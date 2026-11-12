<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Appointment;
use App\Models\Barber;
use App\Models\User;
use App\Support\MediaUrl;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class AdminRoleController extends Controller
{
    /**
     * PUT /api/admin/users/{id}/role
     * Enforce strict Single-Role selection and bidirectional synchronization with the barbers table.
     */
    public function updateUserRole(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'string', 'in:admin,employe,client'],
        ]);

        $user = User::findOrFail($id);
        $newRole = $validated['role'];

        // Prevent demoting the last active administrator
        if (
            $user->hasRole('admin') &&
            $newRole !== 'admin' &&
            User::role('admin')->where('status', 'active')->count() <= 1
        ) {
            return response()->json([
                'status' => 'error',
                'message' => 'Impossible de retirer le rôle du dernier administrateur actif.',
            ], 422);
        }

        // Enforce strict Single-Role (never assignRole, always syncRoles with 1 role)
        $user->syncRoles([$newRole]);

        // Ensure bidirectional sync with barbers table
        if ($newRole === 'employe') {
            $barber = Barber::withTrashed()->where('user_id', $user->id)->first();
            if ($barber) {
                if ($barber->trashed()) {
                    $barber->restore();
                }
                $barber->update([
                    'name' => $user->name,
                    'is_active' => true,
                    'deleted_at' => null,
                ]);
            } else {
                $attributes = [
                    'name' => $user->name,
                    'specialty' => 'Maître Barbier & Styliste',
                    'experience' => '5 ans',
                    'rating' => 5.0,
                    'bio' => 'Professionnel dédié aux rituels de soins masculins et coiffures modernes.',
                    'image_url' => MediaUrl::toStoragePath($user->getRawOriginal('avatar'))
                        ?: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
                    'is_active' => true,
                ];
                if (Schema::hasColumn('barbers', 'photo')) {
                    $attributes['photo'] = $user->getRawOriginal('avatar');
                }
                Barber::firstOrCreate(['user_id' => $user->id], $attributes);
            }
        } else {
            // Role changed FROM employe TO client or admin -> cancel future pending & deactivate/delete barber
            $linkedBarber = Barber::where('user_id', $user->id)->first();
            if ($linkedBarber) {
                Appointment::where('barber_id', $linkedBarber->id)
                    ->whereDate('appointment_date', '>=', Carbon::today()->toDateString())
                    ->where('status', 'pending')
                    ->update(['status' => 'cancelled']);

                $linkedBarber->update(['is_active' => false]);
                $linkedBarber->delete();
            }
        }

        Cache::forget('public_barbers_list');

        $freshUser = $user->fresh(['roles', 'permissions'])->loadCount('appointments');

        return response()->json([
            'status' => 'success',
            'message' => 'Rôle utilisateur mis à jour avec succès.',
            'data' => new UserResource($freshUser),
            'role' => $newRole,
            'roles' => $freshUser->getRoleNames(),
        ]);
    }
}

