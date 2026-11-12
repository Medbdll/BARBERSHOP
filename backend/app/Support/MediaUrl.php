<?php

namespace App\Support;

class MediaUrl
{
    /**
     * Resolve a stored image/avatar path into a production-safe public URL.
     * - External URLs (Google OAuth, Unsplash, etc.) are returned as-is.
     * - Legacy localhost / 127.0.0.1 / ::1 URLs have the old domain stripped and
     *   replaced with config('app.url') . '/storage/...'.
     * - Relative storage paths (e.g. 'avatars/xyz.jpg') are resolved with url('storage/...').
     */
    public static function toPublicUrl(?string $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        if (str_starts_with($trimmed, 'http://') || str_starts_with($trimmed, 'https://')) {
            if (static::isLocalDevUrl($trimmed)) {
                $relative = static::extractStorageRelativePath($trimmed);
                $base = rtrim((string) config('app.url', ''), '/');
                return $base . '/storage/' . ltrim($relative, '/');
            }

            return $trimmed;
        }

        $clean = static::stripStoragePrefix($trimmed);
        return url('storage/' . ltrim($clean, '/'));
    }

    /**
     * Normalize an incoming image value before saving to the database so ONLY
     * relative storage paths (e.g. 'avatars/xyz.jpg') or external third-party URLs
     * are persisted.
     */
    public static function toStoragePath(?string $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        if (str_starts_with($trimmed, 'http://') || str_starts_with($trimmed, 'https://')) {
            $parsedPath = (string) (parse_url($trimmed, PHP_URL_PATH) ?? '');
            if ((static::isLocalDevUrl($trimmed) || static::isAppUrl($trimmed)) && str_contains($parsedPath, '/storage/')) {
                return static::extractStorageRelativePath($trimmed);
            }

            return $trimmed;
        }

        return static::stripStoragePrefix($trimmed);
    }

    /**
     * Extract a public-disk relative path eligible for deletion.
     * Returns null for external URLs (such as Google OAuth avatars).
     */
    public static function extractDeletableDiskPath(?string $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $trimmed = trim($value);

        if (str_starts_with($trimmed, 'http://') || str_starts_with($trimmed, 'https://')) {
            $parsedPath = (string) (parse_url($trimmed, PHP_URL_PATH) ?? '');
            if ((static::isLocalDevUrl($trimmed) || static::isAppUrl($trimmed)) && str_contains($parsedPath, '/storage/')) {
                return static::extractStorageRelativePath($trimmed);
            }

            return null;
        }

        $clean = static::stripStoragePrefix($trimmed);
        return $clean !== '' ? $clean : null;
    }

    protected static function stripStoragePrefix(string $path): string
    {
        $clean = ltrim(str_replace('\\', '/', $path), '/');
        if (str_starts_with($clean, 'storage/')) {
            $clean = substr($clean, strlen('storage/'));
        }

        return ltrim($clean, '/');
    }

    protected static function isLocalDevUrl(string $url): bool
    {
        $host = strtolower((string) (parse_url($url, PHP_URL_HOST) ?? ''));
        return in_array($host, ['localhost', '127.0.0.1', '::1', '[::1]'], true);
    }

    protected static function isAppUrl(string $url): bool
    {
        $appHost = strtolower((string) (parse_url((string) config('app.url', ''), PHP_URL_HOST) ?? ''));
        $urlHost = strtolower((string) (parse_url($url, PHP_URL_HOST) ?? ''));
        return $appHost !== '' && $urlHost !== '' && $appHost === $urlHost;
    }

    protected static function extractStorageRelativePath(string $url): string
    {
        $path = ltrim((string) (parse_url($url, PHP_URL_PATH) ?? ''), '/');
        if (str_contains($path, 'storage/')) {
            $pos = strpos($path, 'storage/');
            $path = substr($path, $pos + strlen('storage/'));
        }

        return ltrim($path, '/');
    }
}

