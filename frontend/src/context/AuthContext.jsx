import React, { useState, useEffect, useMemo } from 'react';
import { AuthContext } from './AuthContextInstance';
import { getUserProfile, loginUser, registerUser, logoutUser } from '../api/barberApi';

export function AuthProvider({ children }) {
  // Synchronously initialize token and user from localStorage so there is zero flicker on refresh
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('token') || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(() => {
    return !!localStorage.getItem('token');
  });

  // Background verification: re-verify with backend without wiping out cached session unless 401 Unauthorized
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        if (isMounted) {
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
        }
      } catch (err) {
        // ONLY clear credentials if server explicitly returned 401 Unauthorized
        if (err.response?.status === 401) {
          console.warn('Session expired or token invalid (401). Clearing stored credentials.');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (isMounted) {
            setToken(null);
            setUser(null);
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
      setToken(data.token);
      setUser(userObj);
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
      setToken(data.token);
      setUser(userObj);
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
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
