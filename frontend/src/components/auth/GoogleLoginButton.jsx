import React, { useState } from 'react';
import api from '../../api/axios';

export default function GoogleLoginButton({
  text = 'Continuer avec Google',
  onError,
  className = '',
}) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Call GET /api/auth/google/redirect to get Google OAuth consent screen URL
      const response = await api.get('/auth/google/redirect');
      const targetUrl = response.data?.url;

      if (targetUrl) {
        // Redirect browser to Google OAuth consent screen
        window.location.href = targetUrl;
      } else {
        throw new Error("L'URL de redirection Google est introuvable.");
      }
    } catch (err) {
      console.error('Google OAuth redirect error:', err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Impossible de contacter le service Google OAuth.';
      if (onError) {
        onError(errorMessage);
      } else {
        alert(errorMessage);
      }
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={loading}
      className={`w-full relative flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-gray-800/90 hover:bg-gray-800 border border-gray-700/80 hover:border-amber-500/50 text-gray-200 hover:text-white font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin h-5 w-5 text-amber-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span className="text-gray-300">Connexion à Google...</span>
        </>
      ) : (
        <>
          {/* Authentic Google Multi-Color SVG Icon */}
          <svg
            className="w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0"
            viewBox="0 0 24 24"
          >
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
          <span className="tracking-wide">{text}</span>
        </>
      )}
    </button>
  );
}

