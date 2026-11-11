import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/useAuth';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, fetchUser } = useAuth();
  const [statusMessage, setStatusMessage] = useState('Finalisation de la connexion Google...');

  useEffect(() => {
    let isCancelled = false;

    const handleCallback = async () => {
      const errorParam = searchParams.get('error');
      const token = searchParams.get('token');

      // 1. Handle error returned by Google or backend
      if (errorParam) {
        console.error('Google OAuth Error received:', errorParam);
        navigate(`/login?error=${encodeURIComponent(errorParam)}`, { replace: true });
        return;
      }

      // 2. Validate token presence
      if (!token) {
        console.error('No token found in Google OAuth callback query');
        navigate(
          `/login?error=${encodeURIComponent("Jeton d'authentification Google manquant ou invalide.")}`,
          { replace: true }
        );
        return;
      }

      try {
        setStatusMessage('Vérification de vos privilèges...');

        // 1. setToken(token) updates both localStorage and React context state immediately
        setToken(token);

        // Explicitly update Axios default headers for immediate subsequent calls
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // 2. Await fetchUser() (GET /api/me) to populate user in AuthContext BEFORE calling navigate()
        const userObj = await fetchUser(token);

        if (isCancelled) return;

        if (!userObj) {
          throw new Error('Impossible de synchroniser le profil utilisateur.');
        }

        // Check if user is marked as blocked
        if (userObj.status === 'blocked') {
          setToken(null);
          navigate(
            `/login?error=${encodeURIComponent('Votre compte client a été suspendu ou bloqué.')}`,
            { replace: true }
          );
          return;
        }

        const roles = Array.isArray(userObj?.roles)
          ? userObj.roles.map((r) => (typeof r === 'string' ? r : r.name))
          : [];

        // 3. Check if there is a draft booking waiting in sessionStorage
        let hasPendingBooking = false;
        try {
          hasPendingBooking = !!sessionStorage.getItem('pending_booking');
        } catch {
          // Ignore storage read errors
        }

        if (hasPendingBooking) {
          navigate('/client/dashboard?booking=restore', { replace: true });
          return;
        }

        // 4. Role-based redirection:
        // admin -> /admin
        // employe -> /employe
        // client -> /client/dashboard
        if (roles.includes('admin')) {
          navigate('/admin', { replace: true });
        } else if (roles.includes('employe')) {
          navigate('/employe', { replace: true });
        } else {
          navigate('/client/dashboard', { replace: true });
        }
      } catch (err) {
        console.error('Failed to authenticate Google user:', err);
        setToken(null);

        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          'Une erreur est survenue lors de la synchronisation de votre profil Google.';

        navigate(`/login?error=${encodeURIComponent(errorMsg)}`, { replace: true });
      }
    };

    handleCallback();

    return () => {
      isCancelled = true;
    };
  }, [searchParams, navigate, setToken, fetchUser]);

  return (
    <div className="min-h-screen bg-[#0F141C] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-gray-900/90 border border-gray-800 shadow-2xl backdrop-blur-xl relative">
        <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>

        {/* Pulsing Gold Indicator */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-ping"></div>
          <div className="absolute inset-0 rounded-full border-2 border-t-amber-500 border-r-amber-500/40 border-b-transparent border-l-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Google G Logo icon */}
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </div>
        </div>

        <h3 className="text-lg font-serif font-bold text-white mb-2 tracking-wide">
          Authentification Google
        </h3>
        <p className="text-xs text-amber-400 font-medium tracking-wide">
          {statusMessage}
        </p>
      </div>
    </div>
  );
}

