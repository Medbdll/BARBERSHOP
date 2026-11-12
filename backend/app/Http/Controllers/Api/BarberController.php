<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Appointment;
use App\Models\Barber;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class BarberController extends Controller
{
    /**
     * DELETE /api/admin/barbers/{id}
     * Delete a barber from staff, cancel future pending appointments,
     * and revert the linked user strictly to the 'client' role.
     */
    public function destroy(int $id): JsonResponse
    {
        $barber = Barber::findOrFail($id);

        $user = $barber->user_id ? User::find($barber->user_id) : null;
        if (! $user && ! empty($barber->name)) {
            $user = User::where('name', $barber->name)->first();
        }

        // Cancel any future pending appointments assigned to this barber
        Appointment::where('barber_id', $barber->id)
            ->whereDate('appointment_date', '>=', Carbon::today()->toDateString())
            ->where('status', 'pending')
            ->update(['status' => 'cancelled']);

        // Strip employe role/permissions and assign strictly 'client' BEFORE deleting barber
        if ($user && ! $user->hasRole('admin')) {
            $user->syncRoles(['client']);
        }

        // Ensure barber record is deactivated/deleted if not already handled by syncBarberProfile
        $freshBarber = Barber::withTrashed()->find($barber->id);
        if ($freshBarber && ! $freshBarber->trashed()) {
            $freshBarber->update(['is_active' => false]);
            $freshBarber->delete();
        }

        Cache::forget('public_barbers_list');

        $freshUser = $user
            ? $user->fresh(['roles', 'permissions'])->loadCount('appointments')
            : null;

        return response()->json([
            'status' => 'success',
            'message' => 'Barbier retiré du staff et basculé au rôle client.',
            'user' => $freshUser ? new UserResource($freshUser) : null,
        ]);
    }
}

