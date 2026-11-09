import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScissorsIcon } from '../auth/AuthIcons';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import BrandLogo from '../common/BrandLogo';
import LanguageSwitcher from '../common/LanguageSwitcher';

export default function LandingNavbar({
  lang: propLang,
  onToggleLang,
  t: propT,
  onOpenAuth,
  onOpenBooking,
}) {
  const { user, isAuthenticated, logout, defaultDashboard, isAdmin, isEmploye } = useAuth();
  const langContext = useLanguage();
  const lang = propLang || langContext.lang;
  const t = propT || langContext.t;
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
            className="flex items-center cursor-pointer group py-1"
          >
            <BrandLogo className="h-16 sm:h-18" />
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
            {/* Language Switcher (FR / العربية) */}
            <LanguageSwitcher variant="pills" />

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
                    <div className="px-3 py-2 text-gray-400 border-b border-gray-800 text-start">
                      {t.nav.connectedAs} <br />
                      <strong className="text-white truncate block">{user?.email}</strong>
                    </div>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        navigate(defaultDashboard || '/client');
                      }}
                      className="w-full text-start px-3 py-2 text-amber-400 hover:bg-gray-800 font-semibold transition cursor-pointer flex items-center justify-between"
                    >
                      <span>
                        {isAdmin ? t.nav.adminConsole : isEmploye ? t.nav.barberSchedule : t.nav.clientDashboard}
                      </span>
                      <span>→</span>
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenAuth('profile');
                      }}
                      className="w-full text-start px-3 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition cursor-pointer"
                    >
                      {t.nav.myAccount}
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-start px-3 py-2 text-red-400 hover:bg-red-950/30 transition cursor-pointer"
                    >
                      {t.nav.logout}
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
            <LanguageSwitcher variant="toggle" />

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
          <div className="flex justify-center pb-2 border-b border-gray-800/80">
            <LanguageSwitcher variant="pills" className="w-full justify-center py-1" />
          </div>

          <div className="flex flex-col space-y-2 text-sm font-semibold">
            <button
              onClick={() => scrollTo('services')}
              className="text-start text-gray-300 hover:text-amber-400 py-1.5"
            >
              {t.nav.services}
            </button>
            <button
              onClick={() => scrollTo('barbers')}
              className="text-start text-gray-300 hover:text-amber-400 py-1.5"
            >
              {t.nav.barbers}
            </button>
            <button
              onClick={() => scrollTo('lookbook')}
              className="text-start text-gray-300 hover:text-amber-400 py-1.5"
            >
              {t.nav.lookbook}
            </button>
            <button
              onClick={() => scrollTo('testimonials')}
              className="text-start text-gray-300 hover:text-amber-400 py-1.5"
            >
              {t.nav.testimonials}
            </button>
            <button
              onClick={() => scrollTo('contact')}
              className="text-start text-gray-300 hover:text-amber-400 py-1.5"
            >
              {t.nav.contact}
            </button>
          </div>

          <div className="pt-3 border-t border-gray-800 flex flex-col gap-2.5">
            {isAuthenticated ? (
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span>{t.nav.connectedAs} : <strong className="text-white">{user?.name}</strong></span>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="text-red-400 hover:text-red-300 underline cursor-pointer"
                >
                  {t.nav.logout}
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

