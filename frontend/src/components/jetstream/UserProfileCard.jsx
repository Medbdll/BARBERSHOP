import React, { useState } from 'react';
import DangerButton from './DangerButton';
import SecondaryButton from './SecondaryButton';
import { useAuth } from '../../context/useAuth';

export default function UserProfileCard({ onBackToShop }) {
  const { user, token, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
  };

  if (!user) {
    return null;
  }

  // Generate initials for avatar fallback
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
        {user.profile_photo_url ? (
          <img
            src={user.profile_photo_url}
            alt={user.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 shadow"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow">
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900 truncate">{user.name}</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
              Active
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Member since {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Today'}
          </p>
        </div>
      </div>

      {/* Jetstream Sanctum Token Info Card */}
      <div className="bg-gray-50 rounded-lg p-3.5 border border-gray-200/80 text-left">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Laravel Sanctum Session
          </span>
          <span className="text-indigo-600 font-mono">auth:sanctum</span>
        </div>
        <div className="text-xs text-gray-500 font-mono break-all bg-white p-2 rounded border border-gray-200 mt-1">
          {token ? `Bearer ${token.substring(0, 24)}...` : 'Session Cookie Auth'}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        {onBackToShop && (
          <SecondaryButton onClick={onBackToShop}>
            ← Back to Shop
          </SecondaryButton>
        )}

        <DangerButton
          onClick={handleLogout}
          processing={loggingOut}
          className="ms-auto"
        >
          Log Out
        </DangerButton>
      </div>
    </div>
  );
}
