import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web/build/player/lottie_light';
import logoAnimation from '../../assets/barberoza-logo.json';

/**
 * Reusable Brand Lottie Logo Component
 * - Plays the drawing animation once after page load / refresh
 * - Locks on the completed luxury emblem & typography
 * - Modern Luxury Hover:
 *    • Ambient golden halo / backlight aura bloom
 *    • Metallic specular sheen sweep across the blades and typography
 *    • Weighted spring elevation (scale + lift) with amber drop-shadow
 *    • Tactile active press response
 */
export default function BrandLogo({
  className = 'h-16 sm:h-18',
  alt = 'BARBEROZA SHOP',
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      animationData: logoAnimation,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
      },
    });

    anim.addEventListener('complete', () => {
      // Ensure it stays locked on the completed final frame
      anim.goToAndStop(anim.totalFrames - 1, true);
    });

    return () => {
      anim.destroy();
    };
  }, []);

  return (
    <div
      role="img"
      aria-label={alt}
      title={alt}
      className={`relative inline-flex items-center justify-center aspect-[16/9] select-none group/logo ${className}`}
    >
      {/* 1. Ambient Golden Halo (Warm Backlight Aura) */}
      <div
        aria-hidden="true"
        className="absolute -inset-2 sm:-inset-4 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.35)_0%,rgba(217,119,6,0.12)_45%,transparent_75%)] rounded-3xl blur-xl opacity-0 scale-75 group-hover/logo:opacity-100 group-hover/logo:scale-115 group-hover:opacity-100 group-hover:scale-115 transition-all duration-700 pointer-events-none -z-10"
      />

      {/* 2. Main Lottie Logo Container with smooth spring physics & luxury amber drop shadow */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] filter drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] group-hover/logo:scale-[1.045] group-hover:scale-[1.045] group-hover/logo:-translate-y-0.5 group-hover:-translate-y-0.5 group-hover/logo:brightness-110 group-hover:brightness-110 group-hover/logo:contrast-105 group-hover:contrast-105 group-hover/logo:drop-shadow-[0_8px_24px_rgba(245,158,11,0.4)] group-hover:drop-shadow-[0_8px_24px_rgba(245,158,11,0.4)] group-active/logo:scale-[0.98] group-active:scale-[0.98] group-active/logo:translate-y-0 group-active:translate-y-0"
      />

      {/* 3. Specular Metallic Light Sheen Beam (Light glide across scissors & gold typography) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl"
      >
        <div
          className="logo-sheen-beam absolute top-0 bottom-0 w-36 sm:w-48 bg-gradient-to-r from-transparent via-amber-200/35 via-white/45 to-transparent mix-blend-overlay"
        />
      </div>
    </div>
  );
}
