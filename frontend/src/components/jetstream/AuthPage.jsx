import React, { useState } from 'react';
import AuthenticationCard from './AuthenticationCard';
import AuthenticationCardLogo from './AuthenticationCardLogo';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import UserProfileCard from './UserProfileCard';
import { useAuth } from '../../context/useAuth';

export default function AuthPage({
  initialMode = 'login',
  onBackToShop,
}) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [mode, setMode] = useState(initialMode);

  // Derive active mode directly: authenticated users are strictly pinned to 'profile'
  const activeMode = isAuthenticated ? 'profile' : mode;

  // Protected Mode Setter: Blocks authenticated users from navigating to signup/login/reset
  const handleSetMode = (targetMode) => {
    if (isAuthenticated) {
      return;
    }
    setMode(targetMode);
  };

  // While verifying authentication state on initial load, show a clean Jetstream loader
  if (authLoading) {
    return (
      <div className="relative">
        <AuthenticationCard logo={<AuthenticationCardLogo onClick={onBackToShop} />}>
          <div className="flex flex-col items-center justify-center py-10 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mb-3"></div>
            <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">
              Verifying session...
            </span>
          </div>
        </AuthenticationCard>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Return button at top left */}
      {onBackToShop && (
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={onBackToShop}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 hover:text-gray-900 text-xs font-semibold rounded-md shadow-sm border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
          >
            ← Barber Catalog
          </button>
        </div>
      )}

      {/* Mode Switch Pills at top right */}
      <div className="absolute top-4 right-4 z-10 hidden sm:flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm text-xs font-medium">
        {!isAuthenticated ? (
          <>
            <button
              onClick={() => handleSetMode('login')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                activeMode === 'login'
                  ? 'bg-gray-800 text-white font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Log in
            </button>
            <button
              onClick={() => handleSetMode('register')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                activeMode === 'register'
                  ? 'bg-gray-800 text-white font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Register
            </button>
            <button
              onClick={() => handleSetMode('forgot-password')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                activeMode === 'forgot-password'
                  ? 'bg-gray-800 text-white font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Reset
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-md font-semibold text-xs border border-indigo-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Logged in as {user?.name || 'User'}</span>
          </div>
        )}
      </div>

      <AuthenticationCard
        logo={<AuthenticationCardLogo onClick={onBackToShop} />}
      >
        {/* Strict Guard: If logged in, ALWAYS render UserProfileCard and prevent viewing signup/login */}
        {isAuthenticated ? (
          <div>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800 flex items-center justify-between">
              <span>ℹ️ You are already logged in as <strong>{user?.name}</strong>.</span>
            </div>
            <UserProfileCard onBackToShop={onBackToShop} />
          </div>
        ) : activeMode === 'register' ? (
          <RegisterForm
            onSwitchToLogin={() => handleSetMode('login')}
            onSuccess={() => handleSetMode('profile')}
          />
        ) : activeMode === 'forgot-password' ? (
          <ForgotPasswordForm
            onSwitchToLogin={() => handleSetMode('login')}
          />
        ) : (
          <LoginForm
            onSwitchToRegister={() => handleSetMode('register')}
            onSwitchToForgotPassword={() => handleSetMode('forgot-password')}
            onSuccess={() => handleSetMode('profile')}
          />
        )}
      </AuthenticationCard>
    </div>
  );
}
