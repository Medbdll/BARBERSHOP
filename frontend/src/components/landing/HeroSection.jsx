import React from 'react';

export default function HeroSection({ t, onOpenBooking, onExploreServices }) {
  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 py-20 overflow-hidden bg-[#111827]">
      {/* Background Photography with dark luxury lighting */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25 scale-105 transition-transform duration-1000 ease-out"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=1600')`,
        }}
      ></div>

      {/* Radial Gold Ambient Glows */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#111827]/90 via-[#111827]/80 to-[#111827]"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-600/15 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-7">
        {/* Prestige Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest shadow-lg shadow-amber-500/5">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span>{t.hero.badge}</span>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
          {t.hero.titleStart}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600">
            {t.hero.titleGold}
          </span>{' '}
          {t.hero.titleEnd}
        </h1>

        {/* Description */}
        <p className="text-base sm:text-lg text-gray-300/90 max-w-2xl mx-auto leading-relaxed">
          {t.hero.description}
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={onOpenBooking}
            className="w-full sm:w-auto py-4 px-8 rounded-xl font-bold text-sm uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 active:scale-[0.98] transition-all shadow-xl shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>{t.hero.ctaPrimary}</span>
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </button>

          <button
            type="button"
            onClick={onExploreServices}
            className="w-full sm:w-auto py-4 px-8 rounded-xl font-semibold text-sm uppercase tracking-wider text-gray-200 hover:text-white bg-gray-900/80 hover:bg-gray-800 border border-gray-700 hover:border-amber-500/50 transition-all cursor-pointer backdrop-blur-sm"
          >
            {t.hero.ctaSecondary}
          </button>
        </div>

        {/* ======================================================== */}
        {/* 4 STAT COUNTERS                                          */}
        {/* ======================================================== */}
        <div className="pt-12 sm:pt-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 bg-gray-900/80 backdrop-blur-md p-6 rounded-2xl border border-gray-800 shadow-2xl">
            {/* Stat 1 */}
            <div className="p-3 text-center border-b sm:border-b-0 sm:border-r border-gray-800/80">
              <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                15 000+
              </div>
              <div className="text-xs text-gray-400 mt-1 font-medium">
                {t.hero.stats.clients}
              </div>
            </div>

            {/* Stat 2 */}
            <div className="p-3 text-center border-b sm:border-b-0 md:border-r border-gray-800/80">
              <div className="text-2xl sm:text-3xl font-black text-white">
                48 000+
              </div>
              <div className="text-xs text-gray-400 mt-1 font-medium">
                {t.hero.stats.cuts}
              </div>
            </div>

            {/* Stat 3 */}
            <div className="p-3 text-center sm:border-r border-gray-800/80">
              <div className="text-2xl sm:text-3xl font-black text-amber-400 flex items-center justify-center gap-1">
                <span>⭐</span>
                <span>4.9 / 5</span>
              </div>
              <div className="text-xs text-gray-400 mt-1 font-medium">
                {t.hero.stats.rating}
              </div>
            </div>

            {/* Stat 4 */}
            <div className="p-3 text-center">
              <div className="text-2xl sm:text-3xl font-black text-white">
                8 Experts
              </div>
              <div className="text-xs text-gray-400 mt-1 font-medium">
                {t.hero.stats.barbers}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

