import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import AvatarUploader from '../common/AvatarUploader';
import { useAuth } from '../../context/useAuth';
import { getTodayDateString, getRelativeScheduleStatus } from '../../utils/dateTime';
import {
  getEmployeeAppointments,
  updateEmployeeAppointmentStatus,
  getEmployeSchedule,
  updateWorkingHours,
} from '../../api/barberApi';

// Isolated memoized digital clock to prevent re-rendering the full portal every second
const EmployeLiveClock = React.memo(function EmployeLiveClock() {
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-end px-3.5 py-1.5 rounded-xl bg-gray-900 border border-gray-800 font-mono shadow-inner">
      <div className="flex items-center gap-2 text-xs text-amber-400 font-bold">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        <span>
          {clock.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      </div>
      <div className="text-[10px] text-gray-400 capitalize">
        {clock.toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </div>
    </div>
  );
});

export default function EmployePortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'hours' | 'clients'

  // Dynamic Live Appointments & Stats State
  const [appointments, setAppointments] = useState([]);
  const [dailyStats, setDailyStats] = useState({
    total_today: 0,
    completed_today: 0,
    remaining_queue: 0,
    next_client: null,
  });
  const [barberProfile, setBarberProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filters State
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'all' | 'custom'
  const [customDate, setCustomDate] = useState(getTodayDateString());
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'in_progress' | 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time Schedule Clock & Auto Polling State
  const [scheduleClock, setScheduleClock] = useState(new Date());
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // Toast / feedback message
  const [feedback, setFeedback] = useState(null);
  const showFeedback = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Working Hours State
  const [workingHours, setWorkingHours] = useState([
    { day_of_week: 0, day_name: 'Dimanche', is_day_off: true, start_time: '09:30', end_time: '20:30', break_start: '13:00', break_end: '14:00' },
    { day_of_week: 1, day_name: 'Lundi', is_day_off: false, start_time: '09:30', end_time: '20:30', break_start: '13:00', break_end: '14:00' },
    { day_of_week: 2, day_name: 'Mardi', is_day_off: false, start_time: '09:30', end_time: '20:30', break_start: '13:00', break_end: '14:00' },
    { day_of_week: 3, day_name: 'Mercredi', is_day_off: false, start_time: '09:30', end_time: '20:30', break_start: '13:00', break_end: '14:00' },
    { day_of_week: 4, day_name: 'Jeudi', is_day_off: false, start_time: '09:30', end_time: '20:30', break_start: '13:00', break_end: '14:00' },
    { day_of_week: 5, day_name: 'Vendredi', is_day_off: false, start_time: '09:30', end_time: '20:30', break_start: '13:00', break_end: '14:00' },
    { day_of_week: 6, day_name: 'Samedi', is_day_off: false, start_time: '09:30', end_time: '20:30', break_start: '13:00', break_end: '14:00' },
  ]);
  const [savingHours, setSavingHours] = useState(false);
  const [hoursSuccess, setHoursSuccess] = useState(null);

  // 1. Fetch live appointments from GET /api/employee/appointments
  const loadAppointments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = {};
      if (dateFilter === 'today') {
        params.date = 'today';
      } else if (dateFilter === 'all') {
        params.date = 'all';
      } else if (dateFilter === 'custom' && customDate) {
        params.date = customDate;
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await getEmployeeAppointments(params);
      setAppointments(res.data || []);
      if (res.daily_stats) {
        setDailyStats(res.daily_stats);
      }
      if (res.barber) {
        setBarberProfile(res.barber);
      }
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Error fetching employee appointments:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [dateFilter, customDate, statusFilter, searchQuery]);

  // Load initial working hours & schedule
  useEffect(() => {
    getEmployeSchedule(getTodayDateString(), 'day')
      .then((res) => {
        if (res.barber?.working_hours && res.barber.working_hours.length > 0) {
          const daysMap = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
          const formatted = res.barber.working_hours.map((wh) => ({
            ...wh,
            day_name: daysMap[wh.day_of_week],
            start_time: wh.start_time?.substring(0, 5) || '09:30',
            end_time: wh.end_time?.substring(0, 5) || '20:30',
            break_start: wh.break_start?.substring(0, 5) || '13:00',
            break_end: wh.break_end?.substring(0, 5) || '14:00',
          }));
          setWorkingHours(formatted);
        }
      })
      .catch(console.error);
  }, []);

  // 2. Relative time schedule clock ticker (every 60s for minute-level schedule badge updates)
  useEffect(() => {
    const timer = setInterval(() => {
      setScheduleClock(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // 3. Real-time background polling every 20 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      loadAppointments(true); // silent fetch without table flicker
    }, 20000);
    return () => clearInterval(pollInterval);
  }, [loadAppointments]);

  // Debounced search / filter trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAppointments(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [loadAppointments]);

  // 4. One-Click Status Update with Optimistic Instant UI Update
  const handleUpdateStatus = async (id, newStatus) => {
    const previousAppointments = appointments;
    const previousDailyStats = dailyStats;

    // Optimistic UI update
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );

    // If updating current/next client, update it optimistically too
    if (dailyStats.next_client?.id === id) {
      setDailyStats((prev) => ({
        ...prev,
        next_client: { ...prev.next_client, status: newStatus },
      }));
    }

    try {
      await updateEmployeeAppointmentStatus(id, newStatus);
      showFeedback(`Statut du rendez-vous mis à jour : ${newStatus}`);
      loadAppointments(true);
    } catch (err) {
      // Revert on error
      setAppointments(previousAppointments);
      setDailyStats(previousDailyStats);
      showFeedback(err.response?.data?.message || 'Erreur lors de la mise à jour.', 'error');
    }
  };

  // Working Hours update
  const handleSaveHours = async (e) => {
    e.preventDefault();
    setSavingHours(true);
    setHoursSuccess(null);
    try {
      await updateWorkingHours(workingHours);
      setHoursSuccess('Vos horaires de service et pauses ont été enregistrés avec succès.');
      setTimeout(() => setHoursSuccess(null), 4000);
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Erreur de sauvegarde des horaires.', 'error');
    } finally {
      setSavingHours(false);
    }
  };

  const toggleDayOff = (dayOfWeek) => {
    setWorkingHours((prev) =>
      prev.map((wh) =>
        wh.day_of_week === dayOfWeek ? { ...wh, is_day_off: !wh.is_day_off } : wh
      )
    );
  };

  const handleHourChange = (dayOfWeek, field, value) => {
    setWorkingHours((prev) =>
      prev.map((wh) => (wh.day_of_week === dayOfWeek ? { ...wh, [field]: value } : wh))
    );
  };

  // Unique assigned clients extraction from appointments
  const assignedClients = useMemo(() => {
    const map = new Map();
    appointments.forEach((appt) => {
      if (appt.client && !map.has(appt.client.id)) {
        map.set(appt.client.id, {
          ...appt.client,
          lastService: appt.service?.name,
          lastDate: appt.appointment_date,
          status: appt.status,
          totalCuts: appointments.filter((a) => a.client_id === appt.client_id).length,
        });
      }
    });
    return Array.from(map.values());
  }, [appointments]);

  // Current or Next client highlighted
  const spotlightClient = dailyStats.next_client;

  return (
    <DashboardLayout
      title="Espace Maître Barbier"
      subtitle={`Bienvenue Maître ${user?.name || barberProfile?.name || ''}. Gérez vos créneaux en direct, vos rituels et vos disponibilités.`}
    >
      {/* Top Header Bar with Live Digital Clock & Auto Polling Badge */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-[#161F30] border border-gray-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <AvatarUploader
            size="md"
            currentImage={user?.avatar || barberProfile?.image_url}
            onUploadSuccess={(res) => {
              const newUrl = res?.avatar_url;
              if (newUrl) {
                setBarberProfile((prev) => (prev ? { ...prev, image_url: newUrl } : prev));
              }
              showFeedback('Photo de profil mise à jour et synchronisée !');
            }}
            onError={(msg) => showFeedback(msg, 'error')}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-black text-white text-base">
                {barberProfile?.name || user?.name}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Poste Actif
              </span>
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
              <span>{barberProfile?.specialty || 'Maître Barbier & Styliste'}</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">★ {barberProfile?.rating || '4.9'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Digital Clock (isolated memoized component) */}
          <EmployeLiveClock />

          {/* Background Polling Status Pill */}
          <div
            className="hidden sm:flex flex-col items-end px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[10px] font-mono text-emerald-400"
            title={`Actualisation automatique toutes les 20 secondes. Dernière synchro : ${lastSyncTime.toLocaleTimeString('fr-FR')}`}
          >
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Auto-sync 20s</span>
            </div>
            <div className="text-[9px] text-gray-400">
              {lastSyncTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              loadAppointments(false);
              showFeedback('Données synchronisées avec le serveur.');
            }}
            className="p-2.5 rounded-xl bg-gray-800 text-amber-400 hover:text-white hover:bg-gray-700 transition cursor-pointer"
            title="Actualiser immédiatement"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {feedback && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-white font-semibold text-xs shadow-2xl flex items-center gap-2 animate-bounce ${
            feedback.type === 'error'
              ? 'bg-gradient-to-r from-red-600 to-rose-700'
              : 'bg-gradient-to-r from-amber-600 to-amber-700'
          }`}
        >
          <span>{feedback.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Navigation Tab Switcher */}
      <div className="flex border-b border-gray-800 mb-8 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'schedule'
              ? 'border-[#D97706] text-[#D97706] bg-amber-500/5 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Planning & RDV en Direct</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 text-amber-400 font-mono">
            {appointments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hours')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'hours'
              ? 'border-[#D97706] text-[#D97706] bg-amber-500/5 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Horaires de Service & Pauses</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('clients')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'clients'
              ? 'border-[#D97706] text-[#D97706] bg-amber-500/5 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Mes Clients Assignés ({assignedClients.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: SCHEDULE & LIVE AGENDA                            */}
      {/* ======================================================== */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* ======================================================== */}
          {/* PROMINENT SPOTLIGHT: CURRENT / NEXT CLIENT IN CHAIR       */}
          {/* ======================================================== */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1E293B] via-[#161F30] to-[#0F172A] border-2 border-amber-500/40 shadow-2xl relative overflow-hidden group">
            {/* Ambient luxury glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition-all"></div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              {spotlightClient ? (
                <>
                  <div className="flex items-start sm:items-center gap-4">
                    {/* Time slot square */}
                    <div className="w-16 h-16 rounded-2xl bg-gray-900/90 border border-amber-500/30 flex flex-col items-center justify-center font-mono shadow-md flex-shrink-0">
                      <span className="text-sm font-black text-amber-400">
                        {spotlightClient.start_time}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {spotlightClient.end_time || '30m'}
                      </span>
                    </div>

                    <div>
                      {/* Status Headline */}
                      <div className="flex items-center gap-2 mb-1">
                        {spotlightClient.status === 'in_progress' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            ✂️ Client Actuel au Fauteuil
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                            ⭐ Prochain Client Attendu
                          </span>
                        )}

                        {/* Live relative countdown badge */}
                        {(() => {
                          const rel = getRelativeScheduleStatus(
                            spotlightClient.appointment_date,
                            spotlightClient.start_time,
                            spotlightClient.end_time,
                            scheduleClock,
                            spotlightClient.status
                          );
                          return rel ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${rel.badgeClass}`}>
                              {rel.label}
                            </span>
                          ) : null;
                        })()}
                      </div>

                      {/* Client Name & Service */}
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>{spotlightClient.client?.name || 'Client réservé'}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-amber-400 font-mono font-bold">
                          {spotlightClient.total_price} MAD
                        </span>
                      </h3>

                      <div className="text-xs text-gray-300 flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <span className="text-amber-200/90 font-medium">
                          Prestation : {spotlightClient.service?.name} ({spotlightClient.service?.duration || 30} min)
                        </span>
                        {spotlightClient.client?.phone && (
                          <a
                            href={`tel:${spotlightClient.client.phone}`}
                            className="text-gray-400 hover:text-amber-400 font-mono flex items-center gap-1 transition"
                            title="Appeler le client"
                          >
                            <span>📞</span>
                            <span>{spotlightClient.client.phone}</span>
                          </a>
                        )}
                        <span className="text-gray-500">Date : {spotlightClient.appointment_date}</span>
                      </div>

                      {spotlightClient.notes && (
                        <div className="text-[11px] text-amber-400/90 italic mt-1 bg-black/20 px-2 py-0.5 rounded border border-amber-500/10 inline-block">
                          Note client : "{spotlightClient.notes}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* One-Click Action Buttons for Current / Next Client */}
                  <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
                    {/* Start Cut / In Chair Button */}
                    {spotlightClient.status !== 'in_progress' && spotlightClient.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(spotlightClient.id, 'in_progress')}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-950 font-bold text-xs shadow-lg shadow-amber-900/40 flex items-center gap-1.5 transition cursor-pointer"
                        title="Faire asseoir le client et démarrer la coupe"
                      >
                        <span>✂️</span>
                        <span>Démarrer / Au Fauteuil</span>
                      </button>
                    )}

                    {/* Complete Cut Button */}
                    {spotlightClient.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(spotlightClient.id, 'completed')}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition cursor-pointer"
                        title="Marquer la prestation comme terminée et créditer les points de fidélité"
                      >
                        <span>✓</span>
                        <span>Terminer la Prestation</span>
                      </button>
                    )}

                    {/* Cancel or No-Show */}
                    {spotlightClient.status !== 'completed' && spotlightClient.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Annuler le rendez-vous de ${spotlightClient.client?.name || 'ce client'} ?`)) {
                            handleUpdateStatus(spotlightClient.id, 'cancelled');
                          }
                        }}
                        className="px-3 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 font-semibold text-xs transition cursor-pointer"
                        title="Annuler ce rendez-vous"
                      >
                        Annuler
                      </button>
                    )}

                    {spotlightClient.status !== 'no_show' && spotlightClient.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Marquer le client ${spotlightClient.client?.name || ''} comme absent (No-Show) ?`)) {
                            handleUpdateStatus(spotlightClient.id, 'no_show');
                          }
                        }}
                        className="px-3 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 border border-gray-700 text-xs font-semibold transition cursor-pointer"
                        title="Client non présenté"
                      >
                        No-Show
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-2 flex items-center gap-3 text-gray-400">
                  <div className="w-12 h-12 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center justify-center text-xl text-amber-500">
                    💈
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-200">
                      Aucun client en attente ou au fauteuil actuellement
                    </h3>
                    <p className="text-xs text-gray-400">
                      Vos créneaux libres restent ouverts à la réservation en ligne.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* PERSONALIZED DAILY STATS (4 METRICS REQUESTED)           */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Appointments Today */}
            <div className="p-5 rounded-2xl bg-[#161F30] border border-gray-800 hover:border-amber-500/40 transition shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wider font-bold">
                <span>Total RDV Aujourd'hui</span>
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">📅</span>
              </div>
              <div className="text-3xl font-black font-mono text-white mt-2">
                {dailyStats.total_today}
              </div>
              <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <span>Rendez-vous programmés</span>
              </div>
            </div>

            {/* 2. Completed Cuts Today */}
            <div className="p-5 rounded-2xl bg-[#161F30] border border-gray-800 hover:border-amber-500/40 transition shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wider font-bold">
                <span>Coupes Terminées</span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">✂️</span>
              </div>
              <div className="text-3xl font-black font-mono text-emerald-400 mt-2">
                {dailyStats.completed_today}
              </div>
              <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                <span>
                  {dailyStats.total_today > 0
                    ? `${Math.round((dailyStats.completed_today / dailyStats.total_today) * 100)}% de la journée effectuée`
                    : 'Prêt pour le premier client'}
                </span>
              </div>
            </div>

            {/* 3. Remaining Clients in Queue */}
            <div className="p-5 rounded-2xl bg-[#161F30] border border-gray-800 hover:border-amber-500/40 transition shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wider font-bold">
                <span>Clients en File</span>
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">⏳</span>
              </div>
              <div className="text-3xl font-black font-mono text-amber-400 mt-2">
                {dailyStats.remaining_queue}
              </div>
              <div className={`text-xs mt-1 font-medium ${
                dailyStats.remaining_queue > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {dailyStats.remaining_queue > 0 ? 'Prestations restantes à assurer' : 'Tous vos clients sont passés'}
              </div>
            </div>

            {/* 4. Next Client Scheduled */}
            <div className="p-5 rounded-2xl bg-[#161F30] border border-gray-800 hover:border-amber-500/40 transition shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wider font-bold">
                <span>Prochain Créneau</span>
                <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400">⏰</span>
              </div>
              <div className="text-2xl font-black font-mono text-white mt-2">
                {spotlightClient?.start_time || 'Libre'}
              </div>
              <div className="text-xs text-gray-400 mt-1 truncate">
                {spotlightClient?.client?.name
                  ? `${spotlightClient.client.name}`
                  : 'Aucune réservation imminente'}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* TOOLBAR: DATE FILTER, SEARCH & STATUS PILLS              */}
          {/* ======================================================== */}
          <div className="p-5 rounded-2xl bg-[#161F30] border border-gray-800 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Real-time Search */}
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                  🔍
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par client, téléphone ou prestation..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-amber-500 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Date Filter Quick Toggles */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="text-gray-400 uppercase text-[10px] tracking-wider">Date :</span>
                <button
                  type="button"
                  onClick={() => setDateFilter('today')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    dateFilter === 'today'
                      ? 'bg-[#D97706] text-white shadow-md shadow-amber-900/40 ring-1 ring-amber-400/50'
                      : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800'
                  }`}
                >
                  Aujourd'hui
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    dateFilter === 'all'
                      ? 'bg-[#D97706] text-white shadow-md shadow-amber-900/40 ring-1 ring-amber-400/50'
                      : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800'
                  }`}
                >
                  Tous mes RDV
                </button>
                <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 px-2.5 py-1 rounded-lg">
                  <span className="text-gray-400 text-[11px]">Précis :</span>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      setDateFilter('custom');
                    }}
                    className="bg-transparent text-amber-400 text-xs font-mono outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Status Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-800/80">
              <span className="text-gray-400 uppercase text-[10px] tracking-wider mr-1">Statut :</span>
              {[
                { key: 'all', label: 'Tous' },
                { key: 'in_progress', label: '✂️ Au Fauteuil' },
                { key: 'confirmed', label: 'Confirmé' },
                { key: 'pending', label: 'En attente' },
                { key: 'completed', label: 'Terminé' },
                { key: 'cancelled', label: 'Annulé' },
                { key: 'no_show', label: 'No-Show' },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setStatusFilter(pill.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === pill.key
                      ? 'bg-[#D97706] text-white shadow-md shadow-amber-900/30'
                      : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* ======================================================== */}
          {/* APPOINTMENT CARDS LIST (DYNAMIC LIVE DATA)               */}
          {/* ======================================================== */}
          {loading ? (
            <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
              <div className="w-7 h-7 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <span className="text-xs">Synchronisation de vos réservations...</span>
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-12 text-center bg-[#161F30]/60 rounded-2xl border border-gray-800 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-base font-medium text-gray-300">Aucun rendez-vous ne correspond aux critères.</p>
              <p className="text-xs text-gray-500 mt-1">Vos créneaux libres restent ouverts à la réservation.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt) => {
                const rel = getRelativeScheduleStatus(
                  appt.appointment_date,
                  appt.start_time,
                  appt.end_time,
                  scheduleClock,
                  appt.status
                );

                const getStatusBorder = (st) => {
                  switch (st) {
                    case 'in_progress':
                      return 'border-l-4 border-l-emerald-400 bg-emerald-950/15 ring-1 ring-emerald-500/30';
                    case 'confirmed':
                      return 'border-l-4 border-l-blue-500 bg-[#161F30]';
                    case 'completed':
                      return 'border-l-4 border-l-emerald-600 bg-[#161F30]/70 opacity-80';
                    case 'cancelled':
                      return 'border-l-4 border-l-red-500 bg-[#161F30]/50 opacity-60';
                    case 'no_show':
                      return 'border-l-4 border-l-gray-600 bg-[#161F30]/50 opacity-60';
                    default:
                      return 'border-l-4 border-l-amber-500 bg-[#161F30]';
                  }
                };

                return (
                  <div
                    key={appt.id}
                    className={`p-4 rounded-xl border border-gray-800 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg ${getStatusBorder(
                      appt.status
                    )}`}
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      {/* Time Slot Box */}
                      <div className="bg-gray-900 px-3.5 py-2 rounded-xl border border-gray-800 text-center font-mono shadow-inner flex-shrink-0">
                        <div className="text-sm font-bold text-amber-400">{appt.start_time}</div>
                        <div className="text-[10px] text-gray-500">{appt.end_time}</div>
                      </div>

                      {/* Appointment & Client Info */}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-white text-base">
                            {appt.service?.name || 'Prestation'}
                          </h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-amber-400 font-mono font-bold">
                            {appt.total_price} MAD
                          </span>
                          {/* Live Dynamic Relative Badge */}
                          {rel && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${rel.badgeClass}`}>
                              {rel.isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>}
                              <span>{rel.label}</span>
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-gray-300 flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                          <span className="font-semibold text-amber-200">
                            Client : {appt.client?.name || 'Client anonyme'}
                          </span>
                          {appt.client?.phone && (
                            <a
                              href={`tel:${appt.client.phone}`}
                              className="text-gray-400 hover:text-amber-400 font-mono transition"
                            >
                              📞 {appt.client.phone}
                            </a>
                          )}
                          <span className="text-gray-500 font-mono">Date : {appt.appointment_date}</span>
                        </div>

                        {appt.notes && (
                          <div className="text-[11px] text-amber-400/80 italic mt-1 bg-black/20 px-2 py-0.5 rounded border border-gray-800 inline-block">
                            Note : "{appt.notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Action Buttons for Barber */}
                    <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
                      {/* Démarrer la coupe (In Chair) */}
                      {appt.status !== 'in_progress' && appt.status !== 'completed' && appt.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(appt.id, 'in_progress')}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 hover:text-gray-950 text-amber-400 border border-amber-500/40 text-xs font-bold transition cursor-pointer"
                          title="Démarrer la coupe / Au Fauteuil"
                        >
                          ✂️ Au Fauteuil
                        </button>
                      )}

                      {/* Terminer */}
                      {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(appt.id, 'completed')}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950/30 cursor-pointer"
                          title="Marquer comme prestation terminée"
                        >
                          ✓ Terminer
                        </button>
                      )}

                      {/* Annuler */}
                      {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Annuler le rendez-vous #${appt.id} de ${appt.client?.name || 'ce client'} ?`)) {
                              handleUpdateStatus(appt.id, 'cancelled');
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-500/20 text-xs font-medium transition cursor-pointer"
                          title="Annuler le rendez-vous"
                        >
                          Annuler
                        </button>
                      )}

                      {/* No-Show */}
                      {appt.status !== 'no_show' && appt.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Marquer le client ${appt.client?.name || ''} comme absent (No-Show) ?`)) {
                              handleUpdateStatus(appt.id, 'no_show');
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-medium transition cursor-pointer"
                          title="Client non présenté"
                        >
                          No-Show
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: WORKING HOURS & SHIFTS                            */}
      {/* ======================================================== */}
      {activeTab === 'hours' && (
        <div className="max-w-4xl bg-[#161F30] rounded-2xl border border-gray-800 p-6 md:p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-serif font-bold text-white mb-1">
                Gestion des Horaires de Travail & Pauses
              </h2>
              <p className="text-xs text-gray-400">
                Définissez vos jours de repos, heures de début et fin de service, ainsi que vos plages de pause déjeuner.
              </p>
            </div>
          </div>

          {hoursSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              ✓ {hoursSuccess}
            </div>
          )}

          <form onSubmit={handleSaveHours} className="space-y-4">
            <div className="divide-y divide-gray-800">
              {workingHours.map((wh) => (
                <div
                  key={wh.day_of_week}
                  className={`py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    wh.is_day_off ? 'opacity-60 bg-gray-900/30 px-3 rounded-lg' : ''
                  }`}
                >
                  <div className="w-36 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={wh.is_day_off}
                      id={`dayoff-${wh.day_of_week}`}
                      onChange={() => toggleDayOff(wh.day_of_week)}
                      className="rounded bg-gray-900 border-gray-700 text-[#D97706] focus:ring-[#D97706] cursor-pointer"
                    />
                    <label
                      htmlFor={`dayoff-${wh.day_of_week}`}
                      className="text-xs font-bold text-white cursor-pointer"
                    >
                      {wh.day_name}
                    </label>
                  </div>

                  {wh.is_day_off ? (
                    <div className="text-xs text-red-400 italic font-medium flex-1">
                      Jour de Repos (aucun créneau ne sera ouvert à la réservation)
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Service :</span>
                        <input
                          type="time"
                          value={wh.start_time}
                          onChange={(e) => handleHourChange(wh.day_of_week, 'start_time', e.target.value)}
                          className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white font-mono outline-none focus:border-amber-500"
                        />
                        <span className="text-gray-500 text-xs">à</span>
                        <input
                          type="time"
                          value={wh.end_time}
                          onChange={(e) => handleHourChange(wh.day_of_week, 'end_time', e.target.value)}
                          className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white font-mono outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-amber-400">Pause :</span>
                        <input
                          type="time"
                          value={wh.break_start || ''}
                          onChange={(e) => handleHourChange(wh.day_of_week, 'break_start', e.target.value)}
                          className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white font-mono outline-none focus:border-amber-500"
                        />
                        <span className="text-gray-500 text-xs">à</span>
                        <input
                          type="time"
                          value={wh.break_end || ''}
                          onChange={(e) => handleHourChange(wh.day_of_week, 'break_end', e.target.value)}
                          className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white font-mono outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-6 flex justify-end">
              <button
                type="submit"
                disabled={savingHours}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-950 font-bold text-xs transition-all shadow-lg shadow-amber-900/30 flex items-center gap-2 cursor-pointer"
              >
                {savingHours ? 'Enregistrement...' : 'Enregistrer mes Horaires'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ASSIGNED CLIENTS                                  */}
      {/* ======================================================== */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-white mb-1">
              Répertoire de vos Clients Habituels
            </h2>
            <p className="text-xs text-gray-400">
              Retrouvez rapidement l'historique et les coordonnées de vos clients fidèles.
            </p>
          </div>

          {assignedClients.length === 0 ? (
            <div className="p-12 text-center bg-[#161F30]/60 rounded-2xl border border-gray-800 text-gray-400">
              Aucun client assigné dans vos rendez-vous récents.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedClients.map((client) => (
                <div
                  key={client.id}
                  className="p-5 rounded-2xl bg-[#161F30] border border-gray-800 hover:border-amber-500/40 transition-all flex items-center gap-4 shadow-lg group"
                >
                  <img
                    src={
                      client.profile_photo_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=111827&color=D97706`
                    }
                    alt={client.name}
                    loading="lazy"
                    decoding="async"
                    className="w-12 h-12 rounded-xl border border-amber-500/30 object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="truncate">
                    <h3 className="font-bold text-white text-sm truncate">{client.name}</h3>
                    <div className="text-[11px] text-gray-400 truncate">{client.email}</div>
                    {client.phone && (
                      <a
                        href={`tel:${client.phone}`}
                        className="text-xs text-amber-400 font-mono mt-1 block hover:underline"
                      >
                        📞 {client.phone}
                      </a>
                    )}
                    <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-2">
                      <span>Dernier : {client.lastService}</span>
                      <span>•</span>
                      <span className="font-mono text-amber-400/80 font-bold">{client.totalCuts} rdv</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
