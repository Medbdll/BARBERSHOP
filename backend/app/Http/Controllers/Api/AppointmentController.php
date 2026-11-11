<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Http\Resources\UserResource;
use App\Models\Appointment;
use App\Models\Barber;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AppointmentController extends Controller
{
    /**
     * POST /api/appointments
     * Intelligent appointment creation with:
     * - Multi-service & single-service support (service_ids or service_id)
     * - One-time persistent phone update (required only if user.phone is currently empty)
     * - Double-booking collision prevention
     * - Returns created appointment + fresh user object
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        // Harmonize single service_id vs multiple service_ids
        $serviceIds = [];
        if ($request->has('service_ids') && is_array($request->service_ids)) {
            $serviceIds = array_filter($request->service_ids);
        } elseif ($request->filled('service_id')) {
            $serviceIds = [(int) $request->service_id];
        }

        // Harmonize phone & notes parameter names
        $phone = $request->input('phone') ?? $request->input('client_phone');
        $notes = $request->input('notes') ?? $request->input('client_notes');

        $request->merge([
            'phone' => $phone,
            'notes' => $notes,
            'normalized_service_ids' => $serviceIds,
            'appointment_datetime' => ($request->filled('appointment_date') && $request->filled('start_time'))
                ? $request->appointment_date . ' ' . $request->start_time
                : null,
        ]);

        $request->validate([
            'normalized_service_ids' => ['required', 'array', 'min:1'],
            'normalized_service_ids.*' => ['integer', 'exists:services,id'],
            'barber_id' => ['required', 'exists:barbers,id'],
            'appointment_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'appointment_datetime' => ['required', 'date', 'after_or_equal:now'],
            'notes' => ['nullable', 'string', 'max:500'],
            'phone' => [
                Rule::requiredIf(empty($user->phone)),
                'nullable',
                'string',
                'max:25',
            ],
        ], [
            'normalized_service_ids.required' => 'Veuillez sélectionner au moins un service.',
            'phone.required' => 'Votre numéro de téléphone est requis pour confirmer et recevoir le rappel SMS.',
            'appointment_date.after_or_equal' => 'La date du rendez-vous ne peut pas être dans le passé.',
            'appointment_datetime.after_or_equal' => 'Le rendez-vous ne peut pas être planifié dans le passé. Veuillez sélectionner un horaire futur.',
        ]);

        // Fetch selected services & calculate total duration & price
        $services = Service::whereIn('id', $serviceIds)
            ->where('is_active', true)
            ->get();

        if ($services->isEmpty()) {
            throw ValidationException::withMessages([
                'service_ids' => ['Aucun service sélectionné n\'est actuellement disponible.'],
            ]);
        }

        $primaryService = $services->first();
        $totalDuration = (int) $services->sum('duration');
        $totalPrice = (float) $services->sum('price');

        $barber = Barber::where('id', $request->barber_id)
            ->where('is_active', true)
            ->firstOrFail();

        $startTime = Carbon::parse($request->appointment_date . ' ' . $request->start_time);
        $endTime = $startTime->copy()->addMinutes($totalDuration > 0 ? $totalDuration : 30);

        // Prevent Double-Booking: check for overlapping appointments for this barber
        $hasConflict = Appointment::where('barber_id', $barber->id)
            ->whereDate('appointment_date', $request->appointment_date)
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->where(function ($query) use ($startTime, $endTime) {
                $query->where('start_time', '<', $endTime->format('H:i:s'))
                    ->where('end_time', '>', $startTime->format('H:i:s'));
            })
            ->exists();

        if ($hasConflict) {
            throw ValidationException::withMessages([
                'start_time' => [
                    "Le créneau de {$request->start_time} est déjà réservé pour {$barber->name}. Veuillez sélectionner un autre horaire disponible."
                ],
            ]);
        }

        // One-Time Persistent Phone Update:
        // If the user provided a phone number and either didn't have one or explicitly updated it,
        // permanently persist it to the users table
        if ($request->filled('phone')) {
            $cleanedPhone = trim($request->phone);
            if (!empty($cleanedPhone) && $user->phone !== $cleanedPhone) {
                $user->update(['phone' => $cleanedPhone]);
            }
        }

        // Create the appointment
        $appointment = Appointment::create([
            'client_id' => $user->id,
            'barber_id' => $barber->id,
            'service_id' => $primaryService->id,
            'appointment_date' => $request->appointment_date,
            'start_time' => $startTime->format('H:i:s'),
            'end_time' => $endTime->format('H:i:s'),
            'status' => 'confirmed',
            'total_price' => $totalPrice,
            'notes' => $request->notes,
        ]);

        // Award 15 Loyalty points for booking
        $user->increment('loyalty_points', 15);

        $appointment->load(['client', 'barber', 'service']);

        $freshUser = $user->fresh();

        return response()->json([
            'status' => 'success',
            'message' => 'Votre rendez-vous a été confirmé avec succès ! Un SMS de rappel vous parviendra avant votre séance.',
            'data' => new AppointmentResource($appointment),
            'user' => new UserResource($freshUser),
            'loyalty_points_earned' => 15,
            'current_loyalty_points' => $freshUser->loyalty_points,
        ], 201);
    }
}

