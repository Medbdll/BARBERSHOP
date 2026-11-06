import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { UserIcon, MailIcon, PhoneIcon } from './AuthIcons';

export default function LuxuryUserProfile({ onBackToShop }) {
  const { user, token, logout, roles, defaultDashboard, isAdmin, isEmploye } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    navigate('/login', { replace: true });
  };

  const handleGoToDashboard = () => {
    navigate(defaultDashboard || '/');
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'VIP';

  const getDashboardLabel = () => {
    if (isAdmin) return 'Accéder au Panneau Super Admin →';
    if (isEmploye) return 'Accéder à mon Espace Barbier →';
    return 'Accéder à mon Espace Réservations →';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* VIP Badge Header */}
      <div className="flex items-center justify-between pb-5 border-b border-gray-800">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            {isAdmin ? 'Super Administrateur' : isEmploye ? 'Maître Barbier' : 'Membre Privilège'}
          </span>
          <h2 className="text-xl font-bold text-white mt-2">Votre Compte Atelier Royal</h2>
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

        <div className="flex items-center gap-3 text-gray-300">
          <span className="text-amber-500 font-bold shrink-0">★</span>
          <span className="text-gray-400">Rôles Spatie:</span>
          <div className="ml-auto flex gap-1">
            {roles.map((r) => (
              <span
                key={r}
                className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/20 text-amber-400"
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        {user?.loyalty_points !== undefined && (
          <div className="flex items-center gap-3 text-gray-300">
            <span className="text-amber-400 font-bold shrink-0">💎</span>
            <span className="text-gray-400">Solde Fidélité:</span>
            <span className="font-bold text-amber-400 ml-auto font-mono">
              {user.loyalty_points} Points
            </span>
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

      {/* Main Dashboard CTA */}
      <button
        type="button"
        onClick={handleGoToDashboard}
        className="w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 transition shadow-lg shadow-amber-600/30 cursor-pointer text-center"
      >
        {getDashboardLabel()}
      </button>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        {onBackToShop && (
          <button
            type="button"
            onClick={onBackToShop}
            className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs uppercase tracking-wider text-gray-300 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-800 transition cursor-pointer text-center"
          >
            ← Site Public
          </button>
        )}

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="py-2.5 px-4 rounded-xl font-semibold text-xs uppercase tracking-wider text-red-400 hover:text-white bg-red-950/30 hover:bg-red-900/60 border border-red-500/30 transition cursor-pointer text-center disabled:opacity-50"
        >
          {loggingOut ? 'Déconnexion...' : 'Se déconnecter'}
        </button>
      </div>
    </div>
  );
}
