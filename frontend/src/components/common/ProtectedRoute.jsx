import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, loading, roles, defaultDashboard } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111827] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-[#D97706]/30 border-t-[#D97706] rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-sans tracking-wide">Vérification des accès VIP...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0) {
    const hasAccess = allowedRoles.some((role) => roles.includes(role));
    if (!hasAccess) {
      return <Navigate to={defaultDashboard || '/'} replace />;
    }
  }

  return children;
}

