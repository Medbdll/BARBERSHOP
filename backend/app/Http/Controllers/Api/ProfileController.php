<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Barber;
use App\Support\MediaUrl;
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
        //    (Never deletes external Google OAuth avatars or third-party URLs)
        $localPath = MediaUrl::extractDeletableDiskPath($user->getRawOriginal('avatar'));
        if ($localPath && Storage::disk('public')->exists($localPath)) {
            Storage::disk('public')->delete($localPath);
        }

        // 2. Store new uploaded avatar in storage/app/public/avatars and persist ONLY the relative path
        $relativePath = $request->file('avatar')->store('avatars', 'public');

        // 3. Save relative path to users.avatar (resolved dynamically by User::getAvatarAttribute)
        $user->update([
            'avatar' => $relativePath,
        ]);

        // 4. Sync Barber profile photo if user has employe role and linked barber record
        if ($user->hasAnyRole(['employe', 'employee'])) {
            $barberUpdate = [
                'image_url' => $relativePath,
            ];

            if (Schema::hasColumn('barbers', 'photo')) {
                $barberUpdate['photo'] = $relativePath;
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
            'avatar_path' => $relativePath,
            'avatar_url' => $freshUser->avatar,
            'user' => new UserResource($freshUser),
        ]);
    }
}

