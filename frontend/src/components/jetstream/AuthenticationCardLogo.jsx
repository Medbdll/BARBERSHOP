import React from 'react';

export default function AuthenticationCardLogo({ onClick }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`flex flex-col items-center select-none ${onClick ? 'cursor-pointer group' : ''}`}
    >
      <div className="relative flex items-center justify-center p-2 rounded-2xl bg-white shadow-sm border border-gray-100 transition-transform duration-200 group-hover:scale-105">
        <svg
          className="w-16 h-16"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Classic Laravel Jetstream logo marks */}
          <path
            d="M11.395 44.428C4.557 40.198 0 32.632 0 24 0 10.745 10.745 0 24 0a23.891 23.891 0 0113.997 4.502c-.2 17.907-11.097 33.245-26.602 39.926z"
            fill="#4F46E5"
          />
          <path
            d="M14.134 45.885A23.914 23.914 0 0024 48c13.255 0 24-10.745 24-24 0-3.516-.756-6.856-2.115-9.866-4.659 15.143-16.608 27.092-31.75 31.751z"
            fill="#6366F1"
          />
        </svg>
      </div>

      <div className="mt-3 text-center">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center justify-center gap-2">
          <span>💈</span>
          <span>Berber Shop</span>
        </h1>
        <p className="text-xs text-gray-500 font-medium mt-0.5 uppercase tracking-wider">
          Laravel Jetstream Auth Style
        </p>
      </div>
    </div>
  );
}

