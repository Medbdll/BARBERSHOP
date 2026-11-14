import React from 'react';
import { GoldStarIcon } from '../auth/AuthIcons';
import { getImageUrl, handleImageFallbackError } from '../../utils/getImageUrl';

export default function TestimonialsSection({
  lang,
  t,
  reviews = [],
  loading = false,
}) {
  // Safely normalize incoming reviews prop and filter only approved reviews
  const rawReviews = Array.isArray(reviews)
    ? reviews
    : reviews?.reviews || reviews?.data || [];

  const approvedReviews = rawReviews.filter(
    (r) => r && (!r.status || r.status === 'approved')
  );

  return (
    <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-950/70 border-t border-gray-800/80">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3.5 py-1 rounded-full border border-amber-500/20">
            {t.testimonials.badge}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {t.testimonials.title}
          </h2>
          <p className="text-sm sm:text-base text-gray-400">
            {t.testimonials.subtitle}
          </p>
        </div>

        {/* Testimonials Grid or Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-gray-900 border border-gray-800 p-6 h-60 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-800 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-800/60 rounded w-full"></div>
                  <div className="h-3 bg-gray-800/60 rounded w-4/5"></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800"></div>
                  <div className="space-y-1 flex-1">
                    <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                    <div className="h-2 bg-gray-800/60 rounded w-1/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : approvedReviews.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            {lang === 'ar' ? 'لا توجد آراء منشورة حالياً.' : 'Aucun avis publié pour le moment.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {approvedReviews.map((review) => {
              const clientName =
                review.user?.name ||
                review.client_name ||
                review.author ||
                (lang === 'ar' ? 'زبون مميز' : 'Client VIP');

              const groomedByText = t.testimonials?.groomedBy || (lang === 'ar' ? 'اعتنى به' : 'Soigné par');
              const vipClientText = t.testimonials?.vipClient || (lang === 'ar' ? 'زبون مميز VIP' : 'Client Privilège VIP');
              const rawBarber = review.barber?.name || review.barber_name;
              const barberName = rawBarber
                ? `${groomedByText} ${rawBarber}`
                : (review.service || vipClientText);

              const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(clientName || 'VIP')}&background=1F2937&color=D97706`;
              const avatar = getImageUrl(
                review.user?.avatar || review.client_avatar || review.avatar,
                fallbackAvatar
              );
              const rating = Math.min(5, Math.max(1, Number(review.rating) || 5));
              const quote =
                (lang === 'ar' ? review.comment_ar : null) ||
                review.comment ||
                (lang === 'ar' ? review.quoteAr || review.quoteFr : review.quoteFr || review.quoteAr) ||
                '';

              return (
                <div
                  key={review.id}
                  className="rounded-2xl bg-gray-900 border border-gray-800 hover:border-amber-500/40 p-6 sm:p-7 shadow-xl flex flex-col justify-between relative transition-all duration-300"
                >
                  {/* Decorative gold quote symbol */}
                  <div className="text-amber-500/20 text-5xl font-serif leading-none absolute top-4 right-5 select-none">
                    “
                  </div>

                  <div>
                    {/* Gold Stars */}
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(rating)].map((_, i) => (
                        <GoldStarIcon key={i} className="w-4 h-4" />
                      ))}
                    </div>

                    {/* Quote */}
                    <p className="text-sm text-gray-300 leading-relaxed italic mb-6">
                      « {quote} »
                    </p>
                  </div>

                  {/* Author Meta */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-800/70">
                    <img
                      src={avatar}
                      alt={clientName}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => handleImageFallbackError(e, fallbackAvatar)}
                      className="w-11 h-11 rounded-full border border-amber-500/30 object-cover"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight">
                        {clientName}
                      </h3>
                      <p className="text-xs text-amber-500/80 font-medium">
                        {barberName}
                      </p>
                    </div>
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
