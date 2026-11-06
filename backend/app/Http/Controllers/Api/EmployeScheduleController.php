<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\Barber;
use App\Models\WorkingHour;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeScheduleController extends Controller
{
    /**
     * Resolve the Barber profile for current authenticated user.
     */
    protected function getBarber(Request $request): ?Barber
    {
        $user = $request->user();

        // If barber profile linked via user_id
        $barber = Barber::where('user_id', $user->id)->first();

        // Fallback: match by name
        if (! $barber) {
            $barber = Barber::where('name', $user->name)->first();
        }

        // Fallback: if admin or employee testing without explicit link, auto-link or pick first
        if (! $barber && $user->hasRole('admin')) {
            $barber = Barber::first();
        } elseif (! $barber && $user->hasRole('employe')) {
            // Auto-create or link barber profile for this employee so they are never blocked
            $barber = Barber::create([
                'user_id' => $user->id,
                'name' => $user->name,
                'specialty' => 'Maître Barbier & Styliste',
                'experience' => '5 ans',
                'rating' => 5.0,
                'bio' => 'Professionnel dédié aux rituels de soins masculins et coiffures modernes.',
                'image_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
                'is_active' => true,
            ]);
        }

        return $barber;
    }

    /**
     * GET /api/employee/appointments (also /api/employe/appointments)
     * Scoped strictly to the authenticated employee (barber).
     * Supports filtering by date (defaulting to today) and status.
     * Returns personalized daily stats: total appointments today, completed cuts,
     * remaining clients in queue, and next upcoming client details.
     */
    public function appointments(Request $request): JsonResponse
    {
        $barber = $this->getBarber($request);

        if (! $barber) {
            return response()->json([
                'status' => 'error',
                'message' => 'Aucun profil de barbier associé à ce compte employé.',
            ], 404);
        }

        $todayStr = Carbon::today()->toDateString();
        $now = Carbon::now();
        $currentTimeStr = $now->format('H:i:s');

        // Base query scoped strictly to this barber
        $query = Appointment::where('barber_id', $barber->id)
            ->with([
                'client:id,name,phone,email',
                'service:id,name,duration,price',
                'barber:id,name,specialty,image_url',
            ]);

        // Date Filter (defaults to today)
        $dateParam = $request->query('date', 'today');
        if ($dateParam === 'all') {
            $query->orderBy('appointment_date', 'desc')->orderBy('start_time', 'desc');
        } elseif ($dateParam === 'today' || empty($dateParam)) {
            $query->whereDate('appointment_date', $todayStr)
                  ->orderBy('appointment_date', 'asc')
                  ->orderBy('start_time', 'asc');
        } else {
            $query->whereDate('appointment_date', $dateParam)
                  ->orderBy('appointment_date', 'asc')
                  ->orderBy('start_time', 'asc');
        }

        // Status Filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Search Filter
        if ($request->filled('search')) {
            $s = '%' . $request->search . '%';
            $query->where(function ($q) use ($s) {
                $q->whereHas('client', function ($cq) use ($s) {
                    $cq->where('name', 'like', $s)
                       ->orWhere('phone', 'like', $s);
                })
                ->orWhereHas('service', function ($sq) use ($s) {
                    $sq->where('name', 'like', $s);
                })
                ->orWhere('id', 'like', $s);
            });
        }

        $appointments = $query->get();

        // 1. Personalized Daily Stats for this logged-in Barber
        $totalToday = Appointment::where('barber_id', $barber->id)
            ->whereDate('appointment_date', $todayStr)
            ->count();

        $completedToday = Appointment::where('barber_id', $barber->id)
            ->whereDate('appointment_date', $todayStr)
            ->where('status', 'completed')
            ->count();

        $remainingQueue = Appointment::where('barber_id', $barber->id)
            ->whereDate('appointment_date', $todayStr)
            ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
            ->count();

        // 2. Next / Current Client details:
        // Prioritize in_progress (client currently in chair)
        $nextClient = Appointment::with([
            'client:id,name,phone,email',
            'service:id,name,duration,price',
            'barber:id,name,specialty,image_url',
        ])
            ->where('barber_id', $barber->id)
            ->whereDate('appointment_date', $todayStr)
            ->where('status', 'in_progress')
            ->first();

        // If no client is currently in chair, pick the closest upcoming client today or future
        if (! $nextClient) {
            $nextClient = Appointment::with([
                'client:id,name,phone,email',
                'service:id,name,duration,price',
                'barber:id,name,specialty,image_url',
            ])
                ->where('barber_id', $barber->id)
                ->whereIn('status', ['confirmed', 'pending'])
                ->where(function ($q) use ($todayStr, $currentTimeStr) {
                    $q->whereDate('appointment_date', '>', $todayStr)
                      ->orWhere(function ($sub) use ($todayStr, $currentTimeStr) {
                          $sub->whereDate('appointment_date', $todayStr)
                              ->where('start_time', '>=', $currentTimeStr);
                      });
                })
                ->orderBy('appointment_date', 'asc')
                ->orderBy('start_time', 'asc')
                ->first();
        }

        // Fallback: earliest pending/confirmed today even if past start time (overdue client in queue)
        if (! $nextClient) {
            $nextClient = Appointment::with([
                'client:id,name,phone,email',
                'service:id,name,duration,price',
                'barber:id,name,specialty,image_url',
            ])
                ->where('barber_id', $barber->id)
                ->whereDate('appointment_date', $todayStr)
                ->whereIn('status', ['confirmed', 'pending'])
                ->orderBy('start_time', 'asc')
                ->first();
        }

        return response()->json([
            'status' => 'success',
            'barber' => [
                'id' => $barber->id,
                'name' => $barber->name,
                'specialty' => $barber->specialty,
                'rating' => $barber->rating,
                'image_url' => $barber->image_url,
            ],
            'daily_stats' => [
                'total_today' => $totalToday,
                'completed_today' => $completedToday,
                'remaining_queue' => $remainingQueue,
                'next_client' => $nextClient ? new AppointmentResource($nextClient) : null,
            ],
            'data' => AppointmentResource::collection($appointments),
        ]);
    }

    /**
     * GET /api/employe/schedule
     * Returns appointments formatted as calendar events for daily/weekly views.
     */
    public function schedule(Request $request): JsonResponse
    {
        $barber = $this->getBarber($request);

        if (! $barber) {
            return response()->json([
                'status' => 'error',
                'message' => 'Aucun profil de barbier associé à ce compte employé.',
            ], 404);
        }

        $startDate = $request->input('start_date', Carbon::today()->startOfWeek()->toDateString());
        $endDate = $request->input('end_date', Carbon::today()->endOfWeek()->toDateString());

        $appointments = Appointment::where('barber_id', $barber->id)
            ->whereBetween('appointment_date', [$startDate, $endDate])
            ->with([
                'client:id,name,phone,email',
                'service:id,name,duration,price',
            ])
            ->orderBy('appointment_date', 'asc')
            ->orderBy('start_time', 'asc')
            ->get();

        // Format for calendar widgets
        $events = $appointments->map(function ($appt) {
            return [
                'id' => $appt->id,
                'title' => ($appt->client?->name ?? 'Client') . ' — ' . ($appt->service?->name ?? 'Prestation'),
                'start' => $appt->appointment_date->format('Y-m-d') . 'T' . $appt->start_time,
                'end' => $appt->appointment_date->format('Y-m-d') . 'T' . $appt->end_time,
                'status' => $appt->status,
                'client_name' => $appt->client?->name,
                'client_phone' => $appt->client?->phone,
                'service_name' => $appt->service?->name,
                'total_price' => $appt->total_price,
                'notes' => $appt->notes,
            ];
        });

        return response()->json([
            'status' => 'success',
            'barber' => [
                'id' => $barber->id,
                'name' => $barber->name,
                'specialty' => $barber->specialty,
            ],
            'range' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'total_appointments' => $appointments->count(),
            'events' => $events,
            'data' => AppointmentResource::collection($appointments),
        ]);
    }

    /**
     * PATCH /api/employee/appointments/{id}/status (also /api/employe/appointments/{id}/status)
     * Update appointment status (pending, confirmed, in_progress, completed, cancelled, no_show).
     * Scoped strictly to the employee's own assigned appointments.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => ['required', 'in:pending,confirmed,in_progress,completed,cancelled,no_show'],
        ]);

        $barber = $this->getBarber($request);
        $user = $request->user();

        if (! $barber) {
            return response()->json([
                'status' => 'error',
                'message' => 'Aucun profil de barbier associé à ce compte employé.',
            ], 403);
        }

        $query = Appointment::where('id', $id);

        if (! $user->hasRole('admin')) {
            $query->where('barber_id', $barber->id);
        }

        $appointment = $query->first();

        if (! $appointment) {
            return response()->json([
                'status' => 'error',
                'message' => 'Rendez-vous introuvable ou non assigné à votre poste.',
            ], 403);
        }

        $oldStatus = $appointment->status;
        $appointment->update([
            'status' => $request->status,
        ]);

        // If completed and not previously completed, reward loyalty points
        if ($request->status === 'completed' && $oldStatus !== 'completed' && $appointment->client) {
            $points = (int) round($appointment->total_price * 0.1);
            $appointment->client->increment('loyalty_points', $points > 0 ? $points : 20);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Le statut du rendez-vous #{$id} est maintenant : {$request->status}",
            'data' => new AppointmentResource($appointment->fresh(['client', 'service', 'barber'])),
        ]);
    }

    /**
     * PUT /api/employe/working-hours
     * Manage shifts, breaks, and days off.
     */
    public function updateWorkingHours(Request $request): JsonResponse
    {
        $request->validate([
            'working_hours' => ['required', 'array'],
            'working_hours.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'working_hours.*.start_time' => ['required', 'date_format:H:i'],
            'working_hours.*.end_time' => ['required', 'date_format:H:i'],
            'working_hours.*.break_start' => ['nullable', 'date_format:H:i'],
            'working_hours.*.break_end' => ['nullable', 'date_format:H:i'],
            'working_hours.*.is_day_off' => ['required', 'boolean'],
        ]);

        $barber = $this->getBarber($request);

        if (! $barber) {
            return response()->json([
                'status' => 'error',
                'message' => 'Profil de barbier introuvable.',
            ], 404);
        }

        foreach ($request->working_hours as $item) {
            WorkingHour::updateOrCreate(
                [
                    'barber_id' => $barber->id,
                    'day_of_week' => $item['day_of_week'],
                ],
                [
                    'start_time' => $item['start_time'],
                    'end_time' => $item['end_time'],
                    'break_start' => $item['break_start'] ?? null,
                    'break_end' => $item['break_end'] ?? null,
                    'is_day_off' => $item['is_day_off'],
                ]
            );
        }

        $freshHours = WorkingHour::where('barber_id', $barber->id)
            ->orderBy('day_of_week', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'message' => 'Horaires de travail et jours de repos mis à jour avec succès.',
            'data' => $freshHours,
        ]);
    }
}

