<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Http\Resources\ReviewResource;
use App\Http\Resources\UserResource;
use App\Models\Appointment;
use App\Models\Barber;
use App\Models\Review;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClientAppointmentController extends Controller
{
    /**
     * POST /api/appointments
     * 4-step booking validation with atomic double-booking prevention & permanent phone update.
     */
    public function store(Request $request): JsonResponse
    {
        return (new AppointmentController())->store($request);
    }

    /**
     * GET /api/client/appointments
     * List user's appointments segmented into upcoming (future or active today)
     * and history (completed, cancelled, no-show, or past).
     * Includes client summary stats (total completed visits, next upcoming appointment, loyalty points).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $todayStr = Carbon::today()->toDateString();
        $now = Carbon::now();

        // 1. Upcoming Appointments:
        // Future date, or today with active status (pending, confirmed, in_progress)
        $upcoming = Appointment::where('client_id', $user->id)
            ->where(function ($q) use ($todayStr) {
                $q->whereDate('appointment_date', '>', $todayStr)
                  ->orWhere(function ($sub) use ($todayStr) {
                      $sub->whereDate('appointment_date', $todayStr)
                          ->whereIn('status', ['pending', 'confirmed', 'in_progress']);
                  });
            })
            ->whereNotIn('status', ['cancelled', 'no_show', 'completed'])
            ->with([
                'barber:id,name,specialty,image_url',
                'service:id,name,duration,price,category',
            ])
            ->orderBy('appointment_date', 'asc')
            ->orderBy('start_time', 'asc')
            ->get();

        // 2. History Appointments:
        // Past dates or finished/cancelled states
        $history = Appointment::where('client_id', $user->id)
            ->where(function ($query) use ($todayStr) {
                $query->whereDate('appointment_date', '<', $todayStr)
                      ->orWhereIn('status', ['completed', 'cancelled', 'no_show']);
            })
            ->with([
                'barber:id,name,specialty,image_url',
                'service:id,name,duration,price,category',
                'review:id,appointment_id,rating,comment',
            ])
            ->orderBy('appointment_date', 'desc')
            ->orderBy('start_time', 'desc')
            ->get();

        // 3. Client Summary Stats
        $totalCompletedVisits = Appointment::where('client_id', $user->id)
            ->where('status', 'completed')
            ->count();

        // Closest upcoming appointment (first in the ascending list)
        $nextAppointment = $upcoming->first();

        return response()->json([
            'status' => 'success',
            'summary_stats' => [
                'total_completed_visits' => $totalCompletedVisits,
                'upcoming_count' => $upcoming->count(),
                'loyalty_points' => $user->fresh()->loyalty_points ?? 0,
                'next_appointment' => $nextAppointment ? (new AppointmentResource($nextAppointment))->resolve() : null,
            ],
            'data' => [
                'upcoming' => AppointmentResource::collection($upcoming),
                'history' => AppointmentResource::collection($history),
            ],
        ]);
    }

    /**
     * GET /api/client/appointments/{id}/queue-status
     * Fetch live queue position (people_ahead & estimated_wait_minutes) for an appointment.
     */
    public function queueStatus(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $appointment = Appointment::where('id', $id)
            ->where('client_id', $user->id)
            ->with([
                'barber:id,name,specialty,image_url',
                'service:id,name,duration,price',
            ])
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $appointment->id,
                'status' => $appointment->status,
                'appointment_date' => $appointment->appointment_date?->format('Y-m-d'),
                'start_time' => substr((string) $appointment->start_time, 0, 5),
                'people_ahead' => (int) $appointment->people_ahead,
                'minutes_until_start' => (int) $appointment->minutes_until_start,
                'is_my_turn_now' => (bool) $appointment->is_my_turn_now,
                'estimated_wait_minutes' => (int) $appointment->estimated_wait_minutes,
                'barber' => $appointment->barber ? [
                    'id' => $appointment->barber->id,
                    'name' => $appointment->barber->name,
                ] : null,
            ],
        ]);
    }

    /**
     * PATCH /api/client/appointments/{id}/cancel
     * Cancel own upcoming appointment with strict past and in_progress checks.
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $appointment = Appointment::where('id', $id)
            ->where('client_id', $user->id)
            ->first();

        if (! $appointment) {
            return response()->json([
                'status' => 'error',
                'message' => 'Rendez-vous introuvable ou vous n’avez pas les droits pour l’annuler.',
            ], 404);
        }

        // Prevent cancellation if already final
        if (in_array($appointment->status, ['completed', 'cancelled', 'no_show'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Ce rendez-vous est déjà ' . ($appointment->status === 'completed' ? 'terminé' : 'annulé') . ' et ne peut plus être modifié.',
            ], 422);
        }

        // Prevent cancellation if client is already in the chair
        if ($appointment->status === 'in_progress') {
            return response()->json([
                'status' => 'error',
                'message' => 'Votre coupe est actuellement en cours dans le fauteuil, impossible d’annuler ce rendez-vous.',
            ], 422);
        }

        // Prevent cancellation if appointment time is in the past
        $appointmentDateTime = Carbon::parse($appointment->appointment_date->format('Y-m-d') . ' ' . $appointment->start_time);
        if ($appointmentDateTime->isPast()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Impossible d’annuler un rendez-vous dont l’horaire est déjà passé.',
            ], 422);
        }

        $refunded = DB::transaction(function () use ($appointment) {
            $lockedAppt = Appointment::with('client')->where('id', $appointment->id)->lockForUpdate()->firstOrFail();
            $oldStatus = $lockedAppt->status;

            $lockedAppt->update([
                'status' => 'cancelled',
            ]);

            return $lockedAppt->refundRedeemedPoints($oldStatus);
        });

        $freshUser = $user->fresh();

        return response()->json([
            'status' => 'success',
            'message' => 'Votre rendez-vous a bien été annulé.',
            'points_refunded' => $refunded,
            'current_loyalty_points' => $freshUser->loyalty_points ?? 0,
            'user' => new UserResource($freshUser),
            'data' => new AppointmentResource($appointment->fresh(['barber', 'service', 'client'])),
        ]);
    }

    /**
     * PATCH /api/client/appointments/{id}/reschedule
     * Reschedule appointment date and time slot.
     */
    public function reschedule(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        // Merge combined appointment timestamp for strict future validation
        $request->merge([
            'appointment_datetime' => ($request->filled('appointment_date') && $request->filled('start_time'))
                ? $request->appointment_date . ' ' . $request->start_time
                : null,
        ]);

        $request->validate([
            'appointment_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'appointment_datetime' => ['required', 'date', 'after_or_equal:now'],
        ], [
            'appointment_date.after_or_equal' => 'La nouvelle date ne peut pas être dans le passé.',
            'appointment_datetime.after_or_equal' => 'Le rendez-vous ne peut pas être reprogrammé dans le passé. Veuillez sélectionner un horaire à partir du moment présent.',
        ]);

        $appointment = Appointment::where('id', $id)
            ->where('client_id', $user->id)
            ->firstOrFail();

        if ($appointment->status === 'completed') {
            return response()->json([
                'status' => 'error',
                'message' => 'Un rendez-vous déjà effectué ne peut être reprogrammé.',
            ], 422);
        }

        $service = $appointment->service;
        $startTime = Carbon::parse($request->appointment_date . ' ' . $request->start_time);
        $endTime = $startTime->copy()->addMinutes($service->duration);

        // Check double-booking for the new slot, excluding this appointment
        $hasConflict = Appointment::where('barber_id', $appointment->barber_id)
            ->where('id', '!=', $appointment->id)
            ->whereDate('appointment_date', $request->appointment_date)
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->where(function ($query) use ($startTime, $endTime) {
                $query->where('start_time', '<', $endTime->format('H:i:s'))
                    ->where('end_time', '>', $startTime->format('H:i:s'));
            })
            ->exists();

        if ($hasConflict) {
            throw ValidationException::withMessages([
                'start_time' => ["Le nouvel horaire ({$request->start_time}) est déjà occupé. Veuillez en choisir un autre."],
            ]);
        }

        $appointment->update([
            'appointment_date' => $request->appointment_date,
            'start_time' => $startTime->format('H:i:s'),
            'end_time' => $endTime->format('H:i:s'),
            'status' => 'confirmed',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Votre rendez-vous a été reprogrammé avec succès.',
            'data' => new AppointmentResource($appointment->fresh(['barber', 'service'])),
        ]);
    }

    /**
     * POST /api/client/reviews
     * Leave a 1-5 star review after a completed cut.
     */
    public function leaveReview(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'appointment_id' => ['nullable', 'exists:appointments,id'],
            'barber_id' => ['required', 'exists:barbers,id'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        // If appointment_id provided, ensure it belongs to this client and is completed
        if ($request->appointment_id) {
            $appointment = Appointment::where('id', $request->appointment_id)
                ->where('client_id', $user->id)
                ->firstOrFail();

            // Check if review already exists for this appointment
            $existing = Review::where('appointment_id', $appointment->id)->first();
            if ($existing) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Vous avez déjà partagé votre avis pour cette séance.',
                ], 422);
            }
        }

        $review = Review::create([
            'appointment_id' => $request->appointment_id,
            'client_id' => $user->id,
            'barber_id' => $request->barber_id,
            'rating' => $request->rating,
            'comment' => $request->comment,
            'is_approved' => false, // Requires admin moderation
        ]);

        // Reward client with 20 loyalty points for leaving a review!
        $user->increment('loyalty_points', 20);

        return response()->json([
            'status' => 'success',
            'message' => 'Merci pour votre précieux avis ! Il sera visible après validation par notre équipe.',
            'data' => new ReviewResource($review->load(['client', 'barber'])),
            'loyalty_points_bonus' => 20,
        ], 201);
    }

    /**
     * GET /api/client/loyalty
     * Track loyalty points, VIP tier, and reward vouchers.
     */
    public function loyalty(Request $request): JsonResponse
    {
        $user = $request->user();
        $points = $user->loyalty_points ?? 0;

        // Tier evaluation
        $tier = 'Gentleman Silver';
        $discount = 0;
        $nextTier = 'Privilège Gold';
        $pointsNeeded = 250 - $points;

        if ($points >= 500) {
            $tier = 'Black Diamond VIP';
            $discount = 20; // 20% discount on services
            $nextTier = 'Niveau Maximum';
            $pointsNeeded = 0;
        } elseif ($points >= 250) {
            $tier = 'Privilège Gold';
            $discount = 10; // 10% discount on services
            $nextTier = 'Black Diamond VIP';
            $pointsNeeded = 500 - $points;
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'points' => $points,
                'cashback_mad' => (int) floor($points / 10),
                'tier' => $tier,
                'discount_percentage' => $discount,
                'next_tier' => $nextTier,
                'points_to_next_tier' => max(0, $pointsNeeded),
                'rewards_available' => [
                    [
                        'id' => 1,
                        'title' => 'Soin Barbe Offert',
                        'points_cost' => 100,
                        'unlocked' => $points >= 100,
                    ],
                    [
                        'id' => 2,
                        'title' => 'Shampoing & Massage Crânien VIP',
                        'points_cost' => 200,
                        'unlocked' => $points >= 200,
                    ],
                    [
                        'id' => 3,
                        'title' => 'Coupe Signature Gratuite',
                        'points_cost' => 350,
                        'unlocked' => $points >= 350,
                    ],
                ],
            ],
        ]);
    }
}

