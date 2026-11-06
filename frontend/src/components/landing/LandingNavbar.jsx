import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScissorsIcon } from '../auth/AuthIcons';
import { useAuth } from '../../context/useAuth';

export default function LandingNavbar({
  lang = 'fr',
  onToggleLang,
  t,
  onOpenAuth,
  onOpenBooking,
}) {
  const { user, isAuthenticated, logout, defaultDashboard, isAdmin, isEmploye } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'VIP';

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#111827]/90 backdrop-blur-md border-b border-gray-800/80 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-md shadow-amber-600/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-gray-950 rounded-[10px] flex items-center justify-center text-amber-400">
                <ScissorsIcon className="w-5 h-5" />
              </div>
            </div>

            <div className="text-left">
              <span className="font-extrabold text-base sm:text-lg tracking-wider text-white flex items-center gap-1.5">
                BERBER SHOP
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  PRIVÉ
                </span>
              </span>
              <p className="text-[10px] text-amber-500/80 uppercase tracking-widest font-medium">
                Maison de Barbier • Casablanca
              </p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center space-x-7">
            <button
              onClick={() => scrollTo('services')}
              className="text-xs font-semibold uppercase tracking-wider text-gray-300 hover:text-amber-400 transition-colors cursor-pointer"
            >
              {t.nav.services}
            </button>
            <button
              onClick={() => scrollTo('barbers')}
              className="text-xs font-semibold uppercase tracking-wider text-gray-300 hover:text-amber-400 transition-colors cursor-pointer"
            >
              {t.nav.barbers}
            </button>
            <button
              onClick={() => scrollTo('lookbook')}
              className="text-xs font-semibold uppercase tracking-wider text-gray-300 hover:text-amber-400 transition-colors cursor-pointer"
            >
              {t.nav.lookbook}
            </button>
            <button
              onClick={() => scrollTo('testimonials')}
              className="text-xs font-semibold uppercase tracking-wider text-gray-300 hover:text-amber-400 transition-colors cursor-pointer"
            >
              {t.nav.testimonials}
            </button>
            <button
              onClick={() => scrollTo('contact')}
              className="text-xs font-semibold uppercase tracking-wider text-gray-300 hover:text-amber-400 transition-colors cursor-pointer"
            >
              {t.nav.contact}
            </button>
          </div>

          {/* Right Action Controls: Lang Switcher, Auth & Booking */}
          <div className="hidden sm:flex items-center gap-3.5">
            {/* Language Switcher (FR / AR) */}
            <div className="flex items-center p-0.5 rounded-lg bg-gray-950/80 border border-gray-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => onToggleLang('fr')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  lang === 'fr'
                    ? 'bg-amber-500 text-gray-950 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => onToggleLang('ar')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  lang === 'ar'
                    ? 'bg-amber-500 text-gray-950 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                AR
              </button>
            </div>

            {/* Auth Buttons */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-gray-900 border border-gray-800 hover:border-amber-500/50 transition cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 text-gray-950 font-bold text-xs flex items-center justify-center">
                    {initials}
                  </div>
                  <span className="text-xs font-semibold text-gray-200 pr-1 max-w-[120px] truncate">
                    {user?.name}
                  </span>
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-xl bg-gray-900 border border-gray-800 shadow-2xl py-1 z-50 text-xs">
                    <div className="px-3 py-2 text-gray-400 border-b border-gray-800">
                      Connecté en tant que <br />
                      <strong className="text-white truncate block">{user?.email}</strong>
                    </div>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        navigate(defaultDashboard || '/client');
                      }}
                      className="w-full text-left px-3 py-2 text-amber-400 hover:bg-gray-800 font-semibold transition cursor-pointer flex items-center justify-between"
                    >
                      <span>{isAdmin ? 'Console Admin' : isEmploye ? 'Planning Barbier' : 'Espace Réservations'}</span>
                      <span>→</span>
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenAuth('profile');
                      }}
                      className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition cursor-pointer"
                    >
                      {t.nav.myAccount}
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-950/30 transition cursor-pointer"
                    >
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="text-xs font-semibold text-gray-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-gray-800/60 transition cursor-pointer"
                >
                  {t.nav.login}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/10 transition cursor-pointer"
                >
                  {t.nav.signup}
                </button>
              </div>
            )}

            {/* Gold CTA: Prendre RDV */}
            <button
              type="button"
              onClick={onOpenBooking}
              className="py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 active:scale-[0.98] transition-all shadow-lg shadow-amber-600/25 flex items-center gap-1.5 cursor-pointer"
            >
              <span>✂️</span>
              <span>{t.nav.bookBtn}</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 sm:hidden">
            {/* Lang switcher on mobile */}
            <button
              onClick={() => onToggleLang(lang === 'fr' ? 'ar' : 'fr')}
              className="text-xs font-bold px-2 py-1 bg-gray-900 border border-gray-800 text-amber-400 rounded-lg"
            >
              {lang === 'fr' ? 'AR' : 'FR'}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-400 hover:text-white focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-gray-950/95 border-b border-gray-800 px-4 pt-3 pb-5 space-y-3">
          <div className="flex flex-col space-y-2 text-sm font-semibold">
            <button
              onClick={() => scrollTo('services')}
              className="text-left text-gray-300 hover:text-amber-400 py-1.5"
            >
              {t.nav.services}
            </button>
            <button
              onClick={() => scrollTo('barbers')}
              className="text-left text-gray-300 hover:text-amber-400 py-1.5"
            >
              {t.nav.barbers}
            </button>
            <button
              onClick={() => scrollTo('lookbook')}
              className="text-left text-gray-300 hover:text-amber-400 py-1.5"
            >
              {t.nav.lookbook}
            </button>
            <button
              onClick={() => scrollTo('testimonials')}
              className="text-left text-gray-300 hover:text-amber-400 py-1.5"
            >
              {t.nav.testimonials}
            </button>
            <button
              onClick={() => scrollTo('contact')}
              className="text-left text-gray-300 hover:text-amber-400 py-1.5"
            >
              {t.nav.contact}
            </button>
          </div>

          <div className="pt-3 border-t border-gray-800 flex flex-col gap-2.5">
            {isAuthenticated ? (
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span>Connecté : {user?.name}</span>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="text-red-400 underline"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="py-2.5 px-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-200"
                >
                  {t.nav.login}
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('register');
                  }}
                  className="py-2.5 px-3 bg-gray-900 border border-amber-500/40 text-amber-400 rounded-xl"
                >
                  {t.nav.signup}
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
              className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 to-amber-600 shadow-md text-center"
            >
              {t.nav.bookBtn}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

