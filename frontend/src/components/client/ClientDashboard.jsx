import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import BrandLogo from '../common/BrandLogo';
import LanguageSwitcher from '../common/LanguageSwitcher';
import AvatarUploader from '../common/AvatarUploader';
import BookingModal from '../landing/BookingModal';
import {
  getServices,
  getBarbers,
  getAvailableSlots,
  getClientAppointments,
  cancelClientAppointment,
  rescheduleClientAppointment,
  submitClientReview,
  updateUserProfile,
} from '../../api/barberApi';
import { getTodayDateString, isSlotInPast } from '../../utils/dateTime';
import {
  getImageUrl,
  handleImageFallbackError,
  DEFAULT_AVATAR_PLACEHOLDER,
} from '../../utils/getImageUrl';

const PENDING_BOOKING_KEY = 'pending_booking';

const DASHBOARD_COPY = {
  fr: {
    brandSubtitle: 'Espace Client VIP',
    languageLabel: 'Langue',
    nav: {
      appointments: 'Mes Rendez-vous',
      history: 'Mon Historique',
      loyalty: 'Fidélité & Favoris',
      profile: 'Mon Profil',
    },
    ctaBook: '+ Prendre un RDV',
    logout: 'Déconnexion',
    welcome: 'Bonjour',
    welcomeSubtitle: 'Gérez vos réservations en direct, suivez votre tour et cumulez vos récompenses.',
    loyalty: {
      badge: 'Portefeuille Fidélité VIP',
      progressText: '{done}/9 coupes réalisées — la 10ème offerte !',
      freeReady: 'Félicitations ! Votre prochaine coupe est offerte !',
      pointsLabel: 'Solde actuel',
      walletSummary: 'Solde : {points} pts = {amount} MAD de réduction',
      discountNote: '≈ {amount} MAD de remise',
      favoritesTitle: 'Vos Barbiers Favoris',
      favoritesEmpty: 'Vos barbiers préférés apparaîtront ici dès votre première visite.',
      visitsCount: '{count} visite(s)',
      currency: 'MAD',
      ptsUnit: 'pts',
    },
    statuses: {
      confirmed: 'Confirmé',
      pending: 'En attente',
      cancelled: 'Annulé',
      completed: 'Terminé',
      no_show: 'Absent',
      in_progress: 'Au fauteuil',
    },
    queue: {
      myTurn: "🟢 C'est votre tour ! Le barbier vous attend.",
      firstInSlot: '✨ Vous êtes le 1er sur ce créneau (RDV prévu à {time})',
      ahead: '⏳ {count} {unit} avant vous',
      aheadDropped: '↓ File avancée',
      unitSingle: 'client',
      unitPlural: 'clients',
      liveSync: 'Synchro auto 15s',
    },
    appointments: {
      title: 'Mes Rendez-vous',
      subtitle: 'Suivi de votre position dans la file et gestion de vos créneaux à venir.',
      emptyTitle: 'Aucun rendez-vous à venir',
      emptyDesc: 'Planifiez votre prochaine coupe auprès de nos maîtres barbiers en quelques secondes.',
      barberLabel: 'Barbier',
      dateLabel: 'Date',
      timeLabel: 'Heure',
      priceLabel: 'Tarif',
      reschedule: 'Reporter',
      cancel: 'Annuler',
      inChairNotice: '✂️ Prestation en cours au fauteuil',
    },
    history: {
      title: 'Mon Historique',
      subtitle: 'Retrouvez vos visites précédentes, notez nos barbiers ou réservez à nouveau en un clic.',
      emptyTitle: 'Aucun historique disponible',
      emptyDesc: 'Vos prestations passées ou annulées s’afficheront ici.',
      bookAgain: 'Réserver à nouveau',
      rate: 'Noter (1-5 ★)',
      ratedBadge: 'Noté ★ {rating}/5',
    },
    profile: {
      title: 'Mon Profil',
      subtitle: 'Mettez à jour vos coordonnées pour vos rappels SMS et confirmations rapides.',
      nameLabel: 'Nom complet',
      emailLabel: 'Adresse E-mail',
      phoneLabel: 'Numéro de téléphone',
      phonePlaceholder: '+212 6 XX XX XX XX',
      saveBtn: 'Sauvegarder',
      saving: 'Enregistrement...',
      savedSuccess: 'Votre profil a été mis à jour avec succès.',
      saveError: 'Impossible de mettre à jour le profil. Vérifiez vos informations.',
    },
    modals: {
      cancelTitle: 'Annuler le rendez-vous',
      cancelConfirmDesc: 'Êtes-vous sûr de vouloir annuler le créneau du {date} à {time} avec {barber} ?',
      cancelKeep: 'Conserver le RDV',
      cancelConfirmBtn: 'Confirmer l’annulation',
      rescheduleTitle: 'Reporter le rendez-vous',
      rescheduleDate: 'Nouvelle date',
      rescheduleSlot: 'Créneaux disponibles',
      noSlots: 'Aucun créneau disponible pour cette date.',
      rescheduleSave: 'Confirmer le report',
      rateTitle: 'Évaluer votre séance',
      rateSubtitle: 'Partagez votre expérience avec {barber} (+20 pts fidélité)',
      rateComment: 'Votre commentaire',
      ratePlaceholder: 'Décrivez la précision de la coupe, l’accueil...',
      rateSubmit: 'Publier l’avis',
      close: 'Fermer',
    },
    feedback: {
      cancelled: 'Rendez-vous annulé avec succès.',
      cancelledRefunded: 'Rendez-vous annulé et {pts} pts fidélité remboursés !',
      rescheduled: 'Votre rendez-vous a été reporté.',
      rated: 'Merci pour votre avis ! +20 pts crédités.',
      errorGeneric: 'Une erreur est survenue. Veuillez réessayer.',
    },
  },
  ar: {
    brandSubtitle: 'فضاء الزبون VIP',
    languageLabel: 'اللغة',
    nav: {
      appointments: 'مواعيدي',
      history: 'سجل الزيارات',
      loyalty: 'الولاء والمفضلون',
      profile: 'ملفي الشخصي',
    },
    ctaBook: '+ حجز موعد جديد',
    logout: 'تسجيل الخروج',
    welcome: 'مرحباً بك،',
    welcomeSubtitle: 'تابع مواعيدك مباشرة، اعرف دورك في قائمة الانتظار، واجمع نقاط المكافآت.',
    loyalty: {
      badge: 'محفظة الوفاء VIP',
      progressText: '{done}/9 قصات منجزة — القصة العاشرة مجانية!',
      freeReady: 'مبروك! قصتك القادمة مجانية بالكامل!',
      pointsLabel: 'الرصيد الحالي',
      walletSummary: 'الرصيد : {points} نقطة = {amount} درهم خصم',
      discountNote: '≈ {amount} درهم خصم',
      favoritesTitle: 'حلاقوك المفضلون',
      favoritesEmpty: 'سيظهر حلاقوك المفضلون هنا بعد أول زيارة لك.',
      visitsCount: '{count} زيارة',
      currency: 'درهم',
      ptsUnit: 'نقطة',
    },
    statuses: {
      confirmed: 'مؤكد',
      pending: 'قيد الانتظار',
      cancelled: 'ملغى',
      completed: 'مكتمل',
      no_show: 'متغيب',
      in_progress: 'في الكرسي الآن',
    },
    queue: {
      myTurn: '🟢 حان دورك ! الحلاق في انتظارك.',
      firstInSlot: '✨ أنت الأول في هذا الموعد (الموعد على الساعة {time})',
      ahead: '⏳ {count} {unit} قبلك في الانتظار',
      aheadDropped: '↓ تقدّم دورك',
      unitSingle: 'زبون',
      unitPlural: 'زبائن',
      liveSync: 'تحديث تلقائي 15ث',
    },
    appointments: {
      title: 'مواعيدي القادمة',
      subtitle: 'متابعة ترتيبك في الانتظار وإدارة مواعيدك النشطة.',
      emptyTitle: 'لا توجد مواعيد قادمة',
      emptyDesc: 'احجز موعدك القادم مع أمهر الحلاقين في بضع ثوانٍ.',
      barberLabel: 'الحلاق',
      dateLabel: 'التاريخ',
      timeLabel: 'الساعة',
      priceLabel: 'السعر',
      reschedule: 'تغيير الموعد',
      cancel: 'إلغاء',
      inChairNotice: '✂️ الخدمة جارية حالياً في الكرسي',
    },
    history: {
      title: 'سجل الزيارات',
      subtitle: 'تصفح زياراتك السابقة، قيّم الحلاقين أو أعد الحجز بضغطة زر.',
      emptyTitle: 'لا يوجد سجل زيارات حتى الآن',
      emptyDesc: 'ستظهر زياراتك المكتملة أو الملغاة هنا.',
      bookAgain: 'إعادة الحجز',
      rate: 'تقييم (1-5 ★)',
      ratedBadge: 'تم التقييم ★ {rating}/5',
    },
    profile: {
      title: 'ملفي الشخصي',
      subtitle: 'حدّث بيانات التواصل الخاصة بك لاستلام رسائل التذكير SMS وتأكيد المواعيد بسرعة.',
      nameLabel: 'الاسم الكامل',
      emailLabel: 'البريد الإلكتروني',
      phoneLabel: 'رقم الهاتف',
      phonePlaceholder: '+212 6 XX XX XX XX',
      saveBtn: 'حفظ التغييرات',
      saving: 'جاري الحفظ...',
      savedSuccess: 'تم تحديث ملفك الشخصي بنجاح.',
      saveError: 'تعذر تحديث الملف الشخصي. يرجى التحقق من البيانات.',
    },
    modals: {
      cancelTitle: 'إلغاء الموعد',
      cancelConfirmDesc: 'هل أنت متأكد من إلغاء موعد يوم {date} على الساعة {time} مع {barber}؟',
      cancelKeep: 'الاحتفاظ بالموعد',
      cancelConfirmBtn: 'تأكيد الإلغاء',
      rescheduleTitle: 'تأجيل / تغيير الموعد',
      rescheduleDate: 'التاريخ الجديد',
      rescheduleSlot: 'الأوقات المتاحة',
      noSlots: 'لا توجد أوقات شاغرة في هذا التاريخ.',
      rescheduleSave: 'تأكيد الموعد الجديد',
      rateTitle: 'تقييم الجلسة',
      rateSubtitle: 'شاركنا رأيك حول تجربتك مع {barber} (+20 نقطة ولاء)',
      rateComment: 'تعليقك',
      ratePlaceholder: 'اكتب رأيك حول دقة القصة والاستقبال...',
      rateSubmit: 'إرسال التقييم',
      close: 'إغلاق',
    },
    feedback: {
      cancelled: 'تم إلغاء الموعد بنجاح.',
      cancelledRefunded: 'تم إلغاء الموعد واسترجاع {pts} نقطة إلى رصيدك!',
      rescheduled: 'تم تعديل موعدك بنجاح.',
      rated: 'شكراً لتقييمك! تم إضافة +20 نقطة ولاء.',
      errorGeneric: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    },
  },
};

export default function ClientDashboard() {
  const { user, setUser, updateUser, logout } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';
  const navigate = useNavigate();

  const copy = useMemo(() => DASHBOARD_COPY[lang] || DASHBOARD_COPY.fr, [lang]);

  // Active Section Tab: 'appointments' | 'history' | 'loyalty' | 'profile'
  const [activeTab, setActiveTab] = useState('appointments');

  // Booking Modal State (automatically opens if restoring guest draft booking)
  const [bookingModalOpen, setBookingModalOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('booking') === 'restore' || !!sessionStorage.getItem(PENDING_BOOKING_KEY);
    } catch {
      return false;
    }
  });
  const [preselectedService, setPreselectedService] = useState(null);
  const [preselectedBarber, setPreselectedBarber] = useState(null);

  // Appointments & Catalogs State
  const [appointmentsData, setAppointmentsData] = useState({ upcoming: [], history: [] });
  const [summaryStats, setSummaryStats] = useState(null);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);

  // Live Queue Drop Detection
  const prevQueueRef = useRef({});
  const [queueDropHighlights, setQueueDropHighlights] = useState({});

  // Profile Edit State
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Modals: Cancel, Reschedule, Rate
  const [cancelModal, setCancelModal] = useState({ isOpen: false, appointment: null, submitting: false });
  const [rescheduleModal, setRescheduleModal] = useState({
    isOpen: false,
    appointment: null,
    date: getTodayDateString(),
    slot: '',
    slots: [],
    loading: false,
    submitting: false,
  });
  const [rateModal, setRateModal] = useState({
    isOpen: false,
    appointment: null,
    rating: 5,
    comment: '',
    submitting: false,
  });

  // Toast Notification
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const tId = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(tId);
  }, [toast]);

  // Clean URL query after restoring booking modal
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.has('booking')) {
      url.searchParams.delete('booking');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, []);

  // Load Client Appointments with silent polling support
  const loadAppointments = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingAppointments(true);
      try {
        const res = await getClientAppointments();
        if (res?.status === 'success') {
          const upcomingList = res.data?.upcoming || [];
          const droppedMap = {};
          const nextQueueMap = {};

          upcomingList.forEach((appt) => {
            const prevVal = prevQueueRef.current[appt.id];
            const currVal = Number(appt.people_ahead ?? 0);
            nextQueueMap[appt.id] = currVal;
            if (prevVal !== undefined && currVal < prevVal) {
              droppedMap[appt.id] = { from: prevVal, to: currVal };
            }
          });
          prevQueueRef.current = nextQueueMap;

          if (Object.keys(droppedMap).length > 0) {
            setQueueDropHighlights((prev) => ({ ...prev, ...droppedMap }));
            setTimeout(() => {
              setQueueDropHighlights((prev) => {
                const updated = { ...prev };
                Object.keys(droppedMap).forEach((id) => delete updated[id]);
                return updated;
              });
            }, 4500);
          }

          setAppointmentsData(res.data || { upcoming: [], history: [] });
          setSummaryStats(res.summary_stats || null);

          if (res.summary_stats?.loyalty_points !== undefined && setUser) {
            setUser((prev) =>
              prev ? { ...prev, loyalty_points: res.summary_stats.loyalty_points } : prev
            );
          }
        }
      } catch (err) {
        console.error('Error fetching appointments:', err);
      } finally {
        if (!silent) setLoadingAppointments(false);
      }
    },
    [setUser]
  );

  // Initial Data Load
  useEffect(() => {
    loadAppointments(false);
    Promise.all([getServices(), getBarbers()])
      .then(([srvRes, brbRes]) => {
        setServices(srvRes?.data || []);
        setBarbers(brbRes?.data || []);
      })
      .catch((err) => console.warn('Initial catalog load warning:', err?.message || err));
  }, [loadAppointments]);

  const todayStr = getTodayDateString();
  const hasActiveAppointmentToday = useMemo(() => {
    return (appointmentsData.upcoming || []).some(
      (appt) =>
        appt.appointment_date === todayStr &&
        ['pending', 'confirmed', 'in_progress'].includes(appt.status)
    );
  }, [appointmentsData.upcoming, todayStr]);

  // Live Auto-Refresh Polling every 15s while tab is visible & client has an active appointment today
  useEffect(() => {
    if (!hasActiveAppointmentToday) return undefined;

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadAppointments(true);
      }
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadAppointments(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasActiveAppointmentToday, loadAppointments]);

  // Derived Loyalty Cut Progress (0-9 cuts cycle, 10th free)
  const completedVisits = Number(summaryStats?.total_completed_visits ?? 0);
  const cutsProgress = completedVisits === 0 ? 0 : completedVisits % 9 === 0 ? 9 : completedVisits % 9;
  const progressPercent = Math.min(100, Math.round((cutsProgress / 9) * 100));

  // Derived Favorite Barbers from past visits
  const favoriteBarbers = useMemo(() => {
    const counts = new Map();
    [...(appointmentsData.history || []), ...(appointmentsData.upcoming || [])].forEach((appt) => {
      if (appt.barber?.id) {
        const entry = counts.get(appt.barber.id) || { barber: appt.barber, visits: 0 };
        entry.visits += 1;
        counts.set(appt.barber.id, entry);
      }
    });
    return Array.from(counts.values()).sort((a, b) => b.visits - a.visits);
  }, [appointmentsData]);

  // Open Booking Wizard helpers
  const handleOpenBooking = (srv = null, brb = null) => {
    setPreselectedService(srv);
    setPreselectedBarber(brb);
    setBookingModalOpen(true);
  };

  const handleBookAgain = (appt) => {
    const foundService = services.find((s) => s.id === appt.service_id) || appt.service || null;
    const foundBarber = barbers.find((b) => b.id === appt.barber_id) || appt.barber || null;
    handleOpenBooking(foundService, foundBarber);
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    const label = copy.statuses[status] || status;
    const styles = {
      confirmed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      pending: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      cancelled: 'bg-red-500/20 text-red-300 border-red-500/40',
      completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      no_show: 'bg-red-950/50 text-red-300 border-red-800/60',
      in_progress: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/60 animate-pulse',
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
          styles[status] || 'bg-slate-800 text-slate-300 border-slate-700'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status === 'confirmed' || status === 'completed' || status === 'in_progress'
              ? 'bg-emerald-400'
              : status === 'pending'
              ? 'bg-orange-400'
              : 'bg-red-400'
          }`}
        />
        <span>{label}</span>
      </span>
    );
  };

  // 3-State Live Queue Badge Helper
  const renderQueueBadge = (appt) => {
    if (!appt || !['pending', 'confirmed'].includes(appt.status)) return null;

    const peopleAhead = Number(appt.people_ahead ?? 0);
    const isMyTurnNow = Boolean(appt.is_my_turn_now);
    const dropInfo = queueDropHighlights[appt.id];

    // Case 1: people_ahead === 0 AND today <= 30 min left
    if (isMyTurnNow) {
      return (
        <div
          className={`mt-3 px-3.5 py-2.5 rounded-xl border bg-emerald-500/20 border-emerald-500/50 text-emerald-300 text-xs font-bold flex flex-wrap items-center justify-between gap-2 transition-all duration-500 ${
            dropInfo ? 'ring-2 ring-emerald-400 scale-[1.02] shadow-lg shadow-emerald-950/50' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <span>{copy.queue.myTurn}</span>
          </div>
          {dropInfo && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[10px] font-mono">
              ↓ {dropInfo.from} → 0
            </span>
          )}
        </div>
      );
    }

    // Case 2: people_ahead === 0 BUT > 30 min left or future date
    if (peopleAhead === 0) {
      return (
        <div
          className={`mt-3 px-3.5 py-2.5 rounded-xl border bg-gradient-to-r from-sky-500/15 to-amber-500/15 border-[#D9822B]/40 text-amber-200 text-xs font-semibold flex flex-wrap items-center justify-between gap-2 transition-all duration-500 ${
            dropInfo ? 'ring-2 ring-sky-400/70 scale-[1.02]' : ''
          }`}
        >
          <span>{copy.queue.firstInSlot.replace('{time}', appt.start_time)}</span>
          {dropInfo && (
            <span className="px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-200 text-[10px] font-mono">
              ↓ {dropInfo.from} → 0
            </span>
          )}
        </div>
      );
    }

    // Case 3: people_ahead > 0
    const unitLabel = peopleAhead > 1 ? copy.queue.unitPlural : copy.queue.unitSingle;
    return (
      <div
        className={`mt-3 px-3.5 py-2.5 rounded-xl border bg-[#D9822B]/15 border-[#D9822B]/40 text-amber-200 text-xs font-semibold flex flex-wrap items-center justify-between gap-2 transition-all duration-500 ${
          dropInfo ? 'ring-2 ring-emerald-400/80 border-emerald-400/60 bg-emerald-500/10 scale-[1.02]' : ''
        }`}
      >
        <span>
          {copy.queue.ahead.replace('{count}', String(peopleAhead)).replace('{unit}', unitLabel)}
        </span>
        {dropInfo && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold animate-bounce">
            {copy.queue.aheadDropped} ({dropInfo.from} → {dropInfo.to})
          </span>
        )}
      </div>
    );
  };

  // Cancel Appointment Flow
  const handleConfirmCancel = async () => {
    if (!cancelModal.appointment) return;
    const apptId = cancelModal.appointment.id;
    setCancelModal((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await cancelClientAppointment(apptId);
      setCancelModal({ isOpen: false, appointment: null, submitting: false });

      if (res?.user && updateUser) {
        updateUser(res.user);
      } else if (res?.current_loyalty_points !== undefined && updateUser) {
        updateUser({ loyalty_points: res.current_loyalty_points });
      }

      const refundedPts = Number(res?.points_refunded ?? 0);
      if (refundedPts > 0) {
        showToast(copy.feedback.cancelledRefunded.replace('{pts}', String(refundedPts)), 'success');
      } else {
        showToast(copy.feedback.cancelled, 'success');
      }

      loadAppointments(true);
    } catch (err) {
      setCancelModal((prev) => ({ ...prev, submitting: false }));
      showToast(err.response?.data?.message || copy.feedback.errorGeneric, 'error');
    }
  };

  // Reschedule Appointment Flow
  const fetchRescheduleSlots = async (barberId, targetDate, duration) => {
    setRescheduleModal((prev) => ({ ...prev, loading: true, slot: '' }));
    try {
      const res = await getAvailableSlots(barberId, targetDate, duration || 30);
      setRescheduleModal((prev) => ({
        ...prev,
        slots: res?.slots || [],
        loading: false,
      }));
    } catch {
      setRescheduleModal((prev) => ({ ...prev, slots: [], loading: false }));
    }
  };

  const handleOpenReschedule = (appt) => {
    const safeDate = appt.appointment_date < todayStr ? todayStr : appt.appointment_date;
    setRescheduleModal({
      isOpen: true,
      appointment: appt,
      date: safeDate,
      slot: '',
      slots: [],
      loading: true,
      submitting: false,
    });
    fetchRescheduleSlots(appt.barber_id, safeDate, appt.service?.duration || 30);
  };

  const handleConfirmReschedule = async () => {
    const { appointment, date, slot } = rescheduleModal;
    if (!appointment || !slot) return;
    setRescheduleModal((prev) => ({ ...prev, submitting: true }));
    try {
      await rescheduleClientAppointment(appointment.id, {
        appointment_date: date,
        start_time: slot,
        barber_id: appointment.barber_id,
      });
      setRescheduleModal({
        isOpen: false,
        appointment: null,
        date: todayStr,
        slot: '',
        slots: [],
        loading: false,
        submitting: false,
      });
      showToast(copy.feedback.rescheduled, 'success');
      loadAppointments(true);
    } catch (err) {
      setRescheduleModal((prev) => ({ ...prev, submitting: false }));
      showToast(err.response?.data?.message || copy.feedback.errorGeneric, 'error');
    }
  };

  // Submit Rating Flow
  const handleConfirmRate = async (e) => {
    e.preventDefault();
    const { appointment, rating, comment } = rateModal;
    if (!appointment) return;
    setRateModal((prev) => ({ ...prev, submitting: true }));
    try {
      await submitClientReview({
        appointment_id: appointment.id,
        barber_id: appointment.barber_id,
        rating,
        comment: comment.trim() || (isAr ? 'خدمة ممتازة وراقية!' : 'Prestation impeccable !'),
      });
      setRateModal({ isOpen: false, appointment: null, rating: 5, comment: '', submitting: false });
      showToast(copy.feedback.rated, 'success');
      loadAppointments(true);
    } catch (err) {
      setRateModal((prev) => ({ ...prev, submitting: false }));
      showToast(err.response?.data?.message || copy.feedback.errorGeneric, 'error');
    }
  };

  // Profile Save Flow
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await updateUserProfile(profileForm);
      if (res?.user && updateUser) {
        updateUser(res.user);
      }
      showToast(copy.profile.savedSuccess, 'success');
    } catch (err) {
      let msg = copy.profile.saveError;
      if (err.response?.data?.errors) {
        const list = Object.values(err.response.data.errors).flat();
        if (list.length > 0) msg = list.join(' ');
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      showToast(msg, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const userInitial = useMemo(() => {
    const trimmed = (user?.name || 'B').trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : 'B';
  }, [user?.name]);

  const userAvatarUrl =
    getImageUrl(user?.avatar) ||
    (user?.profile_photo_url && !user.profile_photo_url.includes('ui-avatars.com')
      ? getImageUrl(user.profile_photo_url)
      : null);

  const navItems = useMemo(
    () => [
      {
        id: 'appointments',
        label: copy.nav.appointments,
        badge: appointmentsData.upcoming.length > 0 ? appointmentsData.upcoming.length : null,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        id: 'history',
        label: copy.nav.history,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        id: 'loyalty',
        label: copy.nav.loyalty,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        ),
      },
      {
        id: 'profile',
        label: copy.nav.profile,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
      },
    ],
    [copy, appointmentsData.upcoming.length]
  );

  return (
    <div
      dir={dir}
      className={`min-h-screen bg-[#10151F] text-white font-sans ${isAr ? 'font-arabic' : ''}`}
    >
      {/* ============================================================ */}
      {/* DESKTOP FIXED SIDEBAR (w-64, RTL/LTR logical start) */}
      {/* ============================================================ */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:start-0 bg-[#141B29] border-e border-slate-800/90 z-30">
        <div className="p-6 border-b border-slate-800/80 space-y-4">
          <div className="flex items-center gap-3 text-start">
            <div className="w-10 h-10 rounded-xl bg-[#D9822B]/15 border border-[#D9822B]/40 flex items-center justify-center shrink-0">
              <BrandLogo size={26} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black tracking-wider text-white truncate">
                BARBEROZA
              </div>
              <div className="text-[11px] font-semibold text-[#D9822B] truncate">
                {copy.brandSubtitle}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenBooking()}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-[#D9822B] to-[#b86719] hover:from-[#e4903a] hover:to-[#D9822B] shadow-lg shadow-[#D9822B]/20 transition cursor-pointer flex items-center justify-center gap-2"
          >
            {copy.ctaBook}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between gap-2 text-start transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#D9822B]/15 text-[#D9822B] border border-[#D9822B]/40 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== null && item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-[#D9822B] text-white shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: FR | العربية Switcher + User Badge + Logout */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400 font-medium">{copy.languageLabel}</span>
            <LanguageSwitcher variant="pills" />
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#182030] border border-slate-800 text-start">
            <div className="w-9 h-9 rounded-full bg-[#10151F] border border-[#D9822B] text-[#D9822B] font-bold text-sm flex items-center justify-center overflow-hidden shrink-0">
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt={user?.name || 'Avatar'}
                  onError={(e) => handleImageFallbackError(e, DEFAULT_AVATAR_PLACEHOLDER)}
                  className="w-full h-full object-cover"
                />
              ) : (
                userInitial
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{user?.name}</div>
              <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-700/80 text-slate-300 hover:text-white hover:bg-red-500/10 hover:border-red-500/40 transition text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 rtl:rotate-180 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>{copy.logout}</span>
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MOBILE & TABLET STICKY TOP HEADER (lg:hidden) */}
      {/* ============================================================ */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#10151F]/95 backdrop-blur-xl border-b border-slate-800/90 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 text-start">
            <div className="w-9 h-9 rounded-full bg-[#10151F] border border-[#D9822B] text-[#D9822B] font-bold text-sm flex items-center justify-center overflow-hidden shrink-0">
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt={user?.name || 'Avatar'}
                  onError={(e) => handleImageFallbackError(e, DEFAULT_AVATAR_PLACEHOLDER)}
                  className="w-full h-full object-cover"
                />
              ) : (
                userInitial
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{user?.name}</div>
              <div className="text-[10px] font-semibold text-[#D9822B] uppercase tracking-wider truncate">
                BARBEROZA SHOP
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher variant="pills" />
            <button
              type="button"
              onClick={handleLogout}
              title={copy.logout}
              aria-label={copy.logout}
              className="p-2 rounded-xl border border-slate-700/80 bg-[#182030] text-slate-300 hover:text-white cursor-pointer"
            >
              <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* MAIN CONTENT SHELL (RTL/LTR logical padding) */}
      {/* ============================================================ */}
      <main className="lg:ps-64">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-12 space-y-6 text-start">
          {/* Welcome Header + Primary Book Appointment CTA */}
          <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {copy.welcome} <span className="text-[#D9822B]">{user?.name}</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">{copy.welcomeSubtitle}</p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenBooking()}
              className="w-full sm:w-auto min-h-[46px] px-6 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider text-white bg-gradient-to-r from-[#D9822B] to-[#b86719] hover:from-[#e4903a] hover:to-[#D9822B] shadow-lg shadow-[#D9822B]/25 transition cursor-pointer shrink-0 flex items-center justify-center gap-2"
            >
              {copy.ctaBook}
            </button>
          </section>

          {/* Luxury Loyalty Wallet & Cashback Card */}
          <section className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#182030] via-[#182030] to-[#121826] border border-[#D9822B]/35 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#D9822B]">
                  <span>💳</span>
                  <span>{copy.loyalty.badge}</span>
                </div>
                <div className="text-base sm:text-lg font-black text-white">
                  {copy.loyalty.walletSummary
                    .replace('{points}', String(user?.loyalty_points ?? 0))
                    .replace('{amount}', String(Math.floor((user?.loyalty_points ?? 0) / 10)))}
                </div>
              </div>

              <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-[#10151F] border border-[#D9822B]/30 shrink-0">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">
                    {copy.loyalty.pointsLabel}
                  </div>
                  <div className="text-2xl font-black text-[#D9822B] font-mono leading-tight">
                    {user?.loyalty_points ?? 0}{' '}
                    <span className="text-xs font-bold">{copy.loyalty.ptsUnit}</span>
                  </div>
                </div>
                <div className="h-9 w-px bg-slate-800" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Cashback</div>
                  <div className="text-lg font-black text-emerald-400 font-mono leading-tight">
                    {Math.floor((user?.loyalty_points ?? 0) / 10)} {copy.loyalty.currency}
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Cut Milestone Bar */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                <span>
                  {cutsProgress === 9
                    ? copy.loyalty.freeReady
                    : copy.loyalty.progressText.replace('{done}', String(cutsProgress))}
                </span>
                <span className="text-[#D9822B] font-mono">{cutsProgress}/9</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#10151F] border border-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#D9822B] via-amber-400 to-amber-300 transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* TAB 1: UPCOMING APPOINTMENTS ("Mes Rendez-vous / مواعيدي") */}
          {/* ============================================================ */}
          {activeTab === 'appointments' && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <span>{copy.appointments.title}</span>
                    {loadingAppointments && (
                      <span className="w-4 h-4 border-2 border-[#D9822B]/30 border-t-[#D9822B] rounded-full animate-spin" />
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{copy.appointments.subtitle}</p>
                </div>

                {hasActiveAppointmentToday && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#182030] border border-slate-700/80 text-[11px] font-mono text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{copy.queue.liveSync}</span>
                  </div>
                )}
              </div>

              {appointmentsData.upcoming.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-[#182030] border border-slate-800 space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-[#D9822B]/15 border border-[#D9822B]/30 text-[#D9822B] flex items-center justify-center text-2xl">
                    💈
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{copy.appointments.emptyTitle}</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      {copy.appointments.emptyDesc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenBooking()}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-[#D9822B] hover:bg-[#e4903a] transition cursor-pointer"
                  >
                    {copy.ctaBook}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
                  {appointmentsData.upcoming.map((appt) => {
                    const canModify = ['pending', 'confirmed'].includes(appt.status);
                    return (
                      <div
                        key={appt.id}
                        className="p-5 rounded-2xl bg-[#182030] border border-slate-800 hover:border-[#D9822B]/40 transition-all shadow-xl flex flex-col justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={getImageUrl(
                                  appt.barber?.image_url,
                                  DEFAULT_AVATAR_PLACEHOLDER
                                )}
                                alt={appt.barber?.name || 'Barber'}
                                onError={(e) => handleImageFallbackError(e, DEFAULT_AVATAR_PLACEHOLDER)}
                                className="w-12 h-12 rounded-xl object-cover border border-[#D9822B]/30 shrink-0"
                              />
                              <div className="min-w-0">
                                <h3 className="text-base font-bold text-white truncate">
                                  {appt.service?.name || (isAr ? 'خدمة فاخرة VIP' : 'Prestation VIP')}
                                </h3>
                                <div className="text-xs text-slate-400 truncate mt-0.5">
                                  {copy.appointments.barberLabel} :{' '}
                                  <span className="text-slate-200 font-semibold">
                                    {appt.barber?.name}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0">{renderStatusBadge(appt.status)}</div>
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#10151F] border border-slate-800/80 text-xs">
                            <div>
                              <span className="text-[10px] uppercase text-slate-500 block">
                                {copy.appointments.dateLabel}
                              </span>
                              <span className="font-mono font-bold text-white mt-0.5 block">
                                {appt.appointment_date}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase text-slate-500 block">
                                {copy.appointments.timeLabel}
                              </span>
                              <span className="font-mono font-bold text-[#D9822B] mt-0.5 block">
                                {appt.start_time}
                              </span>
                            </div>
                            <div className="text-end">
                              <span className="text-[10px] uppercase text-slate-500 block">
                                {copy.appointments.priceLabel}
                              </span>
                              <span className="font-mono font-bold text-white mt-0.5 block">
                                {appt.total_price} {copy.loyalty.currency}
                              </span>
                            </div>
                          </div>

                          {/* Smart 3-state Queue Badge */}
                          {renderQueueBadge(appt)}
                        </div>

                        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-end gap-2">
                          {appt.status === 'in_progress' && (
                            <span className="text-xs font-bold text-emerald-300 me-auto">
                              {copy.appointments.inChairNotice}
                            </span>
                          )}

                          {canModify && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenReschedule(appt)}
                                className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition cursor-pointer"
                              >
                                {copy.appointments.reschedule}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setCancelModal({ isOpen: true, appointment: appt, submitting: false })
                                }
                                className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition cursor-pointer"
                              >
                                {copy.appointments.cancel}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ============================================================ */}
          {/* TAB 2: BOOKING HISTORY ("Mon Historique / سجل الزيارات") */}
          {/* ============================================================ */}
          {activeTab === 'history' && (
            <section className="space-y-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">{copy.history.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{copy.history.subtitle}</p>
              </div>

              {appointmentsData.history.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-[#182030] border border-slate-800 space-y-2">
                  <div className="text-3xl">📜</div>
                  <h3 className="text-base font-bold text-white">{copy.history.emptyTitle}</h3>
                  <p className="text-xs text-slate-400">{copy.history.emptyDesc}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {appointmentsData.history.map((appt) => {
                    const isCompleted = appt.status === 'completed';
                    const existingReview = appt.review;

                    return (
                      <div
                        key={appt.id}
                        className="p-5 rounded-2xl bg-[#182030] border border-slate-800 shadow-lg flex flex-col justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={getImageUrl(
                                  appt.barber?.image_url,
                                  DEFAULT_AVATAR_PLACEHOLDER
                                )}
                                alt={appt.barber?.name || 'Barber'}
                                onError={(e) => handleImageFallbackError(e, DEFAULT_AVATAR_PLACEHOLDER)}
                                className="w-11 h-11 rounded-xl object-cover border border-slate-700 shrink-0"
                              />
                              <div className="min-w-0">
                                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                                  {appt.service?.name || (isAr ? 'خدمة فاخرة VIP' : 'Prestation VIP')}
                                </h3>
                                <div className="text-xs text-slate-400 truncate">
                                  {appt.barber?.name} • {appt.appointment_date} • {appt.start_time}
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0">{renderStatusBadge(appt.status)}</div>
                          </div>

                          <div className="mt-3 text-xs font-mono font-bold text-[#D9822B]">
                            {appt.total_price} {copy.loyalty.currency}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleBookAgain(appt)}
                            className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold bg-[#D9822B]/15 hover:bg-[#D9822B]/25 text-[#D9822B] border border-[#D9822B]/40 transition cursor-pointer"
                          >
                            {copy.history.bookAgain}
                          </button>

                          {isCompleted && !existingReview && (
                            <button
                              type="button"
                              onClick={() =>
                                setRateModal({
                                  isOpen: true,
                                  appointment: appt,
                                  rating: 5,
                                  comment: '',
                                  submitting: false,
                                })
                              }
                              className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition cursor-pointer"
                            >
                              {copy.history.rate}
                            </button>
                          )}

                          {existingReview && (
                            <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                              {copy.history.ratedBadge.replace('{rating}', String(existingReview.rating))}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ============================================================ */}
          {/* TAB 3: LOYALTY & FAVORITES */}
          {/* ============================================================ */}
          {activeTab === 'loyalty' && (
            <section className="space-y-6">
              {/* Favorite Barbers */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#182030] border border-slate-800 space-y-4">
                <h2 className="text-lg font-bold text-white">{copy.loyalty.favoritesTitle}</h2>

                {favoriteBarbers.length === 0 ? (
                  <p className="text-xs text-slate-400">{copy.loyalty.favoritesEmpty}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favoriteBarbers.map(({ barber, visits }) => (
                      <div
                        key={barber.id}
                        className="p-4 rounded-xl bg-[#10151F] border border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={getImageUrl(
                              barber.image_url,
                              DEFAULT_AVATAR_PLACEHOLDER
                            )}
                            alt={barber.name}
                            onError={(e) => handleImageFallbackError(e, DEFAULT_AVATAR_PLACEHOLDER)}
                            className="w-12 h-12 rounded-xl object-cover border border-[#D9822B]/30 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate">
                              {barber.name}
                            </div>
                            <div className="text-[11px] text-[#D9822B]">
                              {copy.loyalty.visitsCount.replace('{count}', String(visits))}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenBooking(null, barber)}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#D9822B] hover:bg-[#e4903a] text-white text-xs font-bold shrink-0 cursor-pointer"
                        >
                          {isAr ? 'حجز' : 'Réserver'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ============================================================ */}
          {/* TAB 4: PROFILE QUICK EDIT ("Mon Profil / ملفي الشخصي") */}
          {/* ============================================================ */}
          {activeTab === 'profile' && (
            <section className="max-w-2xl">
              <form
                onSubmit={handleSaveProfile}
                className="p-5 sm:p-7 rounded-2xl bg-[#182030] border border-slate-800 shadow-xl space-y-5"
              >
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">{copy.profile.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{copy.profile.subtitle}</p>
                </div>

                {/* Circular Avatar Uploader */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-[#10151F]/70 border border-slate-800/90">
                  <AvatarUploader
                    size="lg"
                    showHint
                    onUploadSuccess={() =>
                      showToast(
                        isAr ? 'تم تحديث صورة الملف الشخصي بنجاح.' : 'Photo de profil mise à jour !',
                        'success'
                      )
                    }
                    onError={(msg) => showToast(msg, 'error')}
                  />
                  <div className="min-w-0 space-y-1 text-start">
                    <div className="text-sm font-bold text-white truncate">{user?.name}</div>
                    <div className="text-xs text-slate-400 truncate">{user?.email}</div>
                    <div className="text-xs font-semibold text-[#D9822B]">
                      {isAr
                        ? 'اضغط على الصورة أو أيقونة الكاميرا للتحديث الفوري'
                        : 'Cliquez sur votre photo ou l’icône caméra pour la modifier'}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="profile-name"
                      className="block text-xs font-semibold text-slate-300 mb-1.5"
                    >
                      {copy.profile.nameLabel}
                    </label>
                    <input
                      id="profile-name"
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm text-start focus:border-[#D9822B] focus:ring-1 focus:ring-[#D9822B] outline-none transition"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="profile-email"
                      className="block text-xs font-semibold text-slate-300 mb-1.5"
                    >
                      {copy.profile.emailLabel}
                    </label>
                    <input
                      id="profile-email"
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm text-start focus:border-[#D9822B] focus:ring-1 focus:ring-[#D9822B] outline-none transition"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="profile-phone"
                      className="block text-xs font-semibold text-slate-300 mb-1.5"
                    >
                      {copy.profile.phoneLabel}
                    </label>
                    <input
                      id="profile-phone"
                      type="tel"
                      dir="ltr"
                      placeholder={copy.profile.phonePlaceholder}
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm text-start focus:border-[#D9822B] focus:ring-1 focus:ring-[#D9822B] outline-none transition"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider text-white bg-gradient-to-r from-[#D9822B] to-[#b86719] hover:from-[#e4903a] hover:to-[#D9822B] shadow-lg shadow-[#D9822B]/20 transition cursor-pointer disabled:opacity-50"
                  >
                    {savingProfile ? copy.profile.saving : copy.profile.saveBtn}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </main>

      {/* ============================================================ */}
      {/* MOBILE & TABLET FIXED BOTTOM NAVIGATION BAR */}
      {/* ============================================================ */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[#141B29]/95 backdrop-blur-xl border-t border-slate-800/90 px-2 py-1.5 shadow-[0_-10px_30px_rgba(0,0,0,0.65)]"
        aria-label="Mobile Bottom Navigation"
      >
        <div className="max-w-lg mx-auto grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[52px] px-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                  isActive ? 'text-[#D9822B] bg-[#D9822B]/10' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="text-[10px] font-bold truncate max-w-full px-1">
                  {item.label}
                </span>
                {item.badge !== null && item.badge !== undefined && (
                  <span className="absolute top-1.5 end-3 w-4 h-4 rounded-full bg-[#D9822B] text-white text-[9px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ============================================================ */}
      {/* TOAST FEEDBACK */}
      {/* ============================================================ */}
      {toast && (
        <div className="fixed top-4 end-4 z-[60] max-w-sm">
          <div
            className={`px-4 py-3 rounded-xl border shadow-2xl text-xs font-semibold flex items-center gap-2 backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-red-950/95 border-red-500/40 text-red-200'
                : 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODALS: BOOKING / CANCEL / RESCHEDULE / RATE */}
      {/* ============================================================ */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false);
          setPreselectedService(null);
          setPreselectedBarber(null);
        }}
        preselectedService={preselectedService}
        preselectedBarber={preselectedBarber}
        availableServices={services}
        availableBarbers={barbers}
        onBookingSuccess={() => {
          loadAppointments(true);
        }}
      />

      {/* Cancel Modal */}
      {cancelModal.isOpen && cancelModal.appointment && (
        <div dir={dir} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#182030] border border-slate-700 p-6 space-y-4 shadow-2xl text-start">
            <h3 className="text-lg font-bold text-white">{copy.modals.cancelTitle}</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {copy.modals.cancelConfirmDesc
                .replace('{date}', cancelModal.appointment.appointment_date)
                .replace('{time}', cancelModal.appointment.start_time)
                .replace('{barber}', cancelModal.appointment.barber?.name || '')}
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModal({ isOpen: false, appointment: null, submitting: false })}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                {copy.modals.cancelKeep}
              </button>
              <button
                type="button"
                disabled={cancelModal.submitting}
                onClick={handleConfirmCancel}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {copy.modals.cancelConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal.isOpen && rescheduleModal.appointment && (
        <div dir={dir} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#182030] border border-slate-700 p-6 space-y-4 shadow-2xl text-start">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{copy.modals.rescheduleTitle}</h3>
              <button
                type="button"
                onClick={() =>
                  setRescheduleModal({
                    isOpen: false,
                    appointment: null,
                    date: todayStr,
                    slot: '',
                    slots: [],
                    loading: false,
                    submitting: false,
                  })
                }
                className="text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {copy.modals.rescheduleDate}
              </label>
              <input
                type="date"
                min={todayStr}
                value={rescheduleModal.date}
                onChange={(e) => {
                  const nextDate = e.target.value;
                  setRescheduleModal((prev) => ({ ...prev, date: nextDate }));
                  fetchRescheduleSlots(
                    rescheduleModal.appointment.barber_id,
                    nextDate,
                    rescheduleModal.appointment.service?.duration || 30
                  );
                }}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm text-start outline-none focus:border-[#D9822B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                {copy.modals.rescheduleSlot}
              </label>
              {rescheduleModal.loading ? (
                <div className="py-6 text-center text-xs text-slate-400">...</div>
              ) : rescheduleModal.slots.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#10151F] text-center text-xs text-slate-400">
                  {copy.modals.noSlots}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {rescheduleModal.slots.map((slot) => {
                    const past = isSlotInPast(slot, rescheduleModal.date);
                    const selected = rescheduleModal.slot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={past}
                        onClick={() => setRescheduleModal((prev) => ({ ...prev, slot }))}
                        className={`min-h-[42px] rounded-xl text-xs font-bold border transition cursor-pointer ${
                          selected
                            ? 'bg-[#D9822B] border-[#D9822B] text-white'
                            : past
                            ? 'bg-[#10151F] border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                            : 'bg-[#10151F] border-slate-700 text-slate-200 hover:border-[#D9822B]'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={!rescheduleModal.slot || rescheduleModal.submitting}
                onClick={handleConfirmReschedule}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-[#D9822B] hover:bg-[#e4903a] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {copy.modals.rescheduleSave}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate Appointment Modal */}
      {rateModal.isOpen && rateModal.appointment && (
        <div dir={dir} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleConfirmRate}
            className="w-full max-w-md rounded-2xl bg-[#182030] border border-slate-700 p-6 space-y-4 shadow-2xl text-start"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{copy.modals.rateTitle}</h3>
              <button
                type="button"
                onClick={() =>
                  setRateModal({ isOpen: false, appointment: null, rating: 5, comment: '', submitting: false })
                }
                className="text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {copy.modals.rateSubtitle.replace('{barber}', rateModal.appointment.barber?.name || '')}
            </p>

            {/* 1-5 Star Selector */}
            <div className="flex items-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRateModal((prev) => ({ ...prev, rating: star }))}
                  className={`w-10 h-10 rounded-xl text-lg font-bold border transition cursor-pointer ${
                    star <= rateModal.rating
                      ? 'bg-[#D9822B]/20 border-[#D9822B] text-amber-400'
                      : 'bg-[#10151F] border-slate-700 text-slate-600'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {copy.modals.rateComment}
              </label>
              <textarea
                required
                rows={3}
                minLength={5}
                maxLength={1000}
                placeholder={copy.modals.ratePlaceholder}
                value={rateModal.comment}
                onChange={(e) => setRateModal((prev) => ({ ...prev, comment: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm text-start outline-none focus:border-[#D9822B] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                disabled={rateModal.submitting}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#D9822B] hover:bg-[#e4903a] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {copy.modals.rateSubmit}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
