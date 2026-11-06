import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { getTodayDateString, isSlotInPast, getRelativeScheduleStatus } from '../../utils/dateTime';
import {
  getAdminStats,
  getAdminAppointments,
  updateAdminAppointmentStatus,
  updateAdminAppointment,
  getAdminServices,
  createAdminService,
  updateAdminService,
  deleteAdminService,
  getAdminBarbers,
  createAdminBarber,
  updateAdminBarber,
  deleteAdminBarber,
  getAdminUsers,
  createAdminUser,
  deleteAdminUser,
  syncUserRoles,
  getRolesPermissions,
  syncRolePermissions,
  getReviews,
  approveReview,
  getGallery,
} from '../../api/barberApi';

// Isolated digital clock component to avoid re-rendering entire AdminPortal every second
const AdminLiveClock = React.memo(function AdminLiveClock() {
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden sm:flex flex-col items-end px-3.5 py-1.5 rounded-xl bg-gray-900 border border-gray-800 font-mono shadow-inner">
      <div className="flex items-center gap-2 text-xs text-amber-400 font-bold">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        <span>
          {clock.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
      <div className="text-[10px] text-gray-400 capitalize">
        {clock.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
    </div>
  );
});

export default function AdminPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Sidebar navigation state
  // 'overview' | 'planning' | 'services' | 'team' | 'clients' | 'gallery_reviews' | 'settings'
  const [currentSection, setCurrentSection] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Stats & KPIs state
  const [stats, setStats] = useState(null);

  // Live summary stats from appointments endpoint (today_total, pending_count, today_revenue, next_appointment)
  const [summaryStats, setSummaryStats] = useState(null);

  // Appointments table & weekly schedule state
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'all' | 'custom'
  const [customDate, setCustomDate] = useState(getTodayDateString());
  const [selectedCalendarBarber, setSelectedCalendarBarber] = useState('all');

  // Real-time Schedule Clock (updates every 60s for minute-level schedule calculations) & Background Polling
  const [scheduleClock, setScheduleClock] = useState(new Date());
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // Appointment Edit Modal
  const [editApptModal, setEditApptModal] = useState({ isOpen: false, item: null });
  const [editApptForm, setEditApptForm] = useState({
    appointment_date: '',
    start_time: '',
    barber_id: '',
    service_id: '',
    notes: '',
  });

  // Services catalog state
  const [services, setServices] = useState([]);
  const [serviceModal, setServiceModal] = useState({ isOpen: false, item: null });
  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: 'hair',
    duration: 30,
    price: 150,
    currency: 'MAD',
    description: '',
    is_active: true,
  });

  // Barbers & working hours state
  const [barbers, setBarbers] = useState([]);
  const [barberModal, setBarberModal] = useState({ isOpen: false, item: null });
  const [barberForm, setBarberForm] = useState({
    name: '',
    specialty: '',
    experience: '6 ans',
    rating: 5.0,
    bio: '',
    image_url: '',
    is_active: true,
  });

  // Clients state
  const [clients, setClients] = useState([]);
  const [newUserModal, setNewUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({ name: '', email: '', phone: '', password: '', role: 'client' });
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [selectedUserRoles, setSelectedUserRoles] = useState([]);

  // Reviews & Gallery state
  const [reviews, setReviews] = useState([]);
  const [gallery, setGallery] = useState([]);

  // Spatie Matrix state
  const [matrixData, setMatrixData] = useState({ roles: [], permissions: [], matrix: {} });
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [matrixMessage, setMatrixMessage] = useState(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Load Global Stats & Catalogs
  const loadStatsData = useCallback(async () => {
    try {
      const res = await getAdminStats();
      setStats(res);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    }
  }, []);

  const loadAppointmentsList = useCallback(async (silent = false) => {
    if (!silent) setLoadingAppointments(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (appointmentSearch.trim()) params.search = appointmentSearch.trim();
      if (selectedCalendarBarber !== 'all') params.barber_id = selectedCalendarBarber;

      if (dateFilter === 'today') {
        params.date = 'today';
      } else if (dateFilter === 'all') {
        params.date = 'all';
      } else if (dateFilter === 'custom' && customDate) {
        params.date = customDate;
      }

      const res = await getAdminAppointments(params);
      setAppointments(res.data || []);
      if (res.summary_stats) {
        setSummaryStats(res.summary_stats);
      }
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      if (!silent) setLoadingAppointments(false);
    }
  }, [statusFilter, appointmentSearch, selectedCalendarBarber, dateFilter, customDate]);

  const loadInitialData = useCallback(async () => {
    try {
      const [srvRes, brbRes, revRes, galRes, usrRes, matRes] = await Promise.all([
        getAdminServices(),
        getAdminBarbers(),
        getReviews(),
        getGallery(),
        getAdminUsers(),
        getRolesPermissions(),
      ]);
      setServices(srvRes.data || []);
      setBarbers(brbRes.data || []);
      setReviews(revRes.data || []);
      setGallery(galRes.data || []);
      setClients(usrRes.data || []);
      setMatrixData(matRes || { roles: [], permissions: [], matrix: {} });
    } catch (err) {
      console.error('Error loading initial admin catalogs:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadStatsData();
    loadInitialData();
  }, [loadStatsData, loadInitialData]);

  // Dynamic Relative Schedule Clock (ticks every 60s for minute-level schedule calculation without excessive re-renders)
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setScheduleClock(new Date());
    }, 60000);
    return () => clearInterval(clockTimer);
  }, []);

  // Automatic real-time polling every 20 seconds (fetches new bookings and status changes silently)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      loadAppointmentsList(true);
      loadStatsData();
    }, 20000);
    return () => clearInterval(pollInterval);
  }, [loadAppointmentsList, loadStatsData]);

  // Debounced AJAX search & filter for appointments table
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAppointmentsList(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [loadAppointmentsList]);

  // Appointment Actions with Optimistic UI Updates
  const handleUpdateStatus = async (id, newStatus) => {
    const previousAppointments = appointments;
    // Optimistic UI update
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );

    try {
      await updateAdminAppointmentStatus(id, newStatus);
      showToast(`Rendez-vous #${id} marqué comme : ${newStatus}`);
      loadAppointmentsList(true);
      loadStatsData();
    } catch (err) {
      // Revert optimistic change on error
      setAppointments(previousAppointments);
      alert(err.response?.data?.message || 'Erreur lors de la mise à jour du statut.');
    }
  };

  const handleOpenEditAppt = (appt) => {
    setEditApptModal({ isOpen: true, item: appt });
    setEditApptForm({
      appointment_date: appt.appointment_date,
      start_time: appt.start_time,
      barber_id: appt.barber_id,
      service_id: appt.service_id,
      notes: appt.notes || '',
    });
  };

  const handleSaveEditAppt = async (e) => {
    e.preventDefault();
    if (isSlotInPast(editApptForm.start_time, editApptForm.appointment_date)) {
      alert('Le rendez-vous ne peut pas être planifié dans le passé. Veuillez choisir un horaire futur.');
      return;
    }
    try {
      await updateAdminAppointment(editApptModal.item.id, editApptForm);
      setEditApptModal({ isOpen: false, item: null });
      showToast(`Rendez-vous #${editApptModal.item.id} mis à jour avec succès.`);
      loadAppointmentsList();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la modification.');
    }
  };

  // Export to Excel / CSV
  const handleExportCSV = () => {
    if (appointments.length === 0) {
      alert('Aucun rendez-vous à exporter.');
      return;
    }

    const headers = ['ID', 'Date', 'Heure Debut', 'Heure Fin', 'Client', 'Telephone', 'Service', 'Barbier', 'Prix (MAD)', 'Statut'];
    const rows = appointments.map((a) => [
      a.id,
      a.appointment_date,
      a.start_time,
      a.end_time,
      `"${a.client?.name || 'N/A'}"`,
      `"${a.client?.phone || 'N/A'}"`,
      `"${a.service?.name || 'N/A'}"`,
      `"${a.barber?.name || 'N/A'}"`,
      a.total_price,
      a.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BarberShop_RDV_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export CSV généré avec succès.');
  };

  // Export PDF / Print
  const handleExportPDF = () => {
    window.print();
  };

  // Services CRUD
  const handleOpenServiceModal = (item = null) => {
    if (item) {
      setServiceModal({ isOpen: true, item });
      setServiceForm({
        name: item.name,
        category: item.category,
        duration: item.duration,
        price: item.price,
        currency: item.currency || 'MAD',
        description: item.description,
        is_active: item.is_active,
      });
    } else {
      setServiceModal({ isOpen: true, item: null });
      setServiceForm({
        name: '',
        category: 'hair',
        duration: 35,
        price: 150,
        currency: 'MAD',
        description: '',
        is_active: true,
      });
    }
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    try {
      if (serviceModal.item) {
        await updateAdminService(serviceModal.item.id, serviceForm);
        showToast('Prestation mise à jour.');
      } else {
        await createAdminService(serviceForm);
        showToast('Nouvelle prestation ajoutée au catalogue.');
      }
      setServiceModal({ isOpen: false, item: null });
      const res = await getAdminServices();
      setServices(res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Supprimer cette prestation ?')) return;
    try {
      await deleteAdminService(id);
      showToast('Prestation supprimée.');
      const res = await getAdminServices();
      setServices(res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur.');
    }
  };

  // Barbers CRUD
  const handleOpenBarberModal = (item = null) => {
    if (item) {
      setBarberModal({ isOpen: true, item });
      setBarberForm({
        name: item.name,
        specialty: item.specialty,
        experience: item.experience,
        rating: item.rating,
        bio: item.bio,
        image_url: item.image_url,
        is_active: item.is_active,
      });
    } else {
      setBarberModal({ isOpen: true, item: null });
      setBarberForm({
        name: '',
        specialty: '',
        experience: '6 ans',
        rating: 5.0,
        bio: '',
        image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
        is_active: true,
      });
    }
  };

  const handleSaveBarber = async (e) => {
    e.preventDefault();
    try {
      if (barberModal.item) {
        await updateAdminBarber(barberModal.item.id, barberForm);
        showToast('Profil du barbier mis à jour.');
      } else {
        await createAdminBarber(barberForm);
        showToast('Nouveau maître barbier ajouté à l’équipe.');
      }
      setBarberModal({ isOpen: false, item: null });
      const res = await getAdminBarbers();
      setBarbers(res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    }
  };

  const handleDeleteBarber = async (id) => {
    if (!window.confirm('Retirer ce barbier de l’équipe ?')) return;
    try {
      await deleteAdminBarber(id);
      showToast('Barbier retiré.');
      const res = await getAdminBarbers();
      setBarbers(res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur.');
    }
  };

  // Reviews approval
  const handleToggleApproveReview = async (id, currentStatus) => {
    try {
      await approveReview(id, !currentStatus);
      showToast(!currentStatus ? 'Avis approuvé et publié.' : 'Avis masqué.');
      const res = await getReviews();
      setReviews(res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur.');
    }
  };

  // Users & Role sync
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await createAdminUser(newUserData);
      setNewUserModal(false);
      setNewUserData({ name: '', email: '', phone: '', password: '', role: 'client' });
      showToast('Utilisateur créé avec succès.');
      const res = await getAdminUsers();
      setClients(res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur de création.');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Supprimer définitivement cet utilisateur ?')) return;
    try {
      await deleteAdminUser(id);
      showToast('Utilisateur supprimé.');
      const res = await getAdminUsers();
      setClients(res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur.');
    }
  };

  const handleOpenSyncRoles = (u) => {
    setRoleModalUser(u);
    const existingRoles = Array.isArray(u.roles) ? u.roles.map((r) => (typeof r === 'string' ? r : r.name)) : [];
    setSelectedUserRoles(existingRoles);
  };

  const handleSaveUserRoles = async () => {
    try {
      await syncUserRoles(roleModalUser.id, selectedUserRoles);
      setRoleModalUser(null);
      showToast('Rôles mis à jour.');
      const res = await getAdminUsers();
      setClients(res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur.');
    }
  };

  // Spatie Matrix
  const handleTogglePermission = (roleName, permissionName) => {
    setMatrixData((prev) => {
      const currentList = prev.matrix[roleName] || [];
      const updated = currentList.includes(permissionName)
        ? currentList.filter((p) => p !== permissionName)
        : [...currentList, permissionName];
      return {
        ...prev,
        matrix: {
          ...prev.matrix,
          [roleName]: updated,
        },
      };
    });
  };

  const handleSaveRoleMatrix = async (roleObj) => {
    setSavingMatrix(true);
    setMatrixMessage(null);
    try {
      const perms = matrixData.matrix[roleObj.name] || [];
      await syncRolePermissions(roleObj.id, perms);
      setMatrixMessage(`Permissions Spatie synchronisées pour [${roleObj.name}] !`);
      setTimeout(() => setMatrixMessage(null), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur.');
    } finally {
      setSavingMatrix(false);
    }
  };

  // Navigation Items configuration
  const navLinks = [
    {
      id: 'overview',
      label: "Vue d'ensemble",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: 'planning',
      label: 'Planning & RDV',
      badge: appointments.filter((a) => a.status === 'confirmed').length || undefined,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'services',
      label: 'Prestations (Services)',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879a3 3 0 11-4.242-4.242L12 10.586m0 0L9.121 7.707a3 3 0 00-4.242 4.242L12 14.828" />
        </svg>
      ),
    },
    {
      id: 'team',
      label: 'Équipe (Barbiers & Horaires)',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: 'gallery_reviews',
      label: 'Galerie & Avis',
      badge: reviews.filter((r) => !r.is_approved).length || undefined,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  // Helper for status badges
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            Confirmé
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Terminé
          </span>
        );
      case 'pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            En attente
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
            Annulé
          </span>
        );
      case 'no_show':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-700/50 text-gray-400 border border-gray-600/40">
            No-Show
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-800 text-gray-300">
            {status}
          </span>
        );
    }
  };

  // Weekly Schedule Grid Computation (Dynamic based on current week)
  const weeklyDays = useMemo(() => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    const days = [];
    const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const shortNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const todayStr = getTodayDateString(today);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dateNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dateNum}`;
      const isToday = dateStr === todayStr;
      days.push({
        key: shortNames[i],
        date: dateStr,
        full: `${dayNames[i]} ${d.getDate()}${isToday ? ' (Aujourd’hui)' : ''}`,
        isToday,
      });
    }
    return days;
  }, []);

  const weeklyScheduleGrouped = useMemo(() => {
    const map = {};
    weeklyDays.forEach((d) => {
      map[d.date] = [];
    });

    appointments.forEach((a) => {
      if (map[a.appointment_date]) {
        if (selectedCalendarBarber === 'all' || String(a.barber_id) === String(selectedCalendarBarber)) {
          map[a.appointment_date].push(a);
        }
      }
    });

    return map;
  }, [appointments, weeklyDays, selectedCalendarBarber]);

  // Doughnut Chart Geometry computation
  const popularServicesData = stats?.charts?.popular_services?.doughnut || [
    { name: 'Coupe Signature', count: 45, percentage: 35, color: '#D97706' },
    { name: 'Skin Fade Américain', count: 38, percentage: 30, color: '#10B981' },
    { name: 'Sculpture de Barbe', count: 25, percentage: 20, color: '#3B82F6' },
    { name: 'Soin Visage Purifiant', count: 12, percentage: 10, color: '#8B5CF6' },
    { name: 'Forfait Royal VIP', count: 6, percentage: 5, color: '#EC4899' },
  ];

  return (
    <div className="min-h-screen bg-[#111827] text-gray-100 flex font-sans selection:bg-amber-500 selection:text-gray-950">
      {/* ======================================================== */}
      {/* 1. LEFT SIDEBAR NAVIGATION                                */}
      {/* ======================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-[#161F30] border-r border-gray-800 transition-all duration-300 flex flex-col justify-between ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-20 flex items-center justify-between px-4 border-b border-gray-800/90">
            <button
              type="button"
              onClick={() => setCurrentSection('overview')}
              className="flex items-center gap-3 overflow-hidden text-left cursor-pointer focus:outline-none group"
              title="Vue d'ensemble du Dashboard"
            >
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D97706] to-[#B45309] flex-shrink-0 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-amber-900/30 group-hover:scale-105 transition-transform">
                AR
              </span>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <div className="text-sm font-serif font-black tracking-widest text-amber-400 uppercase">
                    Atelier Royal
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                    Manager Suite VIP
                  </div>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition hidden lg:block cursor-pointer"
              title={sidebarCollapsed ? 'Développer' : 'Réduire'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sidebarCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                )}
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {navLinks.map((item) => {
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#D97706] to-[#B45309] text-white shadow-lg shadow-amber-900/40 ring-1 ring-amber-400/50'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <span className={isActive ? 'text-white' : 'text-amber-500'}>{item.icon}</span>
                  {!sidebarCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                  {!sidebarCollapsed && item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 text-amber-300 font-mono font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Super Admin Profile & Direct Logout */}
        <div className="p-3 border-t border-gray-800/90">
          <div className={`flex items-center gap-3 p-2 rounded-xl bg-gray-900/80 border border-gray-800 ${sidebarCollapsed ? 'justify-center p-1.5' : ''}`}>
            <img
              src={user?.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Admin')}&color=D97706&background=111827`}
              alt={user?.name}
              loading="lazy"
              decoding="async"
              className="w-9 h-9 rounded-xl border border-amber-500/40 object-cover flex-shrink-0"
            />
            {!sidebarCollapsed && (
              <div className="flex-1 truncate text-left">
                <div className="text-xs font-bold text-white truncate">{user?.name}</div>
                <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Super Admin</div>
              </div>
            )}
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/login', { replace: true });
              }}
              className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-gray-800 transition cursor-pointer"
              title="Déconnexion"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT AREA                                      */}
      {/* ======================================================== */}
      <div className={`flex-1 transition-all duration-300 flex flex-col ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 h-20 bg-[#111827]/90 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-6 lg:px-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-black text-white tracking-tight flex items-center gap-2">
              <span>{navLinks.find((l) => l.id === currentSection)?.label}</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest font-sans font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Database</span>
              </span>
            </h1>
            <p className="text-xs text-gray-400">
              Pilotage centralisé, agenda en temps réel et indicateurs de rentabilité Atelier Royal.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Digital Clock (isolated memoized component) */}
            <AdminLiveClock />

            {/* Background Polling Status Badge */}
            <div
              className="hidden md:flex flex-col items-end px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[10px] font-mono text-emerald-400"
              title={`Actualisation automatique en arrière-plan toutes les 20s. Dernière synchro : ${lastSyncTime.toLocaleTimeString('fr-FR')}`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Auto-refresh 20s</span>
              </div>
              <div className="text-[9px] text-gray-400">
                Synchro : {lastSyncTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                loadStatsData();
                loadAppointmentsList(false);
                showToast('Données synchronisées avec le serveur.');
              }}
              className="p-2.5 rounded-xl bg-gray-800 text-amber-400 hover:text-white hover:bg-gray-700 transition cursor-pointer"
              title="Actualiser immédiatement"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </header>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white font-semibold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
            <span>✓</span>
            <span>{toastMessage}</span>
          </div>
        )}

        <main className="p-6 lg:p-8 space-y-8 flex-1">
          {/* ======================================================== */}
          {/* SECTION: VUE D'ENSEMBLE (DASHBOARD COMPLET DEMANDÉ)       */}
          {/* ======================================================== */}
          {currentSection === 'overview' && (
            <div className="space-y-8 animate-fadeIn">
              {/* TOP ROW: 4 LIVE SUMMARY KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. RDV du Jour */}
                <div className="p-6 rounded-2xl bg-[#161F30] border border-gray-800 hover:border-amber-500/40 transition shadow-xl relative overflow-hidden group">
                  <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wider font-bold">
                    <span>RDV du Jour</span>
                    <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">📅</span>
                  </div>
                  <div className="text-3xl font-black font-mono text-white mt-3">
                    {summaryStats ? summaryStats.today_total : (stats?.kpis?.rdv_today || 0)}
                  </div>
                  <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1 font-medium">
                    <span>✓ Réservations prévues aujourd'hui</span>
                  </div>
                </div>

                {/* 2. Chiffre d'Affaires du Jour */}
                <div className="p-6 rounded-2xl bg-[#161F30] border border-gray-800 hover:border-amber-500/40 transition shadow-xl relative overflow-hidden group">
                  <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wider font-bold">
                    <span>Recette du Jour</span>
                    <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">💰</span>
                  </div>
                  <div className="text-3xl font-black font-mono text-amber-400 mt-3">
                    {(summaryStats ? summaryStats.today_revenue : 0).toLocaleString()} <span className="text-lg">MAD</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 flex items-center gap-1 font-medium">
                    <span>Mois : {(stats?.kpis?.month_revenue || 0).toLocaleString()} MAD</span>
                  </div>
                </div>

                {/* 3. En Attente de Validation */}
                <div className="p-6 rounded-2xl bg-[#161F30] border border-gray-800 hover:border-amber-500/40 transition shadow-xl relative overflow-hidden group">
                  <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wider font-bold">
                    <span>En Attente</span>
                    <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">⏳</span>
                  </div>
                  <div className="text-3xl font-black font-mono text-white mt-3">
                    {summaryStats ? summaryStats.pending_count : 0}
                  </div>
                  <div className={`text-xs mt-2 flex items-center gap-1 font-medium ${
                    (summaryStats?.pending_count || 0) > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'
                  }`}>
                    {(summaryStats?.pending_count || 0) > 0 ? (
                      <span>⚠️ Validation admin requise</span>
                    ) : (
                      <span>✓ Toutes les demandes traitées</span>
                    )}
                  </div>
                </div>

                {/* 4. Prochain Rendez-vous */}
                <div className="p-6 rounded-2xl bg-[#161F30] border border-gray-800 hover:border-amber-500/40 transition shadow-xl relative overflow-hidden group">
                  <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wider font-bold">
                    <span>Prochain RDV</span>
                    <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400">💈</span>
                  </div>
                  {summaryStats?.next_appointment ? (
                    <div>
                      <div className="text-2xl font-black font-mono text-amber-400 mt-2">
                        {summaryStats.next_appointment.start_time}
                      </div>
                      <div className="text-xs text-gray-200 font-semibold truncate mt-1">
                        {summaryStats.next_appointment.client?.name || 'Client'} • {summaryStats.next_appointment.service?.name || 'Prestation'}
                      </div>
                      <div className="mt-2">
                        {(() => {
                          const rel = getRelativeScheduleStatus(
                            summaryStats.next_appointment.appointment_date,
                            summaryStats.next_appointment.start_time,
                            summaryStats.next_appointment.end_time,
                            scheduleClock
                          );
                          return rel ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${rel.badgeClass}`}>
                              {rel.isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>}
                              <span>{rel.label}</span>
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xl font-black font-mono text-gray-400 mt-3">
                        Aucun RDV
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Pas de réservation en attente
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECONDARY ROW: MONTHLY OVERVIEW STRIP */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#161F30]/60 border border-gray-800/80 text-xs text-gray-300">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 font-bold">📈</span>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">CA Mois en cours</div>
                    <div className="font-mono font-bold text-white text-sm">{(stats?.kpis?.month_revenue || 0).toLocaleString()} MAD</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold">👥</span>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Nouveaux Clients</div>
                    <div className="font-mono font-bold text-white text-sm">+{stats?.kpis?.new_clients_month || 0}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-red-500/10 text-red-400 font-bold">⚠️</span>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Taux No-Show</div>
                    <div className="font-mono font-bold text-emerald-400 text-sm">{stats?.kpis?.no_show_rate || '0'}%</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 font-bold">✂️</span>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Barbiers Actifs</div>
                    <div className="font-mono font-bold text-white text-sm">{barbers.filter((b) => b.is_active).length} sur {barbers.length}</div>
                  </div>
                </div>
              </div>

              {/* MIDDLE ROW: REVENUE EVOLUTION + DOUGHNUT + INTERACTIVE WEEKLY CALENDAR */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. Revenue Evolution Line Chart (5 cols) */}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-[#161F30] border border-gray-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-white text-base">Évolution du Chiffre d'Affaires</h3>
                      <p className="text-xs text-gray-400">Suivi mensuel des encaissements en MAD</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                      6 Derniers Mois
                    </span>
                  </div>

                  {/* SVG Luxury Curved Line Chart */}
                  <div className="relative pt-4">
                    <svg viewBox="0 0 500 200" className="w-full h-48 overflow-visible">
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#D97706" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#D97706" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid Lines */}
                      <line x1="20" y1="30" x2="480" y2="30" stroke="#1F2937" strokeDasharray="4 4" />
                      <line x1="20" y1="80" x2="480" y2="80" stroke="#1F2937" strokeDasharray="4 4" />
                      <line x1="20" y1="130" x2="480" y2="130" stroke="#1F2937" strokeDasharray="4 4" />
                      <line x1="20" y1="180" x2="480" y2="180" stroke="#374151" />

                      {/* Area fill */}
                      <path
                        d="M 30,140 Q 110,120 180,95 T 320,80 T 470,40 L 470,180 L 30,180 Z"
                        fill="url(#revenueGrad)"
                      />

                      {/* Line */}
                      <path
                        d="M 30,140 Q 110,120 180,95 T 320,80 T 470,40"
                        fill="none"
                        stroke="#D97706"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />

                      {/* Points & Labels */}
                      {[
                        { x: 30, y: 140, label: 'Mai', val: '18k' },
                        { x: 120, y: 120, label: 'Juin', val: '20k' },
                        { x: 210, y: 95, label: 'Juil', val: '22k' },
                        { x: 300, y: 80, label: 'Août', val: '23k' },
                        { x: 390, y: 65, label: 'Sept', val: '24k' },
                        { x: 470, y: 40, label: 'Oct', val: '27k' },
                      ].map((pt) => (
                        <g key={pt.label}>
                          <circle cx={pt.x} cy={pt.y} r="5" fill="#111827" stroke="#D97706" strokeWidth="2.5" />
                          <text x={pt.x} y={pt.y - 10} fill="#F59E0B" fontSize="9" fontWeight="bold" textAnchor="middle">
                            {pt.val}
                          </text>
                          <text x={pt.x} y="195" fill="#9CA3AF" fontSize="10" textAnchor="middle">
                            {pt.label}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>

                {/* 2. Popular Services Doughnut Chart (3 cols) */}
                <div className="lg:col-span-3 p-6 rounded-2xl bg-[#161F30] border border-gray-800 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base mb-1">Prestations Populaires</h3>
                    <p className="text-xs text-gray-400 mb-4">Répartition des ventes par catégorie</p>

                    {/* SVG Doughnut */}
                    <div className="relative w-36 h-36 mx-auto my-2">
                      <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90">
                        {/* Segments */}
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#1F2937" strokeWidth="6" />
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#D97706" strokeWidth="6" strokeDasharray="35 65" strokeDashoffset="0" />
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#10B981" strokeWidth="6" strokeDasharray="30 70" strokeDashoffset="-35" />
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#3B82F6" strokeWidth="6" strokeDasharray="20 80" strokeDashoffset="-65" />
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#8B5CF6" strokeWidth="6" strokeDasharray="15 85" strokeDashoffset="-85" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs text-gray-400 uppercase font-semibold">Total</span>
                        <span className="text-base font-bold text-white font-mono">100%</span>
                      </div>
                    </div>
                  </div>

                  {/* Legend list */}
                  <div className="space-y-1.5 pt-2 text-xs">
                    {popularServicesData.slice(0, 4).map((s) => (
                      <div key={s.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="text-gray-300 truncate">{s.name}</span>
                        </div>
                        <span className="font-mono text-gray-400 font-bold">{s.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Interactive Weekly Schedule Calendar Filtered by Barber (4 cols) */}
                <div className="lg:col-span-4 p-6 rounded-2xl bg-[#161F30] border border-gray-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-white text-base">Planning Hebdomadaire</h3>
                        <p className="text-xs text-gray-400">Occupation par barbier cette semaine</p>
                      </div>

                      {/* Filter by Barber */}
                      <select
                        value={selectedCalendarBarber}
                        onChange={(e) => setSelectedCalendarBarber(e.target.value)}
                        className="px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs text-amber-400 font-medium outline-none"
                      >
                        <option value="all">Tous les Barbiers</option>
                        {barbers.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Week Days Mini Tabs */}
                    <div className="grid grid-cols-7 gap-1 text-center py-2 border-b border-gray-800">
                      {weeklyDays.map((d) => {
                        const count = weeklyScheduleGrouped[d.date]?.length || 0;
                        const isToday = d.isToday || d.date === getTodayDateString(scheduleClock);
                        return (
                          <div
                            key={d.key}
                            className={`p-1.5 rounded-lg text-[10px] font-bold ${
                              isToday
                                ? 'bg-[#D97706] text-white shadow-md'
                                : 'bg-gray-900/60 text-gray-300 border border-gray-800'
                            }`}
                          >
                            <div>{d.key}</div>
                            <div className="font-mono text-[9px] opacity-80 mt-0.5">{count} rdv</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Upcoming slots summary for today */}
                  <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
                    {(weeklyScheduleGrouped[getTodayDateString(scheduleClock)] || []).length === 0 ? (
                      <div className="py-6 text-center text-xs text-gray-500">
                        Aucun créneau réservé pour aujourd'hui avec ce filtre.
                      </div>
                    ) : (
                      (weeklyScheduleGrouped[getTodayDateString(scheduleClock)] || []).map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-gray-900 border border-gray-800/80 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-bold text-amber-400">{item.start_time}</span>
                            <div className="truncate max-w-[120px]">
                              <div className="font-semibold text-white truncate">{item.client?.name || 'Client'}</div>
                              <div className="text-[10px] text-gray-400 truncate">{item.service?.name}</div>
                            </div>
                          </div>
                          {renderStatusBadge(item.status)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* BOTTOM ROW: RICH "GESTION DES RENDEZ-VOUS" TABLE         */}
              {/* ======================================================== */}
              <div className="p-6 rounded-2xl bg-[#161F30] border border-gray-800 space-y-5">
                {/* Header & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <span>Gestion des Rendez-vous</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono">
                        {appointments.length} affichés
                      </span>
                    </h2>
                    <p className="text-xs text-gray-400">
                      Validation en temps réel, modifications, encaissements et exports comptables.
                    </p>
                  </div>

                  {/* Export Buttons: PDF / Excel */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-200 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-amber-500 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📊</span>
                      <span>Exporter Excel (CSV)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPDF}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 transition flex items-center gap-1.5 shadow-md shadow-amber-900/30 cursor-pointer"
                    >
                      <span>🖨️</span>
                      <span>Imprimer / PDF</span>
                    </button>
                  </div>
                </div>

                {/* Filters Row: Date Selector, AJAX Search & Status Filter Pills */}
                <div className="space-y-3 pt-2">
                  {/* Top Filter Bar: Date & Search */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Real-time AJAX Search Bar */}
                    <div className="relative flex-1 max-w-md">
                      <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                        🔍
                      </span>
                      <input
                        type="text"
                        value={appointmentSearch}
                        onChange={(e) => setAppointmentSearch(e.target.value)}
                        placeholder="Rechercher client, téléphone, barbier, prestation..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-900/90 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-amber-500 transition"
                      />
                      {appointmentSearch && (
                        <button
                          type="button"
                          onClick={() => setAppointmentSearch('')}
                          className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Date Selector Pills */}
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
                        Tous les RDV
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
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-gray-400 uppercase text-[10px] tracking-wider mr-1">Statut :</span>
                    {[
                      { key: 'all', label: 'Tous' },
                      { key: 'pending', label: 'En attente' },
                      { key: 'confirmed', label: 'Confirmé' },
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

                {/* Data Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900/40">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-gray-900 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                      <tr>
                        <th className="py-3.5 px-4">Date & Heure (Live)</th>
                        <th className="py-3.5 px-4">Client</th>
                        <th className="py-3.5 px-4">Prestation</th>
                        <th className="py-3.5 px-4">Barbier</th>
                        <th className="py-3.5 px-4">Tarif</th>
                        <th className="py-3.5 px-4">Statut</th>
                        <th className="py-3.5 px-4 text-right">Actions Rapides</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/80">
                      {loadingAppointments ? (
                        <tr>
                          <td colSpan="7" className="py-12 text-center text-gray-400">
                            <div className="flex items-center justify-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                              <span>Chargement et synchronisation des réservations...</span>
                            </div>
                          </td>
                        </tr>
                      ) : appointments.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-12 text-center text-gray-400">
                            Aucun rendez-vous trouvé correspondant aux filtres.
                          </td>
                        </tr>
                      ) : (
                        appointments.map((appt) => {
                          const rel = getRelativeScheduleStatus(
                            appt.appointment_date,
                            appt.start_time,
                            appt.end_time,
                            scheduleClock
                          );

                          return (
                            <tr key={appt.id} className="hover:bg-gray-800/40 transition-colors">
                              {/* Date & Heure with Dynamic Relative Indicator */}
                              <td className="py-3.5 px-4">
                                <div className="font-mono font-bold text-white flex items-center gap-1.5 text-sm">
                                  <span>{appt.start_time}</span>
                                  {appt.end_time && (
                                    <span className="text-gray-500 font-normal text-xs">- {appt.end_time}</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-400 font-mono mt-0.5">{appt.appointment_date}</div>
                                {rel && (
                                  <div className="mt-1">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${rel.badgeClass}`}>
                                      {rel.isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>}
                                      <span>{rel.label}</span>
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Client */}
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-white">{appt.client?.name || 'Client anonyme'}</div>
                                <div className="text-[11px] text-amber-400 font-mono">{appt.client?.phone || 'Sans téléphone'}</div>
                              </td>

                              {/* Service */}
                              <td className="py-3.5 px-4">
                                <div className="font-medium text-gray-200">{appt.service?.name}</div>
                                <div className="text-[10px] text-gray-500 font-mono">{appt.service?.duration} min</div>
                              </td>

                              {/* Barbier */}
                              <td className="py-3.5 px-4">
                                <div className="text-gray-300 font-medium">{appt.barber?.name}</div>
                              </td>

                              {/* Price */}
                              <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                                {appt.total_price} MAD
                              </td>

                              {/* Status */}
                              <td className="py-3.5 px-4">
                                {renderStatusBadge(appt.status)}
                              </td>

                              {/* Action Buttons: Valider, Terminer, Annuler, Modifier */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {appt.status !== 'confirmed' && appt.status !== 'completed' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                                      className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white border border-blue-500/20 text-[11px] font-bold transition cursor-pointer"
                                      title="Confirmer et valider le rendez-vous"
                                    >
                                      Valider
                                    </button>
                                  )}

                                  {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatus(appt.id, 'completed')}
                                      className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-[11px] font-bold transition cursor-pointer"
                                      title="Marquer comme prestation terminée et créditer les points"
                                    >
                                      Terminer
                                    </button>
                                  )}

                                  {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`Annuler le rendez-vous #${appt.id} de ${appt.client?.name || 'ce client'} ?`)) {
                                          handleUpdateStatus(appt.id, 'cancelled');
                                        }
                                      }}
                                      className="px-2.5 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 text-[11px] font-bold transition cursor-pointer"
                                      title="Annuler ce rendez-vous"
                                    >
                                      Annuler
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditAppt(appt)}
                                    className="px-2.5 py-1 rounded bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 text-[11px] font-medium transition cursor-pointer"
                                    title="Modifier la date ou l'heure"
                                  >
                                    Modifier
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION: PLANNING & RDV                                   */}
          {/* ======================================================== */}
          {currentSection === 'planning' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Planning Général & Rendez-vous</h2>
                  <p className="text-xs text-gray-400">Vue calendaire complète de tous les postes de coiffage.</p>
                </div>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-amber-400 text-xs font-bold hover:bg-gray-700"
                >
                  Exporter CSV
                </button>
              </div>

              {/* Full week calendar grid */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {weeklyDays.map((d) => {
                  const dayAppts = weeklyScheduleGrouped[d.date] || [];
                  return (
                    <div key={d.key} className="bg-[#161F30] rounded-xl border border-gray-800 p-3 min-h-[300px] flex flex-col">
                      <div className="text-xs font-bold text-amber-400 pb-2 border-b border-gray-800 mb-2">
                        {d.full}
                      </div>
                      <div className="space-y-2 flex-1">
                        {dayAppts.length === 0 ? (
                          <div className="text-[11px] text-gray-500 italic py-4 text-center">Aucun rdv</div>
                        ) : (
                          dayAppts.map((a) => (
                            <div key={a.id} className="p-2 rounded bg-gray-900 border border-gray-800 text-[11px] space-y-1">
                              <div className="flex justify-between font-mono font-bold text-white">
                                <span>{a.start_time}</span>
                                <span className="text-amber-400">{a.total_price} DH</span>
                              </div>
                              <div className="text-gray-300 font-semibold truncate">{a.client?.name}</div>
                              <div className="text-[10px] text-gray-400 truncate">{a.barber?.name}</div>
                              <div className="pt-1">{renderStatusBadge(a.status)}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION: PRESTATIONS (SERVICES)                           */}
          {/* ======================================================== */}
          {currentSection === 'services' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Catalogue & Tarifs Prestations (MAD)</h2>
                  <p className="text-xs text-gray-400">Gestion des prix, durées et formules VIP.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenServiceModal()}
                  className="px-4 py-2.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold shadow"
                >
                  + Ajouter un Soin
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {services.map((srv) => (
                  <div key={srv.id} className="p-5 rounded-2xl bg-[#161F30] border border-gray-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-white text-base">{srv.name}</h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            srv.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'
                          }`}
                        >
                          {srv.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2 mb-3">{srv.description}</p>
                      <div className="flex items-center gap-3 text-xs font-mono text-gray-300">
                        <span>⏱ {srv.duration} min</span>
                        <span className="text-amber-400 font-bold">{srv.price} MAD</span>
                        <span className="text-gray-500 uppercase">{srv.category}</span>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-800 flex justify-end gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => handleOpenServiceModal(srv)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200"
                      >
                        Éditer
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteService(srv.id)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION: ÉQUIPE (BARBIERS & HORAIRES)                      */}
          {/* ======================================================== */}
          {currentSection === 'team' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Équipe des Artisans Barbiers & Horaires</h2>
                  <p className="text-xs text-gray-400">Comptes barbiers, fiches experts et plannings de travail.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenBarberModal()}
                  className="px-4 py-2.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold shadow"
                >
                  + Ajouter un Barbier
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {barbers.map((b) => (
                  <div key={b.id} className="rounded-2xl border border-gray-800 bg-[#161F30] overflow-hidden flex flex-col justify-between">
                    <div>
                      <img
                        src={b.image_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400'}
                        alt={b.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-44 object-cover object-top"
                      />
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-white text-base">{b.name}</h3>
                          <span className="text-amber-400 text-xs font-bold">★ {b.rating}</span>
                        </div>
                        <p className="text-xs text-amber-500 font-semibold mb-2">{b.specialty}</p>
                        <p className="text-xs text-gray-400 line-clamp-2">{b.bio}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-900/60 border-t border-gray-800 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenBarberModal(b)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-200 hover:text-white"
                      >
                        Éditer
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBarber(b.id)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION: CLIENTS                                          */}
          {/* ======================================================== */}
          {currentSection === 'clients' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Répertoire des Clients & Fidélité</h2>
                  <p className="text-xs text-gray-400">Comptes enregistrés, solde de points et attribution de rôles.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewUserModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold shadow"
                >
                  + Nouveau Client / Utilisateur
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#161F30]">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-gray-900 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                    <tr>
                      <th className="py-3.5 px-4">Client</th>
                      <th className="py-3.5 px-4">Téléphone</th>
                      <th className="py-3.5 px-4">Points Fidélité</th>
                      <th className="py-3.5 px-4">Rôles</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/80">
                    {clients.map((u) => {
                      const roleNames = Array.isArray(u.roles) ? u.roles.map((r) => (typeof r === 'string' ? r : r.name)) : [];
                      return (
                        <tr key={u.id} className="hover:bg-gray-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">{u.name}</div>
                            <div className="text-[11px] text-gray-400">{u.email}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-gray-300">{u.phone || '—'}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{u.loyalty_points || 0} pts</td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1">
                              {roleNames.map((r) => (
                                <span
                                  key={r}
                                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                    r === 'admin'
                                      ? 'bg-red-500/20 text-red-400'
                                      : r === 'employe'
                                      ? 'bg-amber-500/20 text-amber-400'
                                      : 'bg-emerald-500/20 text-emerald-400'
                                  }`}
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleOpenSyncRoles(u)}
                              className="px-2.5 py-1 text-xs rounded bg-gray-800 text-amber-400 hover:bg-gray-700"
                            >
                              Rôles
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id)}
                              className="px-2.5 py-1 text-xs rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION: GALERIE & AVIS                                    */}
          {/* ======================================================== */}
          {currentSection === 'gallery_reviews' && (
            <div className="space-y-8">
              {/* Reviews Moderation */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">Modération des Avis Clients</h2>
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="p-4 rounded-xl bg-[#161F30] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white text-sm">{rev.client_name || 'Client'}</span>
                          <span className="text-xs text-gray-400">sur</span>
                          <span className="text-xs font-semibold text-amber-400">{rev.barber_name}</span>
                          <span className="text-xs text-amber-400 font-mono font-bold">★ {rev.rating}/5</span>
                        </div>
                        <p className="text-xs text-gray-300 italic">"{rev.comment}"</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${rev.is_approved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {rev.is_approved ? 'Approuvé' : 'En attente'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleApproveReview(rev.id, rev.is_approved)}
                          className={`px-3 py-1.5 text-xs rounded-lg font-bold transition ${
                            rev.is_approved ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-600 text-white hover:bg-emerald-500'
                          }`}
                        >
                          {rev.is_approved ? 'Masquer' : 'Approuver'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lookbook Gallery */}
              <div className="space-y-4 pt-6 border-t border-gray-800">
                <h2 className="text-xl font-bold text-white">Galerie Lookbook</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {gallery.map((g) => (
                    <div key={g.id} className="rounded-xl overflow-hidden border border-gray-800 relative group">
                      <img
                        src={g.image_url}
                        alt={g.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-40 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                        {g.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION: PARAMÈTRES (SPATIE RBAC MATRIX)                   */}
          {/* ======================================================== */}
          {currentSection === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Matrice Spatie Roles & Permissions</h2>
                <p className="text-xs text-gray-400">Configuration des autorisations granulaires pour l'API Laravel Sanctum.</p>
              </div>

              {matrixMessage && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                  {matrixMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {matrixData.roles.map((role) => {
                  const assignedPerms = matrixData.matrix[role.name] || [];
                  return (
                    <div key={role.id} className="p-6 rounded-2xl bg-[#161F30] border border-gray-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-base font-bold text-white uppercase tracking-wider">
                            Rôle : <span className="text-amber-400">{role.name}</span>
                          </h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-900 text-gray-400 font-mono">
                            {assignedPerms.length} perms
                          </span>
                        </div>
                        <div className="space-y-2 mb-6 max-h-80 overflow-y-auto pr-2">
                          {matrixData.permissions.map((perm) => {
                            const isChecked = assignedPerms.includes(perm.name);
                            return (
                              <label key={perm.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-900/60 hover:bg-gray-900 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(role.name, perm.name)}
                                  className="rounded bg-gray-800 text-[#D97706]"
                                />
                                <span className={isChecked ? 'text-white font-medium' : 'text-gray-400'}>{perm.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={savingMatrix}
                        onClick={() => handleSaveRoleMatrix(role)}
                        className="w-full py-2.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs shadow"
                      >
                        Enregistrer [{role.name}]
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ======================================================== */}
      {/* MODALS                                                    */}
      {/* ======================================================== */}

      {/* 1. Edit Appointment Modal */}
      {editApptModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveEditAppt} className="bg-[#161F30] rounded-2xl border border-gray-700 p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">
              Modifier le Rendez-vous #{editApptModal.item.id}
            </h3>

            <div>
              <label className="block text-xs text-gray-300 mb-1">Date du rendez-vous</label>
              <input
                type="date"
                required
                min={getTodayDateString()}
                value={editApptForm.appointment_date}
                onChange={(e) => {
                  const val = e.target.value;
                  const today = getTodayDateString();
                  setEditApptForm({ ...editApptForm, appointment_date: val < today ? today : val });
                }}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 mb-1">Heure de début</label>
              <input
                type="time"
                required
                value={editApptForm.start_time}
                onChange={(e) => setEditApptForm({ ...editApptForm, start_time: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 mb-1">Barbier assigné</label>
              <select
                value={editApptForm.barber_id}
                onChange={(e) => setEditApptForm({ ...editApptForm, barber_id: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-white"
              >
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.specialty})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-300 mb-1">Notes ou remarques</label>
              <textarea
                rows={2}
                value={editApptForm.notes}
                onChange={(e) => setEditApptForm({ ...editApptForm, notes: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-white resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditApptModal({ isOpen: false, item: null })}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
              >
                Annuler
              </button>
              <button type="submit" className="px-4 py-1.5 text-xs bg-[#D97706] text-white font-bold rounded">
                Sauvegarder
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Service Modal */}
      {serviceModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveService} className="bg-[#161F30] rounded-2xl border border-gray-700 p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">{serviceModal.item ? 'Modifier le Soin' : 'Nouveau Soin'}</h3>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Nom de la prestation</label>
              <input
                type="text"
                required
                value={serviceForm.name}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">Catégorie</label>
                <select
                  value={serviceForm.category}
                  onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                >
                  <option value="hair">Coiffure (hair)</option>
                  <option value="beard">Barbe (beard)</option>
                  <option value="care">Soins (care)</option>
                  <option value="vip">Forfaits VIP (vip)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Durée (minutes)</label>
                <input
                  type="number"
                  required
                  value={serviceForm.duration}
                  onChange={(e) => setServiceForm({ ...serviceForm, duration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-white font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">Tarif (MAD)</label>
                <input
                  type="number"
                  required
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm({ ...serviceForm, price: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-white font-mono"
                />
              </div>
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-white">
                  <input
                    type="checkbox"
                    checked={serviceForm.is_active}
                    onChange={(e) => setServiceForm({ ...serviceForm, is_active: e.target.checked })}
                    className="rounded bg-gray-900 text-[#D97706]"
                  />
                  <span>Prestation Active</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setServiceModal({ isOpen: false, item: null })}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
              >
                Annuler
              </button>
              <button type="submit" className="px-4 py-1.5 text-xs bg-[#D97706] text-white font-bold rounded">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Barber Modal */}
      {barberModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveBarber} className="bg-[#161F30] rounded-2xl border border-gray-700 p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">{barberModal.item ? 'Modifier le Barbier' : 'Nouveau Barbier'}</h3>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Nom de l'artisan</label>
              <input
                type="text"
                required
                value={barberForm.name}
                onChange={(e) => setBarberForm({ ...barberForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">Spécialité</label>
                <input
                  type="text"
                  required
                  value={barberForm.specialty}
                  onChange={(e) => setBarberForm({ ...barberForm, specialty: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Expérience</label>
                <input
                  type="text"
                  required
                  value={barberForm.experience}
                  onChange={(e) => setBarberForm({ ...barberForm, experience: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">URL Photo</label>
              <input
                type="url"
                required
                value={barberForm.image_url}
                onChange={(e) => setBarberForm({ ...barberForm, image_url: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBarberModal({ isOpen: false, item: null })}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
              >
                Annuler
              </button>
              <button type="submit" className="px-4 py-1.5 text-xs bg-[#D97706] text-white font-bold rounded">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. New User Modal */}
      {newUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateUser} className="bg-[#161F30] rounded-2xl border border-gray-700 p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Créer un Compte Utilisateur</h3>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Nom complet</label>
              <input
                type="text"
                required
                value={newUserData.name}
                onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={newUserData.phone}
                  placeholder="+2126..."
                  onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Rôle initial</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                >
                  <option value="client">Client</option>
                  <option value="employe">Employé (Barbier)</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Mot de passe temporaire</label>
              <input
                type="password"
                required
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewUserModal(false)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
              >
                Annuler
              </button>
              <button type="submit" className="px-4 py-1.5 text-xs bg-[#D97706] text-white font-bold rounded">
                Créer Utilisateur
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. Sync Roles Modal */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#161F30] rounded-2xl border border-gray-700 p-6 max-w-sm w-full">
            <h3 className="text-base font-bold text-white mb-2">Modifier les Rôles de {roleModalUser.name}</h3>
            <div className="space-y-2 mb-6">
              {['admin', 'employe', 'client'].map((r) => (
                <label key={r} className="flex items-center gap-2 p-2 rounded bg-gray-900 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={selectedUserRoles.includes(r)}
                    onChange={() => {
                      setSelectedUserRoles((prev) =>
                        prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
                      );
                    }}
                    className="rounded bg-gray-800 text-[#D97706]"
                  />
                  <span className="text-white capitalize">{r}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRoleModalUser(null)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">
                Annuler
              </button>
              <button type="button" onClick={handleSaveUserRoles} className="px-4 py-1.5 text-xs bg-[#D97706] text-white font-bold rounded">
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
