<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\Barber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeAppointmentController extends Controller
{
    /**
     * PATCH /api/employe/appointments/{id}/status
     * Restrict status updates strictly to role:employe (the assigned Barber).
     * Admins and other barbers cannot alter this appointment status.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        // Enforce role:employe strictly; Admin is forbidden
        if (! $user || ! $user->hasRole('employe') || $user->hasRole('admin')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Action réservée exclusivement aux employés barbiers.',
            ], 403);
        }

        $barber = Barber::where('user_id', $user->id)->first();
        if (! $barber) {
            return response()->json([
                'status' => 'error',
                'message' => 'Aucun profil de barbier associé à ce compte employé.',
            ], 403);
        }

        $appointment = Appointment::where('id', $id)
            ->where('barber_id', $barber->id)
            ->first();

        if (! $appointment) {
            return response()->json([
                'status' => 'error',
                'message' => 'Rendez-vous introuvable ou non assigné à votre poste.',
            ], 403);
        }

        $request->validate([
            'status' => ['required', 'in:pending,confirmed,in_progress,completed,cancelled,no_show'],
        ]);

        DB::transaction(function () use ($appointment, $request) {
            $lockedAppt = Appointment::with('client')->where('id', $appointment->id)->lockForUpdate()->firstOrFail();
            $oldStatus = $lockedAppt->status;

            $lockedAppt->update([
                'status' => $request->status,
            ]);

            if ($request->status === 'completed') {
                $lockedAppt->creditLoyaltyPoints();
            } elseif ($request->status === 'cancelled') {
                $lockedAppt->refundRedeemedPoints($oldStatus);
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => "Le statut du rendez-vous #{$id} est maintenant : {$request->status}",
            'data' => new AppointmentResource($appointment->fresh(['client', 'service', 'barber'])),
        ]);
    }
}
