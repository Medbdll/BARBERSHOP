import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { useAuth } from './context/useAuth';
import ProtectedRoute from './components/common/ProtectedRoute';
import './App.css';

// Code Splitting & Lazy Loading for minimal initial bundle size
const LandingPage = React.lazy(() => import('./components/landing/LandingPage'));
const LuxurySplitAuth = React.lazy(() => import('./components/auth/LuxurySplitAuth'));
const ClientDashboard = React.lazy(() => import('./components/client/ClientDashboard'));
const EmployeDashboard = React.lazy(() => import('./components/employe/EmployeDashboard'));
const AdminPortal = React.lazy(() => import('./components/admin/AdminPortal'));
const GoogleCallback = React.lazy(() => import('./components/auth/GoogleCallback'));

function LuxuryPageFallback() {
  const isAr = typeof window !== 'undefined' && localStorage.getItem('app_lang') === 'ar';
  return (
    <div className="min-h-screen bg-[#0F141C] flex flex-col items-center justify-center p-6 text-center select-none" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-ping"></div>
        <div className="absolute inset-0 rounded-full border-2 border-t-amber-500 border-r-amber-500/40 border-b-transparent border-l-transparent animate-spin"></div>
      </div>
      <div className="text-amber-400 font-serif font-bold text-sm tracking-widest uppercase mb-1">
        {isAr ? 'باربيروزا بريستيج' : 'BARBEROZA PRESTIGE'}
      </div>
      <p className="text-gray-400 text-xs font-sans">
        {isAr ? 'جاري تحميل المنصة الآمنة...' : 'Chargement de l’interface sécurisée...'}
      </p>
    </div>
  );
}

function hasPendingBookingDraft() {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('booking') === 'restore' || !!sessionStorage.getItem('pending_booking');
  } catch {
    return false;
  }
}

function LandingPageWrapper() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, isEmploye, isClient, defaultDashboard } = useAuth();

  // Admin users are strictly directed to their dedicated dashboard
  if (isAuthenticated && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Employe users are strictly directed to their dedicated dashboard
  if (isAuthenticated && isEmploye) {
    return <Navigate to="/employe" replace />;
  }

  // Client users are automatically redirected to /client/dashboard
  if (isAuthenticated && isClient) {
    const target = hasPendingBookingDraft()
      ? '/client/dashboard?booking=restore'
      : '/client/dashboard';
    return <Navigate to={target} replace />;
  }

  const handleOpenAuth = (mode = 'login') => {
    if (isAuthenticated) {
      navigate(defaultDashboard || '/client/dashboard');
    } else {
      navigate('/auth', { state: { initialMode: mode } });
    }
  };

  return <LandingPage onOpenAuth={handleOpenAuth} />;
}

function AuthPageWrapper({ initialMode = 'login' }) {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, isEmploye, isClient } = useAuth();

  // If already authenticated, redirect directly to role dashboard
  if (isAuthenticated && isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  if (isAuthenticated && isEmploye) {
    return <Navigate to="/employe" replace />;
  }
  if (isAuthenticated && isClient) {
    const target = hasPendingBookingDraft()
      ? '/client/dashboard?booking=restore'
      : '/client/dashboard';
    return <Navigate to={target} replace />;
  }

  return (
    <LuxurySplitAuth
      initialMode={initialMode}
      onBackToShop={() => navigate('/')}
    />
  );
}

function FallbackRedirect() {
  const { isAuthenticated, isAdmin, isEmploye, defaultDashboard } = useAuth();
  if (isAuthenticated && isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  if (isAuthenticated && isEmploye) {
    return <Navigate to="/employe" replace />;
  }
  return <Navigate to={isAuthenticated ? defaultDashboard : '/'} replace />;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LuxuryPageFallback />}>
            <Routes>
              {/* Public Landing Page */}
              <Route path="/" element={<LandingPageWrapper />} />

              {/* Authentication Split Screen (Login & Register) */}
              <Route path="/auth" element={<AuthPageWrapper initialMode="login" />} />
              <Route path="/login" element={<AuthPageWrapper initialMode="login" />} />
              <Route path="/register" element={<AuthPageWrapper initialMode="register" />} />

              {/* Google OAuth2 Stateless Callback */}
              <Route path="/auth/google/callback" element={<GoogleCallback />} />

              {/* Role-Based Protected Routes */}

              {/* 1. Client Privilège Dashboard (role: client) */}
              <Route
                path="/client/*"
                element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <ClientDashboard />
                  </ProtectedRoute>
                }
              />

              {/* 2. Employé / Barber Portal (role: employe) */}
              <Route
                path="/employe/*"
                element={
                  <ProtectedRoute allowedRoles={['employe']}>
                    <EmployeDashboard />
                  </ProtectedRoute>
                }
              />

              {/* 3. Super Admin Portal (role: admin) */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminPortal />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<FallbackRedirect />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
