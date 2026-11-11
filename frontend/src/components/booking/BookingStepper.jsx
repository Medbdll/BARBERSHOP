import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import {
  getServices,
  getBarbers,
  getAvailableSlots,
  bookAppointment,
} from '../../api/barberApi';
import { getTodayDateString, isSlotInPast } from '../../utils/dateTime';

const PENDING_BOOKING_KEY = 'pending_booking';

export default function BookingStepper({
  onClose,
  initialService = null,
  initialBarber = null,
  availableServices = [],
  availableBarbers = [],
  onBookingSuccess,
}) {
  const { user, isAuthenticated, updateUser } = useAuth();
  const { lang, t, dir } = useLanguage();
  const isAr = lang === 'ar';
  const navigate = useNavigate();

  // Stepper state: 1: Service, 2: Barber, 3: DateTime, 4: Confirmation, 5: Success
  const [currentStep, setCurrentStep] = useState(1);
  const [restoredDraftNotice, setRestoredDraftNotice] = useState(false);

  // Catalogs
  const [services, setServices] = useState(() => (Array.isArray(availableServices) && availableServices.length > 0 ? availableServices : []));
  const [barbers, setBarbers] = useState(() => (Array.isArray(availableBarbers) && availableBarbers.length > 0 ? availableBarbers : []));
  const [loadingCatalog, setLoadingCatalog] = useState(() => !(availableServices?.length > 0 && availableBarbers?.length > 0));
  const [activeCategory, setActiveCategory] = useState('all');

  // Sync props if parent loads them asynchronously
  useEffect(() => {
    if (Array.isArray(availableServices) && availableServices.length > 0) {
      setServices(availableServices);
    }
  }, [availableServices]);

  useEffect(() => {
    if (Array.isArray(availableBarbers) && availableBarbers.length > 0) {
      setBarbers(availableBarbers);
    }
  }, [availableBarbers]);

  // Selections
  const [selectedServices, setSelectedServices] = useState(initialService ? [initialService] : []);
  const [selectedBarber, setSelectedBarber] = useState(initialBarber || null);
  const [selectedDate, setSelectedDate] = useState(() => getTodayDateString());
  const [selectedSlot, setSelectedSlot] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Client Info (Step 4)
  const [clientPhone, setClientPhone] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [clientNotes, setClientNotes] = useState('');

  // Submission & Results
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Load catalogs & restore draft on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        let sList = availableServices?.length > 0 ? availableServices : services;
        let bList = availableBarbers?.length > 0 ? availableBarbers : barbers;

        if (sList.length === 0 || bList.length === 0) {
          setLoadingCatalog(true);
          const today = getTodayDateString();
          const [servicesRes, barbersRes] = await Promise.all([
            sList.length === 0 ? getServices() : Promise.resolve({ data: sList }),
            bList.length === 0 ? getBarbers(today) : Promise.resolve({ data: bList }),
          ]);

          if (!isMounted) return;

          sList = servicesRes?.data || sList;
          bList = barbersRes?.data || bList;
          setServices(sList);
          setBarbers(bList);
        }

        // Check if there is a pending booking in sessionStorage
        try {
          const savedDraftRaw = sessionStorage.getItem(PENDING_BOOKING_KEY);
          if (savedDraftRaw) {
            const draft = JSON.parse(savedDraftRaw);
            if (draft) {
              if (Array.isArray(draft.service_ids) && draft.service_ids.length > 0) {
                const foundServices = sList.filter((s) => draft.service_ids.includes(s.id));
                if (foundServices.length > 0) setSelectedServices(foundServices);
              } else if (draft.service_id) {
                const found = sList.find((s) => s.id === draft.service_id);
                if (found) setSelectedServices([found]);
              }

              if (draft.barber_id) {
                const foundB = bList.find((b) => b.id === draft.barber_id);
                if (foundB) setSelectedBarber(foundB);
              }

              if (draft.appointment_date) {
                setSelectedDate(draft.appointment_date);
              }

              if (draft.start_time) {
                setSelectedSlot(draft.start_time);
              }

              if (draft.notes) {
                setClientNotes(draft.notes);
              }

              // Jump directly to step 4 (confirmation) if details were saved
              if (draft.step) {
                setCurrentStep(Math.min(draft.step, 4));
                setRestoredDraftNotice(true);
              }
            }
          } else {
            // Apply initial props if no draft
            if (initialService) setSelectedServices([initialService]);
            if (initialBarber) setSelectedBarber(initialBarber);
          }
        } catch (e) {
          console.warn('Could not read pending_booking draft:', e);
        }
      } catch (err) {
        console.error('Error loading booking catalog:', err);
      } finally {
        if (isMounted) setLoadingCatalog(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [initialService, initialBarber]);

  // Sync client phone with user profile
  useEffect(() => {
    if (user?.phone) {
      setClientPhone(user.phone);
      setIsEditingPhone(false);
    } else {
      setIsEditingPhone(true);
    }
  }, [user?.phone]);

  // When date changes, refresh barbers live queue for that date
  const refreshBarbersQueue = useCallback(async (targetDate) => {
    try {
      const res = await getBarbers(targetDate);
      if (res?.data) {
        setBarbers(res.data);
        if (selectedBarber) {
          const updated = res.data.find((b) => b.id === selectedBarber.id);
          if (updated) setSelectedBarber(updated);
        }
      }
    } catch (e) {
      console.warn('Error refreshing barbers queue:', e);
    }
  }, [selectedBarber]);

  // Calculated totals
  const totalDuration = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + (Number(s.duration) || 30), 0);
  }, [selectedServices]);

  const totalPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  }, [selectedServices]);

  // Fetch available slots when barber, date, or services change
  const fetchSlots = useCallback(async () => {
    if (!selectedBarber || !selectedDate) return;
    setLoadingSlots(true);
    try {
      const res = await getAvailableSlots(
        selectedBarber.id,
        selectedDate,
        totalDuration > 0 ? totalDuration : 30
      );
      const rawSlots = res?.slots || [];
      setAvailableSlots(rawSlots);

      // Auto-select first future slot if current slot is invalid or not in list
      const futureSlots = rawSlots.filter((slot) => !isSlotInPast(slot, selectedDate));
      if (futureSlots.length > 0) {
        if (!selectedSlot || !futureSlots.includes(selectedSlot)) {
          setSelectedSlot(futureSlots[0]);
        }
      } else {
        setSelectedSlot('');
      }
    } catch (err) {
      console.error('Failed to fetch available slots:', err);
      setAvailableSlots([]);
      setSelectedSlot('');
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedBarber, selectedDate, totalDuration, selectedSlot]);

  useEffect(() => {
    if (currentStep >= 3 && selectedBarber && selectedDate) {
      fetchSlots();
    }
  }, [currentStep, selectedBarber, selectedDate, totalDuration, fetchSlots]);

  // Save draft to sessionStorage
  const saveDraftToStorage = useCallback((stepNumber) => {
    try {
      const draft = {
        service_ids: selectedServices.map((s) => s.id),
        barber_id: selectedBarber?.id || null,
        appointment_date: selectedDate,
        start_time: selectedSlot,
        notes: clientNotes,
        step: stepNumber || currentStep,
      };
      sessionStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Could not save draft booking:', e);
    }
  }, [selectedServices, selectedBarber, selectedDate, selectedSlot, clientNotes, currentStep]);

  // Toggle service selection (supports multi-selection or single)
  const handleToggleService = (service) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === service.id);
      if (exists) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((s) => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  // Step 1 -> Step 2
  const handleGoToBarbers = () => {
    if (selectedServices.length === 0) return;
    saveDraftToStorage(2);
    setCurrentStep(2);
  };

  // Step 2 -> Step 3
  const handleGoToDateTime = () => {
    if (!selectedBarber) return;
    saveDraftToStorage(3);
    setCurrentStep(3);
  };

  // Step 3 -> Step 4
  const handleGoToConfirmation = () => {
    if (!selectedSlot) return;
    saveDraftToStorage(4);
    setCurrentStep(4);
  };

  // Guest Redirect to Login/Register with saved draft
  const handleGuestRedirectToAuth = () => {
    saveDraftToStorage(4);
    if (onClose) onClose();
    navigate('/login', { state: { returnTo: 'booking' } });
  };

  // Submit Final Booking
  const handleConfirmBooking = async () => {
    setSubmitError(null);

    if (!isAuthenticated) {
      handleGuestRedirectToAuth();
      return;
    }

    if (!selectedSlot) {
      setSubmitError(isAr ? 'يرجى اختيار توقيت متاح.' : 'Veuillez sélectionner un créneau horaire disponible.');
      return;
    }

    if (isSlotInPast(selectedSlot, selectedDate)) {
      setSubmitError(
        isAr
          ? 'هذا التوقيت انتهى. يرجى اختيار موعد في وقت لاحق.'
          : 'Ce créneau horaire est déjà passé. Veuillez sélectionner un horaire futur.'
      );
      return;
    }

    // Phone validation: required if user has no phone in profile
    const finalPhone = clientPhone ? clientPhone.trim() : '';
    if (!user?.phone && !finalPhone) {
      setSubmitError(
        isAr
          ? 'رقم الهاتف مطلوب لتأكيد الموعد واستلام رسالة SMS.'
          : 'Votre numéro de téléphone est requis pour confirmer et recevoir le rappel SMS.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        service_ids: selectedServices.map((s) => s.id),
        service_id: selectedServices[0]?.id,
        barber_id: selectedBarber.id,
        appointment_date: selectedDate,
        start_time: selectedSlot,
        phone: finalPhone || user?.phone || null,
        notes: clientNotes || null,
      };

      const res = await bookAppointment(payload);

      // Clean up draft from sessionStorage
      try {
        sessionStorage.removeItem(PENDING_BOOKING_KEY);
      } catch {}

      // Update user in context with fresh returned user object
      if (res?.user && updateUser) {
        updateUser(res.user);
      }

      setConfirmedBooking({
        appointment: res.data,
        services: selectedServices,
        barber: selectedBarber,
        date: selectedDate,
        slot: selectedSlot,
        pointsEarned: res.loyalty_points_earned || 15,
        totalPoints: res.current_loyalty_points || (user?.loyalty_points || 50) + 15,
      });

      setCurrentStep(5); // Success step

      if (onBookingSuccess) {
        onBookingSuccess(res.data);
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      let msg = isAr
        ? 'حدث خطأ أثناء تأكيد الحجز. يرجى المحاولة مرة أخرى.'
        : 'Erreur lors de la réservation. Veuillez vérifier vos informations.';

      if (err.response?.data?.errors) {
        const list = Object.values(err.response.data.errors).flat();
        if (list.length > 0) msg = list.join(' ');
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      setSubmitError(msg);

      // Refresh slots in case of double-booking collision
      fetchSlots();
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered services for Step 1
  const filteredServices = useMemo(() => {
    if (activeCategory === 'all') return services;
    return services.filter((s) => s.category === activeCategory);
  }, [services, activeCategory]);

  return (
    <div
      dir={dir}
      className={`relative w-full max-w-4xl mx-auto bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden font-sans text-gray-100 ${
        isAr ? 'font-arabic' : ''
      }`}
    >
      {/* ======================================================== */}
      {/* HEADER WITH PROGRESS STEPPER */}
      {/* ======================================================== */}
      <div className="p-6 sm:p-8 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-900 border-b border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </span>
            <div>
              <div className="text-xs font-bold text-amber-500 uppercase tracking-widest">
                {t.bookingModal.badge || 'Réservation VIP'}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {t.bookingModal.title || 'Réservation de Créneau Prestige'}
              </h2>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition cursor-pointer"
              title={t.common.close}
            >
              ✕
            </button>
          )}
        </div>

        {/* Restored Draft Banner */}
        {restoredDraftNotice && currentStep < 5 && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <span>✨</span>
              <span>{t.bookingModal.draftRestored}</span>
            </div>
            <button
              type="button"
              onClick={() => setRestoredDraftNotice(false)}
              className="text-amber-400 hover:text-white text-xs px-2 py-0.5 rounded"
            >
              ✕
            </button>
          </div>
        )}

        {/* 4-Step Progress Indicator */}
        {currentStep < 5 && (
          <div className="grid grid-cols-4 gap-2 sm:gap-4 select-none pt-2">
            {[
              { step: 1, title: t.bookingModal.steps.step1 },
              { step: 2, title: t.bookingModal.steps.step2 },
              { step: 3, title: t.bookingModal.steps.step3 },
              { step: 4, title: t.bookingModal.steps.step4 },
            ].map((s) => {
              const isActive = currentStep === s.step;
              const isPassed = currentStep > s.step;

              return (
                <button
                  key={s.step}
                  type="button"
                  disabled={currentStep < s.step}
                  onClick={() => {
                    if (isPassed) setCurrentStep(s.step);
                  }}
                  className={`flex flex-col items-start p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-lg shadow-amber-500/10'
                      : isPassed
                      ? 'bg-gray-800/60 border-gray-700/80 text-gray-300 hover:bg-gray-800 cursor-pointer'
                      : 'bg-gray-950/40 border-gray-800/60 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isPassed
                          ? 'bg-emerald-500 text-gray-950'
                          : isActive
                          ? 'bg-amber-500 text-gray-950'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {isPassed ? '✓' : s.step}
                    </span>
                    <span className="text-xs font-semibold truncate hidden sm:inline">
                      {s.title}
                    </span>
                  </div>
                  <span className="text-[10px] sm:hidden text-gray-400 mt-1 truncate">
                    {s.title.split('. ')[1] || s.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* STEP CONTENT CONTAINER */}
      {/* ======================================================== */}
      <div className="p-6 sm:p-8 max-h-[70vh] overflow-y-auto">
        {/* Loading Spinner */}
        {loadingCatalog && (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="text-gray-400 text-sm">{t.common.loading}</p>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 1: SERVICE SELECTION */}
        {/* ---------------------------------------------------- */}
        {!loadingCatalog && currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'all', label: t.services.filterAll },
                { key: 'hair', label: t.services.filterHair },
                { key: 'beard', label: t.services.filterBeard },
                { key: 'care', label: t.services.filterCare },
                { key: 'vip', label: t.common.vip },
              ].map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    activeCategory === cat.key
                      ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/20'
                      : 'bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Service Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredServices.map((service) => {
                const isSelected = selectedServices.some((s) => s.id === service.id);

                return (
                  <div
                    key={service.id}
                    onClick={() => handleToggleService(service)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/40 shadow-lg shadow-amber-950/30'
                        : 'bg-gray-950/60 border-gray-800 hover:border-gray-700 hover:bg-gray-800/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-white group-hover:text-amber-400 transition-colors text-sm sm:text-base">
                          {service.name}
                        </h4>
                        <span
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-amber-500 border-amber-500 text-gray-950 font-bold text-xs'
                              : 'border-gray-700 bg-gray-900 group-hover:border-gray-500'
                          }`}
                        >
                          {isSelected ? '✓' : ''}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {service.description || 'Prestation sur-mesure de haute précision.'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-400 flex items-center gap-1">
                        ⏱ {service.duration} {t.common.minutes}
                      </span>
                      <span className="text-amber-400 font-bold text-sm">
                        {service.price} {t.common.currency}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sticky Step 1 Summary Footer */}
            <div className="pt-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-400">
                <span className="text-white font-bold">{selectedServices.length}</span>{' '}
                {isAr ? 'خدمة مختارة' : 'prestation(s) sélectionnée(s)'} •{' '}
                <span className="text-white font-bold">{totalDuration}</span> {t.common.minutes} •{' '}
                <span className="text-amber-400 font-bold text-base">{totalPrice}</span>{' '}
                {t.common.currency}
              </div>

              <button
                type="button"
                onClick={handleGoToBarbers}
                disabled={selectedServices.length === 0}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 transition shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isAr ? 'المتابعة لاختيار الحلاق' : 'Choisir le Maître Barbier'}</span>
                <span>{isAr ? '←' : '→'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 2: BARBER SELECTION WITH LIVE QUEUE COUNTER */}
        {/* ---------------------------------------------------- */}
        {!loadingCatalog && currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  {t.bookingModal.selectBarber}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isAr
                    ? 'اطلع على حالة الانتظار المباشرة لكل حلاق واحجز مع خبيرك المفضل.'
                    : 'Consultez la file d’attente en direct et choisissez votre expert.'}
                </p>
              </div>

              {/* Refresh queue button */}
              <button
                type="button"
                onClick={() => refreshBarbersQueue(selectedDate)}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-gray-800 transition cursor-pointer"
                title="Actualiser la file d'attente"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {isAr ? 'تحديث الانتظار' : 'Actualiser'}
                </span>
              </button>
            </div>

            {/* Barbers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {barbers.map((barber) => {
                const isSelected = selectedBarber?.id === barber.id;
                const waitingCount = Number(barber.waiting_clients_count) || 0;
                const waitMinutes = Number(barber.estimated_wait_minutes) || 0;

                return (
                  <div
                    key={barber.id}
                    onClick={() => setSelectedBarber(barber)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/40 shadow-lg shadow-amber-950/30'
                        : 'bg-gray-950/60 border-gray-800 hover:border-gray-700 hover:bg-gray-800/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-start gap-3.5">
                        <img
                          src={barber.image_url || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=300&q=80'}
                          alt={barber.name}
                          className="w-14 h-14 rounded-2xl object-cover border border-amber-500/20 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-bold text-white group-hover:text-amber-400 transition-colors text-sm sm:text-base truncate">
                              {barber.name}
                            </h4>
                            <span
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-amber-500 border-amber-500 text-gray-950 font-bold text-xs'
                                  : 'border-gray-700 bg-gray-900 group-hover:border-gray-500'
                              }`}
                            >
                              {isSelected ? '✓' : ''}
                            </span>
                          </div>

                          <p className="text-xs text-amber-500 font-medium truncate mt-0.5">
                            {barber.specialty || 'Maître Barbier Styliste'}
                          </p>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                            <span className="flex items-center gap-1 text-amber-400 font-bold">
                              ★ {barber.rating || 5.0}
                            </span>
                            <span>•</span>
                            <span>{barber.experience || '8 ans d’exp.'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* LIVE QUEUE COUNTER BADGE ("Ch7al ba9ilo dyal bnadem") */}
                    <div className="mt-3.5 pt-3 border-t border-gray-800/80">
                      {waitingCount === 0 ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-semibold tracking-wide w-full justify-center sm:justify-start">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>{t.bookingModal.queueZero}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs font-semibold tracking-wide w-full justify-center sm:justify-start">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                          <span>
                            {isAr
                              ? `🟠 ${waitingCount} زبائن في الانتظار (~${barber.waiting_badge || waitMinutes + 'د'})`
                              : `🟠 ${waitingCount} client${waitingCount > 1 ? 's' : ''} devant vous (~${barber.waiting_badge || waitMinutes + 'min'})`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stepper Navigation */}
            <div className="pt-4 border-t border-gray-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 transition text-xs sm:text-sm font-semibold cursor-pointer"
              >
                {t.common.back}
              </button>

              <button
                type="button"
                onClick={handleGoToDateTime}
                disabled={!selectedBarber}
                className="px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 transition shadow-lg shadow-amber-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isAr ? 'المتابعة لاختيار الموعد' : 'Choisir la Date & Heure'}</span>
                <span>{isAr ? '←' : '→'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 3: DATE & TIME SLOTS */}
        {/* ---------------------------------------------------- */}
        {!loadingCatalog && currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            {/* Date Selection Control */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t.bookingModal.stepDate}
              </label>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="date"
                  min={getTodayDateString()}
                  value={selectedDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setSelectedDate(newDate);
                    refreshBarbersQueue(newDate);
                  }}
                  className="px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white font-medium focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition cursor-pointer"
                />

                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <span>Barbier sélectionné :</span>
                  <span className="text-amber-400 font-bold">{selectedBarber?.name}</span>
                  <span>({selectedBarber?.waiting_clients_count || 0} en attente)</span>
                </div>
              </div>
            </div>

            {/* Available Time Slots Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  {t.bookingModal.stepSlot} ({totalDuration} {t.common.minutes})
                </label>

                {loadingSlots && (
                  <span className="text-xs text-amber-400 animate-pulse">
                    {t.bookingModal.searchingSlots}
                  </span>
                )}
              </div>

              {/* Slot Legend */}
              <div className="flex items-center gap-4 text-[11px] text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500"></span> {t.bookingModal.legendChosen}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-gray-800 border border-gray-700"></span> Libre
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-red-950/60 border border-red-900/60"></span> {t.bookingModal.legendBooked}
                </span>
              </div>

              {availableSlots.length === 0 && !loadingSlots ? (
                <div className="p-8 text-center rounded-2xl bg-gray-950/40 border border-gray-800 text-gray-400 text-sm">
                  {t.bookingModal.noSlots}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-2">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    const inPast = isSlotInPast(slot, selectedDate);

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={inPast}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-gray-950 shadow-md shadow-amber-500/20 scale-[1.02]'
                            : inPast
                            ? 'bg-gray-950/40 border border-gray-900 text-gray-600 cursor-not-allowed opacity-50'
                            : 'bg-gray-950 border border-gray-800 text-gray-200 hover:border-amber-500/50 hover:bg-gray-800/60'
                        }`}
                      >
                        <span className="text-sm">{slot}</span>
                        {inPast && (
                          <span className="text-[9px] text-gray-500 uppercase tracking-tighter">
                            Passé
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Stepper Navigation */}
            <div className="pt-4 border-t border-gray-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 transition text-xs sm:text-sm font-semibold cursor-pointer"
              >
                {t.common.back}
              </button>

              <button
                type="button"
                onClick={handleGoToConfirmation}
                disabled={!selectedSlot}
                className="px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 transition shadow-lg shadow-amber-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isAr ? 'المتابعة للتأكيد' : 'Récapitulatif & Validation'}</span>
                <span>{isAr ? '←' : '→'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 4: CONFIRMATION & PERSISTENT PHONE UPDATE */}
        {/* ---------------------------------------------------- */}
        {!loadingCatalog && currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            {/* Error Banner */}
            {submitError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 shadow-lg shadow-red-950/30">
                <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1 font-medium">{submitError}</div>
              </div>
            )}

            {/* GUEST BANNER: Prompt to authenticate with draft preservation */}
            {!isAuthenticated ? (
              <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/40 text-amber-200 text-xs space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🔒</span>
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      {isAr ? 'يرجى تسجيل الدخول لتأكيد موعدك VIP' : 'Identification Requise pour Confirmer'}
                    </h4>
                    <p className="mt-1 text-gray-300 leading-relaxed">
                      {isAr
                        ? 'حجزك (الخدمة، الحلاق، التوقيت) محفوظ في المتصفح ! سجّل دخولك أو أنشئ حساباً سريعاً ليتم تأكيد الحجز فوراً.'
                        : 'Vos choix de réservation sont enregistrés. Connectez-vous ou créez votre compte client VIP en 30 secondes pour valider votre créneau.'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={handleGuestRedirectToAuth}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 transition shadow-md shadow-amber-500/20 cursor-pointer text-center"
                  >
                    {t.bookingModal.continueToAuth}
                  </button>
                </div>
              </div>
            ) : (
              /* AUTHENTICATED CLIENT INFO & PERSISTENT PHONE */
              <div className="space-y-4 p-5 rounded-2xl bg-gray-950/60 border border-gray-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  {t.bookingModal.stepClient}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name (Read-only pre-filled) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      {t.bookingModal.yourName}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={user?.name || ''}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 text-xs font-medium cursor-not-allowed select-none"
                    />
                  </div>

                  {/* Email (Read-only pre-filled) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      {t.bookingModal.clientEmail}
                    </label>
                    <input
                      type="email"
                      readOnly
                      value={user?.email || ''}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 text-xs font-medium cursor-not-allowed select-none"
                    />
                  </div>
                </div>

                {/* ONE-TIME PERSISTENT PHONE NUMBER */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-300">
                      {t.bookingModal.yourPhone} <span className="text-amber-500">*</span>
                    </label>

                    {user?.phone && !isEditingPhone && (
                      <button
                        type="button"
                        onClick={() => setIsEditingPhone(true)}
                        className="text-[11px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                      >
                        {t.bookingModal.phoneModify}
                      </button>
                    )}

                    {user?.phone && isEditingPhone && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientPhone(user.phone);
                          setIsEditingPhone(false);
                        }}
                        className="text-[11px] text-gray-400 hover:text-gray-200 underline cursor-pointer"
                      >
                        {t.bookingModal.phoneCancelModify}
                      </button>
                    )}
                  </div>

                  {user?.phone && !isEditingPhone ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs">
                      <div className="flex items-center gap-2">
                        <span>✓</span>
                        <span className="font-semibold">{user.phone}</span>
                        <span className="text-gray-400 text-[10px]">({t.bookingModal.phoneSaved})</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="tel"
                        required
                        placeholder={t.bookingModal.phonePlaceholder}
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white font-medium text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                      />
                      <p className="mt-1 text-[11px] text-gray-400">
                        {t.bookingModal.phoneRequiredNotice}
                      </p>
                    </div>
                  )}
                </div>

                {/* Optional Special Notes */}
                <div className="pt-1">
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    {t.bookingModal.specialNotes}
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    placeholder={t.bookingModal.notesPlaceholder}
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition resize-none"
                  />
                </div>
              </div>
            )}

            {/* RESERVATION SUMMARY CARD */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-950 to-gray-900 border border-amber-500/30 shadow-xl space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {isAr ? 'تفاصيل الموعد' : 'Récapitulatif de votre rendez-vous'}
              </h4>

              <div className="space-y-2 text-xs divide-y divide-gray-800/60">
                {/* Services list */}
                <div className="pb-2 flex items-start justify-between">
                  <span className="text-gray-400">{t.bookingModal.summaryService}</span>
                  <div className="text-right">
                    {selectedServices.map((s) => (
                      <div key={s.id} className="text-white font-semibold">
                        {s.name} ({s.duration} min)
                      </div>
                    ))}
                  </div>
                </div>

                {/* Barber */}
                <div className="py-2 flex items-center justify-between">
                  <span className="text-gray-400">{t.bookingModal.summaryBarber}</span>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <img
                      src={selectedBarber?.image_url || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=150&q=80'}
                      alt={selectedBarber?.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span>{selectedBarber?.name}</span>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="py-2 flex items-center justify-between">
                  <span className="text-gray-400">{t.bookingModal.summaryDateTime}</span>
                  <span className="text-amber-400 font-bold">
                    {selectedDate} à {selectedSlot}
                  </span>
                </div>

                {/* Total Price & Loyalty Points */}
                <div className="pt-2 flex items-center justify-between">
                  <div>
                    <div className="text-gray-400">{t.bookingModal.summaryPrice}</div>
                    <div className="text-[11px] text-amber-500 font-semibold">
                      +{15} {t.bookingModal.loyaltyPoints}
                    </div>
                  </div>
                  <div className="text-xl font-black text-amber-400 font-serif">
                    {totalPrice} {t.common.currency}
                  </div>
                </div>
              </div>
            </div>

            {/* Stepper Navigation */}
            <div className="pt-4 border-t border-gray-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 transition text-xs sm:text-sm font-semibold cursor-pointer"
              >
                {t.common.back}
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmBooking}
                className="px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 transition shadow-lg shadow-amber-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-950/20 border-t-gray-950 rounded-full animate-spin"></div>
                    <span>{t.bookingModal.confirming}</span>
                  </>
                ) : (
                  <>
                    <span>{t.bookingModal.confirmBtn}</span>
                    <span>✓</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 5: SUCCESS CONFIRMATION VIEW */}
        {/* ---------------------------------------------------- */}
        {currentStep === 5 && confirmedBooking && (
          <div className="py-8 px-4 text-center space-y-6 animate-fadeIn">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-3xl font-bold shadow-lg shadow-emerald-500/20">
              ✓
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {t.bookingModal.successTitle}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-gray-300 max-w-md mx-auto leading-relaxed">
                {t.bookingModal.successMsg}
              </p>
            </div>

            {/* Quick Details Pill */}
            <div className="max-w-md mx-auto p-4 rounded-2xl bg-gray-950/80 border border-gray-800 text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-gray-400">Date & Créneau :</span>
                <span className="text-amber-400 font-bold">
                  {confirmedBooking.date} à {confirmedBooking.slot}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Barbier :</span>
                <span className="text-white font-medium">{confirmedBooking.barber?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Points fidélité crédités :</span>
                <span className="text-emerald-400 font-bold">+{confirmedBooking.pointsEarned} pts</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose();
                  navigate('/client');
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 transition shadow-md shadow-amber-500/20 cursor-pointer"
              >
                {t.bookingModal.manageAppointments}
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 transition text-xs font-semibold cursor-pointer"
                >
                  {t.common.close}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

