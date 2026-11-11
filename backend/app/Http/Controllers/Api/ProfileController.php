<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Barber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    /**
     * POST /api/profile/avatar
     * Upload and update profile picture for any authenticated user (client, employe, admin).
     */
    public function updateAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $user = $request->user();

        // 1. Delete previous local avatar from public disk if one exists
        //    (Skip external URLs such as Google OAuth avatars or third-party hosts)
        $previousAvatar = $user->avatar;
        if (is_string($previousAvatar) && $previousAvatar !== '') {
            $localPath = null;

            if (! str_starts_with($previousAvatar, 'http')) {
                $localPath = ltrim(str_replace('/storage/', '', $previousAvatar), '/');
            } else {
                $parsedPath = parse_url($previousAvatar, PHP_URL_PATH) ?: '';
                if (str_contains($parsedPath, '/storage/avatars/')) {
                    $localPath = 'avatars/' . basename($parsedPath);
                }
            }

            if ($localPath && Storage::disk('public')->exists($localPath)) {
                Storage::disk('public')->delete($localPath);
            }
        }

        // 2. Store new uploaded avatar in storage/app/public/avatars
        $path = $request->file('avatar')->store('avatars', 'public');
        $avatarUrl = asset('storage/' . $path);

        // 3. Save public URL to users.avatar
        $user->update([
            'avatar' => $avatarUrl,
        ]);

        // 4. Sync Barber profile photo if user has employe role and linked barber record
        if ($user->hasAnyRole(['employe', 'employee'])) {
            $barberUpdate = [
                'image_url' => $avatarUrl,
            ];

            if (Schema::hasColumn('barbers', 'photo')) {
                $barberUpdate['photo'] = $avatarUrl;
            }

            Barber::withTrashed()
                ->where('user_id', $user->id)
                ->update($barberUpdate);

            Cache::forget('public_barbers_list');
        }

        $freshUser = $user->fresh();

        return response()->json([
            'status' => 'success',
            'message' => 'Photo de profil mise à jour avec succès.',
            'avatar_url' => $avatarUrl,
            'user' => new UserResource($freshUser),
        ]);
    }
}

