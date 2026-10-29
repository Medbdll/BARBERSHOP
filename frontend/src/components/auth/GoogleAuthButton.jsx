import React, { useState } from 'react';

export default function GoogleAuthButton({ text = 'Continuer avec Google', onClick }) {
  const [loading, setLoading] = useState(false);

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert('Simulation OAuth Google: Dans un environnement de production, cette action redirigera vers les serveurs d’authentification sécurisés de Google.');
    }, 600);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full relative flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700/80 hover:border-amber-500/50 text-gray-200 hover:text-white font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-amber-500/10 cursor-pointer group disabled:opacity-50"
    >
      {loading ? (
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
      ) : (
        <svg
          className="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
          viewBox="0 0 24 24"
        >
          <path
            fill="#EA4335"
            d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
          />
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
          />
          <path
            fill="#FBBC05"
            d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-1.9z"
          />
          <path
            fill="#34A853"
            d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
          />
        </svg>
      )}
      <span className="tracking-wide">{text}</span>
    </button>
  );
}

