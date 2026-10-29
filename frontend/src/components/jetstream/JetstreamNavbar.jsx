import React, { useState } from 'react';
import { useAuth } from '../../context/useAuth';

export default function JetstreamNavbar({
  currentView,
  onNavigate,
  onOpenAuth,
}) {
  const { user, isAuthenticated, loading, token, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left section: Logo & Nav Links */}
          <div className="flex">
            {/* Logo */}
            <div
              className="shrink-0 flex items-center cursor-pointer gap-2"
              onClick={() => onNavigate('shop')}
            >
              <svg
                className="block h-9 w-auto text-indigo-600"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.395 44.428C4.557 40.198 0 32.632 0 24 0 10.745 10.745 0 24 0a23.891 23.891 0 0113.997 4.502c-.2 17.907-11.097 33.245-26.602 39.926z"
                  fill="#4F46E5"
                />
                <path
                  d="M14.134 45.885A23.914 23.914 0 0024 48c13.255 0 24-10.745 24-24 0-3.516-.756-6.856-2.115-9.866-4.659 15.143-16.608 27.092-31.75 31.751z"
                  fill="#6366F1"
                />
              </svg>
              <span className="font-bold text-gray-900 text-lg tracking-tight flex items-center gap-1.5">
                <span>💈</span> Berber Shop
              </span>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition cursor-pointer ${
                  currentView === 'shop'
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Services & Barbers
              </button>

              <button
                type="button"
                onClick={() => onOpenAuth(isAuthenticated ? 'profile' : 'login')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition cursor-pointer ${
                  currentView === 'auth'
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {isAuthenticated ? 'My Account' : (loading && token ? 'Verifying...' : 'Jetstream Auth')}
              </button>
            </div>
          </div>

          {/* Right section: Authentication / Profile */}
          <div className="hidden sm:flex sm:items-center sm:ms-6">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none p-1.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
                >
                  {user?.profile_photo_url ? (
                    <img
                      className="h-8 w-8 rounded-full object-cover border border-indigo-500"
                      src={user.profile_photo_url}
                      alt={user.name}
                    />
                  ) : (
                    <span className="h-8 w-8 rounded-full bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center">
                      {initials}
                    </span>
                  )}
                  <span className="font-semibold text-gray-800">{user?.name}</span>
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="px-4 py-2 text-xs text-gray-400">
                      Manage Account
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenAuth('profile');
                      }}
                      className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                      Profile & Tokens
                    </button>
                    <div className="border-t border-gray-100"></div>
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : loading && token ? (
              <div className="flex items-center gap-2 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                <div className="h-4 w-16 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-50 transition cursor-pointer"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="text-xs font-semibold uppercase tracking-wider text-white bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-md shadow-sm transition cursor-pointer"
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu hamburger */}
          <div className="-me-2 flex items-center sm:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
            >
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile responsive menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-200 pt-2 pb-3 space-y-1 bg-white px-4">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('shop');
            }}
            className={`w-full text-left block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
              currentView === 'shop'
                ? 'border-indigo-500 text-indigo-700 bg-indigo-50 font-semibold'
                : 'border-transparent text-gray-600 hover:bg-gray-50'
            }`}
          >
            Services & Barbers
          </button>

          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('profile');
                }}
                className={`w-full text-left block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  currentView === 'auth'
                    ? 'border-indigo-500 text-indigo-700 bg-indigo-50 font-semibold'
                    : 'border-transparent text-gray-600 hover:bg-gray-50'
                }`}
              >
                Profile ({user?.name})
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full text-left block pl-3 pr-4 py-2 text-base font-medium text-red-600 hover:bg-red-50"
              >
                Log Out
              </button>
            </>
          ) : loading && token ? (
            <div className="py-2 text-xs text-gray-400 pl-3">Verifying session...</div>
          ) : (
            <div className="pt-2 border-t border-gray-100 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('login');
                }}
                className="flex-1 text-center py-2 px-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('register');
                }}
                className="flex-1 text-center py-2 px-3 bg-gray-800 text-white rounded-md text-sm font-medium"
              >
                Register
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
