import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import BrandLogo from '../common/BrandLogo';
import LanguageSwitcher from '../common/LanguageSwitcher';

export default function DashboardLayout({ title, subtitle, children, navItems = [] }) {
  const { user, logout, isAdmin, isEmploye, isClient } = useAuth();
  const { t, lang, dir } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const getRoleBadge = () => {
    if (isAdmin) {
      return (
        <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
          Super Admin
        </span>
      );
    }
    if (isEmploye) {
      return (
        <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
          Barbier Expert
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        Client Privilège
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#111827] text-gray-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#111827]/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Back to Shop */}
            <div className="flex items-center gap-4">
              <Link
                to={isAdmin ? '/admin' : isEmploye ? '/employe' : '/'}
                className="flex items-center gap-2 group py-1"
              >
                <BrandLogo className="h-12 sm:h-13" />
                <span className="hidden sm:inline-block text-[10px] text-amber-500/80 tracking-widest uppercase font-semibold pl-2 border-l border-gray-800">
                  {isAdmin
                    ? (lang === 'ar' ? 'لوحة تحكم المدير' : 'Manager Suite')
                    : isEmploye
                    ? (lang === 'ar' ? 'فضاء الحلاق' : 'Barbier Pro')
                    : (lang === 'ar' ? 'فضاء الزبون VIP' : 'Espace VIP')}
                </span>
              </Link>

              {/* Show "Site public" link ONLY for clients */}
              {isClient && (
                <>
                  <span className="text-gray-700 hidden sm:inline">|</span>
                  <Link
                    to="/"
                    className="hidden sm:inline-flex items-center text-xs text-gray-400 hover:text-amber-400 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    {lang === 'ar' ? 'الموقع الرئيسي' : 'Site public'}
                  </Link>
                </>
              )}
            </div>

            {/* User Profile & Actions */}
            <div className="flex items-center gap-3">
              {/* Language Switcher */}
              <LanguageSwitcher variant="toggle" className="hidden sm:inline-flex" />

              {/* Role badge */}
              <div className="hidden md:block">
                {getRoleBadge()}
              </div>

              {/* Loyalty points for client */}
              {isClient && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
                  <svg className="w-3.5 h-3.5 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>{user?.loyalty_points ?? 0} {t.common?.points || 'pts'}</span>
                </div>
              )}

              {/* User details */}
              <div className="flex items-center gap-2 pl-2">
                <img
                  src={user?.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&color=D97706&background=1F2937`}
                  alt={user?.name || 'Profil'}
                  loading="lazy"
                  decoding="async"
                  className="w-8 h-8 rounded-full border border-amber-500/40 object-cover"
                />
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-medium text-gray-200">{user?.name}</div>
                  <div className="text-[10px] text-gray-400 truncate max-w-[130px]">{user?.email}</div>
                </div>
              </div>

              {/* Logout button */}
              <button
                type="button"
                onClick={handleLogout}
                className="ml-2 p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                title={t.nav.logout}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sub-navigation bar for active portal */}
      {navItems.length > 0 && (
        <div className="bg-[#161F30] border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-2 ${
                      isActive
                        ? 'bg-[#D97706] text-white shadow-md shadow-amber-900/30'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="ml-1.5 px-1.5 py-0.2 text-[10px] rounded-full bg-black/40 text-amber-200">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(title || subtitle) && (
          <div className="mb-8">
            {title && (
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {children}
      </main>

      {/* Footer copyright */}
      <footer className="border-t border-gray-800/80 py-4 text-center text-xs text-gray-500">
        Atelier Royal Barber — Plateforme de Gestion Haute Précision &copy; 2026
      </footer>
    </div>
  );
}
