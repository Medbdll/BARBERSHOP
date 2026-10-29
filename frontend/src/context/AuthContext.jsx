import React, { useState, useEffect } from 'react';
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
        const profile = await getUserProfile();
        if (isMounted) {
          setUser(profile);
          localStorage.setItem('user', JSON.stringify(profile));
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
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const register = async (userData) => {
    const data = await registerUser(userData);
    if (data?.token && data?.user) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
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

  // User is authenticated if token exists AND user object is present (restored immediately from localStorage)
  const isAuthenticated = !!(token && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
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
