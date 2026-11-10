<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class CheckIdleTimeout
{
    /**
     * Inactivity timeout in minutes.
     * After leaving the website / remaining idle for 30 minutes,
     * the session token is killed.
     */
    protected const TIMEOUT_MINUTES = 30;

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user('sanctum') ?? $request->user();
        $token = null;

        if ($user && method_exists($user, 'currentAccessToken') && $user->currentAccessToken()) {
            $token = $user->currentAccessToken();
        } elseif ($bearer = $request->bearerToken()) {
            $token = PersonalAccessToken::findToken($bearer);
        }

        if ($token instanceof PersonalAccessToken) {
            $lastActivity = $token->last_used_at ?? $token->created_at;

            if ($lastActivity && $lastActivity->diffInMinutes(now()) >= self::TIMEOUT_MINUTES) {
                // Revoke / kill the token on the server
                $token->delete();

                $lang = $request->header('Accept-Language', 'fr');
                $isAr = str_starts_with(strtolower(trim($lang)), 'ar');
                $message = $isAr
                    ? 'تم إنهاء جلستك بعد 30 دقيقة من عدم النشاط. يرجى تسجيل الدخول مجدداً.'
                    : 'Votre session a expiré après 30 minutes d\'inactivité. Veuillez vous reconnecter.';

                return response()->json([
                    'status' => 'error',
                    'message' => $message,
                    'session_expired' => true,
                ], 401);
            }

            // Update the token's last activity timestamp
            $token->forceFill(['last_used_at' => now()])->save();
        }

        return $next($request);
    }
}
