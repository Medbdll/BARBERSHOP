import axios from 'axios';

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

// Request Interceptor: Attach Bearer token if user is authenticated
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Centralized error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response ? error.response.status : null;

    if (status === 401) {
      // Session or token expired
      console.warn('Unauthorized. Clearing stored credentials...');
      localStorage.removeItem('token');
      // Optional: window.location.href = '/login';
    } else if (status === 419) {
      // CSRF token mismatch in Laravel
      console.warn('CSRF token mismatch.');
    } else if (status >= 500) {
      console.error('Server error encountered:', error.response?.data?.message || error.message);
    }

    return Promise.reject(error);
  }
);

export default api;

