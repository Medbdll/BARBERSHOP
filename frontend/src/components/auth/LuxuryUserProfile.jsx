import React, { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { UserIcon, MailIcon, PhoneIcon } from './AuthIcons';

export default function LuxuryUserProfile({ onBackToShop }) {
  const { user, token, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'VIP';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* VIP Badge Header */}
      <div className="flex items-center justify-between pb-5 border-b border-gray-800">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            Espace Membre Privilège
          </span>
          <h2 className="text-xl font-bold text-white mt-2">Votre Compte Client</h2>
        </div>
        <div className="w-12 h-12 rounded-full border-2 border-amber-500 bg-gradient-to-tr from-amber-600 to-amber-400 text-gray-950 font-black text-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
          {initials}
        </div>
      </div>

      {/* User Info Details */}
      <div className="space-y-3 bg-gray-950/60 p-4 rounded-xl border border-gray-800 text-xs">
        <div className="flex items-center gap-3 text-gray-300">
          <UserIcon className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-gray-400">Nom:</span>
          <span className="font-semibold text-white ml-auto">{user?.name}</span>
        </div>

        <div className="flex items-center gap-3 text-gray-300">
          <MailIcon className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-gray-400">E-mail:</span>
          <span className="font-semibold text-white ml-auto">{user?.email}</span>
        </div>

        {user?.phone && (
          <div className="flex items-center gap-3 text-gray-300">
            <PhoneIcon className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-gray-400">SMS Reminders:</span>
            <span className="font-semibold text-white ml-auto">{user.phone}</span>
          </div>
        )}

        <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Session Sanctum Active
          </span>
          <span className="font-mono text-gray-500">
            {token ? `Bearer ${token.substring(0, 16)}...` : 'Session Actif'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {onBackToShop && (
          <button
            type="button"
            onClick={onBackToShop}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 transition shadow-md shadow-amber-500/20 cursor-pointer text-center"
          >
            ← Consulter les Services
          </button>
        )}

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="py-3 px-4 rounded-xl font-semibold text-xs uppercase tracking-wider text-red-400 hover:text-white bg-red-950/30 hover:bg-red-900/60 border border-red-500/30 transition cursor-pointer text-center disabled:opacity-50"
        >
          {loggingOut ? 'Déconnexion...' : 'Se déconnecter'}
        </button>
      </div>
    </div>
  );
}

