import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuth } from '../../context/useAuth';
import {
  getServices,
  getBarbers,
  getAvailableSlots,
  bookAppointment,
  getClientAppointments,
  cancelClientAppointment,
  rescheduleClientAppointment,
  submitClientReview,
  getClientLoyalty,
} from '../../api/barberApi';
import { getTodayDateString, isSlotInPast, getRelativeScheduleStatus } from '../../utils/dateTime';

export default function ClientPortal() {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('appointments'); // Default to appointments overview: 'appointments' | 'booking' | 'loyalty' | 'review'
  const [appointmentsSubFilter, setAppointmentsSubFilter] = useState('upcoming'); // 'upcoming' | 'history'

  // Dynamic Live Appointments & Summary Stats State
  const [appointmentsData, setAppointmentsData] = useState({ upcoming: [], history: [] });
  const [summaryStats, setSummaryStats] = useState(null);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [scheduleClock, setScheduleClock] = useState(new Date());

  // Data states (catalogs)
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  // Booking Wizard State
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => getTodayDateString());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [allSlotsData, setAllSlotsData] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [clientPhone, setClientPhone] = useState(user?.phone || '');
  const [clientNotes, setClientNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingError, setBookingError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cancellation Modal & Feedback State
  const [cancelModal, setCancelModal] = useState({ isOpen: false, appointment: null, isCancelling: false });
  const [feedback, setFeedback] = useState(null);
  const showFeedback = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Reschedule Modal
  const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, appointment: null });
  const [newDate, setNewDate] = useState(() => getTodayDateString());
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [allRescheduleSlots, setAllRescheduleSlots] = useState([]);
  const [newSlot, setNewSlot] = useState('');
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);

  // Review state
  const [reviewBarberId, setReviewBarberId] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(null);
  const [reviewError, setReviewError] = useState(null);

  // Live Appointments Loader with silent background polling support
  const loadAppointments = useCallback(async (silent = false) => {
    if (!silent) setLoadingAppointments(true);
    try {
      const res = await getClientAppointments();
      if (res.status === 'success') {
        setAppointmentsData(res.data || { upcoming: [], history: [] });
        setSummaryStats(res.summary_stats || null);
        setLastSyncTime(new Date());

        // Sync user loyalty points if provided
        if (res.summary_stats?.loyalty_points !== undefined) {
          setUser((prev) => prev ? { ...prev, loyalty_points: res.summary_stats.loyalty_points } : prev);
        }
      }
    } catch (err) {
      console.error('Error fetching client appointments:', err);
    } finally {
      if (!silent) setLoadingAppointments(false);
    }
  }, [setUser]);

  // Initial load of catalogs & appointments
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoadingData(true);
        const [srvRes, brbRes] = await Promise.all([getServices(), getBarbers()]);
        setServices(srvRes.data || []);
        setBarbers(brbRes.data || []);
      } catch (err) {
        console.error('Error fetching catalog:', err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchCatalog();
    loadAppointments(false);
  }, [loadAppointments]);

  // Automatic background polling every 20 seconds for real-time status updates
  useEffect(() => {
    const pollInterval = setInterval(() => {
      loadAppointments(true); // silent fetch without layout flicker
    }, 20000);
    return () => clearInterval(pollInterval);
  }, [loadAppointments]);

  // Dynamic relative schedule countdown ticker (ticks every 60s without full-app re-renders)
  useEffect(() => {
    const timer = setInterval(() => {
      setScheduleClock(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch loyalty details if loyalty tab opened
  useEffect(() => {
    if (activeTab === 'loyalty') {
      getClientLoyalty().then((res) => {
        setLoyaltyData(res.data || null);
      }).catch(console.error);
    }
  }, [activeTab]);

  // Fetch available slots dynamically when barber, date, or service changes
  const fetchBookingSlots = useCallback(async (barberId, dateStr, durationMin) => {
    if (!barberId || !dateStr) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await getAvailableSlots(barberId, dateStr, durationMin);
      setAvailableSlots(res.slots || []);
      setAllSlotsData(res.all_slots || []);
    } catch (err) {
      console.error('Error loading slots:', err);
      setAvailableSlots([]);
      setAllSlotsData([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBarber && selectedDate && selectedService) {
      fetchBookingSlots(selectedBarber.id, selectedDate, selectedService.duration);
    }
  }, [selectedBarber, selectedDate, selectedService, fetchBookingSlots]);

  // Handle final appointment confirmation
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    setBookingError(null);
    setBookingSuccess(null);

    if (!selectedSlot) {
      setBookingError('Veuillez sélectionner un créneau disponible.');
      return;
    }

    if (isSlotInPast(selectedSlot, selectedDate)) {
      setBookingError('Ce créneau horaire est déjà passé. Veuillez sélectionner un horaire à partir du moment présent.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        service_id: selectedService.id,
        barber_id: selectedBarber.id,
        appointment_date: selectedDate,
        start_time: selectedSlot,
        client_phone: clientPhone,
        client_notes: clientNotes,
      };

      const res = await bookAppointment(payload);
      setBookingSuccess(res.message || 'Rendez-vous confirmé avec succès !');

      // Update user loyalty points in state
      if (res.current_loyalty_points !== undefined) {
        setUser((prev) => ({
          ...prev,
          loyalty_points: res.current_loyalty_points,
        }));
      }

      // Immediately refresh available slots without reloading page
      fetchBookingSlots(selectedBarber.id, selectedDate, selectedService.duration);
      loadAppointments(true);

      // Reset wizard and navigate to appointments overview
      setTimeout(() => {
        setBookingStep(1);
        setSelectedService(null);
        setSelectedBarber(null);
        setSelectedSlot(null);
        setActiveTab('appointments');
      }, 2500);
    } catch (err) {
      let msg = 'Erreur lors de la réservation. Veuillez réessayer.';
      if (err.response?.data?.errors) {
        const errorList = Object.values(err.response.data.errors).flat();
        if (errorList.length > 0) msg = errorList.join(' ');
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      setBookingError(msg);

      // Immediately refresh available slots so booked slots are updated in UI
      fetchBookingSlots(selectedBarber.id, selectedDate, selectedService.duration);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rebook an appointment from History
  const handleRebook = (appt) => {
    // Find matching service and barber in catalogs
    const foundService = services.find((s) => s.id === appt.service_id) || appt.service;
    const foundBarber = barbers.find((b) => b.id === appt.barber_id) || appt.barber;

    if (foundService) setSelectedService(foundService);
    if (foundBarber) setSelectedBarber(foundBarber);

    const todayStr = getTodayDateString();
    setSelectedDate(todayStr);

    // Switch to booking wizard at step 3 (Date & Time selection)
    setActiveTab('booking');
    setBookingStep(3);

    if (foundBarber && foundService) {
      fetchBookingSlots(foundBarber.id, todayStr, foundService.duration || 30);
    }

    showFeedback(
      `Prestation "${foundService?.name || 'Soin'}" pré-sélectionnée avec ${foundBarber?.name || 'votre barbier'}. Choisissez votre horaire !`,
      'info'
    );
  };

  // Trigger Cancel Confirmation Modal
  const handleCancelClick = (appt) => {
    setCancelModal({
      isOpen: true,
      appointment: appt,
      isCancelling: false,
    });
  };

  // Confirm Cancellation with Optimistic UI update
  const handleConfirmCancel = async () => {
    if (!cancelModal.appointment) return;
    const apptId = cancelModal.appointment.id;
    setCancelModal((prev) => ({ ...prev, isCancelling: true }));

    // Snapshot previous state for rollback on error
    const prevUpcoming = appointmentsData.upcoming;
    const prevHistory = appointmentsData.history;
    const cancelledAppt = { ...cancelModal.appointment, status: 'cancelled' };

    // Optimistic UI state update: remove from upcoming, prepend to history
    setAppointmentsData((prev) => ({
      upcoming: prev.upcoming.filter((a) => a.id !== apptId),
      history: [cancelledAppt, ...prev.history],
    }));

    // Optimistically update summary stats
    const remainingUpcoming = prevUpcoming.filter((a) => a.id !== apptId);
    setSummaryStats((prev) => prev ? {
      ...prev,
      upcoming_count: remainingUpcoming.length,
      next_appointment: remainingUpcoming.length > 0 ? remainingUpcoming[0] : null,
    } : null);

    try {
      const res = await cancelClientAppointment(apptId, 'Annulation demandée par le client');
      showFeedback(res.message || 'Votre rendez-vous a été annulé avec succès.', 'success');
      setCancelModal({ isOpen: false, appointment: null, isCancelling: false });

      // Refresh slots if currently in booking flow
      if (selectedBarber && selectedService) {
        fetchBookingSlots(selectedBarber.id, selectedDate, selectedService.duration);
      }
      // Re-fetch in background to confirm server state
      loadAppointments(true);
    } catch (err) {
      // Rollback on error
      setAppointmentsData({ upcoming: prevUpcoming, history: prevHistory });
      const errorMsg = err.response?.data?.message || "Impossible d'annuler ce rendez-vous.";
      showFeedback(errorMsg, 'error');
      setCancelModal({ isOpen: false, appointment: null, isCancelling: false });
    }
  };

  // Open Reschedule Modal
  const openRescheduleModal = async (appt) => {
    setRescheduleModal({ isOpen: true, appointment: appt });
    const today = getTodayDateString();
    const safeDate = appt.appointment_date < today ? today : appt.appointment_date;
    setNewDate(safeDate);
    setNewSlot('');
    loadRescheduleSlots(appt.barber_id, safeDate, appt.service?.duration || 30);
  };

  const loadRescheduleSlots = async (barberId, date, duration) => {
    setLoadingRescheduleSlots(true);
    try {
      const res = await getAvailableSlots(barberId, date, duration);
      setRescheduleSlots(res.slots || []);
      setAllRescheduleSlots(res.all_slots || []);
    } catch (err) {
      console.error(err);
      setRescheduleSlots([]);
      setAllRescheduleSlots([]);
    } finally {
      setLoadingRescheduleSlots(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!newSlot) {
      alert('Veuillez sélectionner un nouveau créneau.');
      return;
    }

    if (isSlotInPast(newSlot, newDate)) {
      alert('Ce créneau horaire est déjà passé. Veuillez choisir un horaire futur.');
      return;
    }

    try {
      await rescheduleClientAppointment(rescheduleModal.appointment.id, {
        appointment_date: newDate,
        start_time: newSlot,
        barber_id: rescheduleModal.appointment.barber_id,
      });
      setRescheduleModal({ isOpen: false, appointment: null });
      loadAppointments();
      if (selectedBarber && selectedService) {
        fetchBookingSlots(selectedBarber.id, selectedDate, selectedService.duration);
      }
    } catch (err) {
      let msg = 'Impossible de reporter le rendez-vous.';
      if (err.response?.data?.errors) {
        const errorList = Object.values(err.response.data.errors).flat();
        if (errorList.length > 0) msg = errorList.join(' ');
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      alert(msg);
      loadRescheduleSlots(
        rescheduleModal.appointment.barber_id,
        newDate,
        rescheduleModal.appointment.service?.duration || 30
      );
    }
  };

  // Handle Review submission
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewSuccess(null);
    setReviewError(null);

    if (!reviewBarberId) {
      setReviewError('Veuillez sélectionner un barbier.');
      return;
    }

    try {
      const res = await submitClientReview({
        barber_id: reviewBarberId,
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewSuccess(res.message || 'Merci pour votre avis d’exception !');
      setReviewComment('');
    } catch (err) {
      setReviewError(err.response?.data?.message || 'Erreur lors de l’envoi de votre avis.');
    }
  };

  // Resolve next upcoming appointment and its dynamic relative status badge
  const nextAppt = summaryStats?.next_appointment || (appointmentsData.upcoming && appointmentsData.upcoming[0]) || null;
  const nextRel = nextAppt
    ? getRelativeScheduleStatus(
        nextAppt.appointment_date,
        nextAppt.start_time,
        nextAppt.end_time,
        scheduleClock,
        nextAppt.status
      )
    : null;

  return (
    <DashboardLayout
      title="Espace Client Privilège"
      subtitle="Gérez vos soins d'exception, vos réservations en temps réel et vos privilèges de fidélité."
    >
      {/* Floating Feedback Notification */}
      {feedback && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-2.5 backdrop-blur-md ${
              feedback.type === 'error'
                ? 'bg-red-950/90 text-red-200 border-red-500/40'
                : feedback.type === 'info'
                ? 'bg-blue-950/90 text-blue-200 border-blue-500/40'
                : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
            }`}
          >
            <span>{feedback.type === 'error' ? '⚠️' : feedback.type === 'info' ? 'ℹ️' : '✓'}</span>
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="ml-2 text-gray-400 hover:text-white text-sm cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PROMINENT NEXT APPOINTMENT HERO CARD */}
      {/* ======================================================== */}
      {nextAppt ? (
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-[#111827] via-[#161F30] to-[#1F2937] border-2 border-amber-500/40 p-6 md:p-8 shadow-2xl relative overflow-hidden group">
          {/* Ambient gold glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Top Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-800/80">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-sm shadow">
                ✂️
              </span>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
                  Votre Prochain Rendez-vous d'Exception
                </div>
                <div className="text-xs text-gray-400 font-mono">
                  Réf #{nextAppt.id} • Atelier Royal Berber
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Dynamic Countdown & Status Badge */}
              {nextRel && (
                <div className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm ${nextRel.badgeClass}`}>
                  {nextRel.isLive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>}
                  <span>{nextRel.label}</span>
                </div>
              )}

              {/* Live Real-time Sync Status */}
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-900/90 border border-gray-800 text-[10px] font-mono text-gray-400"
                title={`Actualisation automatique toutes les 20s. Dernière synchro : ${lastSyncTime.toLocaleTimeString('fr-FR')}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>En direct</span>
              </div>
            </div>
          </div>

          {/* Main Card Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Barber Photo & Prestation Details */}
            <div className="md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <img
                src={nextAppt.barber?.image_url || nextAppt.barber_image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400'}
                alt={nextAppt.barber?.name || nextAppt.barber_name}
                loading="lazy"
                decoding="async"
                className="w-20 h-20 rounded-2xl border-2 border-amber-500/40 object-cover object-top shadow-xl flex-shrink-0"
              />
              <div className="space-y-1">
                <div className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
                  {nextAppt.barber?.specialty || nextAppt.barber_specialty || 'Maître Barbier'}
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white">
                  {nextAppt.service?.name || nextAppt.service_name}
                </h3>
                <p className="text-xs text-gray-400 flex items-center gap-2">
                  <span>Avec <strong className="text-gray-200">{nextAppt.barber?.name || nextAppt.barber_name}</strong></span>
                  <span>•</span>
                  <span className="font-mono text-gray-300">{nextAppt.service?.duration || 30} min</span>
                </p>

                {/* Date & Time Big Display */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-900/90 border border-gray-800 text-sm font-bold text-white">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{nextAppt.appointment_date}</span>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm font-bold font-mono text-amber-400">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{nextAppt.start_time} - {nextAppt.end_time}</span>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-gray-900/90 border border-gray-800 text-sm font-bold font-mono text-gray-300">
                    {nextAppt.total_price || nextAppt.price} MAD
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions for Next Appointment */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 justify-center md:items-end w-full">
              {nextAppt.status !== 'in_progress' ? (
                <>
                  <button
                    type="button"
                    onClick={() => openRescheduleModal(nextAppt)}
                    className="w-full sm:w-auto md:w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-gray-900 border border-gray-700 hover:border-amber-500/50 text-gray-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow"
                  >
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Reporter le créneau
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCancelClick(nextAppt)}
                    className="w-full sm:w-auto md:w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 transition-all cursor-pointer flex items-center justify-center gap-2 shadow"
                  >
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Annuler le rendez-vous
                  </button>
                </>
              ) : (
                <div className="w-full p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold text-center animate-pulse flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>✂️ Prestation en cours au fauteuil</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Invitation Banner when no upcoming appointment */
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-gray-900 via-[#161F30] to-[#1F2937] border border-gray-800 p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl flex-shrink-0">
              💈
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
                Aucun rendez-vous à venir
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white">
                Prêt pour votre prochain rituel de soin ?
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Sélectionnez votre créneau auprès de nos maîtres barbiers d'exception.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveTab('booking');
              setBookingStep(1);
            }}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#D97706] to-[#B45309] hover:from-[#F59E0B] hover:to-[#D97706] text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-900/30 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2"
          >
            <span>+ Réserver un soin</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* CLIENT STATS SUMMARY CARDS */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-[#161F30] border border-gray-800 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Soins Complétés</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {summaryStats?.total_completed_visits ?? 0}
            </div>
            <div className="text-[11px] text-emerald-400 font-medium mt-0.5">Visites à l'Atelier</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
            ✓
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#161F30] border border-gray-800 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Rendez-vous à venir</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {appointmentsData.upcoming.length}
            </div>
            <div className="text-[11px] text-gray-400 font-medium mt-0.5">Créneaux actifs</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg">
            📅
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#161F30] border border-gray-800 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Points Privilège</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {user?.loyalty_points ?? 0} <span className="text-xs font-sans text-gray-400">pts</span>
            </div>
            <div className="text-[11px] text-amber-500/90 font-medium mt-0.5">
              ≈ {Math.floor((user?.loyalty_points ?? 0) / 10)} MAD de réduction
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg">
            ⭐
          </div>
        </div>
      </div>

      {/* Custom Tabs Navigation */}
      <div className="flex border-b border-gray-800 mb-8 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('appointments')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'appointments'
              ? 'border-[#D97706] text-[#D97706] bg-amber-500/5 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Mes Rendez-vous</span>
          {appointmentsData.upcoming.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold">
              {appointmentsData.upcoming.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('booking')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'booking'
              ? 'border-[#D97706] text-[#D97706] bg-amber-500/5 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Réserver une Prestation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('loyalty')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'loyalty'
              ? 'border-[#D97706] text-[#D97706] bg-amber-500/5 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <span>Club Fidélité ({user?.loyalty_points || 0} pts)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('review')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'review'
              ? 'border-[#D97706] text-[#D97706] bg-amber-500/5 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span>Évaluer un Barbier</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: 4-STEP BOOKING WIZARD */}
      {/* ======================================================== */}
      {activeTab === 'booking' && (
        <div className="bg-[#1F2937]/80 rounded-2xl border border-gray-800 p-6 md:p-8 backdrop-blur-sm shadow-xl">
          {/* Wizard Step Progress */}
          <div className="grid grid-cols-4 gap-2 mb-8">
            {[
              { step: 1, label: '1. Prestation' },
              { step: 2, label: '2. Barbier' },
              { step: 3, label: '3. Date & Heure' },
              { step: 4, label: '4. Confirmation' },
            ].map((item) => (
              <div
                key={item.step}
                className={`text-center pb-2 border-b-2 font-medium text-xs sm:text-sm transition-all ${
                  bookingStep === item.step
                    ? 'border-[#D97706] text-[#D97706]'
                    : bookingStep > item.step
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-gray-800 text-gray-500'
                }`}
              >
                {item.label}
              </div>
            ))}
          </div>

          {bookingSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{bookingSuccess} Redirection vers vos rendez-vous...</span>
            </div>
          )}

          {bookingError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{bookingError}</span>
            </div>
          )}

          {/* STEP 1: Select Service */}
          {bookingStep === 1 && (
            <div>
              <h2 className="text-xl font-serif font-bold text-white mb-2">
                Étape 1 : Choisissez votre soin ou rituel
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                Sélectionnez parmi nos prestations signature de coupe, barbe et soins purifiants.
              </p>

              {loadingData ? (
                <div className="py-12 text-center text-gray-400">Chargement de la carte des soins...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((srv) => {
                    const isSelected = selectedService?.id === srv.id;
                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedService(srv)}
                        className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/10 border-[#D97706] shadow-lg shadow-amber-900/20'
                            : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 hover:bg-gray-800/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-white text-base">{srv.name}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 font-mono">
                              {srv.duration} min
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-4">
                            {srv.description}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-800/60">
                          <span className="text-lg font-bold text-amber-400 font-mono">
                            {srv.price} {srv.currency}
                          </span>
                          <span
                            className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                              isSelected
                                ? 'bg-[#D97706] text-white'
                                : 'bg-gray-800 text-gray-300'
                            }`}
                          >
                            {isSelected ? 'Sélectionné' : 'Choisir'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  disabled={!selectedService}
                  onClick={() => setBookingStep(2)}
                  className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                    selectedService
                      ? 'bg-[#D97706] hover:bg-[#B45309] text-white shadow-lg shadow-amber-900/30'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Continuer vers le barbier
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Select Barber */}
          {bookingStep === 2 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-serif font-bold text-white mb-1">
                    Étape 2 : Choisissez votre maître barbier
                  </h2>
                  <p className="text-sm text-gray-400">
                    Chaque artisan barbier possède son expertise spécifique.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">Prestation choisie :</span>
                  <div className="text-sm font-semibold text-amber-400">{selectedService?.name}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
                {barbers.map((barber) => {
                  const isSelected = selectedBarber?.id === barber.id;
                  return (
                    <div
                      key={barber.id}
                      onClick={() => setSelectedBarber(barber)}
                      className={`rounded-2xl border overflow-hidden transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/10 border-[#D97706] ring-1 ring-[#D97706]'
                          : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <img
                        src={barber.image_url}
                        alt={barber.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-44 object-cover object-top"
                      />
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-white text-base">{barber.name}</h3>
                          <div className="flex items-center text-xs text-amber-400">
                            ★ {barber.rating}
                          </div>
                        </div>
                        <p className="text-xs text-[#D97706] font-medium mb-2">{barber.specialty}</p>
                        <p className="text-xs text-gray-400 line-clamp-2 mb-4">{barber.bio}</p>
                        <button
                          type="button"
                          className={`w-full py-2 text-xs font-semibold rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-[#D97706] text-white'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {isSelected ? 'Barbier Sélectionné' : 'Choisir ce Barbier'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  type="button"
                  onClick={() => setBookingStep(1)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  ← Retour aux prestations
                </button>
                <button
                  type="button"
                  disabled={!selectedBarber}
                  onClick={() => setBookingStep(3)}
                  className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                    selectedBarber
                      ? 'bg-[#D97706] hover:bg-[#B45309] text-white shadow-lg shadow-amber-900/30'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Choisir la date & heure
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Select Date & Available Real-time Slot */}
          {bookingStep === 3 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-white mb-1">
                    Étape 3 : Date et créneau disponible
                  </h2>
                  <p className="text-sm text-gray-400">
                    Les créneaux sont calculés en temps réel avec détection automatique des conflits.
                  </p>
                </div>
                <div className="bg-gray-900/80 px-4 py-2 rounded-xl border border-gray-800 text-xs">
                  <div className="text-gray-400">
                    Avec : <span className="text-amber-400 font-semibold">{selectedBarber?.name}</span>
                  </div>
                  <div className="text-gray-400">
                    Durée : <span className="text-gray-200 font-mono">{selectedService?.duration} min</span>
                  </div>
                </div>
              </div>

              {/* Date Input */}
              <div className="mb-6 max-w-xs">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-300">
                    Sélectionnez la date du rendez-vous
                  </label>
                  {selectedDate === getTodayDateString() && (
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-semibold border border-amber-500/20">
                      Aujourd'hui
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  min={getTodayDateString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    const today = getTodayDateString();
                    setSelectedDate(val < today ? today : val);
                  }}
                  className="w-full px-4 py-2.5 bg-gray-900/90 border border-gray-700 rounded-xl text-white text-sm focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706] outline-none font-mono"
                />
              </div>

              {/* Slots Grid */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-medium text-gray-300">
                    Créneaux horaires disponibles
                  </label>
                  <span className="text-xs text-gray-400 font-mono">
                    {availableSlots.filter((s) => !isSlotInPast(s, selectedDate)).length} disponible(s)
                  </span>
                </div>

                {loadingSlots ? (
                  <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                    <span>Calcul des disponibilités en temps réel...</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-800 text-center text-gray-400 text-sm">
                    Aucun créneau disponible pour cette date avec ce barbier (jour de repos ou agenda complet). Veuillez choisir une autre date.
                  </div>
                ) : availableSlots.every((s) => isSlotInPast(s, selectedDate)) ? (
                  <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center text-amber-300 text-sm">
                    Tous les créneaux pour aujourd'hui sont déjà passés. Veuillez sélectionner une date ultérieure.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
                    {(allSlotsData.length > 0 ? allSlotsData : availableSlots.map((s) => ({ time: s, is_available: true }))).map((slotObj) => {
                      const slot = slotObj.time;
                      const isPast = slotObj.is_past || isSlotInPast(slot, selectedDate);
                      const isBooked = slotObj.is_booked;
                      const isBreak = slotObj.is_break;
                      const isDisabled = isPast || isBooked || isBreak || !slotObj.is_available;
                      const isSelected = selectedSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => !isDisabled && setSelectedSlot(slot)}
                          className={`py-2 px-1 text-center rounded-lg text-xs font-mono font-medium transition-all relative ${
                            isPast
                              ? 'bg-gray-900/30 border border-gray-800/40 text-gray-600 line-through cursor-not-allowed opacity-35'
                              : isBooked
                              ? 'bg-red-950/20 text-red-400/50 line-through cursor-not-allowed border border-red-900/30'
                              : isBreak
                              ? 'bg-gray-900/20 text-gray-600 cursor-not-allowed border border-gray-900'
                              : isSelected
                              ? 'bg-[#D97706] text-white shadow-md shadow-amber-900/40 ring-2 ring-amber-400 font-bold'
                              : 'bg-gray-900/70 border border-gray-800 text-gray-300 hover:border-amber-500/50 hover:text-white cursor-pointer'
                          }`}
                          title={
                            isPast
                              ? 'Ce créneau est déjà passé'
                              : isBooked
                              ? 'Ce créneau est déjà réservé'
                              : isBreak
                              ? 'Pause'
                              : `Sélectionner ${slot}`
                          }
                        >
                          {slot}
                          {isBooked && <span className="block text-[8px] text-red-400 font-sans">Pris</span>}
                          {isPast && <span className="block text-[8px] text-gray-600 font-sans">Passé</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setBookingStep(2)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  ← Retour au barbier
                </button>
                <button
                  type="button"
                  disabled={!selectedSlot}
                  onClick={() => setBookingStep(4)}
                  className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                    selectedSlot
                      ? 'bg-[#D97706] hover:bg-[#B45309] text-white shadow-lg shadow-amber-900/30'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Récapitulatif & Validation
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Final Confirmation */}
          {bookingStep === 4 && (
            <div>
              <h2 className="text-xl font-serif font-bold text-white mb-2">
                Étape 4 : Confirmez votre rendez-vous
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                Veuillez vérifier les informations de votre réservation d’exception.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Summary Card */}
                <div className="bg-gray-900/80 rounded-xl p-5 border border-gray-800 space-y-3">
                  <div className="text-xs uppercase tracking-wider text-amber-500 font-semibold mb-1">
                    Récapitulatif de la prestation
                  </div>
                  <div className="flex justify-between text-sm py-1 border-b border-gray-800">
                    <span className="text-gray-400">Prestation :</span>
                    <span className="text-white font-medium">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm py-1 border-b border-gray-800">
                    <span className="text-gray-400">Maître Barbier :</span>
                    <span className="text-white font-medium">{selectedBarber?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm py-1 border-b border-gray-800">
                    <span className="text-gray-400">Date :</span>
                    <span className="text-white font-medium">{selectedDate}</span>
                  </div>
                  <div className="flex justify-between text-sm py-1 border-b border-gray-800">
                    <span className="text-gray-400">Horaire :</span>
                    <span className="text-amber-400 font-mono font-bold">{selectedSlot}</span>
                  </div>
                  <div className="flex justify-between text-sm py-1 border-b border-gray-800">
                    <span className="text-gray-400">Durée estimée :</span>
                    <span className="text-gray-300 font-mono">{selectedService?.duration} min</span>
                  </div>
                  <div className="flex justify-between text-base pt-2">
                    <span className="text-white font-bold">Total à régler au salon :</span>
                    <span className="text-amber-400 font-bold font-mono text-lg">
                      {selectedService?.price} {selectedService?.currency}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Vous cumulerez +{Math.round(selectedService?.price * 0.1)} points de fidélité</span>
                  </div>
                </div>

                {/* Contact & Notes Form */}
                <div className="bg-gray-900/80 rounded-xl p-5 border border-gray-800 space-y-4">
                  <div className="text-xs uppercase tracking-wider text-amber-500 font-semibold mb-1">
                    Coordonnées de notification SMS
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Numéro de téléphone portable (pour SMS de rappel) *
                    </label>
                    <input
                      type="tel"
                      value={clientPhone}
                      required
                      placeholder="+212 6 XX XX XX XX"
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full px-3.5 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-[#D97706] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Notes ou demandes particulières (facultatif)
                    </label>
                    <textarea
                      rows={3}
                      value={clientNotes}
                      placeholder="Ex: Peau sensible, dégradé très blanc sur les tempes..."
                      onChange={(e) => setClientNotes(e.target.value)}
                      className="w-full px-3.5 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-[#D97706] outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setBookingStep(3)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  ← Changer d’horaire
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || !clientPhone}
                  onClick={handleConfirmBooking}
                  className={`px-8 py-3 rounded-xl font-bold text-sm tracking-wide uppercase transition-all flex items-center gap-2 ${
                    isSubmitting || !clientPhone
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#D97706] to-[#B45309] hover:from-[#F59E0B] hover:to-[#D97706] text-white shadow-xl shadow-amber-900/40'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Confirmation en cours...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirmer mon Rendez-vous</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MY APPOINTMENTS (Upcoming & History) */}
      {/* ======================================================== */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          {/* Header & Sub-tab Pill Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-800">
            <div>
              <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                <span>Gestion de vos Rendez-vous</span>
                {loadingAppointments && (
                  <div className="w-3.5 h-3.5 border-2 border-amber-500/40 border-t-amber-500 rounded-full animate-spin" />
                )}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Consultez vos séances à venir en temps réel ou réservez à nouveau vos soins favoris.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Segmented Filter Pills */}
              <div className="flex p-1 rounded-xl bg-gray-900 border border-gray-800">
                <button
                  type="button"
                  onClick={() => setAppointmentsSubFilter('upcoming')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    appointmentsSubFilter === 'upcoming'
                      ? 'bg-[#D97706] text-white shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span>À venir</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    appointmentsSubFilter === 'upcoming' ? 'bg-black/30 text-amber-200' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {appointmentsData.upcoming.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAppointmentsSubFilter('history')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    appointmentsSubFilter === 'history'
                      ? 'bg-[#D97706] text-white shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span>Historique</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    appointmentsSubFilter === 'history' ? 'bg-black/30 text-amber-200' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {appointmentsData.history.length}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('booking');
                  setBookingStep(1);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#D97706] to-[#B45309] hover:from-[#F59E0B] hover:to-[#D97706] text-white shadow-md shadow-amber-900/30 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>+ Réserver</span>
              </button>
            </div>
          </div>

          {/* 1. UPCOMING APPOINTMENTS LIST */}
          {appointmentsSubFilter === 'upcoming' && (
            <div>
              {appointmentsData.upcoming.length === 0 ? (
                <div className="p-12 text-center bg-[#161F30] rounded-2xl border border-gray-800 text-gray-400 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
                    📅
                  </div>
                  <h3 className="text-base font-bold text-white">Aucun rendez-vous à venir</h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Vous n'avez pas de créneau planifié pour le moment. Choisissez une prestation et réservez dès maintenant !
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('booking');
                      setBookingStep(1);
                    }}
                    className="mt-2 px-5 py-2 rounded-xl bg-[#D97706] text-white text-xs font-bold hover:bg-[#B45309] transition-colors cursor-pointer"
                  >
                    + Réserver une Prestation
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {appointmentsData.upcoming.map((appt) => {
                    const rel = getRelativeScheduleStatus(
                      appt.appointment_date,
                      appt.start_time,
                      appt.end_time,
                      scheduleClock,
                      appt.status
                    );

                    const canCancel = appt.status !== 'in_progress' && appt.status !== 'completed' && appt.status !== 'cancelled';

                    return (
                      <div
                        key={appt.id}
                        className="p-5 rounded-2xl bg-[#161F30] border border-gray-800 hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-lg relative overflow-hidden group"
                      >
                        <div>
                          {/* Card Top: Service & Dynamic Status Badge */}
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={appt.barber?.image_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400'}
                                alt={appt.barber?.name}
                                loading="lazy"
                                decoding="async"
                                className="w-12 h-12 rounded-xl border border-amber-500/30 object-cover object-top flex-shrink-0"
                              />
                              <div>
                                <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider font-mono">
                                  RDV #{appt.id} • {appt.service?.duration || 30} min
                                </div>
                                <h3 className="text-base font-bold text-white mt-0.5">
                                  {appt.service?.name || 'Prestation'}
                                </h3>
                                <div className="text-xs text-gray-400">
                                  Barbier : <strong className="text-gray-200">{appt.barber?.name}</strong>
                                </div>
                              </div>
                            </div>

                            {/* Live Countdown Badge */}
                            {rel && (
                              <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm ${rel.badgeClass}`}>
                                {rel.isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>}
                                <span>{rel.label}</span>
                              </div>
                            )}
                          </div>

                          {/* Date, Time & Price Details */}
                          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-gray-900/80 border border-gray-800/80 text-xs mb-4">
                            <div>
                              <span className="text-[10px] uppercase text-gray-500 block">Date & Créneau</span>
                              <div className="font-mono font-bold text-white mt-0.5">
                                {appt.appointment_date}
                              </div>
                              <div className="font-mono text-amber-400 font-bold text-sm">
                                {appt.start_time} - {appt.end_time}
                              </div>
                            </div>
                            <div className="text-right flex flex-col justify-between">
                              <span className="text-[10px] uppercase text-gray-500 block">Montant</span>
                              <div className="font-mono font-bold text-white text-base">
                                {appt.total_price} {appt.currency || 'MAD'}
                              </div>
                              <div className="text-[10px] text-emerald-400 font-medium">
                                +{Math.round((appt.total_price || 0) * 0.1)} pts cumulés
                              </div>
                            </div>
                          </div>

                          {appt.notes && (
                            <div className="text-[11px] text-gray-400 italic bg-gray-900/40 p-2.5 rounded-lg border border-gray-800/60 mb-4">
                              « {appt.notes} »
                            </div>
                          )}
                        </div>

                        {/* Actions for Upcoming Appointment */}
                        <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>Réservation confirmée</span>
                          </span>

                          <div className="flex items-center gap-2">
                            {canCancel && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openRescheduleModal(appt)}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white transition-colors cursor-pointer"
                                >
                                  Reporter
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelClick(appt)}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
                                >
                                  Annuler
                                </button>
                              </>
                            )}

                            {appt.status === 'in_progress' && (
                              <div className="px-3 py-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg animate-pulse">
                                Au fauteuil
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. HISTORY APPOINTMENTS LIST */}
          {appointmentsSubFilter === 'history' && (
            <div>
              {appointmentsData.history.length === 0 ? (
                <div className="p-12 text-center bg-[#161F30] rounded-2xl border border-gray-800 text-gray-400 space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-800 text-gray-500 flex items-center justify-center text-xl">
                    📜
                  </div>
                  <h3 className="text-base font-bold text-white">Aucun historique de soins</h3>
                  <p className="text-xs text-gray-400">Vos prestations passées ou annulées apparaîtront ici.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {appointmentsData.history.map((appt) => {
                    const isCompleted = appt.status === 'completed';
                    const isCancelled = appt.status === 'cancelled';

                    return (
                      <div
                        key={appt.id}
                        className="p-5 rounded-2xl bg-[#161F30] border border-gray-800 hover:border-gray-700 transition-all flex flex-col justify-between shadow-lg"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={appt.barber?.image_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400'}
                                alt={appt.barber?.name}
                                loading="lazy"
                                decoding="async"
                                className="w-11 h-11 rounded-xl border border-gray-700 object-cover object-top flex-shrink-0"
                              />
                              <div>
                                <div className="text-[10px] text-gray-400 font-mono font-bold uppercase">
                                  Séance #{appt.id}
                                </div>
                                <h3 className="text-base font-bold text-white mt-0.5">
                                  {appt.service?.name || 'Prestation'}
                                </h3>
                                <div className="text-xs text-gray-400">
                                  Avec {appt.barber?.name}
                                </div>
                              </div>
                            </div>

                            {/* Status Pill */}
                            {isCompleted ? (
                              <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                Terminé
                              </span>
                            ) : isCancelled ? (
                              <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-500/15 text-red-400 border border-red-500/30">
                                Annulé
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gray-800 text-gray-400 border border-gray-700">
                                {appt.status}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900/60 border border-gray-800/60 text-xs mb-4">
                            <div>
                              <span className="text-[10px] text-gray-500 uppercase block">Date & Heure</span>
                              <span className="text-gray-300 font-mono font-medium">
                                {appt.appointment_date} à {appt.start_time}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-gray-500 uppercase block">Tarif</span>
                              <span className="text-amber-400 font-mono font-bold text-sm">
                                {appt.total_price} {appt.currency || 'MAD'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Rebook & Review Actions */}
                        <div className="pt-3 border-t border-gray-800 flex items-center justify-between gap-2">
                          {isCompleted ? (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewBarberId(appt.barber_id);
                                setActiveTab('review');
                              }}
                              className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                            >
                              <span>★ Laisser un avis</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-gray-500">Prestation archivée</span>
                          )}

                          {/* REBOOK / BOOK AGAIN BUTTON */}
                          <button
                            type="button"
                            onClick={() => handleRebook(appt)}
                            className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5 shadow"
                            title="Pré-sélectionner cette prestation et ce barbier pour réserver à nouveau"
                          >
                            <span>✂️ Réserver à nouveau</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: LOYALTY CLUB */}
      {/* ======================================================== */}
      {activeTab === 'loyalty' && (
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-gray-900 via-[#1F2937] to-amber-950/30 rounded-2xl p-8 border border-amber-500/30 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 max-w-xl">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 inline-block mb-3">
                Membre Privilège — Atelier Royal
              </span>
              <h2 className="text-3xl font-serif font-bold text-white mb-2">
                Votre Solde : <span className="text-amber-400 font-mono">{user?.loyalty_points || 0} Points</span>
              </h2>
              <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                Chaque prestation réalisée vous rapporte 10% de sa valeur en points. 10 points = 1 MAD de réduction immédiate déductible lors de vos prochaines visites.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">Valeur Cash</div>
                  <div className="text-lg font-bold text-amber-400 font-mono">
                    {Math.floor((user?.loyalty_points || 0) / 10)} MAD
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">Statut</div>
                  <div className="text-lg font-bold text-emerald-400">{loyaltyData?.tier || 'VIP Gold'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">Prochain palier</div>
                  <div className="text-sm font-medium text-gray-300 mt-1">VIP Black (500 pts)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-[#1F2937]/70 border border-gray-800">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold mb-4">
                1
              </div>
              <h3 className="font-bold text-white text-base mb-1">Prenez Soin de Vous</h3>
              <p className="text-xs text-gray-400">
                Chaque coupe, taille de barbe ou rituel de soin crédite automatiquement votre compte.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-[#1F2937]/70 border border-gray-800">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold mb-4">
                2
              </div>
              <h3 className="font-bold text-white text-base mb-1">Cumulez les Points</h3>
              <p className="text-xs text-gray-400">
                100 MAD dépensés = 10 points fidélité garantis et valables à vie.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-[#1F2937]/70 border border-gray-800">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold mb-4">
                3
              </div>
              <h3 className="font-bold text-white text-base mb-1">Soins VIP Offerts</h3>
              <p className="text-xs text-gray-400">
                Échangez vos points contre des prestations gratuites ou des produits de coiffage de luxe.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: LEAVE A REVIEW */}
      {/* ======================================================== */}
      {activeTab === 'review' && (
        <div className="max-w-2xl bg-[#1F2937]/80 rounded-2xl border border-gray-800 p-6 md:p-8">
          <h2 className="text-xl font-serif font-bold text-white mb-2">
            Votre Avis d’Exception Compte
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            Partagez votre retour d’expérience sur votre coupe ou votre barbier pour aider la communauté.
          </p>

          {reviewSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              {reviewSuccess}
            </div>
          )}

          {reviewError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              {reviewError}
            </div>
          )}

          <form onSubmit={handleSubmitReview} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">
                Sélectionnez le Maître Barbier *
              </label>
              <select
                value={reviewBarberId}
                required
                onChange={(e) => setReviewBarberId(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm focus:border-[#D97706] outline-none"
              >
                <option value="">-- Choisir un barbier --</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.specialty})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">
                Note Globale (1 à 5 Étoiles) *
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 text-2xl transition-transform hover:scale-110"
                  >
                    <span className={star <= reviewRating ? 'text-amber-400' : 'text-gray-600'}>
                      ★
                    </span>
                  </button>
                ))}
                <span className="ml-3 text-sm font-semibold text-amber-400">{reviewRating} / 5</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">
                Commentaire & Ressenti (facultatif)
              </label>
              <textarea
                rows={4}
                value={reviewComment}
                placeholder="Parlez-nous de la précision de la coupe, du rituel à la serviette chaude, de l'accueil..."
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm focus:border-[#D97706] outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-amber-900/30"
            >
              Publier mon Avis
            </button>
          </form>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1F2937] rounded-2xl border border-gray-700 p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">
              Déplacer le Rendez-vous #{rescheduleModal.appointment?.id}
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Sélectionnez une nouvelle date et un nouveau créneau disponible.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-gray-300">Nouvelle Date</label>
                  {newDate === getTodayDateString() && (
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-semibold border border-amber-500/20">
                      Aujourd'hui
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={newDate}
                  min={getTodayDateString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    const today = getTodayDateString();
                    const safeDate = val < today ? today : val;
                    setNewDate(safeDate);
                    loadRescheduleSlots(
                      rescheduleModal.appointment.barber_id,
                      safeDate,
                      rescheduleModal.appointment.service?.duration || 30
                    );
                  }}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-gray-300">
                    Nouveau Créneau
                  </label>
                  <span className="text-[11px] text-gray-400 font-mono">
                    {rescheduleSlots.filter((s) => !isSlotInPast(s, newDate)).length} disponible(s)
                  </span>
                </div>
                {loadingRescheduleSlots ? (
                  <div className="text-xs text-gray-400 py-2">Recherche des créneaux...</div>
                ) : rescheduleSlots.length === 0 ? (
                  <div className="text-xs text-red-400 py-2">Aucun créneau libre à cette date.</div>
                ) : rescheduleSlots.every((s) => isSlotInPast(s, newDate)) ? (
                  <div className="text-xs text-amber-400 py-2 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                    Tous les créneaux pour cette date sont passés.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                    {(allRescheduleSlots.length > 0 ? allRescheduleSlots : rescheduleSlots.map((s) => ({ time: s, is_available: true }))).map((slotObj) => {
                      const slot = slotObj.time;
                      const isPast = slotObj.is_past || isSlotInPast(slot, newDate);
                      const isBooked = slotObj.is_booked;
                      const isDisabled = isPast || isBooked || !slotObj.is_available;
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => !isDisabled && setNewSlot(slot)}
                          className={`py-1.5 px-2 text-xs font-mono rounded cursor-pointer relative ${
                            isPast
                              ? 'bg-gray-900/40 text-gray-600 line-through cursor-not-allowed opacity-35'
                              : isBooked
                              ? 'bg-red-950/20 text-red-400/50 line-through cursor-not-allowed border border-red-900/30'
                              : newSlot === slot
                              ? 'bg-[#D97706] text-white font-bold'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                          title={isPast ? 'Créneau déjà passé' : isBooked ? 'Déjà réservé' : `Choisir ${slot}`}
                        >
                          {slot}
                          {isBooked && <span className="block text-[8px] text-red-400 font-sans">Pris</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRescheduleModal({ isOpen: false, appointment: null })}
                className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
              >
                Fermer
              </button>
              <button
                type="button"
                disabled={!newSlot}
                onClick={handleConfirmReschedule}
                className={`px-4 py-2 text-xs font-bold rounded-lg ${
                  newSlot
                    ? 'bg-[#D97706] text-white hover:bg-[#B45309]'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                Confirmer le Déplacement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CANCELLATION CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {cancelModal.isOpen && cancelModal.appointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1F2937] border border-gray-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3.5 text-red-400">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 text-xl">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Annuler votre rendez-vous ?</h3>
                <p className="text-xs text-gray-400">Cette action libérera le créneau dans l'agenda de votre barbier.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-900/90 border border-gray-800 text-xs space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                <span className="text-gray-400">Prestation :</span>
                <span className="text-white font-bold">{cancelModal.appointment.service?.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                <span className="text-gray-400">Maître Barbier :</span>
                <span className="text-gray-200 font-medium">{cancelModal.appointment.barber?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Date & Heure :</span>
                <span className="text-amber-400 font-mono font-bold">
                  {cancelModal.appointment.appointment_date} à {cancelModal.appointment.start_time}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 italic">
              Vous pourrez à tout moment réserver un nouveau créneau directement depuis votre espace client.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={cancelModal.isCancelling}
                onClick={() => setCancelModal({ isOpen: false, appointment: null, isCancelling: false })}
                className="px-4 py-2.5 text-xs font-semibold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors cursor-pointer"
              >
                Conserver mon RDV
              </button>
              <button
                type="button"
                disabled={cancelModal.isCancelling}
                onClick={handleConfirmCancel}
                className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-lg shadow-red-900/40 transition-all cursor-pointer flex items-center gap-2"
              >
                {cancelModal.isCancelling ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Annulation en cours...</span>
                  </>
                ) : (
                  <span>Confirmer l'annulation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
