import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import {
  getServices,
  getBarbers,
  getAvailableSlots,
  bookAppointment,
} from '../../api/barberApi';
import { getTodayDateString, isSlotInPast } from '../../utils/dateTime';

export default function BookingModal({
  isOpen,
  onClose,
  lang = 'fr',
  t,
  preselectedService = null,
  preselectedBarber = null,
  availableServices = [],
  availableBarbers = [],
}) {
  const { user, isAuthenticated, login, register } = useAuth();
  const navigate = useNavigate();

  // Catalog states
  const [services, setServices] = useState(availableServices);
  const [barbers, setBarbers] = useState(availableBarbers);

  // Form selections
  const [selectedServiceId, setSelectedServiceId] = useState(
    preselectedService ? preselectedService.id : availableServices[0]?.id || 1
  );
  const [selectedBarberId, setSelectedBarberId] = useState(
    preselectedBarber ? preselectedBarber.id : availableBarbers[0]?.id || 1
  );

  const [date, setDate] = useState(() => getTodayDateString());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [allSlotsData, setAllSlotsData] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');

  const [clientName, setClientName] = useState(user?.name || '');
  const [clientPhone, setClientPhone] = useState(user?.phone || '');
  const [clientNotes, setClientNotes] = useState('');

  // Quick Auth State inside modal if guest
  const [authTab, setAuthTab] = useState('booking'); // 'booking' | 'login' | 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Submission & Confirmation state
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [confirmedData, setConfirmedData] = useState(null);

  // Load catalog if empty
  useEffect(() => {
    let ignore = false;
    if (services.length === 0 || barbers.length === 0) {
      Promise.all([getServices(), getBarbers()])
        .then(([srvRes, brbRes]) => {
          if (!ignore) {
            if (srvRes.data && srvRes.data.length > 0) {
              setServices(srvRes.data);
              if (!preselectedService) setSelectedServiceId(srvRes.data[0].id);
            }
            if (brbRes.data && brbRes.data.length > 0) {
              setBarbers(brbRes.data);
              if (!preselectedBarber) setSelectedBarberId(brbRes.data[0].id);
            }
          }
        })
        .catch(console.error);
    }
    return () => {
      ignore = true;
    };
  }, [services.length, barbers.length, preselectedService, preselectedBarber]);

  // Fetch real-time available slots whenever barber, date, or service changes
  const activeService = services.find((s) => s.id === Number(selectedServiceId)) || services[0];
  const activeBarber = barbers.find((b) => b.id === Number(selectedBarberId)) || barbers[0];

  const fetchSlots = useCallback(async (barberId, dateStr, durationMin) => {
    if (!barberId || !dateStr) return;
    setLoadingSlots(true);
    try {
      const res = await getAvailableSlots(barberId, dateStr, durationMin);
      const rawSlots = res.slots || [];
      const detailedSlots = res.all_slots || [];
      setAvailableSlots(rawSlots);
      setAllSlotsData(detailedSlots);

      // Select the first valid future slot
      const validFutureSlots = rawSlots.filter((slot) => !isSlotInPast(slot, dateStr));
      if (validFutureSlots.length > 0) {
        setSelectedSlot((prev) => (validFutureSlots.includes(prev) ? prev : validFutureSlots[0]));
      } else {
        setSelectedSlot('');
      }
    } catch (err) {
      console.error('Error fetching available slots:', err);
      setAvailableSlots([]);
      setAllSlotsData([]);
      setSelectedSlot('');
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (activeBarber && date && activeService) {
      const duration = typeof activeService.duration === 'number' ? activeService.duration : 30;
      fetchSlots(activeBarber.id, date, duration);
    }
  }, [activeBarber, date, activeService, fetchSlots]);

  if (!isOpen) return null;

  // Handle Quick Login inside modal
  const handleQuickLogin = async (e) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      await login({ email: authEmail, password: authPassword });
      setAuthTab('booking');
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Identifiants incorrects.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Handle Quick Register inside modal
  const handleQuickRegister = async (e) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      await register({
        name: clientName,
        email: authEmail,
        phone: clientPhone,
        password: authPassword,
        password_confirmation: authPassword,
      });
      setAuthTab('booking');
    } catch (err) {
      setAuthError(err.response?.data?.message || "Erreur lors de l'inscription.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Handle Real Appointment Booking
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingError(null);

    if (!selectedSlot) {
      setBookingError('Veuillez sélectionner un créneau horaire disponible.');
      return;
    }

    if (isSlotInPast(selectedSlot, date)) {
      setBookingError('Ce créneau horaire est déjà passé. Veuillez sélectionner un horaire futur.');
      return;
    }

    if (!isAuthenticated) {
      setAuthTab('login');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        service_id: Number(selectedServiceId),
        barber_id: Number(selectedBarberId),
        appointment_date: date,
        start_time: selectedSlot,
        client_phone: clientPhone,
        client_notes: clientNotes,
      };

      const res = await bookAppointment(payload);
      setConfirmedData({
        appointment: res.data,
        service: activeService,
        barber: activeBarber,
        slot: selectedSlot,
        date,
        pointsEarned: res.loyalty_points_earned,
        totalPoints: res.current_loyalty_points,
      });

      // Immediately refresh available slots without reloading page
      const duration = typeof activeService?.duration === 'number' ? activeService.duration : 30;
      fetchSlots(activeBarber.id, date, duration);
    } catch (err) {
      console.error('Booking submission error:', err);
      let errorMsg = 'Erreur lors de la réservation. Veuillez vérifier vos informations.';
      if (err.response?.data?.errors) {
        const errorList = Object.values(err.response.data.errors).flat();
        if (errorList.length > 0) {
          errorMsg = errorList.join(' ');
        }
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      setBookingError(errorMsg);

      // Re-fetch slots immediately so if slot was double-booked, UI reflects it
      const duration = typeof activeService?.duration === 'number' ? activeService.duration : 30;
      fetchSlots(activeBarber.id, date, duration);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setConfirmedData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 max-h-[92vh] overflow-y-auto font-sans">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition cursor-pointer"
        >
          ✕
        </button>

        {/* 1. CONFIRMATION SUCCESS VIEW */}
        {confirmedData ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              ✓
            </div>

            <h3 className="text-2xl font-bold text-white">Rendez-vous Confirmé !</h3>
            <p className="text-sm text-gray-300 max-w-md mx-auto leading-relaxed">
              Votre réservation #{confirmedData.appointment?.id} a été enregistrée avec succès. Un SMS de confirmation et rappel automatique sera envoyé à votre numéro.
            </p>

            <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-xs text-left space-y-2 mt-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Prestation :</span>
                <span className="font-bold text-white">{confirmedData.service?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Maître Barbier :</span>
                <span className="font-bold text-amber-400">{confirmedData.barber?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date & Heure :</span>
                <span className="font-mono text-white font-bold">
                  {confirmedData.date} à {confirmedData.slot}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tarif au salon :</span>
                <span className="font-mono text-amber-400 font-bold">
                  {confirmedData.service?.price} {confirmedData.service?.currency || 'MAD'}
                </span>
              </div>
              {confirmedData.pointsEarned && (
                <div className="flex justify-between pt-2 border-t border-gray-800 text-emerald-400 font-medium">
                  <span>Points fidélité crédités :</span>
                  <span>+{confirmedData.pointsEarned} pts (Total: {confirmedData.totalPoints})</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  navigate('/client');
                }}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 transition shadow cursor-pointer text-center"
              >
                Gérer mes Rendez-vous →
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="py-3 px-5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : authTab !== 'booking' ? (
          /* 2. INLINE GUEST QUICK AUTHENTICATION */
          <div className="space-y-5 py-2">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  Réservation Privilège
                </span>
                <h3 className="text-lg font-bold text-white">
                  {authTab === 'login' ? 'Connexion Client' : 'Inscription Rapide'}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuthTab('login')}
                  className={`text-xs px-2.5 py-1 rounded font-medium ${
                    authTab === 'login' ? 'bg-amber-500 text-gray-950 font-bold' : 'text-gray-400'
                  }`}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab('register')}
                  className={`text-xs px-2.5 py-1 rounded font-medium ${
                    authTab === 'register' ? 'bg-amber-500 text-gray-950 font-bold' : 'text-gray-400'
                  }`}
                >
                  Inscription
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Pour finaliser votre réservation et bénéficier des rappels SMS et points fidélité, veuillez vous identifier en quelques secondes.
            </p>

            {authError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {authError}
              </div>
            )}

            {authTab === 'login' ? (
              <form onSubmit={handleQuickLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="client@barbershop.ma"
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Mot de passe</label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthTab('booking')}
                    className="flex-1 py-2 text-xs text-gray-400 hover:text-white"
                  >
                    ← Revenir au formulaire
                  </button>
                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 text-gray-950 font-bold text-xs uppercase hover:bg-amber-400 transition"
                  >
                    {authSubmitting ? 'Connexion...' : 'Se connecter & Réserver'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleQuickRegister} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Nom complet</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Youssef Alami"
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="votre.email@domaine.com"
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Téléphone portable</label>
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+212 6 XX XX XX XX"
                      className="w-full px-3.5 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Mot de passe</label>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthTab('booking')}
                    className="flex-1 py-2 text-xs text-gray-400 hover:text-white"
                  >
                    ← Revenir au formulaire
                  </button>
                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 text-gray-950 font-bold text-xs uppercase hover:bg-amber-400 transition"
                  >
                    {authSubmitting ? 'Création...' : "S'inscrire & Réserver"}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* 3. DYNAMIC BOOKING FORM WITH REAL-TIME SLOTS */
          <div>
            <div className="mb-6 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                {t.bookingModal.badge}
              </span>
              <h2 className="text-2xl font-extrabold text-white">
                {t.bookingModal.title}
              </h2>
              <p className="text-xs text-gray-400">
                {t.bookingModal.subtitle}
              </p>
            </div>

            {bookingError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {bookingError}
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              {/* Service Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wider">
                  1. {t.bookingModal.selectService}
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-amber-500"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || (lang === 'ar' ? s.nameAr : s.nameFr)} — {s.duration} min ({s.price} {s.currency || 'MAD'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Barber Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wider">
                  2. {t.bookingModal.selectBarber}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {barbers.map((b) => {
                    const isSelected = Number(selectedBarberId) === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBarberId(b.id)}
                        className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 text-white'
                            : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:border-gray-700'
                        }`}
                      >
                        <img
                          src={b.image_url || b.image}
                          alt={b.name}
                          loading="lazy"
                          decoding="async"
                          className="w-8 h-8 rounded-lg object-cover object-top border border-amber-500/20"
                        />
                        <div className="truncate">
                          <div className="text-xs font-semibold truncate text-white">{b.name}</div>
                          <div className="text-[10px] text-amber-400">★ {b.rating}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Dynamic Available Slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                      3. Date de Visite
                    </label>
                    {date === getTodayDateString() && (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-semibold border border-amber-500/20">
                        Aujourd'hui
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    required
                    min={getTodayDateString()}
                    value={date}
                    onChange={(e) => {
                      const val = e.target.value;
                      const today = getTodayDateString();
                      setDate(val < today ? today : val);
                    }}
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Créneau Horaire
                    </label>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {availableSlots.filter((s) => !isSlotInPast(s, date)).length} libre(s)
                    </span>
                  </div>

                  {loadingSlots ? (
                    <div className="py-6 px-3 bg-gray-950 border border-gray-800 rounded-xl flex items-center justify-center gap-2 text-xs text-amber-400">
                      <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                      <span>Recherche des disponibilités en direct...</span>
                    </div>
                  ) : allSlotsData.length > 0 ? (
                    <div className="p-2 bg-gray-950 border border-gray-800 rounded-xl">
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-40 overflow-y-auto pr-1">
                        {allSlotsData.map((slotObj) => {
                          const slot = slotObj.time;
                          const isPast = slotObj.is_past || isSlotInPast(slot, date);
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
                              className={`py-1.5 px-1 rounded text-center text-xs font-mono transition-all relative ${
                                isPast
                                  ? 'bg-gray-900/30 text-gray-600 line-through cursor-not-allowed opacity-30 border border-gray-900'
                                  : isBooked
                                  ? 'bg-red-950/20 text-red-400/50 line-through cursor-not-allowed border border-red-900/30'
                                  : isBreak
                                  ? 'bg-gray-900/20 text-gray-600 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-gray-950 font-bold shadow-md shadow-amber-600/30 ring-1 ring-amber-300'
                                  : 'bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 hover:border-amber-500/40 cursor-pointer'
                              }`}
                              title={
                                isPast
                                  ? 'Créneau passé'
                                  : isBooked
                                  ? 'Créneau déjà réservé'
                                  : isBreak
                                  ? 'Pause'
                                  : `Sélectionner ${slot}`
                              }
                            >
                              {slot}
                              {isBooked && <span className="block text-[8px] text-red-400">Pris</span>}
                              {isPast && <span className="block text-[8px] text-gray-600">Passé</span>}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 pt-1.5 border-t border-gray-800/60 justify-end">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded bg-amber-500 inline-block"></span> Choisi
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded bg-red-800/60 inline-block"></span> Réservé
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded bg-gray-700/60 inline-block"></span> Passé
                        </span>
                      </div>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-xs text-red-400 py-3 px-3 bg-red-950/30 border border-red-900/30 rounded-xl">
                      Complet ou jour de repos à cette date.
                    </div>
                  ) : (
                    <select
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                      className="w-full px-3.5 py-2 bg-gray-950 border border-gray-700 rounded-xl text-amber-400 font-mono text-xs font-bold outline-none focus:border-amber-500"
                    >
                      {availableSlots.map((slot) => {
                        const isPassed = isSlotInPast(slot, date);
                        return (
                          <option key={slot} value={slot} disabled={isPassed}>
                            {slot} {isPassed ? '— (Déjà passé)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              </div>

              {/* Client Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1 uppercase tracking-wider">
                    {t.bookingModal.yourName}
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nom & Prénom"
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1 uppercase tracking-wider">
                    {t.bookingModal.yourPhone}
                  </label>
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+212 6 XX XX XX XX"
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1 uppercase tracking-wider">
                  Notes particulières (facultatif)
                </label>
                <input
                  type="text"
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Ex: Dégradé blanc, contours soignés..."
                  className="w-full px-3.5 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-amber-500"
                />
              </div>

              {/* Pricing & Loyalty Summary */}
              <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400">Total Prestation :</span>
                  <span className="ml-2 font-mono font-bold text-amber-400 text-sm">
                    {activeService?.price} {activeService?.currency || 'MAD'}
                  </span>
                </div>
                <div className="text-emerald-400 font-medium text-[11px]">
                  +{Math.round((activeService?.price || 150) * 0.1)} pts fidélité
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting || availableSlots.length === 0}
                className={`w-full py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg flex items-center justify-center gap-2 ${
                  submitting || availableSlots.length === 0
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-gray-950 shadow-amber-600/25 active:scale-[0.99]'
                }`}
              >
                {submitting ? (
                  <span>Confirmation en cours...</span>
                ) : !isAuthenticated ? (
                  <span>Continuer & Valider (Identification Rapide) →</span>
                ) : (
                  <span>{t.bookingModal.confirmBtn}</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
