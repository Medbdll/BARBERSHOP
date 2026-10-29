import React, { useState } from 'react';
import LuxuryLoginForm from './LuxuryLoginForm';
import LuxuryRegisterForm from './LuxuryRegisterForm';
import LuxuryForgotPasswordForm from './LuxuryForgotPasswordForm';
import LuxuryUserProfile from './LuxuryUserProfile';
import { ScissorsIcon, GoldStarIcon } from './AuthIcons';
import { useAuth } from '../../context/useAuth';

export default function LuxurySplitAuth({
  initialMode = 'login',
  onBackToShop,
}) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot-password'

  // If user is already authenticated, strictly pin active mode to 'profile'
  const activeMode = isAuthenticated ? 'profile' : mode;

  const handleSetMode = (targetMode) => {
    if (isAuthenticated) return;
    setMode(targetMode);
  };

  return (
    <div className="min-h-screen w-full bg-[#111827] text-gray-100 flex flex-col lg:flex-row relative overflow-hidden font-sans select-none">
      {/* Background ambient gold glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-600/10 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[128px] pointer-events-none"></div>

      {/* ======================================================== */}
      {/* LEFT COLUMN: Atmospheric Barber Visual & Customer Quote */}
      {/* ======================================================== */}
      <div className="relative w-full lg:w-[48%] xl:w-[45%] min-h-[420px] lg:min-h-screen bg-gray-950 flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-hidden border-b lg:border-b-0 lg:border-r border-gray-800/80">
        {/* Background atmospheric image with dark gold overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity scale-105 transition-transform duration-1000 ease-out hover:scale-100"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1200')`,
          }}
        ></div>

        {/* Gradient dark overlays for rich legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/80 to-[#111827]/90"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(217,119,6,0.18)_0%,transparent_60%)]"></div>

        {/* Top: Brand Logo & Prestige Tag */}
        <div className="relative z-10">
          <div
            onClick={onBackToShop}
            role={onBackToShop ? 'button' : undefined}
            className="inline-flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-600/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-gray-950 rounded-[14px] flex items-center justify-center text-amber-400">
                <ScissorsIcon className="w-6 h-6" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-wider text-white">
                  BERBER SHOP
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
                  PRIVÉ
                </span>
              </div>
              <p className="text-xs text-amber-500/80 tracking-widest uppercase font-medium">
                Maître Barbier & Soins d'Exception
              </p>
            </div>
          </div>
        </div>

        {/* Middle: Brand Narrative & Key Values */}
        <div className="relative z-10 my-8 lg:my-0 space-y-5 max-w-lg">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            <span>✨</span> L'Expérience Masculine par Excellence
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
            L'élégance d'une coupe taillée pour{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600">
              votre signature
            </span>.
          </h1>

          <p className="text-sm text-gray-300/90 leading-relaxed">
            De la taille de barbe au rasoir traditionnel aux rituels de serviette chaude, réservez vos séances avec votre barbier attitré en toute simplicité.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-gray-300">
            <div className="flex items-center gap-2 bg-gray-900/60 p-2.5 rounded-xl border border-gray-800">
              <span className="text-amber-400">⏱</span>
              <span>Rappels SMS 2h avant</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-900/60 p-2.5 rounded-xl border border-gray-800">
              <span className="text-amber-400">⭐</span>
              <span>Barbiers d'Élite Notés 4.9</span>
            </div>
          </div>
        </div>

        {/* Bottom: Luxury Customer Quote Card */}
        <div className="relative z-10">
          <div className="p-4 sm:p-5 rounded-2xl bg-gray-900/80 backdrop-blur-md border border-amber-500/20 shadow-xl shadow-black/40">
            {/* Stars */}
            <div className="flex items-center gap-1 mb-2.5">
              {[...Array(5)].map((_, i) => (
                <GoldStarIcon key={i} className="w-3.5 h-3.5" />
              ))}
              <span className="ml-2 text-[11px] font-bold text-amber-400">Avis Vérifié</span>
            </div>

            {/* Quote text */}
            <p className="text-xs sm:text-sm text-gray-200 italic leading-relaxed">
              « L'art de la précision et le rituel d'antan réunis avec raffinement. Une coupe impeccable, un accueil chaleureux et une ponctualité sans faille grâce aux rappels SMS. »
            </p>

            {/* Author info */}
            <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-white">Alexandre de Montmirail</p>
                <p className="text-[11px] text-gray-400">Client Membre Privilège — Club Barber</p>
              </div>
              <span className="text-[10px] text-amber-500 font-mono tracking-wider">
                PARIS • 2024
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: Clean Dark & Gold Form Card               */}
      {/* ======================================================== */}
      <div className="relative w-full lg:w-[52%] xl:w-[55%] flex flex-col justify-center items-center p-6 sm:p-10 lg:p-14">
        {/* Navigation & View Switcher Bar */}
        <div className="w-full max-w-md flex items-center justify-between mb-8">
          {onBackToShop ? (
            <button
              type="button"
              onClick={onBackToShop}
              className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-amber-400 transition-colors cursor-pointer group"
            >
              <span className="transition-transform group-hover:-translate-x-1">←</span>
              <span>Retour au salon</span>
            </button>
          ) : (
            <div></div>
          )}

          {/* Toggle pill between "Connexion" and "Inscription" */}
          {!isAuthenticated && activeMode !== 'forgot-password' && (
            <div className="inline-flex p-1 rounded-xl bg-gray-950/80 border border-gray-800 shadow-inner">
              <button
                type="button"
                onClick={() => handleSetMode('login')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeMode === 'login'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-gray-950 shadow-md shadow-amber-600/30'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => handleSetMode('register')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeMode === 'register'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-gray-950 shadow-md shadow-amber-600/30'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Inscription
              </button>
            </div>
          )}
        </div>

        {/* The Luxury Card */}
        <div className="w-full max-w-md bg-gray-900/90 rounded-2xl border border-gray-800/90 p-6 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-xl relative">
          {/* Subtle top gold accent line */}
          <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>

          {authLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent mb-3"></div>
              <span className="text-xs uppercase tracking-wider text-amber-500/80 font-semibold">
                Vérification du compte client...
              </span>
            </div>
          ) : isAuthenticated ? (
            <LuxuryUserProfile onBackToShop={onBackToShop} />
          ) : activeMode === 'register' ? (
            <LuxuryRegisterForm
              onSwitchToLogin={() => handleSetMode('login')}
              onSuccess={() => handleSetMode('profile')}
            />
          ) : activeMode === 'forgot-password' ? (
            <LuxuryForgotPasswordForm
              onSwitchToLogin={() => handleSetMode('login')}
            />
          ) : (
            <LuxuryLoginForm
              onSwitchToRegister={() => handleSetMode('register')}
              onSwitchToForgotPassword={() => handleSetMode('forgot-password')}
              onSuccess={() => handleSetMode('profile')}
            />
          )}
        </div>

        {/* Security & Confidentiality Footer Note */}
        <div className="w-full max-w-md mt-6 text-center text-[11px] text-gray-500 flex items-center justify-center gap-1.5">
          <span>🔒</span>
          <span>Données chiffrées & réservations protégées par Sanctum API.</span>
        </div>
      </div>
    </div>
  );
}
