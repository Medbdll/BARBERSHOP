import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web/build/player/lottie_light';
import logoAnimation from '../../assets/barberoza-logo.json';

/**
 * Reusable Brand Lottie Logo Component
 * - Plays the drawing animation once after page load / refresh
 * - Locks on the completed final frame
 * - Simple, clean hover: smooth subtle scale on hover and active click feedback
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
      ref={containerRef}
      role="img"
      aria-label={alt}
      title={alt}
      className={`aspect-[16/9] overflow-hidden select-none flex items-center justify-center transition-transform duration-300 ease-out hover:scale-105 active:scale-95 group-hover:scale-105 group-active:scale-95 ${className}`}
    />
  );
}
