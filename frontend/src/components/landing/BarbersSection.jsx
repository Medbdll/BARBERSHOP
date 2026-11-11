import React from 'react';
import { barbersData as fallbackBarbers } from '../../data/barberShopData';

export default function BarbersSection({
  lang,
  t,
  barbers = [],
  loading = false,
  onSelectBarber,
}) {
  const sourceBarbers = barbers && barbers.length > 0 ? barbers : fallbackBarbers;

  return (
    <section id="barbers" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-950/80 border-y border-gray-800/80">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3.5 py-1 rounded-full border border-amber-500/20">
            {t.barbers.badge}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {t.barbers.title}
          </h2>
          <p className="text-sm sm:text-base text-gray-400">
            {t.barbers.subtitle}
          </p>
        </div>

        {/* Barbers Card Row or Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl bg-gray-900 border border-gray-800 p-5 h-96 flex flex-col justify-between">
                <div className="aspect-square bg-gray-800 rounded-xl mb-4"></div>
                <div className="h-5 bg-gray-800 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-800/60 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {sourceBarbers.map((barber) => {
              const defaultTitle = t.barbers.defaultTitle || (lang === 'ar' ? 'حلاق محترف' : 'Maître Barbier');
              const title = lang === 'ar' ? (barber.titleAr || barber.experience || defaultTitle) : (barber.titleFr || barber.experience || defaultTitle);
              const specialty = lang === 'ar' ? (barber.specialtyAr || barber.specialty) : (barber.specialtyFr || barber.specialty);
              const imageUrl = barber.image_url || barber.image;

              return (
                <div
                  key={barber.id}
                  className="group rounded-2xl bg-gray-900 border border-gray-800 hover:border-amber-500/50 p-5 transition-all duration-300 hover:-translate-y-1 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    {/* Photo with gold ring hover */}
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-4 border border-gray-800 group-hover:border-amber-500/40 transition-colors">
                      <img
                        src={imageUrl}
                        alt={barber.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-60"></div>

                      {/* Rating badge */}
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-gray-950/90 border border-gray-800 text-amber-400 text-xs font-bold flex items-center gap-1 shadow">
                        <span>⭐</span>
                        <span>{barber.rating}</span>
                      </div>
                    </div>

                    {/* Name and Title */}
                    <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                      {barber.name}
                    </h3>
                    <p className="text-xs font-semibold text-amber-500/90 tracking-wide uppercase mt-0.5">
                      {title}
                    </p>

                    {/* Specialty Pill & Live Queue Badge */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300 border border-gray-700/60 inline-block">
                        ✂️ {specialty}
                      </span>

                      {barber.waiting_clients_count !== undefined && (
                        Number(barber.waiting_clients_count) === 0 ? (
                          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 inline-flex items-center gap-1 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>{t.bookingModal?.queueImmediate || '0 client en attente'}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-950/50 border border-amber-500/30 text-amber-300 inline-flex items-center gap-1 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            <span>
                              {lang === 'ar'
                                ? `${barber.waiting_clients_count} في الانتظار (~${barber.waiting_badge || barber.estimated_wait_minutes + 'د'})`
                                : `${barber.waiting_clients_count} en attente (~${barber.waiting_badge || barber.estimated_wait_minutes + 'min'})`}
                            </span>
                          </span>
                        )
                      )}
                    </div>

                    {/* Bio excerpt */}
                    {barber.bio && (
                      <p className="mt-3 text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {barber.bio}
                      </p>
                    )}
                  </div>

                  {/* Booking CTA Button */}
                  <div className="pt-5 mt-4 border-t border-gray-800/80">
                    <button
                      type="button"
                      onClick={() => onSelectBarber(barber)}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-gray-950 bg-amber-500/10 hover:bg-amber-500 border border-amber-500/30 hover:border-amber-500 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow"
                    >
                      <span>{t.barbers.bookWith}</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
