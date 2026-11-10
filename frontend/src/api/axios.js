import axios from 'axios';

export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds
export const LAST_ACTIVITY_KEY = 'last_activity_time';
export const SESSION_EXPIRED_KEY = 'session_expired_notice';

/**
 * Checks if the user session has been inactive/left for 30 minutes or more.
 * @returns {boolean}
 */
export const isClientSessionExpired = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return false;

    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) return false;

    const elapsed = Date.now() - parseInt(lastActivity, 10);
    return elapsed >= INACTIVITY_TIMEOUT_MS;
  } catch {
    return false;
  }
};

/**
 * Record user activity timestamp in localStorage.
 * Only tracks when user has an active token.
 */
export const recordClientActivity = () => {
  try {
    if (localStorage.getItem('token')) {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }
  } catch {
    // Ignore localStorage write errors (e.g. storage full or private mode quota)
  }
};

/**
 * Purges authentication tokens and local user session.
 * Dispatches an event so all mounted React components react immediately.
 * @param {boolean} isExpired - Whether session was ended due to timeout
 */
export const clearClientSession = (isExpired = false) => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(LAST_ACTIVITY_KEY);

    if (isExpired) {
      localStorage.setItem(SESSION_EXPIRED_KEY, 'true');
      window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { reason: 'inactivity_timeout' } }));
    }
  } catch {
    // Ignore error
  }
};

// Create an Axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
  timeout: 10000,
});

// Request Interceptor: Attach Bearer token & active language to every request
api.interceptors.request.use(
  (config) => {
    // 1. Check if existing session has timed out (30 min inactive/left)
    const token = localStorage.getItem('token');
    if (token) {
      if (isClientSessionExpired()) {
        console.warn('[Session Inactivity] 30 minutes elapsed without interaction. Terminating session.');
        clearClientSession(true);
        return Promise.reject(new axios.Cancel('Session expired after 30 minutes of inactivity.'));
      }
      config.headers.Authorization = `Bearer ${token}`;
      // Refresh activity on outgoing authenticated requests
      recordClientActivity();
    }

    // 2. Attach active application language from localStorage (FR | AR)
    const lang = localStorage.getItem('app_lang') || 'fr';
    config.headers['Accept-Language'] = lang;

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Centralized error handling & session sync
api.interceptors.response.use(
  (response) => {
    // Keep session active on successful API response
    if (localStorage.getItem('token')) {
      recordClientActivity();
    }
    return response;
  },
  (error) => {
    const status = error.response ? error.response.status : null;
    const isExpired = error.response?.data?.session_expired || isClientSessionExpired();

    if (status === 401) {
      console.warn('Unauthorized (401). Clearing stored credentials...', isExpired ? 'Session expired.' : '');
      clearClientSession(isExpired);
    } else if (status === 419) {
      console.warn('CSRF token mismatch.');
    } else if (status >= 500) {
      console.error('Server error encountered:', error.response?.data?.message || error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
