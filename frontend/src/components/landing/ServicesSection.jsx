import React, { useState } from 'react';
import {
  getImageUrl,
  handleImageFallbackError,
} from '../../utils/getImageUrl';

export default function ServicesSection({
  lang,
  t,
  services = [],
  loading = false,
  onSelectService,
  selectedServiceId,
}) {
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { key: 'all', label: t.services.filterAll },
    { key: 'hair', label: t.services.filterHair },
    { key: 'beard', label: t.services.filterBeard },
    { key: 'care', label: t.services.filterCare },
    { key: 'vip', label: t.services.filterVip },
  ];

  const sourceData = Array.isArray(services) ? services : [];

  const filteredServices =
    activeCategory === 'all'
      ? sourceData
      : sourceData.filter((s) => s.category === activeCategory);

  return (
    <section id="services" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
        <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3.5 py-1 rounded-full border border-amber-500/20">
          {t.services.badge}
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {t.services.title}
        </h2>
        <p className="text-sm sm:text-base text-gray-400">
          {t.services.subtitle}
        </p>

        {/* Filter Category Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-6">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeCategory === cat.key
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-gray-950 shadow-lg shadow-amber-500/20'
                  : 'bg-gray-900/90 text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid or Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="rounded-2xl bg-gray-900/50 border border-gray-800 overflow-hidden flex flex-col">
              <div className="h-40 bg-gray-800 w-full" />
              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-800/60 rounded w-full" />
                  <div className="h-3 bg-gray-800/60 rounded w-2/3" />
                </div>
                <div className="h-8 bg-gray-800 rounded mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {lang === 'ar' ? 'لا توجد خدمات متاحة في هذا القسم.' : 'Aucune prestation disponible dans cette catégorie.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredServices.map((service) => {
            const isSelected = selectedServiceId === service.id;
            const name = lang === 'ar' ? (service.title_ar || service.nameAr || service.name) : (service.title_fr || service.nameFr || service.name);
            const desc = lang === 'ar' ? (service.description_ar || service.descriptionAr || service.description) : (service.description_fr || service.descriptionFr || service.description);
            const rawDuration = typeof service.duration === 'number' ? service.duration : parseInt(service.duration, 10) || 30;
            const formattedDuration = `${rawDuration} ${t.common?.minutes || 'min'}`;
            const currencyLabel = t.common?.currency || 'MAD';

            const imageUrl = getImageUrl(service.image_url);

            return (
              <div
                key={service.id}
                className={`rounded-2xl flex flex-col justify-between transition-all duration-300 relative group overflow-hidden ${
                  isSelected
                    ? 'bg-gray-900 border-2 border-amber-500 shadow-xl shadow-amber-500/10'
                    : 'bg-gray-900/60 hover:bg-gray-900/90 border border-gray-800 hover:border-amber-500/40 shadow-lg'
                }`}
              >
                {/* Popular or Recommended badge */}
                {(service.popular || service.category === 'vip') && (
                  <div className="absolute top-3 right-3 z-10 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-gray-950 text-[10px] font-black uppercase tracking-wider shadow">
                    {t.common?.prestige || 'Prestige'}
                  </div>
                )}

                {/* Service Image */}
                <div className="relative w-full h-40 overflow-hidden bg-gray-800 shrink-0">
                  <img
                    src={imageUrl}
                    alt={name}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => handleImageFallbackError(e, categoryFallback)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Dark gradient overlay at bottom for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/30 to-transparent" />
                 
        
                </div>

                {/* Service Info */}
                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base leading-snug group-hover:text-amber-300 transition-colors mb-2">
                      {name}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
                      {desc}
                    </p>
                  </div>

                  {/* Footer: Duration, Price in MAD, Select CTA */}
                  <div className="pt-4 border-t border-gray-800/80 space-y-3 mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-gray-400 font-medium">
                        <span>⏱</span>
                        <span>{formattedDuration}</span>
                      </span>

                      <div className="text-right">
                        <span className="text-lg font-black text-amber-400 font-mono">
                          {service.price}
                        </span>{' '}
                        <span className="text-xs font-bold text-amber-500/80">
                          {currencyLabel}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectService(service)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                          : 'bg-gray-800 hover:bg-amber-500 text-gray-200 hover:text-gray-950 border border-gray-700 hover:border-amber-500 shadow'
                      }`}
                    >
                      {isSelected ? (
                        <span>{t.services.selectedBtn}</span>
                      ) : (
                        <span>{t.services.selectBtn}</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
