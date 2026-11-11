import api from './axios';

// In-flight request deduplication map to prevent multiple identical requests hitting PHP dev server simultaneously
const inFlightRequests = new Map();

// Short in-memory cache for public catalogs (services, barbers, reviews, gallery)
const memoryCache = new Map();
const MEMORY_CACHE_TTL = 30000; // 30 seconds

const cachedGet = async (key, fetcher, ttl = MEMORY_CACHE_TTL) => {
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const promise = fetcher()
    .then((data) => {
      memoryCache.set(key, { data, timestamp: Date.now() });
      inFlightRequests.delete(key);
      return data;
    })
    .catch((err) => {
      inFlightRequests.delete(key);
      if (cached) {
        console.warn(`[API Cache Fallback] Fetch failed for ${key}, using cached data:`, err.message);
        return cached.data;
      }
      throw err;
    });

  inFlightRequests.set(key, promise);
  return promise;
};

/**
 * =====================================================================
 * PUBLIC API ENDPOINTS
 * =====================================================================
 */

export const checkBackendStatus = async () => {
  const response = await api.get('/status');
  return response.data;
};

export const getServices = async (category = 'all', forceFresh = false) => {
  const cacheKey = `services_${category || 'all'}`;
  if (forceFresh) memoryCache.delete(cacheKey);

  return cachedGet(cacheKey, async () => {
    const params = category && category !== 'all' ? { category } : {};
    const response = await api.get('/services', { params });
    return response.data;
  });
};

export const getBarbers = async (date = null, forceFresh = false) => {
  const cacheKey = `barbers_${date || 'today'}`;
  if (forceFresh) memoryCache.delete(cacheKey);

  return cachedGet(cacheKey, async () => {
    const params = date ? { date } : {};
    const response = await api.get('/barbers', { params });
    return response.data;
  });
};

export const getAvailableSlots = async (barberId, date, duration = 30) => {
  const response = await api.get('/available-slots', {
    params: {
      barber_id: barberId,
      date,
      duration,
    },
  });
  return response.data;
};

export const getReviews = async (forceFresh = false) => {
  const cacheKey = 'reviews_list';
  if (forceFresh) memoryCache.delete(cacheKey);

  return cachedGet(cacheKey, async () => {
    const response = await api.get('/reviews');
    return response.data;
  });
};

export const getGallery = async (forceFresh = false) => {
  const cacheKey = 'gallery_list';
  if (forceFresh) memoryCache.delete(cacheKey);

  return cachedGet(cacheKey, async () => {
    const response = await api.get('/gallery');
    return response.data;
  });
};

/**
 * =====================================================================
 * AUTHENTICATION ENDPOINTS
 * =====================================================================
 */

export const getGoogleAuthRedirectUrl = async () => {
  const response = await api.get('/auth/google/redirect');
  return response.data;
};

export const loginUser = async ({ email, password }) => {
  const response = await api.post('/login', { email, password });
  return response.data;
};

export const registerUser = async ({ name, email, phone, password, password_confirmation }) => {
  const response = await api.post('/register', {
    name,
    email,
    phone,
    password,
    password_confirmation,
  });
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post('/logout');
  return response.data;
};

export const getUserProfile = async () => {
  const response = await api.get('/me');
  return response.data;
};

export const forgotPassword = async ({ email }) => {
  const response = await api.post('/forgot-password', { email });
  return response.data;
};

/**
 * =====================================================================
 * CLIENT ENDPOINTS (role: client)
 * =====================================================================
 */

export const bookAppointment = async (appointmentData) => {
  const response = await api.post('/appointments', appointmentData);
  return response.data;
};

export const getClientAppointments = async () => {
  const response = await api.get('/client/appointments');
  return response.data;
};

export const getClientAppointmentQueueStatus = async (id) => {
  const response = await api.get(`/client/appointments/${id}/queue-status`);
  return response.data;
};

export const cancelClientAppointment = async (id, reason = '') => {
  const response = await api.patch(`/client/appointments/${id}/cancel`, { reason });
  return response.data;
};

export const rescheduleClientAppointment = async (id, { appointment_date, start_time, barber_id }) => {
  const response = await api.patch(`/client/appointments/${id}/reschedule`, {
    appointment_date,
    start_time,
    barber_id,
  });
  return response.data;
};

export const submitClientReview = async ({ barber_id, rating, comment }) => {
  const response = await api.post('/client/reviews', {
    barber_id,
    rating,
    comment,
  });
  return response.data;
};

export const getClientLoyalty = async () => {
  const response = await api.get('/client/loyalty');
  return response.data;
};

/**
 * =====================================================================
 * EMPLOYÉ / BARBER ENDPOINTS (role: employe | admin)
 * =====================================================================
 */

export const getEmployeeAppointments = async (params = {}) => {
  const response = await api.get('/employee/appointments', { params });
  return response.data;
};

export const updateEmployeeAppointmentStatus = async (id, status) => {
  const response = await api.patch(`/employee/appointments/${id}/status`, { status });
  return response.data;
};

export const getEmployeSchedule = async (date, view = 'day') => {
  const response = await api.get('/employee/schedule', {
    params: { date, view },
  });
  return response.data;
};

export const updateAppointmentStatus = async (id, status, notes = '') => {
  const response = await api.patch(`/employee/appointments/${id}/status`, {
    status,
    notes,
  });
  return response.data;
};

export const updateWorkingHours = async (workingHours) => {
  const response = await api.put('/employee/working-hours', {
    working_hours: workingHours,
  });
  return response.data;
};

/**
 * =====================================================================
 * ADMIN ENDPOINTS (role: admin)
 * =====================================================================
 */

export const getAdminStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};

export const getAdminUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const createAdminUser = async (userData) => {
  const response = await api.post('/admin/users', userData);
  return response.data;
};

export const deleteAdminUser = async (id) => {
  const response = await api.delete(`/admin/users/${id}`);
  return response.data;
};

export const syncUserRoles = async (userId, roles) => {
  const response = await api.post(`/admin/users/${userId}/sync-roles`, { roles });
  return response.data;
};

export const getRolesPermissions = async () => {
  const response = await api.get('/admin/roles-permissions');
  return response.data;
};

export const syncRolePermissions = async (roleId, permissions) => {
  const response = await api.post(`/admin/roles/${roleId}/sync-permissions`, { permissions });
  return response.data;
};

export const getAdminServices = async () => {
  const response = await api.get('/admin/services');
  return response.data;
};

export const createAdminService = async (serviceData) => {
  const response = await api.post('/admin/services', serviceData);
  return response.data;
};

export const updateAdminService = async (id, serviceData) => {
  const response = await api.put(`/admin/services/${id}`, serviceData);
  return response.data;
};

export const deleteAdminService = async (id) => {
  const response = await api.delete(`/admin/services/${id}`);
  return response.data;
};

export const getAdminBarbers = async () => {
  const response = await api.get('/admin/barbers');
  return response.data;
};

export const createAdminBarber = async (barberData) => {
  const response = await api.post('/admin/barbers', barberData);
  return response.data;
};

export const updateAdminBarber = async (id, barberData) => {
  const response = await api.put(`/admin/barbers/${id}`, barberData);
  return response.data;
};

export const deleteAdminBarber = async (id) => {
  const response = await api.delete(`/admin/barbers/${id}`);
  return response.data;
};

export const approveReview = async (id, isApproved = true) => {
  const response = await api.patch(`/admin/reviews/${id}/approve`, {
    is_approved: isApproved,
  });
  return response.data;
};

export const getAdminAppointments = async (params = {}) => {
  const response = await api.get('/admin/appointments', { params });
  return response.data;
};

export const updateAdminAppointmentStatus = async (id, status) => {
  const response = await api.patch(`/admin/appointments/${id}/status`, { status });
  return response.data;
};

export const updateAdminAppointment = async (id, payload) => {
  const response = await api.put(`/admin/appointments/${id}`, payload);
  return response.data;
};
