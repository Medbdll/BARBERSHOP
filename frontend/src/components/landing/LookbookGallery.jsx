import React from 'react';
import { lookbookData as fallbackGallery } from '../../data/barberShopData';

export default function LookbookGallery({
  lang,
  t,
  gallery = [],
  loading = false,
}) {
  const sourceGallery = gallery && gallery.length > 0 ? gallery : fallbackGallery;

  return (
    <section id="lookbook" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
        <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3.5 py-1 rounded-full border border-amber-500/20">
          {t.lookbook.badge}
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {t.lookbook.title}
        </h2>
        <p className="text-sm sm:text-base text-gray-400">
          {t.lookbook.subtitle}
        </p>
      </div>

      {/* Masonry Grid or Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 auto-rows-[220px] animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl bg-gray-900 border border-gray-800 h-full"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 auto-rows-[220px]">
          {sourceGallery.map((item, index) => {
            const title = item.title || (lang === 'ar' ? item.titleAr : item.titleFr);
            const image = item.image_url || item.image;
            const category = item.category || 'Lookbook';
            const colSpan = item.colSpan || (index === 0 || index === 3 ? 'md:col-span-2' : 'md:col-span-1');

            return (
              <div
                key={item.id || index}
                className={`relative rounded-2xl overflow-hidden border border-gray-800 hover:border-amber-500/50 shadow-xl group transition-all duration-300 ${colSpan}`}
              >
                <img
                  src={image}
                  alt={title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>

                {/* Caption Overlay */}
                <div className="absolute bottom-0 inset-x-0 p-5 transform translate-y-1 group-hover:translate-y-0 transition-transform">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 rounded-full inline-block mb-1.5">
                    {category}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                    {title}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
