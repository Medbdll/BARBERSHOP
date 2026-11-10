import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AuthContext } from './AuthContextInstance';
import { getUserProfile, loginUser, registerUser, logoutUser } from '../api/barberApi';
import {
  isClientSessionExpired,
  recordClientActivity,
  clearClientSession,
  LAST_ACTIVITY_KEY,
  SESSION_EXPIRED_KEY,
} from '../api/axios';

export function AuthProvider({ children }) {
  // Pre-flight check on initial page load / app mount:
  // If the user left or was inactive for > 30 minutes, immediately terminate session
  if (typeof window !== 'undefined' && isClientSessionExpired()) {
    clearClientSession(true);
  }

  // Synchronously initialize token and user from localStorage so there is zero flicker on refresh
  const [token, setToken] = useState(() => {
    try {
      if (isClientSessionExpired()) return null;
      return localStorage.getItem('token') || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      if (isClientSessionExpired()) return null;
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [sessionExpired, setSessionExpired] = useState(() => {
    try {
      return localStorage.getItem(SESSION_EXPIRED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [loading, setLoading] = useState(() => {
    return !!localStorage.getItem('token') && !isClientSessionExpired();
  });

  const clearSessionExpired = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_EXPIRED_KEY);
    } catch {
      // Ignore
    }
    setSessionExpired(false);
  }, []);

  const killSession = useCallback(async (isExpired = true) => {
    try {
      await logoutUser();
    } catch {
      // Ignore network errors when forcing logout
    } finally {
      clearClientSession(isExpired);
      setToken(null);
      setUser(null);
      if (isExpired) {
        setSessionExpired(true);
      }
    }
  }, []);

  // Background verification: re-verify with backend without wiping out cached session unless 401 Unauthorized
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken || isClientSessionExpired()) {
        if (storedToken && isClientSessionExpired()) {
          clearClientSession(true);
          if (isMounted) setSessionExpired(true);
        }
        if (isMounted) {
          setToken(null);
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await getUserProfile();
        const profile = res?.data || res;
        if (isMounted) {
          const userObj = {
            ...profile,
            roles: profile.roles || res?.roles || [],
            permissions: profile.permissions || res?.permissions || [],
          };
          setUser(userObj);
          localStorage.setItem('user', JSON.stringify(userObj));
          recordClientActivity();
        }
      } catch (err) {
        // ONLY clear credentials if server explicitly returned 401 Unauthorized
        if (err.response?.status === 401) {
          console.warn('Session expired or token invalid (401). Clearing stored credentials.');
          const isTimeout = err.response?.data?.session_expired || isClientSessionExpired();
          clearClientSession(isTimeout);
          if (isMounted) {
            setToken(null);
            setUser(null);
            if (isTimeout) setSessionExpired(true);
          }
        } else {
          // If offline / network error / timeout, keep cached user so page refresh doesn't log them out
          console.warn('Could not re-verify profile with server, keeping cached session:', err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Inactivity timeout & leave detection (30 minutes)
  useEffect(() => {
    if (!token) return;

    // Stamp current activity on mount
    recordClientActivity();

    // Throttle activity updates so we do not spam localStorage on continuous mousemove/scroll
    let lastThrottledTime = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastThrottledTime > 10000) {
        lastThrottledTime = now;
        recordClientActivity();
      }
    };

    // When the user leaves tab / switches app / minimizes browser
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User left tab or minimized: stamp exact departure time
        recordClientActivity();
      } else if (document.visibilityState === 'visible') {
        // User returned to tab: check if 30+ minutes elapsed while away
        if (isClientSessionExpired()) {
          console.warn('[Session Expiry] Returned after 30+ minutes of inactivity/leaving. Killing session.');
          killSession(true);
        } else {
          recordClientActivity();
        }
      }
    };

    // When window regains focus
    const handleFocus = () => {
      if (isClientSessionExpired()) {
        console.warn('[Session Expiry] Window focused after 30+ minutes of inactivity. Killing session.');
        killSession(true);
      } else {
        recordClientActivity();
      }
    };

    // Periodic heartbeat: check every 15 seconds if tab is idle for >= 30 minutes
    const intervalId = setInterval(() => {
      if (isClientSessionExpired()) {
        console.warn('[Session Expiry] 30 minutes inactivity limit reached. Killing session.');
        killSession(true);
      }
    }, 15000);

    const userEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    userEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      userEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [token, killSession]);

  // Global cross-tab synchronization and custom session-expired event listener
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'token' && !e.newValue) {
        setToken(null);
        setUser(null);
      } else if (e.key === SESSION_EXPIRED_KEY) {
        if (e.newValue === 'true') {
          setToken(null);
          setUser(null);
          setSessionExpired(true);
        } else if (!e.newValue) {
          setSessionExpired(false);
        }
      }
    };

    const handleSessionExpiredEvent = () => {
      setToken(null);
      setUser(null);
      setSessionExpired(true);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('auth:session-expired', handleSessionExpiredEvent);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('auth:session-expired', handleSessionExpiredEvent);
    };
  }, []);

  const login = async (credentials) => {
    const data = await loginUser(credentials);
    if (data?.token && data?.user) {
      const userObj = {
        ...data.user,
        roles: data.user.roles || data.roles || [],
        permissions: data.user.permissions || data.permissions || [],
      };
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userObj));
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      localStorage.removeItem(SESSION_EXPIRED_KEY);

      setToken(data.token);
      setUser(userObj);
      setSessionExpired(false);
      return { ...data, user: userObj };
    }
    return data;
  };

  const register = async (userData) => {
    const data = await registerUser(userData);
    if (data?.token && data?.user) {
      const userObj = {
        ...data.user,
        roles: data.user.roles || data.roles || ['client'],
        permissions: data.user.permissions || data.permissions || [],
      };
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userObj));
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      localStorage.removeItem(SESSION_EXPIRED_KEY);

      setToken(data.token);
      setUser(userObj);
      setSessionExpired(false);
      return { ...data, user: userObj };
    }
    return data;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn('Logout network error (clearing local session anyway):', err);
    } finally {
      clearClientSession(false);
      setToken(null);
      setUser(null);
      setSessionExpired(false);
    }
  };

  const roles = useMemo(() => {
    if (!user) return [];
    if (Array.isArray(user.roles)) {
      return user.roles.map((r) => (typeof r === 'string' ? r : r.name));
    }
    return [];
  }, [user]);

  const permissions = useMemo(() => {
    if (!user) return [];
    if (Array.isArray(user.permissions)) {
      return user.permissions.map((p) => (typeof p === 'string' ? p : p.name));
    }
    return [];
  }, [user]);

  const hasRole = (role) => {
    if (Array.isArray(role)) {
      return role.some((r) => roles.includes(r));
    }
    return roles.includes(role);
  };

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const isAdmin = roles.includes('admin');
  const isEmploye = roles.includes('employe');
  const isClient = roles.includes('client');

  const defaultDashboard = useMemo(() => {
    if (isAdmin) return '/admin';
    if (isEmploye) return '/employe';
    if (isClient) return '/client';
    return '/';
  }, [isAdmin, isEmploye, isClient]);

  // User is authenticated if token exists AND user object is present
  const isAuthenticated = !!(token && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        roles,
        permissions,
        hasRole,
        hasPermission,
        isAdmin,
        isEmploye,
        isClient,
        defaultDashboard,
        isAuthenticated,
        loading,
        sessionExpired,
        clearSessionExpired,
        killSession,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
