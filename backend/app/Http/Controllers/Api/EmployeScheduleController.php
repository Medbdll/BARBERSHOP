<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Http\Resources\UserResource;
use App\Models\Appointment;
use App\Models\Barber;
use App\Models\WorkingHour;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class EmployeScheduleController extends Controller
{
    /**
     * Format consistent Barber profile payload for employee dashboard endpoints.
     */
    protected function formatBarberPayload(Barber $barber): array
    {
        $barber->loadMissing(['workingHours' => function ($query) {
            $query->orderBy('day_of_week', 'asc');
        }]);

        return [
            'id' => $barber->id,
            'name' => $barber->name,
            'specialty' => $barber->specialty,
            'experience' => $barber->experience,
            'rating' => (float) $barber->rating,
            'bio' => $barber->bio,
            'image_url' => $barber->image_url,
            'is_active' => (bool) $barber->is_active,
            'working_hours' => $barber->workingHours,
        ];
    }

    /**
     * Compute real-time daily KPI metrics & spotlight next/current client for today.
     */
    protected function buildDailyStats(Barber $barber): array
    {
        $todayStr = Carbon::today()->toDateString();
        $currentTimeStr = Carbon::now()->format('H:i:s');

        $totalToday = Appointment::where('barber_id', $barber->id)
            ->whereDate('appointment_date', $todayStr)
            ->count();

        $completedToday = Appointment::where('barber_id', $barber->id)
            ->whereDate('appointment_date', $todayStr)
            ->where('status', 'completed')
            ->count();

        $revenueToday = (float) Appointment::where('barber_id', $barber->id)
            ->whereDate('appointment_date', $todayStr)
            ->where('status', 'completed')
            ->sum('total_price');

        $remainingQueue = Appointment::where('barber_id', $barber->id)
            ->whereDate('appointment_date', $todayStr)
            ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
            ->count();

        // Prioritize client currently in chair
        $nextClient = Appointment::with([
            'client:id,name,phone,email,loyalty_points,avatar',
            'service:id,name,duration,price',
            'barber:id,name,specialty,image_url',
        ])
            ->where('barber_id', $barber->id)
            ->whereDate('appointment_date', $todayStr)
            ->where('status', 'in_progress')
            ->first();

        // Otherwise closest upcoming appointment today or future
        if (! $nextClient) {
            $nextClient = Appointment::with([
                'client:id,name,phone,email,loyalty_points,avatar',
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

        // Fallback: earliest pending/confirmed today even if start time has passed
        if (! $nextClient) {
            $nextClient = Appointment::with([
                'client:id,name,phone,email,loyalty_points,avatar',
                'service:id,name,duration,price',
                'barber:id,name,specialty,image_url',
            ])
                ->where('barber_id', $barber->id)
                ->whereDate('appointment_date', $todayStr)
                ->whereIn('status', ['confirmed', 'pending'])
                ->orderBy('start_time', 'asc')
                ->first();
        }

        return [
            'total_today' => $totalToday,
            'completed_today' => $completedToday,
            'remaining_queue' => $remainingQueue,
            'revenue_today' => round($revenueToday, 2),
            'next_client' => $nextClient ? new AppointmentResource($nextClient) : null,
        ];
    }
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

        // Base query scoped strictly to this barber
        $query = Appointment::where('barber_id', $barber->id)
            ->with([
                'client:id,name,phone,email,loyalty_points,avatar',
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

        return response()->json([
            'status' => 'success',
            'barber' => $this->formatBarberPayload($barber),
            'daily_stats' => $this->buildDailyStats($barber),
            'data' => AppointmentResource::collection($appointments),
        ]);
    }

    /**
     * GET /api/employe/schedule
     * Returns appointments for a single date (?date=YYYY-MM-DD) or range (start_date/end_date),
     * plus daily_stats and complete barber profile with working_hours.
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

        $dateParam = $request->query('date');
        if ($dateParam) {
            $parsedDate = Carbon::parse($dateParam)->toDateString();
            $startDate = $request->input('start_date', $parsedDate);
            $endDate = $request->input('end_date', $parsedDate);
        } else {
            $startDate = $request->input('start_date', Carbon::today()->startOfWeek()->toDateString());
            $endDate = $request->input('end_date', Carbon::today()->endOfWeek()->toDateString());
        }

        $query = Appointment::where('barber_id', $barber->id)
            ->whereBetween('appointment_date', [$startDate, $endDate])
            ->with([
                'client:id,name,phone,email,loyalty_points,avatar',
                'service:id,name,duration,price',
                'barber:id,name,specialty,image_url',
            ]);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $appointments = $query->orderBy('appointment_date', 'asc')
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
            'barber' => $this->formatBarberPayload($barber),
            'daily_stats' => $this->buildDailyStats($barber),
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
        return app(EmployeAppointmentController::class)->updateStatus($request, $id);
    }

    /**
     * PUT /api/employe/working-hours
     * Manage shifts, breaks, days off, and optional live availability toggle.
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
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $barber = $this->getBarber($request);

        if (! $barber) {
            return response()->json([
                'status' => 'error',
                'message' => 'Profil de barbier introuvable.',
            ], 404);
        }

        if ($request->has('is_active')) {
            $barber->update([
                'is_active' => (bool) $request->boolean('is_active'),
            ]);
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
                    'break_start' => ! empty($item['break_start']) ? $item['break_start'] : null,
                    'break_end' => ! empty($item['break_end']) ? $item['break_end'] : null,
                    'is_day_off' => $item['is_day_off'],
                ]
            );
        }

        Cache::forget('public_barbers_list');

        $freshHours = WorkingHour::where('barber_id', $barber->id)
            ->orderBy('day_of_week', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'message' => 'Horaires de travail et jours de repos mis à jour avec succès.',
            'barber' => $this->formatBarberPayload($barber->fresh(['workingHours'])),
            'data' => $freshHours,
        ]);
    }

    /**
     * PATCH /api/employe/availability
     * Toggle barber live status ("En service" vs "En pause / Congé").
     */
    public function updateAvailability(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $barber = $this->getBarber($request);

        if (! $barber) {
            return response()->json([
                'status' => 'error',
                'message' => 'Profil de barbier introuvable.',
            ], 404);
        }

        $barber->update([
            'is_active' => (bool) $validated['is_active'],
        ]);

        Cache::forget('public_barbers_list');

        return response()->json([
            'status' => 'success',
            'message' => $barber->is_active
                ? 'Statut actif : En service.'
                : 'Statut mis à jour : En pause / Congé.',
            'barber' => $this->formatBarberPayload($barber->fresh(['workingHours'])),
        ]);
    }

    /**
     * PUT /api/employe/profile
     * Update barber specialty, bio, name, and phone.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $barber = $this->getBarber($request);

        if (! $barber) {
            return response()->json([
                'status' => 'error',
                'message' => 'Profil de barbier introuvable.',
            ], 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:25'],
            'specialty' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($user, $barber, $validated) {
            $userUpdates = [];
            $barberUpdates = [];

            if (array_key_exists('name', $validated)) {
                $cleanName = trim((string) $validated['name']);
                $userUpdates['name'] = $cleanName;
                $barberUpdates['name'] = $cleanName;
            }

            if (array_key_exists('phone', $validated)) {
                $userUpdates['phone'] = $validated['phone'] !== null && trim((string) $validated['phone']) !== ''
                    ? trim((string) $validated['phone'])
                    : null;
            }

            if (array_key_exists('specialty', $validated)) {
                $barberUpdates['specialty'] = $validated['specialty'] !== null && trim((string) $validated['specialty']) !== ''
                    ? trim((string) $validated['specialty'])
                    : null;
            }

            if (array_key_exists('bio', $validated)) {
                $barberUpdates['bio'] = $validated['bio'] !== null && trim((string) $validated['bio']) !== ''
                    ? trim((string) $validated['bio'])
                    : null;
            }

            if (! empty($userUpdates)) {
                $user->update($userUpdates);
            }

            if (! empty($barberUpdates)) {
                $barber->update($barberUpdates);
            }
        });

        Cache::forget('public_barbers_list');

        return response()->json([
            'status' => 'success',
            'message' => 'Profil barbier mis à jour avec succès.',
            'user' => new UserResource($user->fresh()),
            'barber' => $this->formatBarberPayload($barber->fresh(['workingHours'])),
        ]);
    }
}

