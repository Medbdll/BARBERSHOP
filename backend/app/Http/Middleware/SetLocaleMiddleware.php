<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocaleMiddleware
{
    /**
     * Supported application locales.
     *
     * @var array<string>
     */
    protected array $supportedLocales = ['fr', 'ar'];

    /**
     * Default fallback locale.
     *
     * @var string
     */
    protected string $defaultLocale = 'fr';

    /**
     * Handle an incoming request and set the active application locale
     * based on the 'Accept-Language' header or '?lang=' query parameter.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Check query parameter '?lang=ar' first (useful for testing or direct links)
        $requestedLocale = $request->query('lang');

        // 2. Otherwise read the 'Accept-Language' header sent by Axios
        if (!$requestedLocale) {
            $header = $request->header('Accept-Language');
            if ($header) {
                // Parse standard Accept-Language values (e.g. "fr-FR,fr;q=0.9", "ar", or "fr")
                $parts = explode(',', $header);
                $primary = strtolower(trim(explode(';', $parts[0])[0]));
                $requestedLocale = substr($primary, 0, 2);
            }
        }

        // 3. Match against supported locales, fallback to French ('fr')
        $locale = in_array($requestedLocale, $this->supportedLocales, true)
            ? $requestedLocale
            : $this->defaultLocale;

        // 4. Set Laravel application locale
        app()->setLocale($locale);

        // 5. Proceed with the request
        $response = $next($request);

        // 6. Attach Content-Language header in response for HTTP standards
        $response->headers->set('Content-Language', $locale);

        return $response;
    }
}
