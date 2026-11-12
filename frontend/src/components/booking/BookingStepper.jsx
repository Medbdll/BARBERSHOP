import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import {
  getServices,
  getBarbers,
  getAvailableSlots,
  bookAppointment,
  getClientAppointmentQueueStatus,
} from '../../api/barberApi';
import { getTodayDateString, isSlotInPast } from '../../utils/dateTime';
import {
  getImageUrl,
  handleImageFallbackError,
  DEFAULT_AVATAR_PLACEHOLDER,
} from '../../utils/getImageUrl';

const PENDING_BOOKING_KEY = 'pending_booking';

const STEP_CONFIG = [
  {
    step: 1,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"
        />
      </svg>
    ),
  },
  {
    step: 2,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
  {
    step: 3,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    step: 4,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

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
  const [services, setServices] = useState(() =>
    Array.isArray(availableServices) && availableServices.length > 0 ? availableServices : []
  );
  const [barbers, setBarbers] = useState(() =>
    Array.isArray(availableBarbers) && availableBarbers.length > 0 ? availableBarbers : []
  );
  const [loadingCatalog, setLoadingCatalog] = useState(
    () => !(availableServices?.length > 0 && availableBarbers?.length > 0)
  );
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
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);

  // Submission & Results
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [liveQueue, setLiveQueue] = useState(null);

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

              if (draft.step) {
                setCurrentStep(Math.min(draft.step, 4));
                setRestoredDraftNotice(true);
              }
            }
          } else {
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

  // Refresh live barber queue for selected date
  const refreshBarbersQueue = useCallback(
    async (targetDate) => {
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
    },
    [selectedBarber]
  );

  // Calculated totals
  const totalDuration = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + (Number(s.duration) || 30), 0);
  }, [selectedServices]);

  const totalPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  }, [selectedServices]);

  const userLoyaltyPoints = Number(user?.loyalty_points || 0);
  const canRedeemLoyalty = isAuthenticated && userLoyaltyPoints >= 10 && totalPrice >= 1;

  const {
    maxUsableLoyaltyPoints,
    appliedDiscountMad,
    finalTotalPrice,
    expectedCashbackPoints,
  } = useMemo(() => {
    const maxFromBalanceMad = Math.floor(userLoyaltyPoints / 10);
    const maxApplicableDiscount = Math.min(maxFromBalanceMad, Math.floor(totalPrice));
    const usablePoints = maxApplicableDiscount * 10;
    const discount = useLoyaltyPoints && canRedeemLoyalty ? maxApplicableDiscount : 0;
    const finalTotal = Math.max(0, Math.round((totalPrice - discount) * 100) / 100);
    const cashback = Math.floor(Number(((finalTotal / 100) * 20).toFixed(6)));
    return {
      maxUsableLoyaltyPoints: usablePoints,
      appliedDiscountMad: discount,
      finalTotalPrice: finalTotal,
      expectedCashbackPoints: cashback,
    };
  }, [userLoyaltyPoints, totalPrice, useLoyaltyPoints, canRedeemLoyalty]);

  // Fetch available slots when entering step 3+ or changing barber/date/duration
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

      const futureSlots = rawSlots.filter((slot) => !isSlotInPast(slot, selectedDate));
      setSelectedSlot((prevSlot) => {
        if (futureSlots.length === 0) return '';
        if (prevSlot && futureSlots.includes(prevSlot)) return prevSlot;
        return futureSlots[0];
      });
    } catch (err) {
      console.error('Failed to fetch available slots:', err);
      setAvailableSlots([]);
      setSelectedSlot('');
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedBarber, selectedDate, totalDuration]);

  useEffect(() => {
    if (currentStep >= 3 && selectedBarber && selectedDate) {
      fetchSlots();
    }
  }, [currentStep, selectedBarber, selectedDate, totalDuration, fetchSlots]);

  // Save draft to sessionStorage
  const saveDraftToStorage = useCallback(
    (stepNumber) => {
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
    },
    [selectedServices, selectedBarber, selectedDate, selectedSlot, clientNotes, currentStep]
  );

  // Toggle service selection
  const handleToggleService = (service) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === service.id);
      if (exists) {
        if (prev.length === 1) return prev; // Keep at least one service selected
        return prev.filter((s) => s.id !== service.id);
      }
      return [...prev, service];
    });
  };

  // Step transitions
  const handleGoToBarbers = useCallback(() => {
    if (selectedServices.length === 0) return;
    saveDraftToStorage(2);
    setCurrentStep(2);
  }, [selectedServices.length, saveDraftToStorage]);

  const handleGoToDateTime = useCallback(() => {
    if (!selectedBarber) return;
    saveDraftToStorage(3);
    setCurrentStep(3);
  }, [selectedBarber, saveDraftToStorage]);

  const handleGoToConfirmation = useCallback(() => {
    if (!selectedSlot) return;
    saveDraftToStorage(4);
    setCurrentStep(4);
  }, [selectedSlot, saveDraftToStorage]);

  // Guest Redirect to Login/Register with preserved draft
  const handleGuestRedirectToAuth = useCallback(() => {
    saveDraftToStorage(4);
    if (onClose) onClose();
    navigate('/login', { state: { returnTo: 'booking' } });
  }, [saveDraftToStorage, onClose, navigate]);

  // Submit Final Booking
  const handleConfirmBooking = useCallback(async () => {
    setSubmitError(null);

    if (!isAuthenticated) {
      handleGuestRedirectToAuth();
      return;
    }

    if (!selectedSlot) {
      setSubmitError(
        isAr ? 'يرجى اختيار توقيت متاح.' : 'Veuillez sélectionner un créneau horaire disponible.'
      );
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
        use_loyalty_points: Boolean(useLoyaltyPoints && canRedeemLoyalty),
      };

      const res = await bookAppointment(payload);

      try {
        sessionStorage.removeItem(PENDING_BOOKING_KEY);
      } catch {
        // Ignore storage error
      }

      if (res?.user && updateUser) {
        updateUser(res.user);
      }

      const initialAhead = Number(res.data?.people_ahead ?? 0);
      setLiveQueue({
        people_ahead: initialAhead,
        estimated_wait_minutes: Number(res.data?.estimated_wait_minutes ?? 0),
        minutes_until_start: Number(res.data?.minutes_until_start ?? 0),
        is_my_turn_now: Boolean(res.data?.is_my_turn_now),
        start_time: res.data?.start_time || selectedSlot,
        status: res.data?.status || 'confirmed',
        droppedFrom: null,
      });

      const confirmedTotalPrice = Number(
        res.total_price ?? res.data?.total_price ?? finalTotalPrice
      );
      const confirmedSubtotalPrice = Number(
        res.subtotal_price ?? res.data?.subtotal_price ?? totalPrice
      );
      const confirmedDiscount = Number(
        res.discount_amount ?? res.data?.discount_amount ?? appliedDiscountMad
      );
      const confirmedPointsUsed = Number(
        res.points_used ??
          res.data?.points_used ??
          (useLoyaltyPoints && canRedeemLoyalty ? maxUsableLoyaltyPoints : 0)
      );
      const confirmedExpectedCashback = Number(
        res.estimated_points_to_earn ??
          res.data?.estimated_points_to_earn ??
          expectedCashbackPoints
      );
      const confirmedCurrentPoints = Number(
        res.current_loyalty_points ??
          res.user?.loyalty_points ??
          Math.max(0, userLoyaltyPoints - confirmedPointsUsed)
      );

      setConfirmedBooking({
        appointment: res.data,
        services: selectedServices,
        barber: selectedBarber,
        date: selectedDate,
        slot: selectedSlot,
        subtotalPrice: confirmedSubtotalPrice,
        discountAmount: confirmedDiscount,
        pointsUsed: confirmedPointsUsed,
        totalPrice: confirmedTotalPrice,
        expectedCashback: confirmedExpectedCashback,
        totalPoints: confirmedCurrentPoints,
      });

      setUseLoyaltyPoints(false);
      setCurrentStep(5);

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

      fetchSlots();
    } finally {
      setSubmitting(false);
    }
  }, [
    isAuthenticated,
    handleGuestRedirectToAuth,
    selectedSlot,
    selectedDate,
    isAr,
    clientPhone,
    user,
    selectedServices,
    selectedBarber,
    clientNotes,
    useLoyaltyPoints,
    canRedeemLoyalty,
    finalTotalPrice,
    totalPrice,
    appliedDiscountMad,
    maxUsableLoyaltyPoints,
    expectedCashbackPoints,
    userLoyaltyPoints,
    updateUser,
    onBookingSuccess,
    fetchSlots,
  ]);

  // Filtered services for Step 1
  const filteredServices = useMemo(() => {
    if (activeCategory === 'all') return services;
    return services.filter((s) => s.category === activeCategory);
  }, [services, activeCategory]);

  // Live Queue Status polling on Step 5 Post-Booking Confirmation screen (every 15s while visible for active appointments today)
  useEffect(() => {
    const appointmentId = confirmedBooking?.appointment?.id;
    const isTodayBooking = confirmedBooking?.date === getTodayDateString();
    const isActiveStatus = ['pending', 'confirmed'].includes(liveQueue?.status || 'confirmed');
    if (currentStep !== 5 || !appointmentId || !isTodayBooking || !isActiveStatus) {
      return undefined;
    }

    let isMounted = true;

    const refreshQueueStatus = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await getClientAppointmentQueueStatus(appointmentId);
        if (!isMounted || !res?.data) return;

        const nextAhead = Number(res.data.people_ahead ?? 0);
        const nextWait = Number(res.data.estimated_wait_minutes ?? 0);
        const nextMinutesUntil = Number(res.data.minutes_until_start ?? 0);
        const nextIsMyTurnNow = Boolean(res.data.is_my_turn_now);
        const nextStartTime = res.data.start_time || confirmedBooking?.slot;
        const nextStatus = res.data.status || 'confirmed';

        setLiveQueue((prev) => {
          const prevAhead = prev?.people_ahead;
          const hasDropped = prevAhead !== undefined && prevAhead !== null && nextAhead < prevAhead;
          return {
            people_ahead: nextAhead,
            estimated_wait_minutes: nextWait,
            minutes_until_start: nextMinutesUntil,
            is_my_turn_now: nextIsMyTurnNow,
            start_time: nextStartTime,
            status: nextStatus,
            droppedFrom: hasDropped ? prevAhead : null,
          };
        });
      } catch (err) {
        console.warn('Queue status polling error:', err?.message || err);
      }
    };

    const pollInterval = setInterval(refreshQueueStatus, 15000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshQueueStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentStep, confirmedBooking?.appointment?.id, confirmedBooking?.date, confirmedBooking?.slot, liveQueue?.status]);

  // Clear queue drop transition highlight cleanly after 4.5s
  useEffect(() => {
    if (liveQueue?.droppedFrom === null || liveQueue?.droppedFrom === undefined) return undefined;
    const timer = setTimeout(() => {
      setLiveQueue((prev) => (prev ? { ...prev, droppedFrom: null } : prev));
    }, 4500);
    return () => clearTimeout(timer);
  }, [liveQueue?.droppedFrom]);

  // Localized step metadata
  const steps = useMemo(() => {
    const titles = [
      t.bookingModal.steps?.step1 || (isAr ? '1. الخدمة' : '1. Prestation'),
      t.bookingModal.steps?.step2 || (isAr ? '2. الحلاق' : '2. Barbier'),
      t.bookingModal.steps?.step3 || (isAr ? '3. الموعد' : '3. Créneau'),
      t.bookingModal.steps?.step4 || (isAr ? '4. التأكيد' : '4. Confirmation'),
    ];
    return STEP_CONFIG.map((item, idx) => ({
      ...item,
      title: titles[idx],
    }));
  }, [t, isAr]);

  const currentStepMeta = steps.find((s) => s.step === currentStep) || steps[0];

  // Primary CTA action unified across Desktop Summary Card & Mobile Fixed Bottom Bar
  const primaryAction = useMemo(() => {
    const forwardArrow = isAr ? '←' : '→';

    if (currentStep === 1) {
      return {
        label: isAr ? 'متابعة: اختيار الحلاق' : 'Continuer',
        icon: forwardArrow,
        disabled: loadingCatalog || selectedServices.length === 0,
        onClick: handleGoToBarbers,
      };
    }

    if (currentStep === 2) {
      return {
        label: isAr ? 'متابعة: الموعد' : 'Continuer',
        icon: forwardArrow,
        disabled: loadingCatalog || !selectedBarber,
        onClick: handleGoToDateTime,
      };
    }

    if (currentStep === 3) {
      return {
        label: isAr ? 'متابعة: التأكيد' : 'Continuer',
        icon: forwardArrow,
        disabled: loadingSlots || !selectedSlot,
        onClick: handleGoToConfirmation,
      };
    }

    if (!isAuthenticated) {
      return {
        label: isAr ? 'تسجيل الدخول للتأكيد' : 'Continuer / Se connecter',
        icon: forwardArrow,
        disabled: false,
        onClick: handleGuestRedirectToAuth,
      };
    }

    return {
      label: submitting
        ? t.bookingModal.confirming
        : isAr
        ? 'تأكيد الحجز'
        : 'Confirmer',
      icon: submitting ? null : '✓',
      disabled: submitting || !selectedSlot,
      onClick: handleConfirmBooking,
    };
  }, [
    currentStep,
    isAr,
    loadingCatalog,
    selectedServices.length,
    handleGoToBarbers,
    selectedBarber,
    handleGoToDateTime,
    loadingSlots,
    selectedSlot,
    handleGoToConfirmation,
    isAuthenticated,
    handleGuestRedirectToAuth,
    submitting,
    t.bookingModal.confirming,
    handleConfirmBooking,
  ]);

  return (
    <div
      dir={dir}
      className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-10 font-sans text-gray-100 ${
        isAr ? 'font-arabic' : ''
      }`}
    >
      {/* ======================================================== */}
      {/* TOP BAR: BRAND HEADER + CLOSE + PROGRESS STEPPER */}
      {/* ======================================================== */}
      <div className="mb-6 rounded-2xl sm:rounded-3xl bg-gray-900/95 border border-gray-800 shadow-2xl p-4 sm:p-6">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </span>
            <div className="min-w-0 text-start">
              <div className="text-[11px] font-bold text-amber-500 uppercase tracking-widest truncate">
                {t.bookingModal.badge || 'Réservation VIP'}
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight truncate">
                {t.bookingModal.title || 'Réservation de Créneau Prestige'}
              </h2>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center text-gray-400 hover:text-white rounded-xl bg-gray-950/60 border border-gray-800 hover:bg-gray-800 transition cursor-pointer shrink-0"
              title={t.common.close}
              aria-label={t.common.close}
            >
              ✕
            </button>
          )}
        </div>

        {/* Restored Draft Banner */}
        {restoredDraftNotice && currentStep < 5 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 text-start">
              <span className="shrink-0">✨</span>
              <span className="truncate">{t.bookingModal.draftRestored}</span>
            </div>
            <button
              type="button"
              onClick={() => setRestoredDraftNotice(false)}
              className="text-amber-400 hover:text-white text-xs px-2 py-1 rounded shrink-0 cursor-pointer"
              aria-label={t.common.close}
            >
              ✕
            </button>
          </div>
        )}

        {/* STEPPER PROGRESS HEADER (Steps 1-4) */}
        {currentStep < 5 && (
          <div className="mt-5 pt-4 border-t border-gray-800/80 select-none">
            {/* MOBILE HEADER: Compact Progress Bar + Title + "Étape X/4" Badge */}
            <div className="sm:hidden space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 text-start">
                  <span className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                    {currentStepMeta.icon}
                  </span>
                  <span className="text-sm font-bold text-white truncate">
                    {currentStepMeta.title}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold shrink-0">
                  {isAr ? `الخطوة ${currentStep}/4` : `Étape ${currentStep}/4`}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                />
              </div>
            </div>

            {/* TABLET / DESKTOP HEADER: Full 4-step Horizontal Indicator with Icons & Titles */}
            <div className="hidden sm:flex items-center justify-between gap-2 md:gap-3">
              {steps.map((s, idx) => {
                const isActive = currentStep === s.step;
                const isPassed = currentStep > s.step;

                return (
                  <React.Fragment key={s.step}>
                    <button
                      type="button"
                      disabled={currentStep < s.step}
                      onClick={() => {
                        if (isPassed) setCurrentStep(s.step);
                      }}
                      className={`flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-start transition-all ${
                        isActive
                          ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-lg shadow-amber-500/10'
                          : isPassed
                          ? 'bg-gray-800/70 border-emerald-500/40 text-gray-200 hover:bg-gray-800 cursor-pointer'
                          : 'bg-gray-950/50 border-gray-800/70 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isPassed
                            ? 'bg-emerald-500 text-gray-950 font-bold text-xs'
                            : isActive
                            ? 'bg-amber-500 text-gray-950'
                            : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {isPassed ? '✓' : s.icon}
                      </span>
                      <span className="text-xs font-semibold truncate">{s.title}</span>
                    </button>

                    {idx < steps.length - 1 && (
                      <div
                        className={`hidden md:block w-4 lg:w-6 h-0.5 shrink-0 rounded-full ${
                          currentStep > s.step ? 'bg-emerald-500/70' : 'bg-gray-800'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* STEPS 1 TO 4: RESPONSIVE 12-COLUMN SPLIT LAYOUT */}
      {/* ======================================================== */}
      {currentStep < 5 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* LEFT / MAIN COLUMN: Interactive Steps */}
          <div className="lg:col-span-8 w-full min-w-0">
            <div className="rounded-2xl sm:rounded-3xl bg-gray-900/95 border border-gray-800 shadow-2xl p-4 sm:p-6 lg:p-8">
              {/* Loading Spinner */}
              {loadingCatalog && (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">{t.common.loading}</p>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 1: SERVICE SELECTION */}
              {/* ---------------------------------------------------- */}
              {!loadingCatalog && currentStep === 1 && (
                <div className="space-y-5">
                  <div className="text-start">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {t.bookingModal.selectService}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {isAr
                        ? 'يمكنك اختيار خدمة واحدة أو دمج عدة خدمات في نفس الموعد.'
                        : 'Sélectionnez une ou plusieurs prestations pour composer votre séance.'}
                    </p>
                  </div>

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
                        className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                          activeCategory === cat.key
                            ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/20'
                            : 'bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Services Adaptive Grid: 1 col mobile -> 2 cols sm+ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {filteredServices.map((service) => {
                      const isSelected = selectedServices.some((s) => s.id === service.id);

                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => handleToggleService(service)}
                          className={`w-full text-start p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                            isSelected
                              ? 'bg-amber-950/25 border-amber-500/70 ring-1 ring-amber-500/40 shadow-lg shadow-amber-950/30'
                              : 'bg-gray-950/60 border-gray-800 hover:border-gray-700 hover:bg-gray-800/40'
                          }`}
                        >
                          <div className="w-full">
                            <div className="flex items-start justify-between gap-2.5">
                              <h4 className="font-bold text-white group-hover:text-amber-400 transition-colors text-sm sm:text-base leading-snug">
                                {isAr ? (service.title_ar || service.name) : (service.title_fr || service.name)}
                              </h4>
                              <span
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                  isSelected
                                    ? 'bg-amber-500 border-amber-500 text-gray-950 font-bold text-xs'
                                    : 'border-gray-700 bg-gray-900 group-hover:border-gray-500'
                                }`}
                              >
                                {isSelected ? '✓' : ''}
                              </span>
                            </div>
                            <p className="mt-1.5 text-xs text-gray-400 line-clamp-2 leading-relaxed">
                              {(isAr ? (service.description_ar || service.description) : (service.description_fr || service.description)) ||
                                (isAr
                                  ? 'خدمة فاخرة مصممة بعناية ودقة عالية.'
                                  : 'Prestation sur-mesure de haute précision.')}
                            </p>
                          </div>

                          <div className="w-full mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs font-medium">
                            <span className="text-gray-400 flex items-center gap-1.5">
                              <span>⏱</span>
                              <span>
                                {service.duration} {t.common.minutes}
                              </span>
                            </span>
                            <span className="text-amber-400 font-bold text-sm">
                              {service.price} {t.common.currency}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 2: BARBER SELECTION WITH LIVE QUEUE COUNTER */}
              {/* ---------------------------------------------------- */}
              {!loadingCatalog && currentStep === 2 && (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-start min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        {t.bookingModal.selectBarber}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {isAr
                          ? 'اطلع على حالة الانتظار المباشرة لكل حلاق واحجز مع خبيرك المفضل.'
                          : 'Consultez la file d’attente en direct et choisissez votre expert.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => refreshBarbersQueue(selectedDate)}
                      className="min-h-[38px] text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-950/60 border border-gray-800 hover:bg-gray-800 transition cursor-pointer shrink-0"
                      title={isAr ? 'تحديث حالة الانتظار' : "Actualiser la file d'attente"}
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span className="hidden sm:inline">
                        {isAr ? 'تحديث' : 'Actualiser'}
                      </span>
                    </button>
                  </div>

                  {/* Barbers Adaptive Grid: 1 col mobile -> 2 cols sm -> 3 cols xl */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {barbers.map((barber) => {
                      const isSelected = selectedBarber?.id === barber.id;
                      const waitingCount = Number(barber.waiting_clients_count) || 0;
                      const waitMinutes = Number(barber.estimated_wait_minutes) || 0;

                      return (
                        <button
                          key={barber.id}
                          type="button"
                          onClick={() => setSelectedBarber(barber)}
                          className={`w-full text-start p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                            isSelected
                              ? 'bg-amber-950/25 border-amber-500/70 ring-1 ring-amber-500/40 shadow-lg shadow-amber-950/30'
                              : 'bg-gray-950/60 border-gray-800 hover:border-gray-700 hover:bg-gray-800/40'
                          }`}
                        >
                          <div className="w-full">
                            <div className="flex items-start gap-3">
                              <img
                                src={getImageUrl(
                                  barber.image_url || barber.photo,
                                  DEFAULT_AVATAR_PLACEHOLDER
                                )}
                                alt={barber.name}
                                onError={(e) => handleImageFallbackError(e, DEFAULT_AVATAR_PLACEHOLDER)}
                                className="w-12 h-12 rounded-xl object-cover border border-amber-500/20 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-1.5">
                                  <h4 className="font-bold text-white group-hover:text-amber-400 transition-colors text-sm truncate">
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
                                  {barber.specialty || t.barbers.defaultTitle}
                                </p>

                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-gray-400">
                                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                                    ★ {barber.rating || 5.0}
                                  </span>
                                  <span>•</span>
                                  <span className="truncate">
                                    {barber.experience || (isAr ? '8 سنوات خبرة' : '8 ans d’exp.')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* LIVE QUEUE COUNTER BADGE */}
                          <div className="w-full mt-3.5 pt-3 border-t border-gray-800/80">
                            {waitingCount === 0 ? (
                              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold leading-snug">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                <span>{t.bookingModal.queueZero}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-[11px] font-semibold leading-snug">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                                <span>
                                  {isAr
                                    ? `${waitingCount} زبائن في الانتظار (~${barber.waiting_badge || waitMinutes + 'د'})`
                                    : `${waitingCount} client${waitingCount > 1 ? 's' : ''} devant vous (~${barber.waiting_badge || waitMinutes + 'min'})`}
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Inline Back Link for Desktop */}
                  <div className="hidden lg:flex pt-2 border-t border-gray-800/70">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="min-h-[42px] px-4 py-2 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 transition text-xs font-semibold cursor-pointer"
                    >
                      {t.common.back}
                    </button>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 3: DATE & TIME SLOTS */}
              {/* ---------------------------------------------------- */}
              {!loadingCatalog && currentStep === 3 && (
                <div className="space-y-6">
                  {/* Date Selection Control */}
                  <div className="space-y-2 text-start">
                    <label
                      htmlFor="booking-date-input"
                      className="block text-xs font-semibold text-gray-300 uppercase tracking-wider"
                    >
                      {t.bookingModal.stepDate}
                    </label>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <input
                        id="booking-date-input"
                        type="date"
                        min={getTodayDateString()}
                        value={selectedDate}
                        onChange={(e) => {
                          const newDate = e.target.value;
                          setSelectedDate(newDate);
                          refreshBarbersQueue(newDate);
                        }}
                        className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-700 text-white font-medium text-base sm:text-sm text-start focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition cursor-pointer"
                      />

                      <div className="text-xs text-gray-400 flex flex-wrap items-center gap-1.5">
                        <span>{isAr ? 'الحلاق المختار :' : 'Barbier sélectionné :'}</span>
                        <span className="text-amber-400 font-bold">{selectedBarber?.name}</span>
                        <span>
                          ({selectedBarber?.waiting_clients_count || 0}{' '}
                          {isAr ? 'في الانتظار' : 'en attente'})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Available Time Slots Grid */}
                  <div className="space-y-3 text-start">
                    <div className="flex flex-wrap items-center justify-between gap-2">
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
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-amber-500 shrink-0" />
                        <span>{t.bookingModal.legendChosen}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-gray-800 border border-gray-700 shrink-0" />
                        <span>{t.common.available}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-red-950/60 border border-red-900/60 shrink-0" />
                        <span>{t.bookingModal.legendBooked}</span>
                      </span>
                    </div>

                    {availableSlots.length === 0 && !loadingSlots ? (
                      <div className="p-8 text-center rounded-2xl bg-gray-950/40 border border-gray-800 text-gray-400 text-sm">
                        {t.bookingModal.noSlots}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-1">
                        {availableSlots.map((slot) => {
                          const isSelected = selectedSlot === slot;
                          const inPast = isSlotInPast(slot, selectedDate);

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={inPast}
                              onClick={() => setSelectedSlot(slot)}
                              className={`min-h-[44px] py-2.5 px-2 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-gray-950 shadow-md shadow-amber-500/20 scale-[1.02]'
                                  : inPast
                                  ? 'bg-gray-950/40 border border-gray-900 text-gray-600 cursor-not-allowed opacity-50'
                                  : 'bg-gray-950 border border-gray-800 text-gray-200 hover:border-amber-500/50 hover:bg-gray-800/60'
                              }`}
                            >
                              <span className="text-sm leading-none">{slot}</span>
                              {inPast && (
                                <span className="text-[9px] text-gray-500 uppercase tracking-tighter">
                                  {t.common.passed}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Inline Back Link for Desktop */}
                  <div className="hidden lg:flex pt-2 border-t border-gray-800/70">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="min-h-[42px] px-4 py-2 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 transition text-xs font-semibold cursor-pointer"
                    >
                      {t.common.back}
                    </button>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 4: CLIENT INFO & PERSISTENT PHONE UPDATE */}
              {/* ---------------------------------------------------- */}
              {!loadingCatalog && currentStep === 4 && (
                <div className="space-y-5">
                  {/* Error Banner */}
                  {submitError && (
                    <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 shadow-lg shadow-red-950/30 text-start">
                      <svg
                        className="w-4 h-4 text-red-400 mt-0.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="flex-1 font-medium">{submitError}</div>
                    </div>
                  )}

                  {/* GUEST BANNER */}
                  {!isAuthenticated ? (
                    <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/40 text-amber-200 text-xs space-y-4 text-start">
                      <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0">🔒</span>
                        <div>
                          <h4 className="font-bold text-sm text-white">
                            {isAr
                              ? 'يرجى تسجيل الدخول لتأكيد موعدك VIP'
                              : 'Identification Requise pour Confirmer'}
                          </h4>
                          <p className="mt-1.5 text-gray-300 leading-relaxed text-xs sm:text-sm">
                            {isAr
                              ? 'حجزك (الخدمة، الحلاق، التوقيت) محفوظ في المتصفح ! سجّل دخولك أو أنشئ حساباً سريعاً ليتم تأكيد الحجز فوراً.'
                              : 'Vos choix de réservation sont enregistrés. Connectez-vous ou créez votre compte client VIP en 30 secondes pour valider votre créneau.'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={handleGuestRedirectToAuth}
                          className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 transition shadow-md shadow-amber-500/20 cursor-pointer text-center"
                        >
                          {t.bookingModal.continueToAuth}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* AUTHENTICATED CLIENT INFO & PERSISTENT PHONE */
                    <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-gray-950/60 border border-gray-800 text-start">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        {t.bookingModal.stepClient}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Name (Read-only pre-filled) */}
                        <div>
                          <label
                            htmlFor="client-name-input"
                            className="block text-xs font-medium text-gray-400 mb-1.5"
                          >
                            {t.bookingModal.yourName}
                          </label>
                          <input
                            id="client-name-input"
                            type="text"
                            readOnly
                            value={user?.name || ''}
                            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 text-base sm:text-sm font-medium text-start cursor-not-allowed select-none"
                          />
                        </div>

                        {/* Email (Read-only pre-filled) */}
                        <div>
                          <label
                            htmlFor="client-email-input"
                            className="block text-xs font-medium text-gray-400 mb-1.5"
                          >
                            {t.bookingModal.clientEmail}
                          </label>
                          <input
                            id="client-email-input"
                            type="email"
                            readOnly
                            value={user?.email || ''}
                            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 text-base sm:text-sm font-medium text-start cursor-not-allowed select-none"
                          />
                        </div>
                      </div>

                      {/* ONE-TIME PERSISTENT PHONE NUMBER */}
                      <div className="pt-1">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label
                            htmlFor="client-phone-input"
                            className="block text-xs font-medium text-gray-300"
                          >
                            {t.bookingModal.yourPhone} <span className="text-amber-500">*</span>
                          </label>

                          {user?.phone && !isEditingPhone && (
                            <button
                              type="button"
                              onClick={() => setIsEditingPhone(true)}
                              className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer shrink-0"
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
                              className="text-xs text-gray-400 hover:text-gray-200 underline cursor-pointer shrink-0"
                            >
                              {t.bookingModal.phoneCancelModify}
                            </button>
                          )}
                        </div>

                        {user?.phone && !isEditingPhone ? (
                          <div className="flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="shrink-0">✓</span>
                              <span className="font-semibold" dir="ltr">
                                {user.phone}
                              </span>
                              <span className="text-gray-400 text-xs truncate">
                                ({t.bookingModal.phoneSaved})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <input
                              id="client-phone-input"
                              type="tel"
                              required
                              placeholder={t.bookingModal.phonePlaceholder}
                              value={clientPhone}
                              onChange={(e) => setClientPhone(e.target.value)}
                              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white font-medium text-base sm:text-sm text-start focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                            />
                            <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
                              {t.bookingModal.phoneRequiredNotice}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Optional Special Notes */}
                      <div className="pt-1">
                        <label
                          htmlFor="client-notes-input"
                          className="block text-xs font-medium text-gray-300 mb-1.5"
                        >
                          {t.bookingModal.specialNotes}
                        </label>
                        <textarea
                          id="client-notes-input"
                          rows={3}
                          maxLength={500}
                          value={clientNotes}
                          onChange={(e) => setClientNotes(e.target.value)}
                          placeholder={t.bookingModal.notesPlaceholder}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white text-base sm:text-sm text-start placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition resize-none"
                        />
                      </div>

                      {/* Loyalty Cashback Redemption Toggle (Authenticated users with >= 10 pts) */}
                      {userLoyaltyPoints >= 10 && (
                        <div className="pt-1">
                          <div
                            className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                              useLoyaltyPoints && canRedeemLoyalty
                                ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10'
                                : 'bg-gray-900/90 border-amber-500/25 hover:border-amber-500/45'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 text-start space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-amber-400 text-sm shrink-0">★</span>
                                  <span className="text-xs sm:text-sm font-bold text-white leading-snug">
                                    {isAr
                                      ? `استخدام رصيدي (${userLoyaltyPoints} نقطة = -${Math.floor(userLoyaltyPoints / 10)} ${t.common.currency})`
                                      : `Utiliser mes ${userLoyaltyPoints} points (-${Math.floor(userLoyaltyPoints / 10)} MAD)`}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-400 leading-relaxed">
                                  {useLoyaltyPoints && canRedeemLoyalty
                                    ? isAr
                                      ? `سيتم خصم ${maxUsableLoyaltyPoints} نقطة (-${appliedDiscountMad} ${t.common.currency})`
                                      : `${maxUsableLoyaltyPoints} pts utilisés • Réduction appliquée : -${appliedDiscountMad} ${t.common.currency}`
                                    : Math.floor(userLoyaltyPoints / 10) > Math.floor(totalPrice)
                                      ? isAr
                                        ? `الحد الأقصى للخصم على هذا الموعد : -${Math.floor(totalPrice)} ${t.common.currency} (${Math.floor(totalPrice) * 10} نقطة)`
                                        : `Max applicable sur ce RDV : -${Math.floor(totalPrice)} ${t.common.currency} (${Math.floor(totalPrice) * 10} pts)`
                                      : isAr
                                        ? '10 نقاط = 1 د.م تخفيض • 100 د.م = 20 نقطة'
                                        : '10 pts = 1 MAD de réduction • 100 MAD = 20 pts'}
                                </p>
                              </div>

                              <button
                                type="button"
                                role="switch"
                                aria-checked={Boolean(useLoyaltyPoints && canRedeemLoyalty)}
                                disabled={!canRedeemLoyalty}
                                onClick={() => setUseLoyaltyPoints((prev) => !prev)}
                                className={`relative inline-flex items-center w-12 h-7 p-1 rounded-full shrink-0 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                  useLoyaltyPoints && canRedeemLoyalty
                                    ? 'bg-amber-500 justify-end shadow-inner'
                                    : 'bg-gray-700 justify-start'
                                }`}
                                aria-label={
                                  isAr
                                    ? 'تفعيل خصم نقاط الولاء'
                                    : 'Activer la réduction points de fidélité'
                                }
                              >
                                <span className="w-5 h-5 rounded-full bg-white shadow-md transition-transform" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MOBILE-ONLY SUMMARY REVIEW CARD (Hidden on Desktop where Sticky Sidebar is visible) */}
                  <div className="lg:hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-gray-950 to-gray-900 border border-amber-500/30 shadow-xl space-y-3 text-start">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      {isAr ? 'ملخص الموعد' : 'Récapitulatif de votre rendez-vous'}
                    </h4>

                    <div className="space-y-2.5 text-xs divide-y divide-gray-800/70">
                      <div className="pb-2 flex items-start justify-between gap-3">
                        <span className="text-gray-400 shrink-0">
                          {t.bookingModal.summaryService}
                        </span>
                        <div className="text-end">
                          {selectedServices.map((s) => (
                            <div key={s.id} className="text-white font-semibold">
                              {isAr ? (s.title_ar || s.name) : (s.title_fr || s.name)} ({s.duration_minutes || s.duration} {t.common.minutes})
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="py-2 flex items-center justify-between gap-3">
                        <span className="text-gray-400 shrink-0">
                          {t.bookingModal.summaryBarber}
                        </span>
                        <div className="flex items-center gap-2 text-white font-semibold">
                          <img
                            src={getImageUrl(
                              selectedBarber?.photo || selectedBarber?.image_url,
                              DEFAULT_AVATAR_PLACEHOLDER
                            )}
                            alt={selectedBarber?.name}
                            onError={(e) => handleImageFallbackError(e, DEFAULT_AVATAR_PLACEHOLDER)}
                            className="w-6 h-6 rounded-full object-cover shrink-0"
                          />
                          <span>{selectedBarber?.name}</span>
                        </div>
                      </div>

                      <div className="py-2 flex items-center justify-between gap-3">
                        <span className="text-gray-400 shrink-0">
                          {t.bookingModal.summaryDateTime}
                        </span>
                        <span className="text-amber-400 font-bold text-end">
                          {selectedDate} • {selectedSlot}
                        </span>
                      </div>

                      {appliedDiscountMad > 0 && (
                        <>
                          <div className="py-2 flex items-center justify-between gap-3 text-gray-400">
                            <span>{isAr ? 'المبلغ الفرعي' : 'Sous-total'}</span>
                            <span className="line-through">
                              {totalPrice} {t.common.currency}
                            </span>
                          </div>
                          <div className="py-2 flex items-center justify-between gap-3 text-emerald-400 font-semibold">
                            <span>
                              {isAr
                                ? `خصم الولاء (-${maxUsableLoyaltyPoints} نقطة)`
                                : `Fidélité (-${maxUsableLoyaltyPoints} pts)`}
                            </span>
                            <span>
                              -{appliedDiscountMad} {t.common.currency}
                            </span>
                          </div>
                        </>
                      )}

                      <div className="pt-2 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-gray-400">{t.bookingModal.summaryPrice}</div>
                          <div className="text-[11px] text-amber-500 font-semibold">
                            +{expectedCashbackPoints}{' '}
                            {isAr ? 'نقطة عند إتمام الحجز' : 'pts fidélité après visite'}
                          </div>
                        </div>
                        <div className="text-lg font-black text-amber-400 font-serif">
                          {finalTotalPrice} {t.common.currency}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inline Back Link for Desktop */}
                  <div className="hidden lg:flex pt-2 border-t border-gray-800/70">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="min-h-[42px] px-4 py-2 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 transition text-xs font-semibold cursor-pointer"
                    >
                      {t.common.back}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT / SUMMARY COLUMN: Sticky Desktop Récapitulatif Card */}
          <aside className="lg:col-span-4 hidden lg:block sticky top-24">
            <div className="rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border border-amber-500/30 shadow-2xl p-6 space-y-5 text-start">
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-amber-500">
                    BARBEROZA SHOP
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    {isAr ? 'ملخص الحجز' : 'Récapitulatif'}
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                  {isAr ? `الخطوة ${currentStep}/4` : `Étape ${currentStep}/4`}
                </span>
              </div>

              <div className="space-y-3.5 text-xs divide-y divide-gray-800/70">
                {/* Selected Services */}
                <div className="pb-3 space-y-1.5">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>{t.bookingModal.summaryService}</span>
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="text-amber-400 hover:text-amber-300 underline text-[11px] cursor-pointer"
                      >
                        {t.bookingModal.phoneModify}
                      </button>
                    )}
                  </div>
                  {selectedServices.length > 0 ? (
                    <ul className="space-y-1.5 pt-1">
                      {selectedServices.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between gap-2 text-white font-medium"
                        >
                          <span className="truncate">{isAr ? (s.title_ar || s.name) : (s.title_fr || s.name)}</span>
                          <span className="text-amber-400 shrink-0 font-semibold">
                            {s.price} {t.common.currency}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-500 italic">
                      {isAr ? 'لم يتم اختيار خدمة بعد' : 'Aucune prestation sélectionnée'}
                    </div>
                  )}
                </div>

                {/* Selected Barber */}
                <div className="py-3 space-y-1.5">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>{t.bookingModal.summaryBarber}</span>
                    {currentStep > 2 && selectedBarber && (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="text-amber-400 hover:text-amber-300 underline text-[11px] cursor-pointer"
                      >
                        {t.bookingModal.phoneModify}
                      </button>
                    )}
                  </div>
                  {selectedBarber ? (
                    <div className="flex items-center gap-2.5 pt-1">
                      <img
                        src={getImageUrl(
                          selectedBarber.image_url || selectedBarber.photo,
                          DEFAULT_AVATAR_PLACEHOLDER
                        )}
                        alt={selectedBarber.name}
                        onError={(e) => handleImageFallbackError(e, DEFAULT_AVATAR_PLACEHOLDER)}
                        className="w-8 h-8 rounded-full object-cover border border-amber-500/30 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-white font-semibold truncate">
                          {selectedBarber.name}
                        </div>
                        <div className="text-[11px] text-amber-500 truncate">
                          {selectedBarber.specialty || t.barbers.defaultTitle}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 italic">
                      {isAr ? 'يتم اختياره في الخطوة 2' : 'À choisir à l’étape 2'}
                    </div>
                  )}
                </div>

                {/* Date & Time Slot */}
                <div className="py-3 space-y-1.5">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>{t.bookingModal.summaryDateTime}</span>
                    {currentStep > 3 && selectedSlot && (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="text-amber-400 hover:text-amber-300 underline text-[11px] cursor-pointer"
                      >
                        {t.bookingModal.phoneModify}
                      </button>
                    )}
                  </div>
                  {selectedDate && selectedSlot ? (
                    <div className="text-amber-400 font-bold text-sm pt-0.5">
                      {selectedDate} • {selectedSlot}
                    </div>
                  ) : (
                    <div className="text-gray-500 italic">
                      {isAr ? 'يتم اختياره في الخطوة 3' : 'À choisir à l’étape 3'}
                    </div>
                  )}
                </div>

                {/* Totals & Loyalty */}
                <div className="pt-3 space-y-2.5">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>{t.common.duration}</span>
                    <span className="text-white font-semibold">
                      {totalDuration} {t.common.minutes}
                    </span>
                  </div>

                  {appliedDiscountMad > 0 && (
                    <>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{isAr ? 'المبلغ الفرعي' : 'Sous-total'}</span>
                        <span className="line-through">
                          {totalPrice} {t.common.currency}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                        <span>
                          {isAr
                            ? `خصم الولاء (-${maxUsableLoyaltyPoints} نقطة)`
                            : `Fidélité (-${maxUsableLoyaltyPoints} pts)`}
                        </span>
                        <span>
                          -{appliedDiscountMad} {t.common.currency}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <div className="text-gray-300 font-medium">
                        {t.bookingModal.summaryPrice}
                      </div>
                      <div className="text-[11px] text-amber-500 font-semibold">
                        +{expectedCashbackPoints}{' '}
                        {isAr ? 'نقطة عند إتمام الحجز' : 'pts fidélité après visite'}
                      </div>
                    </div>
                    <div className="text-2xl font-black text-amber-400 font-serif">
                      {finalTotalPrice} {t.common.currency}
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Action Controls */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                  className="w-full min-h-[48px] px-5 py-3 rounded-xl font-bold text-sm uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 transition shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting && currentStep === 4 ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-950/20 border-t-gray-950 rounded-full animate-spin" />
                      <span>{primaryAction.label}</span>
                    </>
                  ) : (
                    <>
                      <span>{primaryAction.label}</span>
                      {primaryAction.icon && <span>{primaryAction.icon}</span>}
                    </>
                  )}
                </button>

                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                    className="w-full min-h-[40px] px-4 py-2 rounded-xl border border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800/70 transition text-xs font-semibold cursor-pointer"
                  >
                    {t.common.back}
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ======================================================== */}
      {/* MOBILE FIXED BOTTOM SUMMARY BAR (Steps 1-4) */}
      {/* ======================================================== */}
      {currentStep < 5 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/90 px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.65)]">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0 text-start">
              <div className="flex items-baseline gap-1.5 flex-wrap leading-tight">
                <span className="text-base sm:text-lg font-black text-amber-400 font-serif truncate">
                  {finalTotalPrice} {t.common.currency}
                </span>
                {appliedDiscountMad > 0 && (
                  <span className="text-[11px] text-emerald-400 font-semibold whitespace-nowrap">
                    (-{appliedDiscountMad} {t.common.currency})
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-1.5 truncate mt-0.5">
                <span>⏱ {totalDuration} {t.common.minutes}</span>
                <span>•</span>
                <span>
                  {selectedServices.length}{' '}
                  {isAr ? 'خدمات' : selectedServices.length > 1 ? 'services' : 'service'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                  aria-label={t.common.back}
                  title={t.common.back}
                  className="min-h-[44px] min-w-[44px] px-3 py-2.5 rounded-xl border border-gray-700 bg-gray-900 text-gray-300 hover:text-white hover:bg-gray-800 transition text-sm font-bold cursor-pointer flex items-center justify-center"
                >
                  {isAr ? '→' : '←'}
                </button>
              )}

              <button
                type="button"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className="min-h-[44px] px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 transition shadow-lg shadow-amber-600/25 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {submitting && currentStep === 4 ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-950/20 border-t-gray-950 rounded-full animate-spin" />
                    <span>{isAr ? 'جاري...' : 'Envoi...'}</span>
                  </>
                ) : (
                  <>
                    <span>{primaryAction.label}</span>
                    {primaryAction.icon && <span>{primaryAction.icon}</span>}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 5: SUCCESS CONFIRMATION VIEW */}
      {/* ======================================================== */}
      {currentStep === 5 && confirmedBooking && (
        <div className="max-w-2xl mx-auto rounded-2xl sm:rounded-3xl bg-gray-900/95 border border-gray-800 shadow-2xl p-6 sm:p-10 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-3xl font-bold shadow-lg shadow-emerald-500/20">
            ✓
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {t.bookingModal.successTitle}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-gray-300 max-w-md mx-auto leading-relaxed">
              {t.bookingModal.successMsg}
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-2xl bg-gray-950/80 border border-gray-800 text-xs space-y-2.5 text-start">
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-400">{t.bookingModal.summaryDateTime}</span>
              <span className="text-amber-400 font-bold">
                {confirmedBooking.date} • {confirmedBooking.slot}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-400">{t.bookingModal.summaryBarber}</span>
              <span className="text-white font-medium">{confirmedBooking.barber?.name}</span>
            </div>
            {confirmedBooking.discountAmount > 0 && (
              <>
                <div className="flex items-center justify-between gap-2 text-gray-400">
                  <span>{isAr ? 'المبلغ الفرعي' : 'Sous-total'}</span>
                  <span className="line-through">
                    {confirmedBooking.subtotalPrice} {t.common.currency}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-emerald-400">
                    {isAr
                      ? `خصم الولاء (-${confirmedBooking.pointsUsed} نقطة)`
                      : `Réduction fidélité (-${confirmedBooking.pointsUsed} pts)`}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    -{confirmedBooking.discountAmount} {t.common.currency}
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-800/80">
              <span className="text-gray-300 font-medium">{t.bookingModal.summaryPrice}</span>
              <span className="text-amber-400 font-black">
                {confirmedBooking.totalPrice} {t.common.currency}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-400">
                {isAr ? 'كاشباك متوقع (بعد الحضور)' : 'Cashback attendu (fin de visite)'}
              </span>
              <span className="text-emerald-400 font-bold">
                +{confirmedBooking.expectedCashback} pts
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-400">
                {isAr ? 'رصيدك الحالي' : 'Solde fidélité actuel'}
              </span>
              <span className="text-amber-300 font-semibold">
                {confirmedBooking.totalPoints} pts
              </span>
            </div>
          </div>

          {/* LIVE QUEUE COUNTER ON POST-BOOKING CONFIRMATION (3 STATES) */}
          {liveQueue && ['pending', 'confirmed', 'in_progress'].includes(liveQueue.status) && (
            <div className="max-w-md mx-auto text-start">
              {/* Case 1: people_ahead === 0 AND today <= 30 min left (or in_progress) */}
              {liveQueue.status === 'in_progress' || liveQueue.is_my_turn_now === true ? (
                <div
                  className={`p-4 rounded-2xl border bg-emerald-500/20 border-emerald-500/50 text-emerald-300 text-xs sm:text-sm font-bold flex flex-wrap items-center justify-between gap-2 transition-all duration-500 ${
                    liveQueue.droppedFrom !== null
                      ? 'ring-2 ring-emerald-400 scale-[1.02] shadow-lg shadow-emerald-950/50'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                    </span>
                    <span>
                      {isAr
                        ? '🟢 حان دورك ! الحلاق في انتظارك.'
                        : "🟢 C'est votre tour ! Le barbier vous attend."}
                    </span>
                  </div>
                  {liveQueue.droppedFrom !== null && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-emerald-200 text-[10px] font-mono animate-pulse">
                      ↓ {liveQueue.droppedFrom} → 0
                    </span>
                  )}
                </div>
              ) : liveQueue.people_ahead === 0 ? (
                /* Case 2: people_ahead === 0 BUT > 30 min left or future date */
                <div
                  className={`p-4 rounded-2xl border bg-gradient-to-r from-sky-500/15 to-amber-500/15 border-amber-500/40 text-amber-200 text-xs sm:text-sm font-semibold space-y-1.5 transition-all duration-500 ${
                    liveQueue.droppedFrom !== null ? 'ring-2 ring-sky-400/70 scale-[1.02]' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" />
                      <span>
                        {isAr
                          ? `✨ أنت الأول في هذا الموعد (الموعد على الساعة ${liveQueue.start_time || confirmedBooking.slot})`
                          : `✨ Vous êtes le 1er sur ce créneau (RDV prévu à ${liveQueue.start_time || confirmedBooking.slot})`}
                      </span>
                    </div>
                    {liveQueue.droppedFrom !== null && (
                      <span className="px-2 py-0.5 rounded-full bg-sky-400/20 border border-sky-400/40 text-sky-200 text-[10px] font-mono">
                        ↓ {liveQueue.droppedFrom} → 0
                      </span>
                    )}
                  </div>
                  {confirmedBooking.date === getTodayDateString() && (
                    <div className="text-[11px] text-gray-400 font-normal">
                      {isAr
                        ? 'يتم تحديث التنبيه تلقائياً قبل 30 دقيقة من موعدك.'
                        : 'Actualisation en direct toutes les 15s à l’approche du rendez-vous.'}
                    </div>
                  )}
                </div>
              ) : (
                /* Case 3: people_ahead > 0 */
                <div
                  className={`p-4 rounded-2xl border bg-amber-500/15 border-amber-500/40 text-amber-300 text-xs sm:text-sm font-semibold space-y-1.5 transition-all duration-500 ${
                    liveQueue.droppedFrom !== null
                      ? 'ring-2 ring-emerald-400/80 border-emerald-400/60 bg-emerald-500/10 scale-[1.02]'
                      : ''
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                      <span>
                        {isAr
                          ? `⏳ أشخاص قبلك : ${liveQueue.people_ahead}${
                              liveQueue.estimated_wait_minutes > 0
                                ? ` (~${liveQueue.estimated_wait_minutes} د)`
                                : ''
                            }`
                          : `⏳ Personnes avant vous : ${liveQueue.people_ahead}${
                              liveQueue.estimated_wait_minutes > 0
                                ? ` (~${liveQueue.estimated_wait_minutes} min)`
                                : ''
                            }`}
                      </span>
                    </div>
                    {liveQueue.droppedFrom !== null && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold animate-bounce">
                        ↓ {liveQueue.droppedFrom} → {liveQueue.people_ahead}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 font-normal">
                    {isAr
                      ? 'يتم تحديث الدور تلقائياً كل 15 ثانية.'
                      : 'Mise à jour automatique en direct toutes les 15s.'}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (onClose) onClose();
                navigate('/client/dashboard');
              }}
              className="w-full sm:w-auto min-h-[44px] px-6 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 transition shadow-md shadow-amber-500/20 cursor-pointer"
            >
              {t.bookingModal.manageAppointments}
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto min-h-[44px] px-6 py-3 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 transition text-xs sm:text-sm font-semibold cursor-pointer"
              >
                {t.common.close}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
