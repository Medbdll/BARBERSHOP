/**
 * Resolve the backend base URL (without /api) for public storage files.
 * Uses VITE_API_URL or VITE_API_BASE_URL, defaulting to https://api.barberoza.shop in production.
 */
export const getBackendOrigin = () => {
  const envUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL;

  if (envUrl) {
    const cleaned = envUrl.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
    if (import.meta.env.PROD && (cleaned.includes('localhost') || cleaned.includes('127.0.0.1'))) {
      return 'https://api.barberoza.shop';
    }
    return cleaned;
  }

  return 'https://api.barberoza.shop';
};

export const DEFAULT_AVATAR_PLACEHOLDER =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400';

export const DEFAULT_GALLERY_PLACEHOLDER =
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800';

export const DEFAULT_SERVICE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800';

/**
 * Resolve any backend relative path, legacy localhost URL, or external URL into
 * a production-safe URL.
 *
 * @param {string|null|undefined} path
 * @param {string|null} fallback
 * @returns {string|null}
 */
export const getImageUrl = (path, fallback = null) => {
  if (!path || typeof path !== 'string') {
    return fallback;
  }

  const trimmed = path.trim();
  if (!trimmed) {
    return fallback;
  }

  // Keep in-memory blob/data previews untouched
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const backendOrigin = getBackendOrigin();

  // 1. If already a full URL starting with http:// or https://
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';

      // If it contains localhost or 127.0.0.1 in production (or mismatched host in dev), replace origin
      if (isLocalHost) {
        if (import.meta.env.PROD || (backendOrigin && !trimmed.startsWith(backendOrigin))) {
          const cleanPathname = parsed.pathname.replace(/^\/+/, '');
          const storagePath = cleanPathname.startsWith('storage/')
            ? cleanPathname
            : `storage/${cleanPathname}`;
          return `${backendOrigin}/${storagePath}`;
        }
        return trimmed;
      }

      // Otherwise, return the full https://... URL directly as-is without prepending anything or replacing it with a local static map!
      return trimmed;
    } catch {
      return fallback || trimmed;
    }
  }

  // 2. Relative paths starting with /storage/, storage/, services/, or other directories
  const cleanRelative = trimmed.replace(/^\/+/, '');
  const normalizedStoragePath = cleanRelative.startsWith('storage/')
    ? cleanRelative
    : `storage/${cleanRelative}`;

  return `${backendOrigin}/${normalizedStoragePath}`;
};

/**
 * Safe img onError handler preventing infinite fallback loops.
 */
export const handleImageFallbackError = (
  event,
  fallbackUrl = DEFAULT_AVATAR_PLACEHOLDER
) => {
  const img = event?.currentTarget;
  if (!img || img.dataset.fallbackApplied === 'true') {
    return;
  }
  img.dataset.fallbackApplied = 'true';
  img.src = fallbackUrl;
};

export default getImageUrl;

