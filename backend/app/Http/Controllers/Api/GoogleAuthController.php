<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    /**
     * Generate Google OAuth consent URL and return as JSON.
     * GET /api/auth/google/redirect
     */
    public function redirect(): JsonResponse
    {
        $clientId = config('services.google.client_id');
        $clientSecret = config('services.google.client_secret');

        if (empty($clientId) || empty($clientSecret)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Les identifiants Google OAuth sont manquants. Veuillez renseigner GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans votre fichier backend/.env.',
            ], 422);
        }

        try {
            /** @var \Laravel\Socialite\Two\GoogleProvider $driver */
            $driver = Socialite::driver('google')->stateless();
            $targetUrl = $driver->redirect()->getTargetUrl();

            return response()->json([
                'status' => 'success',
                'url' => $targetUrl,
            ]);
        } catch (Exception $e) {
            Log::error('Google OAuth Redirect Error: ' . $e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Impossible de générer le lien de connexion Google: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle the callback from Google OAuth.
     * GET /api/auth/google/callback
     */
    public function callback(Request $request): RedirectResponse
    {
        $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');

        // Check if user denied or Google returned an error query
        if ($request->has('error')) {
            $errorDesc = $request->query('error_description', $request->query('error', 'Authentification Google annulée.'));
            return redirect("{$frontendUrl}/auth/google/callback?error=" . urlencode($errorDesc));
        }

        try {
            $googleUser = Socialite::driver('google')->stateless()->user();

            if (! $googleUser || ! $googleUser->getEmail()) {
                return redirect("{$frontendUrl}/auth/google/callback?error=" . urlencode('Aucune adresse e-mail fournie par Google.'));
            }

            // Check if user exists by google_id or email
            $user = User::where('google_id', $googleUser->getId())
                ->orWhere('email', $googleUser->getEmail())
                ->first();

            if ($user) {
                // If user exists, update google_id and avatar if missing
                $updated = false;

                if (empty($user->google_id)) {
                    $user->google_id = $googleUser->getId();
                    $updated = true;
                }

                if (empty($user->avatar) && $googleUser->getAvatar()) {
                    $user->avatar = $googleUser->getAvatar();
                    $updated = true;
                }

                if (empty($user->profile_photo_path) && $googleUser->getAvatar()) {
                    $user->profile_photo_path = $googleUser->getAvatar();
                    $updated = true;
                }

                if ($updated) {
                    $user->save();
                }

                // If user has no roles, assign client
                if ($user->roles()->count() === 0) {
                    $user->assignRole('client');
                }
            } else {
                // Create a new User
                $user = User::create([
                    'name' => $googleUser->getName() ?: explode('@', $googleUser->getEmail())[0],
                    'email' => $googleUser->getEmail(),
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                    'profile_photo_path' => $googleUser->getAvatar(),
                    'password' => Hash::make(Str::random(32)),
                    'phone' => null,
                    'loyalty_points' => 50,
                    'status' => 'active',
                    'email_verified_at' => now(),
                ]);

                // Automatically assign Spatie client role
                $user->assignRole('client');
            }

            // Check if $user->status === 'blocked' and reject login if blocked
            if (isset($user->status) && $user->status === 'blocked') {
                return redirect("{$frontendUrl}/auth/google/callback?error=" . urlencode('Votre compte a été bloqué par un administrateur.'));
            }

            // Generate Sanctum Bearer token
            $token = $user->createToken('google_auth_token')->plainTextToken;

            // Redirect back to React SPA callback route
            return redirect("{$frontendUrl}/auth/google/callback?token={$token}");
        } catch (Exception $e) {
            Log::error('Google OAuth Callback Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect("{$frontendUrl}/auth/google/callback?error=" . urlencode('Échec de la connexion avec Google: ' . $e->getMessage()));
        }
    }
}

