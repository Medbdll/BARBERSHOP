import React, { useState, useEffect } from 'react';
import LandingNavbar from './LandingNavbar';
import HeroSection from './HeroSection';
import ServicesSection from './ServicesSection';
import BarbersSection from './BarbersSection';
import LookbookGallery from './LookbookGallery';
import TestimonialsSection from './TestimonialsSection';
import FooterSection from './FooterSection';
import BookingModal from './BookingModal';
import { useLanguage } from '../../context/LanguageContext';
import {
  getServices,
  getBarbers,
  getReviews,
  getGallery,
} from '../../api/barberApi';

/**
 * Safely extract an array payload from various API response shapes:
 * - Direct array
 * - res.data as array
 * - res.data[key]
 * - res[key]
 * - res.data.data (paginated Laravel resource)
 */
function extractArray(res, key) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (key && Array.isArray(res.data?.[key])) return res.data[key];
  if (key && Array.isArray(res[key])) return res[key];
  if (Array.isArray(res.data?.data)) return res.data.data;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.data?.items)) return res.data.items;
  return [];
}

export default function LandingPage({ onOpenAuth }) {
  const { lang, setLang, t, dir } = useLanguage();
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(null);

  // Dynamic API state
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    Promise.allSettled([getServices(), getBarbers(), getReviews(), getGallery()])
      .then(([srvRes, brbRes, revRes, galRes]) => {
        if (ignore) return;

        if (srvRes.status === 'fulfilled') {
          setServices(extractArray(srvRes.value, 'services'));
        } else {
          console.warn('Failed to load services:', srvRes.reason);
        }

        if (brbRes.status === 'fulfilled') {
          setBarbers(extractArray(brbRes.value, 'barbers'));
        } else {
          console.warn('Failed to load barbers:', brbRes.reason);
        }

        if (revRes.status === 'fulfilled') {
          setReviews(extractArray(revRes.value, 'reviews'));
        } else {
          console.warn('Failed to load reviews:', revRes.reason);
        }

        if (galRes.status === 'fulfilled') {
          setGallery(extractArray(galRes.value, 'gallery'));
        } else {
          console.warn('Failed to load gallery:', galRes.reason);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.warn('Backend API connection notice, fallback to static cache:', err);
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    // Automatically open booking stepper if user returns from login with a draft booking
    try {
      const pending = sessionStorage.getItem('pending_booking');
      const params = new URLSearchParams(window.location.search);
      if (pending || params.get('booking') === 'restore') {
        setBookingModalOpen(true);
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, []);

  const handleOpenBooking = () => {
    setBookingModalOpen(true);
  };

  const handleSelectService = (service) => {
    setSelectedService(service);
    setBookingModalOpen(true);
  };

  const handleSelectBarber = (barber) => {
    setSelectedBarber(barber);
    setBookingModalOpen(true);
  };

  const handleExploreServices = () => {
    const el = document.getElementById('services');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-[#111827] text-gray-100 font-sans selection:bg-amber-500 selection:text-gray-950 ${
        lang === 'ar' ? 'font-arabic' : ''
      }`}
    >
      {/* Sticky Navigation Bar */}
      <LandingNavbar
        lang={lang}
        onToggleLang={(newLang) => setLang(newLang)}
        t={t}
        onOpenAuth={onOpenAuth}
        onOpenBooking={handleOpenBooking}
      />

      <main>
        {/* Bold Hero Section with 4 Stat Counters */}
        <HeroSection
          t={t}
          onOpenBooking={handleOpenBooking}
          onExploreServices={handleExploreServices}
        />

        {/* Dynamic Filterable Service & Pricing Grid in MAD */}
        <ServicesSection
          lang={lang}
          t={t}
          services={services}
          loading={loading}
          onSelectService={handleSelectService}
          selectedServiceId={selectedService?.id}
        />

        {/* Dynamic "Meet Our Barbers" Card Row */}
        <BarbersSection
          lang={lang}
          t={t}
          barbers={barbers}
          loading={loading}
          onSelectBarber={handleSelectBarber}
        />

        {/* Dynamic Masonry Lookbook Gallery */}
        <LookbookGallery
          lang={lang}
          t={t}
          gallery={gallery}
          loading={loading}
        />

        {/* Dynamic Client Testimonials */}
        <TestimonialsSection
          lang={lang}
          t={t}
          reviews={reviews}
          loading={loading}
        />
      </main>

      {/* Footer with Embedded Map & Opening Hours */}
      <FooterSection t={t} />

      {/* Dynamic Interactive Booking Modal with Real-time Slots */}
      {bookingModalOpen && (
        <BookingModal
          key={`${selectedService?.id || 'none'}-${selectedBarber?.id || 'none'}`}
          isOpen={bookingModalOpen}
          onClose={() => {
            setBookingModalOpen(false);
            setSelectedService(null);
            setSelectedBarber(null);
          }}
          lang={lang}
          t={t}
          preselectedService={selectedService}
          preselectedBarber={selectedBarber}
          availableServices={services}
          availableBarbers={barbers}
        />
      )}
    </div>
  );
}
