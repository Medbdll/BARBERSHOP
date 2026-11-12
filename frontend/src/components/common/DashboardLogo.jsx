import React from 'react';
import dashboardLogoImg from '../../assets/barberoza-dashboard-logo.png';

/**
 * Gold barber monogram emblem used across Client, Employee, and Admin dashboards.
 */
export default function DashboardLogo({
  className = 'w-8 h-8',
  alt = 'BARBEROZA SHOP',
}) {
  return (
    <img
      src={dashboardLogoImg}
      alt={alt}
      title={alt}
      decoding="async"
      className={`object-contain select-none transition-transform duration-300 ease-out hover:scale-105 active:scale-95 group-hover:scale-105 ${className}`}
    />
  );
}

