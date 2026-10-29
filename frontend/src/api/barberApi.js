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

