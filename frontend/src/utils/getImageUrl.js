const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

/**
 * Strip trailing `/api` segment to derive the backend origin for public storage files.
 */
export const getBackendOrigin = () => {
  return API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
};

export const DEFAULT_AVATAR_PLACEHOLDER =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400';

export const DEFAULT_GALLERY_PLACEHOLDER =
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800';

/**
 * Resolve any backend relative path, legacy localhost URL, or external URL into
 * a production-safe URL using VITE_API_BASE_URL (with `/api` stripped).
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

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
        const cleanPathname = parsed.pathname.replace(/^\/+/, '');
        const storagePath = cleanPathname.startsWith('storage/')
          ? cleanPathname
          : `storage/${cleanPathname}`;
        return `${backendOrigin}/${storagePath}`;
      }
      return trimmed;
    } catch {
      return fallback || trimmed;
    }
  }

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
