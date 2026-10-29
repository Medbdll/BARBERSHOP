import api from './axios';

/**
 * Check backend connection status
 */
export const checkBackendStatus = async () => {
  const response = await api.get('/status');
  return response.data;
};

/**
 * Fetch all available barber shop services
 */
export const getServices = async () => {
  const response = await api.get('/services');
  return response.data;
};

/**
 * Fetch all barbers
 */
export const getBarbers = async () => {
  const response = await api.get('/barbers');
  return response.data;
};

/**
 * Fetch authenticated user (Sanctum)
 */
export const getUserProfile = async () => {
  const response = await api.get('/user');
  return response.data;
};

/**
 * Log in user
 */
export const loginUser = async ({ email, password }) => {
  const response = await api.post('/login', { email, password });
  return response.data;
};

/**
 * Register new user
 */
export const registerUser = async ({ name, email, password, password_confirmation }) => {
  const response = await api.post('/register', {
    name,
    email,
    password,
    password_confirmation,
  });
  return response.data;
};

/**
 * Log out user
 */
export const logoutUser = async () => {
  const response = await api.post('/logout');
  return response.data;
};

/**
 * Request password reset link
 */
export const forgotPassword = async ({ email }) => {
  const response = await api.post('/forgot-password', { email });
  return response.data;
};


