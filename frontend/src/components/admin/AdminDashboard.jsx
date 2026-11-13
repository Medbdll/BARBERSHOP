import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import DashboardLogo from '../common/DashboardLogo';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { getTodayDateString } from '../../utils/dateTime';
import {
  getImageUrl,
  handleImageFallbackError,
  DEFAULT_AVATAR_PLACEHOLDER,
  DEFAULT_GALLERY_PLACEHOLDER,
} from '../../utils/getImageUrl';
import {
  getAdminStats,
  getAdminAppointments,
  getAdminServices,
  createAdminService,
  updateAdminService,
  deleteAdminService,
  getAdminBarbers,
  updateAdminBarber,
  deleteAdminBarber,
  getAdminUsers,
  toggleAdminUserStatus,
  updateUserRole,
  getAdminReviews,
  updateAdminReviewStatus,
  deleteAdminReview,
} from '../../api/barberApi';

const ADMIN_COPY = {
  fr: {
    brandSubtitle: '— ADMIN —',
    languageLabel: 'Langue',
    logout: 'Déconnexion',
    welcome: 'Administration',
    welcomeSubtitle:
      'Supervisez le salon en direct : réservations, revenus, catalogue, équipe et fidélité.',
    walkInCta: '+ Nouveau RDV Manuel',
    liveSync: 'Live • 20s',
    refreshBtn: 'Actualiser',
    nav: {
      overview: "Vue d'ensemble",
      appointments: 'Rendez-vous',
      services: 'Prestations',
      team: 'Équipe & Rôles',
      clients: 'Clients',
      reviews: 'Avis Clients',
    },
    kpis: {
      todayBookings: 'RDV du Jour',
      todayHint: "Planifiés aujourd'hui",
      monthRevenue: "Chiffre d'Affaires (MAD)",
      monthHint: 'Revenus encaissés ce mois',
      activeClients: 'Clients Inscrits',
      clientsHint: 'Comptes fidélité actifs',
      attendanceRate: 'Taux de Présence',
      attendanceHint: 'Complétion vs No-Show',
    },
    overview: {
      revenueTitle: 'Évolution des Revenus (6 derniers mois)',
      servicesTitle: 'Prestations les plus demandées',
      liveFeedTitle: "File d'attente en direct (Aujourd'hui)",
      liveFeedSubtitle: 'Tous les barbiers confondus, avec actions rapides.',
      emptyQueue: "Aucun rendez-vous actif pour aujourd'hui.",
      bookingsLabel: 'réservations',
    },
    appointments: {
      title: 'Gestion Globale des Rendez-vous',
      subtitle: 'Filtrez par client, téléphone, date, barbier ou statut.',
      searchPlaceholder: 'Rechercher par client, téléphone, barbier...',
      todayFilter: "Aujourd'hui",
      allDatesFilter: 'Toutes les dates',
      allBarbers: 'Tous les barbiers',
      exportCsv: 'Exporter CSV',
      exportPdf: 'Exporter PDF',
      empty: 'Aucun rendez-vous trouvé pour ces filtres.',
      loyaltyApplied: 'Fidélité : -{amount} MAD (-{pts} pts)',
      pointsCreditedToast: '+{pts} pts crédités au client !',
    },
    statuses: {
      all: 'Tous',
      pending: 'En attente',
      confirmed: 'Confirmé',
      in_progress: 'Au fauteuil',
      completed: 'Terminé',
      cancelled: 'Annulé',
      no_show: 'No-Show',
    },
    actions: {
      confirm: 'Confirmer',
      complete: '✓ Terminer',
      noShow: 'No-Show',
      cancel: 'Annuler',
      edit: 'Modifier',
      delete: 'Supprimer',
      save: 'Enregistrer',
      close: 'Fermer',
      confirmCancelTitle: 'Confirmer l’annulation',
      confirmCancelDesc:
        'Annuler le rendez-vous de {client} ({time}) ? Les points utilisés seront remboursés automatiquement.',
      confirmDeleteService: 'Supprimer cette prestation du catalogue ?',
      confirmDeleteBarber: 'Retirer ce barbier de l’équipe ?',
    },
    servicesTab: {
      title: 'Catalogue des Prestations',
      subtitle: 'Gérez les tarifs, durées, photos et disponibilité des coupes et soins.',
      addBtn: '+ Ajouter une Prestation',
      active: 'Actif',
      inactive: 'Inactif',
      modalAdd: 'Nouvelle Prestation',
      modalEdit: 'Modifier la Prestation',
      nameLabel: 'Nom de la prestation',
      titleFrLabel: 'Titre (FR)',
      titleArLabel: 'العنوان (AR)',
      categoryLabel: 'Catégorie',
      durationLabel: 'Durée (min)',
      priceLabel: 'Tarif (MAD)',
      descLabel: 'Description',
      descFrLabel: 'Description (FR)',
      descArLabel: 'الوصف (AR)',
      imageUrlLabel: 'URL Image ou chemin',
      imageFileLabel: 'Ou importer une image',
      activeLabel: 'Prestation active en ligne',
      categories: {
        hair: 'Coiffure (hair)',
        beard: 'Barbe (beard)',
        care: 'Soins (care)',
        vip: 'Forfaits VIP (vip)',
      },
    },
    teamTab: {
      title: 'Équipe Barbiers & Rôles Spatie',
      subtitle: 'Ajoutez vos employés barbiers et attribuez les rôles Admin / Employé / Client.',
      addEmployeBtn: '+ Ajouter un Employé (Barbier)',
      barbersSection: 'Artisans Barbiers Actifs',
      rolesSection: 'Matrice des Utilisateurs & Rôles Spatie',
      syncRolesBtn: 'Rôles',
      editBarberTitle: 'Modifier le Barbier',
      newEmployeTitle: 'Nouvel Employé (Barbier)',
      fullName: 'Nom complet',
      email: 'E-mail',
      phone: 'Téléphone',
      password: 'Mot de passe temporaire',
      specialty: 'Spécialité',
      experience: 'Expérience',
      bio: 'Biographie',
      photoUrl: 'Photo (URL ou chemin)',
      photoFile: 'Ou importer une photo',
      syncRolesTitle: 'Attribuer les rôles Spatie',
      roleLabels: {
        admin: 'Administrateur',
        employe: 'Employé (Barbier)',
        client: 'Client',
      },
    },
    clientsTab: {
      title: 'Clients & Portefeuille Fidélité',
      subtitle: 'Consultez les points fidélité (10 pts = 1 MAD) et bloquez les comptes abusifs.',
      searchPlaceholder: 'Rechercher un client par nom, téléphone ou email...',
      bookingsCount: 'RDV',
      loyaltyLabel: 'Fidélité',
      statusActive: 'Actif',
      statusBlocked: 'Bloqué',
      blockBtn: 'Bloquer',
      unblockBtn: 'Débloquer',
      empty: 'Aucun client correspondant.',
    },
    reviewsTab: {
      title: 'Modération des Avis Clients',
      subtitle: 'Approuvez ou rejetez les avis avant publication sur la Landing Page.',
      filterAll: 'Tous',
      filterPending: 'En attente',
      filterApproved: 'Approuvés',
      filterRejected: 'Rejetés',
      approveBtn: '✓ Approuver',
      rejectBtn: '✕ Rejeter',
      pendingBtn: '↩ En attente',
      deleteBtn: 'Supprimer',
      pendingBadge: 'En attente',
      approvedBadge: 'Approuvé',
      rejectedBadge: 'Rejeté',
      empty: 'Aucun avis pour ce filtre.',
      stars: 'étoiles',
      by: 'par',
      confirmDelete: 'Supprimer définitivement cet avis client ?',
    },
    walkInModal: {
      title: 'Nouveau RDV Manuel (Walk-in)',
      existingClient: 'Client existant',
      walkInGuest: 'Nouveau client / Passage',
      selectClient: 'Sélectionner un client',
      guestName: 'Nom du client',
      guestPhone: 'Téléphone',
      selectBarber: 'Barbier',
      selectService: 'Prestation',
      date: 'Date',
      time: 'Heure de début',
      notes: 'Notes internes',
      submit: 'Créer le rendez-vous',
      saving: 'Création...',
    },
    common: {
      currency: 'MAD',
      minutes: 'min',
      pts: 'pts',
    },
  },
  ar: {
    brandSubtitle: '— الإدارة —',
    languageLabel: 'اللغة',
    logout: 'تسجيل الخروج',
    welcome: 'لوحة الإدارة',
    welcomeSubtitle: 'راقب الصالون مباشرة: المواعيد، المداخيل، الخدمات، الفريق والزبناء.',
    walkInCta: '+ حجز يدوي جديد',
    liveSync: 'مباشر • 20ث',
    refreshBtn: 'تحديث',
    nav: {
      overview: 'نظرة عامة',
      appointments: 'المواعيد',
      services: 'الخدمات',
      team: 'الفريق والأدوار',
      clients: 'الزبناء',
      reviews: 'تقييمات الزبناء',
    },
    kpis: {
      todayBookings: 'مواعيد اليوم',
      todayHint: 'المبرمجة اليوم',
      monthRevenue: 'رقم المعاملات (درهم)',
      monthHint: 'مداخيل هذا الشهر',
      activeClients: 'الزبناء المسجلون',
      clientsHint: 'حسابات الولاء النشطة',
      attendanceRate: 'نسبة الحضور',
      attendanceHint: 'الإنجاز مقابل الغياب',
    },
    overview: {
      revenueTitle: 'تطور المداخيل (آخر 6 أشهر)',
      servicesTitle: 'الخدمات الأكثر طلباً',
      liveFeedTitle: 'قائمة الانتظار المباشرة (اليوم)',
      liveFeedSubtitle: 'جميع الحلاقين مع أزرار التحديث السريع.',
      emptyQueue: 'لا توجد مواعيد نشطة اليوم.',
      bookingsLabel: 'حجوزات',
    },
    appointments: {
      title: 'إدارة جميع المواعيد',
      subtitle: 'تصفية حسب الزبون أو الهاتف أو التاريخ أو الحلاق أو الحالة.',
      searchPlaceholder: 'ابحث بالاسم أو الهاتف أو الحلاق...',
      todayFilter: 'اليوم',
      allDatesFilter: 'كل التواريخ',
      allBarbers: 'كل الحلاقين',
      exportCsv: 'تصدير CSV',
      exportPdf: 'تصدير PDF',
      empty: 'لا توجد مواعيد مطابقة للبحث.',
      loyaltyApplied: 'خصم الولاء: -{amount} درهم (-{pts} نقطة)',
      pointsCreditedToast: 'تمت إضافة +{pts} نقطة لرصيد الزبون!',
    },
    statuses: {
      all: 'الكل',
      pending: 'قيد الانتظار',
      confirmed: 'مؤكد',
      in_progress: 'في الكرسي',
      completed: 'مكتمل',
      cancelled: 'ملغى',
      no_show: 'متغيب',
    },
    actions: {
      confirm: 'تأكيد',
      complete: '✓ إنهاء',
      noShow: 'متغيب',
      cancel: 'إلغاء',
      edit: 'تعديل',
      delete: 'حذف',
      save: 'حفظ',
      close: 'إغلاق',
      confirmCancelTitle: 'تأكيد الإلغاء',
      confirmCancelDesc:
        'هل تريد إلغاء موعد {client} ({time})؟ سيتم إرجاع نقاط الولاء المستعملة تلقائياً.',
      confirmDeleteService: 'هل تريد حذف هذه الخدمة؟',
      confirmDeleteBarber: 'هل تريد إزالة هذا الحلاق من الفريق؟',
    },
    servicesTab: {
      title: 'كتالوج الخدمات',
      subtitle: 'إدارة الأسعار، المدة، الصور وتفعيل الخدمات.',
      addBtn: '+ إضافة خدمة',
      active: 'مفعل',
      inactive: 'معطل',
      modalAdd: 'إضافة خدمة جديدة',
      modalEdit: 'تعديل الخدمة',
      nameLabel: 'اسم الخدمة',
      titleFrLabel: 'العنوان بالفرنسية (FR)',
      titleArLabel: 'العنوان بالعربية (AR)',
      categoryLabel: 'الفئة',
      durationLabel: 'المدة (دقيقة)',
      priceLabel: 'السعر (درهم)',
      descLabel: 'الوصف',
      descFrLabel: 'الوصف بالفرنسية (FR)',
      descArLabel: 'الوصف بالعربية (AR)',
      imageUrlLabel: 'رابط الصورة أو المسار',
      imageFileLabel: 'أو تحميل صورة',
      activeLabel: 'الخدمة متاحة للحجز',
      categories: {
        hair: 'حلاقة الشعر (hair)',
        beard: 'العناية باللحية (beard)',
        care: 'العناية بالبشرة (care)',
        vip: 'باقات VIP (vip)',
      },
    },
    teamTab: {
      title: 'فريق الحلاقين والأدوار (Spatie)',
      subtitle: 'أضف حلاقين جدد وحدد أدوار الإدارة والموظفين والزبناء.',
      addEmployeBtn: '+ إضافة حلاق (موظف)',
      barbersSection: 'الحلاقون النشطون',
      rolesSection: 'جدول المستخدمين والأدوار',
      syncRolesBtn: 'الأدوار',
      editBarberTitle: 'تعديل الحلاق',
      newEmployeTitle: 'موظف حلاق جديد',
      fullName: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      phone: 'الهاتف',
      password: 'كلمة المرور المؤقتة',
      specialty: 'التخصص',
      experience: 'الخبرة',
      bio: 'نبذة تعريفية',
      photoUrl: 'الصورة (رابط أو مسار)',
      photoFile: 'أو تحميل صورة',
      syncRolesTitle: 'تحديث أدوار المستخدم',
      roleLabels: {
        admin: 'مدير',
        employe: 'حلاق (موظف)',
        client: 'زبون',
      },
    },
    clientsTab: {
      title: 'الزبناء ورصيد الولاء',
      subtitle: 'متابعة نقاط الولاء (10 نقاط = 1 درهم) وحظر الحسابات المتغيبة.',
      searchPlaceholder: 'ابحث عن زبون بالاسم أو الهاتف أو البريد...',
      bookingsCount: 'حجوزات',
      loyaltyLabel: 'الولاء',
      statusActive: 'نشط',
      statusBlocked: 'محظور',
      blockBtn: 'حظر',
      unblockBtn: 'إلغاء الحظر',
      empty: 'لا يوجد زبناء مطابقون.',
    },
    reviewsTab: {
      title: 'مراجعة وإدارة التقييمات',
      subtitle: 'وافق على التقييمات أو ارفضها قبل نشرها في الصفحة الرئيسية.',
      filterAll: 'الكل',
      filterPending: 'قيد المراجعة',
      filterApproved: 'مقبولة',
      filterRejected: 'مرفوضة',
      approveBtn: '✓ قبول',
      rejectBtn: '✕ رفض',
      pendingBtn: '↩ قيد المراجعة',
      deleteBtn: 'حذف',
      pendingBadge: 'قيد المراجعة',
      approvedBadge: 'مقبول',
      rejectedBadge: 'مرفوض',
      empty: 'لا توجد تقييمات لهذا الفلتر.',
      stars: 'نجوم',
      by: 'بواسطة',
      confirmDelete: 'هل تريد حذف هذا التقييم نهائياً؟',
    },
    walkInModal: {
      title: 'حجز يدوي جديد (Walk-in)',
      existingClient: 'زبون مسجل',
      walkInGuest: 'زبون جديد / مباشر',
      selectClient: 'اختر الزبون',
      guestName: 'اسم الزبون',
      guestPhone: 'رقم الهاتف',
      selectBarber: 'الحلاق',
      selectService: 'الخدمة',
      date: 'التاريخ',
      time: 'وقت البداية',
      notes: 'ملاحظات',
      submit: 'تأكيد الحجز اليدوي',
      saving: 'جاري الحفظ...',
    },
    common: {
      currency: 'درهم',
      minutes: 'دقيقة',
      pts: 'نقطة',
    },
  },
};

function StatusBadge({ status, copy }) {
  const palette = {
    pending: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
    confirmed: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
    in_progress: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 animate-pulse',
    completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
    no_show: 'bg-slate-700/60 text-slate-300 border-slate-600/60',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${
        palette[status] || palette.pending
      }`}
    >
      {copy.statuses[status] || status}
    </span>
  );
}

function AdminAppointmentCard({
  appt,
  copy,
  isAr,
  showDate = true,
}) {
  const hasDiscount = Number(appt.discount_amount || 0) > 0 || Number(appt.points_used || 0) > 0;
  const serviceTitle = isAr
    ? (appt.service?.title_ar || appt.service?.name)
    : (appt.service?.title_fr || appt.service?.name);

  return (
    <article className="p-4 sm:p-5 rounded-2xl bg-[#182030] border border-slate-800 hover:border-[#D9822B]/40 transition-all shadow-lg space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="px-3 py-2 rounded-xl bg-[#10151F] border border-slate-800 text-center shrink-0 min-w-[76px]">
            <div className="text-sm font-black font-mono text-[#D9822B]">{appt.start_time}</div>
            <div className="text-[10px] font-mono text-slate-400">→ {appt.end_time}</div>
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                {appt.client?.name || (isAr ? 'زبون' : 'Client')}
              </h3>
              {showDate && (
                <span className="px-2 py-0.5 rounded bg-[#10151F] border border-slate-800 text-[11px] font-mono text-slate-300">
                  {appt.appointment_date}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {serviceTitle && (
                <span className="px-2 py-0.5 rounded-md bg-[#D9822B]/15 border border-[#D9822B]/35 text-[#D9822B] font-semibold">
                  ✂️ {serviceTitle}
                </span>
              )}
              {appt.barber?.name && (
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 font-medium">
                  💈 {appt.barber.name}
                </span>
              )}
              {appt.client?.phone && (
                <a
                  href={`tel:${appt.client.phone}`}
                  className="px-2 py-0.5 rounded-md bg-[#10151F] border border-slate-700/80 text-slate-300 hover:text-[#D9822B] font-mono"
                >
                  📞 <span dir="ltr">{appt.client.phone}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
          <StatusBadge status={appt.status} copy={copy} />
          <div className="text-end">
            <div className="flex items-baseline justify-end gap-1.5">
              {hasDiscount && (
                <span className="text-xs font-mono text-slate-500 line-through">
                  {appt.subtotal_price} {copy.common.currency}
                </span>
              )}
              <span className="text-base font-black font-mono text-white">
                {appt.total_price} {copy.common.currency}
              </span>
            </div>
            {hasDiscount && (
              <div className="text-[11px] text-emerald-400 font-semibold">
                {copy.appointments.loyaltyApplied
                  .replace('{amount}', String(appt.discount_amount || 0))
                  .replace('{pts}', String(appt.points_used || 0))}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';
  const copy = ADMIN_COPY[isAr ? 'ar' : 'fr'];
  const navigate = useNavigate();

  const todayStr = getTodayDateString();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'appointments' | 'services' | 'team' | 'clients' | 'reviews'

  // Core Data State
  const [stats, setStats] = useState(null);
  const [todayQueue, setTodayQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Appointments Tab Filters
  const [apptSearch, setApptSearch] = useState('');
  const [apptDateMode, setApptDateMode] = useState('today'); // 'today' | 'all' | 'custom'
  const [apptCustomDate, setApptCustomDate] = useState(todayStr);
  const [apptStatus, setApptStatus] = useState('all');
  const [apptBarberId, setApptBarberId] = useState('all');

  // Clients Tab Search
  const [clientSearch, setClientSearch] = useState('');
  const [togglingUserId, setTogglingUserId] = useState(null);

  // Reviews Moderation State
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewCounts, setReviewCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [reviewStatusFilter, setReviewStatusFilter] = useState('all');
  const [updatingReviewId, setUpdatingReviewId] = useState(null);
  const [reviewDeleteConfirm, setReviewDeleteConfirm] = useState(null);

  const [serviceModal, setServiceModal] = useState({ isOpen: false, item: null });
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    title_fr: '',
    title_ar: '',
    category: 'hair',
    duration: 30,
    price: 120,
    description_fr: '',
    description_ar: '',
    image_url: '',
    imageFile: null,
    is_active: true,
  });

  const [barberModal, setBarberModal] = useState({ isOpen: false, item: null });
  const [barberSaving, setBarberSaving] = useState(false);
  const [barberForm, setBarberForm] = useState({
    name: '',
    specialty: '',
    experience: '5 ans',
    bio: '',
    image_url: '',
    imageFile: null,
    is_active: true,
  });

  const [updatingRoleUserId, setUpdatingRoleUserId] = useState(null);

  // Confirm Dialog for Service/Barber delete
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, id: null });

  // Toast
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Load KPIs, Today's queue, Services, Barbers, Users, Reviews
  const loadDashboardCatalogs = useCallback(async () => {
    try {
      const [statsRes, todayRes, srvRes, brbRes, usrRes, revRes] = await Promise.all([
        getAdminStats(),
        getAdminAppointments({ date: 'today', per_page: 50 }),
        getAdminServices(),
        getAdminBarbers(),
        getAdminUsers({ per_page: 100 }),
        getAdminReviews(),
      ]);
      setStats(statsRes || null);
      setTodayQueue(Array.isArray(todayRes?.data) ? todayRes.data : []);
      setServices(Array.isArray(srvRes?.data) ? srvRes.data : []);
      setBarbers(Array.isArray(brbRes?.data) ? brbRes.data : []);
      setUsersList(Array.isArray(usrRes?.data) ? usrRes.data : []);
      if (Array.isArray(revRes?.data)) setReviews(revRes.data);
      if (revRes?.counts) setReviewCounts(revRes.counts);
    } catch (err) {
      console.error('Admin dashboard load warning:', err);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const res = await getAdminReviews();
      setReviews(Array.isArray(res?.data) ? res.data : []);
      if (res?.counts) setReviewCounts(res.counts);
    } catch (err) {
      console.error('Reviews load error:', err);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  const loadFilteredAppointments = useCallback(async () => {
    try {
      const params = {
        date: apptDateMode === 'custom' ? apptCustomDate : apptDateMode,
        per_page: 80,
      };
      if (apptStatus !== 'all') params.status = apptStatus;
      if (apptBarberId !== 'all') params.barber_id = apptBarberId;
      if (apptSearch.trim()) params.search = apptSearch.trim();

      const res = await getAdminAppointments(params);
      setAppointments(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error('Filtered appointments error:', err);
    } finally {
      setLoadingAppointments(false);
    }
  }, [apptDateMode, apptCustomDate, apptStatus, apptBarberId, apptSearch]);

  // Initial load + 20s polling
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAdminStats(),
      getAdminAppointments({ date: 'today', per_page: 50 }),
      getAdminServices(),
      getAdminBarbers(),
      getAdminUsers({ per_page: 100 }),
      getAdminReviews(),
    ])
      .then(([statsRes, todayRes, srvRes, brbRes, usrRes, revRes]) => {
        if (cancelled) return;
        setStats(statsRes || null);
        setTodayQueue(Array.isArray(todayRes?.data) ? todayRes.data : []);
        setServices(Array.isArray(srvRes?.data) ? srvRes.data : []);
        setBarbers(Array.isArray(brbRes?.data) ? brbRes.data : []);
        setUsersList(Array.isArray(usrRes?.data) ? usrRes.data : []);
        if (Array.isArray(revRes?.data)) setReviews(revRes.data);
        if (revRes?.counts) setReviewCounts(revRes.counts);
      })
      .catch(() => {});

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadDashboardCatalogs();
      }
    }, 20000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [loadDashboardCatalogs]);

  useEffect(() => {
    if (activeTab === 'reviews') {
      loadReviews();
    }
  }, [activeTab, loadReviews]);

  // Reload Tab 2 appointments on filter change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadFilteredAppointments();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadFilteredAppointments]);

  // Export CSV / PDF
  const handleExportCSV = () => {
    const source = appointments.length > 0 ? appointments : todayQueue;
    if (source.length === 0) {
      showToast(copy.appointments.empty, 'error');
      return;
    }

    const headers = [
      'ID',
      'Date',
      'Heure Debut',
      'Heure Fin',
      'Client',
      'Telephone',
      'Service',
      'Barbier',
      'Prix Final (MAD)',
      'Reduction (MAD)',
      'Statut',
    ];
    const rows = source.map((a) => [
      a.id,
      a.appointment_date,
      a.start_time,
      a.end_time,
      `"${a.client?.name || ''}"`,
      `"${a.client?.phone || ''}"`,
      `"${a.service?.name || ''}"`,
      `"${a.barber?.name || ''}"`,
      a.total_price,
      a.discount_amount || 0,
      a.status,
    ]);

    const csv =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `Barberoza_RDV_${todayStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isAr ? 'تم تصدير ملف CSV بنجاح.' : 'Export CSV téléchargé.');
  };

  const handleExportPDF = () => {
    window.print();
  };

  // Services CRUD
  const handleOpenServiceModal = (item = null) => {
    setServiceModal({ isOpen: true, item });
    if (item) {
      setServiceForm({
        title_fr: item.title_fr || item.name || '',
        title_ar: item.title_ar || item.title_fr || item.name || '',
        category: item.category || 'hair',
        duration: item.duration_minutes || item.duration || 30,
        price: item.price || 100,
        description_fr: item.description_fr || item.description || '',
        description_ar: item.description_ar || item.description_fr || item.description || '',
        image_url: item.image_url || '',
        imageFile: null,
        is_active: Boolean(item.is_active),
      });
    } else {
      setServiceForm({
        title_fr: '',
        title_ar: '',
        category: 'hair',
        duration: 30,
        price: 120,
        description_fr: '',
        description_ar: '',
        image_url: '',
        imageFile: null,
        is_active: true,
      });
    }
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    setServiceSaving(true);
    try {
      let payload;
      const durationVal = Number(serviceForm.duration) || 30;
      const priceVal = Number(serviceForm.price) || 0;
      const titleFr = serviceForm.title_fr.trim();
      const titleAr = (serviceForm.title_ar || serviceForm.title_fr).trim();
      const descFr = (serviceForm.description_fr || '').trim();
      const descAr = (serviceForm.description_ar || serviceForm.description_fr || '').trim();

      if (serviceForm.imageFile) {
        payload = new FormData();
        payload.append('title_fr', titleFr);
        payload.append('title_ar', titleAr);
        payload.append('name', titleFr);
        payload.append('category', serviceForm.category);
        payload.append('duration', String(durationVal));
        payload.append('duration_minutes', String(durationVal));
        payload.append('price', String(priceVal));
        payload.append('description_fr', descFr);
        payload.append('description_ar', descAr);
        payload.append('description', descFr);
        payload.append('is_active', serviceForm.is_active ? '1' : '0');
        payload.append('image', serviceForm.imageFile);
      } else {
        payload = {
          title_fr: titleFr,
          title_ar: titleAr,
          name: titleFr,
          category: serviceForm.category,
          duration: durationVal,
          duration_minutes: durationVal,
          price: priceVal,
          description_fr: descFr,
          description_ar: descAr,
          description: descFr,
          image_url: serviceForm.image_url || null,
          is_active: Boolean(serviceForm.is_active),
        };
      }

      if (serviceModal.item) {
        await updateAdminService(serviceModal.item.id, payload);
      } else {
        await createAdminService(payload);
      }
      setServiceModal({ isOpen: false, item: null });
      const res = await getAdminServices();
      setServices(res.data || []);
      showToast(isAr ? 'تم حفظ الخدمة بنجاح.' : 'Prestation enregistrée.');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Erreur prestation.', 'error');
    } finally {
      setServiceSaving(false);
    }
  };

  const handleToggleServiceActive = async (srv) => {
    try {
      await updateAdminService(srv.id, { is_active: !srv.is_active });
      const res = await getAdminServices();
      setServices(res.data || []);
      showToast(!srv.is_active ? copy.servicesTab.active : copy.servicesTab.inactive);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Erreur.', 'error');
    }
  };

  // Barber Edit
  const handleOpenBarberModal = (b) => {
    setBarberModal({ isOpen: true, item: b });
    setBarberForm({
      name: b.name || '',
      specialty: b.specialty || '',
      experience: b.experience || '5 ans',
      bio: b.bio || '',
      image_url: b.image_url || '',
      imageFile: null,
      is_active: Boolean(b.is_active),
    });
  };

  const handleSaveBarber = async (e) => {
    e.preventDefault();
    if (!barberModal.item) return;
    setBarberSaving(true);
    try {
      let payload;
      if (barberForm.imageFile) {
        payload = new FormData();
        payload.append('name', barberForm.name);
        payload.append('specialty', barberForm.specialty);
        payload.append('experience', barberForm.experience);
        payload.append('bio', barberForm.bio || '');
        payload.append('is_active', barberForm.is_active ? '1' : '0');
        payload.append('image', barberForm.imageFile);
      } else {
        payload = {
          name: barberForm.name,
          specialty: barberForm.specialty,
          experience: barberForm.experience,
          bio: barberForm.bio || '',
          image_url: barberForm.image_url || null,
          is_active: Boolean(barberForm.is_active),
        };
      }

      await updateAdminBarber(barberModal.item.id, payload);
      setBarberModal({ isOpen: false, item: null });
      await loadDashboardCatalogs();
      showToast(isAr ? 'تم تحديث بيانات الحلاق.' : 'Profil barbier mis à jour.');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Erreur.', 'error');
    } finally {
      setBarberSaving(false);
    }
  };



  // Single-Role Selection & Barber-User Sync
  const handleSingleRoleChange = async (targetUser, newRole) => {
    if (!targetUser || !newRole) return;
    setUpdatingRoleUserId(targetUser.id);
    try {
      await updateUserRole(targetUser.id, newRole);
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, roles: [newRole] } : u))
      );
      await loadDashboardCatalogs();
      showToast(isAr ? 'تم تحديث الدور بنجاح.' : 'Rôle utilisateur mis à jour.');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Erreur mise à jour du rôle.', 'error');
    } finally {
      setUpdatingRoleUserId(null);
    }
  };

  // Block / Unblock Client Account
  const handleToggleUserStatus = async (targetUser) => {
    setTogglingUserId(targetUser.id);
    try {
      const res = await toggleAdminUserStatus(targetUser.id);
      const updated = res?.data;
      setUsersList((prev) => prev.map((u) => (u.id === targetUser.id ? updated : u)));
      showToast(res?.message || 'Statut mis à jour.');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Erreur statut utilisateur.', 'error');
    } finally {
      setTogglingUserId(null);
    }
  };

  // Confirm Delete Service or Barber
  const handleConfirmDelete = async () => {
    if (!deleteConfirm.id || !deleteConfirm.type) return;
    try {
      if (deleteConfirm.type === 'service') {
        await deleteAdminService(deleteConfirm.id);
        const res = await getAdminServices();
        setServices(res.data || []);
      } else if (deleteConfirm.type === 'barber') {
        const deletedBarber = barbers.find((b) => b.id === deleteConfirm.id);
        const res = await deleteAdminBarber(deleteConfirm.id);
        setBarbers((prev) => prev.filter((b) => b.id !== deleteConfirm.id));
        const revertedUserId = res?.user?.id ?? deletedBarber?.user_id;
        if (revertedUserId) {
          setUsersList((prev) =>
            prev.map((u) =>
              u.id === revertedUserId
                ? { ...u, ...(res?.user || {}), roles: ['client'] }
                : u
            )
          );
        }
        await loadDashboardCatalogs();
      }
      showToast(isAr ? 'تم الحذف بنجاح.' : 'Suppression effectuée.');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Erreur suppression.', 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, type: null, id: null });
    }
  };

  // Reviews Moderation Handlers
  const handleReviewStatus = async (reviewId, newStatus) => {
    setUpdatingReviewId(reviewId);
    try {
      await updateAdminReviewStatus(reviewId, newStatus);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status: newStatus, is_approved: newStatus === 'approved' } : r))
      );
      setReviewCounts((prev) => {
        const currentRev = reviews.find((r) => r.id === reviewId);
        const oldStatus = currentRev?.status || (currentRev?.is_approved ? 'approved' : 'pending');
        if (oldStatus === newStatus) return prev;
        return {
          ...prev,
          [oldStatus]: Math.max(0, (prev[oldStatus] || 0) - 1),
          [newStatus]: (prev[newStatus] || 0) + 1,
        };
      });
      showToast(
        newStatus === 'approved'
          ? (isAr ? 'تم قبول التقييم ونشره.' : 'Avis approuvé et publié.')
          : newStatus === 'rejected'
            ? (isAr ? 'تم رفض التقييم.' : 'Avis rejeté.')
            : (isAr ? 'تم إعادة التقييم لقيد المراجعة.' : 'Avis remis en attente.')
      );
    } catch (err) {
      showToast(err?.response?.data?.message || 'Erreur statut avis.', 'error');
    } finally {
      setUpdatingReviewId(null);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    setUpdatingReviewId(reviewId);
    try {
      await deleteAdminReview(reviewId);
      const targetRev = reviews.find((r) => r.id === reviewId);
      const currentSt = targetRev?.status || (targetRev?.is_approved ? 'approved' : 'pending');
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setReviewCounts((prev) => ({
        ...prev,
        total: Math.max(0, (prev.total || 0) - 1),
        [currentSt]: Math.max(0, (prev[currentSt] || 0) - 1),
      }));
      showToast(isAr ? 'تم حذف التقييم نهائياً.' : 'Avis supprimé définitivement.');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Erreur suppression avis.', 'error');
    } finally {
      setUpdatingReviewId(null);
      setReviewDeleteConfirm(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Filtered Clients (Users with 'client' role, or matching search)
  const clientUsers = useMemo(() => {
    const onlyClients = usersList.filter((u) => {
      const roles = Array.isArray(u.roles)
        ? u.roles.map((r) => (typeof r === 'string' ? r : r.name))
        : [];
      return roles.includes('client') || roles.length === 0;
    });
    const q = clientSearch.trim().toLowerCase();
    if (!q) return onlyClients;
    return onlyClients.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
    );
  }, [usersList, clientSearch]);

  const adminAvatarUrl =
    getImageUrl(user?.avatar) ||
    (user?.profile_photo_url && !user.profile_photo_url.includes('ui-avatars.com')
      ? getImageUrl(user.profile_photo_url)
      : null);

  const adminInitial = (user?.name || 'A').trim().charAt(0).toUpperCase() || 'A';

  const pendingOrConfirmedCount = useMemo(
    () => todayQueue.filter((a) => ['pending', 'confirmed', 'in_progress'].includes(a.status)).length,
    [todayQueue]
  );

  const pendingReviewsCount = useMemo(() => reviewCounts.pending || 0, [reviewCounts]);

  const navItems = useMemo(
    () => [
      {
        id: 'overview',
        label: copy.nav.overview,
        badge: null,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        ),
      },
      {
        id: 'appointments',
        label: copy.nav.appointments,
        badge: pendingOrConfirmedCount > 0 ? pendingOrConfirmedCount : null,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        id: 'services',
        label: copy.nav.services,
        badge: null,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879a3 3 0 11-4.242-4.242L12 10.586m0 0L9.121 7.707a3 3 0 00-4.242 4.242L12 14.828" />
          </svg>
        ),
      },
      {
        id: 'team',
        label: copy.nav.team,
        badge: null,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        id: 'clients',
        label: copy.nav.clients,
        badge: null,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
      },
      {
        id: 'reviews',
        label: copy.nav.reviews,
        badge: pendingReviewsCount > 0 ? pendingReviewsCount : null,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        ),
      },
    ],
    [copy.nav, pendingOrConfirmedCount, pendingReviewsCount]
  );

  // Analytics datasets for Overview progress bars
  const revenueTrendBars = useMemo(() => {
    const labels = stats?.charts?.revenue_trend?.labels || [];
    const data = stats?.charts?.revenue_trend?.datasets?.[0]?.data || [];
    const maxVal = Math.max(1, ...data.map((v) => Number(v) || 0));
    return labels.map((label, idx) => ({
      label,
      value: Number(data[idx] || 0),
      pct: Math.round(((Number(data[idx] || 0)) / maxVal) * 100),
    }));
  }, [stats]);

  const popularServicesBars = useMemo(() => {
    return stats?.charts?.popular_services?.doughnut || [];
  }, [stats]);

  const statusFilterKeys = ['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];

  return (
    <div
      dir={dir}
      className={`min-h-screen bg-[#10151F] text-white font-sans ${isAr ? 'font-arabic' : ''}`}
    >
      {/* ============================================================ */}
      {/* DESKTOP FIXED SIDEBAR (w-64) */}
      {/* ============================================================ */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:start-0 bg-[#141B29] border-e border-slate-800/90 z-30 print:hidden">
        <div className="p-6 border-b border-slate-800/80 space-y-4">
          <div className="flex items-center gap-3 text-start">
            <div className="w-10 h-10 rounded-xl bg-[#D9822B]/15 border border-[#D9822B]/40 flex items-center justify-center shrink-0">
              <DashboardLogo className="w-7 h-7" />
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
        </div>

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

        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400 font-medium">{copy.languageLabel}</span>
            <LanguageSwitcher variant="pills" />
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#182030] border border-slate-800 text-start">
            <div className="w-9 h-9 rounded-full bg-[#10151F] border border-[#D9822B] text-[#D9822B] font-bold text-sm flex items-center justify-center overflow-hidden shrink-0">
              {adminAvatarUrl ? (
                <img
                  src={adminAvatarUrl}
                  alt={user?.name || 'Admin'}
                  onError={(e) => handleImageFallbackError(e, DEFAULT_AVATAR_PLACEHOLDER)}
                  className="w-full h-full object-cover"
                />
              ) : (
                adminInitial
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
      <header className="lg:hidden sticky top-0 z-40 bg-[#10151F]/95 backdrop-blur-xl border-b border-slate-800/90 px-4 py-3 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 text-start">
            <div className="w-8 h-8 rounded-lg bg-[#D9822B]/15 border border-[#D9822B]/40 flex items-center justify-center shrink-0">
              <DashboardLogo className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{user?.name}</div>
              <div className="text-[10px] font-semibold text-[#D9822B] uppercase tracking-wider truncate">
                BARBEROZA {copy.brandSubtitle}
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
      {/* MAIN CONTENT SHELL */}
      {/* ============================================================ */}
      <main className="lg:ps-64">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-12 space-y-6 text-start">
          {/* Welcome Header + Walk-in CTA */}
          <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {copy.welcome} <span className="text-[#D9822B]">BARBEROZA</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">{copy.welcomeSubtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#182030] border border-slate-800 text-xs font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{copy.liveSync}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  loadDashboardCatalogs();
                  loadFilteredAppointments();
                }}
                className="min-h-[38px] px-4 py-2 rounded-xl bg-[#182030] hover:bg-slate-800 border border-[#D9822B]/40 text-[#D9822B] text-xs font-bold transition cursor-pointer"
              >
                ↻ {copy.refreshBtn}
              </button>
            </div>
          </section>

          {/* ============================================================ */}
          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {/* ============================================================ */}
          {activeTab === 'overview' && (
            <section className="space-y-6">
              {/* Top Global KPI Banner (4 cards) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-[#182030] border border-slate-800 hover:border-[#D9822B]/40 transition shadow-lg">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="truncate">{copy.kpis.todayBookings}</span>
                    <span className="text-sky-400">📅</span>
                  </div>
                  <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-white">
                    {stats?.kpis?.rdv_today ?? 0}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 truncate">{copy.kpis.todayHint}</div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#182030] border border-[#D9822B]/35 hover:border-[#D9822B]/70 transition shadow-lg">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="truncate">{copy.kpis.monthRevenue}</span>
                    <span className="text-[#D9822B]">💰</span>
                  </div>
                  <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-white">
                    {Number(stats?.kpis?.month_revenue ?? 0)}{' '}
                    <span className="text-xs font-bold text-[#D9822B]">{copy.common.currency}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 truncate">{copy.kpis.monthHint}</div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#182030] border border-slate-800 hover:border-[#D9822B]/40 transition shadow-lg">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="truncate">{copy.kpis.activeClients}</span>
                    <span className="text-emerald-400">👥</span>
                  </div>
                  <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                    {stats?.kpis?.total_clients ?? 0}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 truncate">{copy.kpis.clientsHint}</div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#182030] border border-slate-800 hover:border-[#D9822B]/40 transition shadow-lg">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="truncate">{copy.kpis.attendanceRate}</span>
                    <span className="text-[#D9822B]">✓</span>
                  </div>
                  <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-[#D9822B]">
                    {stats?.kpis?.attendance_rate ?? 100}%
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 truncate">{copy.kpis.attendanceHint}</div>
                </div>
              </div>

              {/* Analytics Visual Progress Bars */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend Bars */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#182030] border border-slate-800 shadow-lg space-y-4">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    {copy.overview.revenueTitle}
                  </h2>
                  <div className="space-y-3">
                    {revenueTrendBars.map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">{item.label}</span>
                          <span className="font-mono font-bold text-[#D9822B]">
                            {item.value.toLocaleString()} {copy.common.currency}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#10151F] border border-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#D9822B] to-amber-400 transition-all duration-500"
                            style={{ width: `${Math.max(4, item.pct)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Popular Services Bars */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#182030] border border-slate-800 shadow-lg space-y-4">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    {copy.overview.servicesTitle}
                  </h2>
                  <div className="space-y-3">
                    {popularServicesBars.map((srv) => (
                      <div key={srv.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-200 font-semibold truncate">{srv.name}</span>
                          <span className="font-mono text-slate-300 shrink-0">
                            {srv.count} {copy.overview.bookingsLabel} ({srv.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#10151F] border border-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(4, Number(srv.percentage) || 0)}%`,
                              backgroundColor: srv.color || '#D9822B',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Activity Feed (Today's Queue across all Barbers) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      {copy.overview.liveFeedTitle}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">{copy.overview.liveFeedSubtitle}</p>
                  </div>
                </div>

                {todayQueue.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-[#182030] border border-slate-800 text-xs text-slate-400">
                    {copy.overview.emptyQueue}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayQueue.map((appt) => (
                      <AdminAppointmentCard
                        key={appt.id}
                        appt={appt}
                        copy={copy}
                        isAr={isAr}
                        showDate={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ============================================================ */}
          {/* TAB 2: GLOBAL APPOINTMENTS MANAGEMENT */}
          {/* ============================================================ */}
          {activeTab === 'appointments' && (
            <section className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <span>{copy.appointments.title}</span>
                    {loadingAppointments && (
                      <span className="w-4 h-4 border-2 border-[#D9822B]/30 border-t-[#D9822B] rounded-full animate-spin" />
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{copy.appointments.subtitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#182030] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    ⬇ {copy.appointments.exportCsv}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#182030] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    🖨 {copy.appointments.exportPdf}
                  </button>
                </div>
              </div>

              {/* Filter Toolbar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#182030] border border-slate-800 space-y-4 print:hidden">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <input
                    type="search"
                    value={apptSearch}
                    onChange={(e) => {
                      setLoadingAppointments(true);
                      setApptSearch(e.target.value);
                    }}
                    placeholder={copy.appointments.searchPlaceholder}
                    className="md:col-span-5 min-h-[42px] px-4 py-2 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm text-start placeholder-slate-500 outline-none focus:border-[#D9822B]"
                  />

                  <div className="md:col-span-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLoadingAppointments(true);
                        setApptDateMode('today');
                      }}
                      className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                        apptDateMode === 'today'
                          ? 'bg-[#D9822B] text-white border-[#D9822B]'
                          : 'bg-[#10151F] text-slate-300 border-slate-700'
                      }`}
                    >
                      {copy.appointments.todayFilter}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoadingAppointments(true);
                        setApptDateMode('all');
                      }}
                      className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                        apptDateMode === 'all'
                          ? 'bg-[#D9822B] text-white border-[#D9822B]'
                          : 'bg-[#10151F] text-slate-300 border-slate-700'
                      }`}
                    >
                      {copy.appointments.allDatesFilter}
                    </button>
                    <input
                      type="date"
                      value={apptCustomDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setLoadingAppointments(true);
                          setApptCustomDate(e.target.value);
                          setApptDateMode('custom');
                        }
                      }}
                      className="min-h-[42px] px-3 py-1.5 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B]"
                    />
                  </div>

                  <select
                    value={apptBarberId}
                    onChange={(e) => {
                      setLoadingAppointments(true);
                      setApptBarberId(e.target.value);
                    }}
                    className="md:col-span-3 min-h-[42px] px-3 py-2 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B]"
                  >
                    <option value="all">{copy.appointments.allBarbers}</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                  {statusFilterKeys.map((stKey) => {
                    const active = apptStatus === stKey;
                    return (
                      <button
                        key={stKey}
                        type="button"
                        onClick={() => {
                          setLoadingAppointments(true);
                          setApptStatus(stKey);
                        }}
                        className={`min-h-[34px] px-3 py-1 rounded-full text-xs font-bold border transition cursor-pointer ${
                          active
                            ? 'bg-[#D9822B]/20 border-[#D9822B] text-[#D9822B]'
                            : 'bg-[#10151F] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {copy.statuses[stKey]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {appointments.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-[#182030] border border-slate-800 text-xs text-slate-400">
                  {copy.appointments.empty}
                </div>
              ) : (
                <div className="space-y-3.5">
                  {appointments.map((appt) => (
                    <AdminAppointmentCard
                      key={appt.id}
                      appt={appt}
                      copy={copy}
                      isAr={isAr}
                      showDate
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ============================================================ */}
          {/* TAB 3: SERVICES CATALOG CRUD */}
          {/* ============================================================ */}
          {activeTab === 'services' && (
            <section className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">{copy.servicesTab.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{copy.servicesTab.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenServiceModal(null)}
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-[#D9822B] hover:bg-[#e4903a] text-white text-xs font-bold shadow cursor-pointer shrink-0"
                >
                  {copy.servicesTab.addBtn}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    className="rounded-2xl bg-[#182030] border border-slate-800 overflow-hidden shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-40 bg-[#10151F] border-b border-slate-800 overflow-hidden">
                        <img
                          src={getImageUrl(srv.image_url, DEFAULT_GALLERY_PLACEHOLDER)}
                          alt={srv.name}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => handleImageFallbackError(e, DEFAULT_GALLERY_PLACEHOLDER)}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 start-3 px-2.5 py-0.5 rounded-full bg-black/70 border border-slate-700 text-[10px] font-bold uppercase tracking-wider text-[#D9822B]">
                          {srv.category}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleServiceActive(srv)}
                          className={`absolute top-3 end-3 px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer transition ${
                            srv.is_active
                              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                              : 'bg-red-950/90 border-red-500/50 text-red-300'
                          }`}
                        >
                          {srv.is_active ? copy.servicesTab.active : copy.servicesTab.inactive}
                        </button>
                      </div>

                      <div className="p-4 sm:p-5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-bold text-white leading-snug">
                            {isAr
                              ? (srv.title_ar || srv.title_fr || srv.name)
                              : (srv.title_fr || srv.title_ar || srv.name)}
                          </h3>
                          <span className="text-base font-black font-mono text-[#D9822B] shrink-0">
                            {srv.price} {copy.common.currency}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-slate-400">
                          ⏱ {srv.duration_minutes || srv.duration} {copy.common.minutes}
                        </div>
                        {(srv.description_fr || srv.description_ar || srv.description) && (
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {isAr
                              ? (srv.description_ar || srv.description_fr || srv.description)
                              : (srv.description_fr || srv.description_ar || srv.description)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenServiceModal(srv)}
                        className="min-h-[36px] flex-1 px-3 py-1.5 rounded-xl bg-[#10151F] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                      >
                        {copy.actions.edit}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteConfirm({ isOpen: true, type: 'service', id: srv.id })
                        }
                        className="min-h-[36px] px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold cursor-pointer"
                      >
                        {copy.actions.delete}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============================================================ */}
          {/* TAB 4: BARBERS & SPATIE ROLE MANAGEMENT */}
          {/* ============================================================ */}
          {activeTab === 'team' && (
            <section className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">{copy.teamTab.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{copy.teamTab.subtitle}</p>
                </div>
              </div>

              {/* Barbers Profiles Grid */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#D9822B]">
                  {copy.teamTab.barbersSection} ({barbers.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {barbers.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-2xl bg-[#182030] border border-slate-800 overflow-hidden shadow-lg flex flex-col justify-between"
                    >
                      <div>
                        <img
                          src={getImageUrl(b.image_url, DEFAULT_AVATAR_PLACEHOLDER)}
                          alt={b.name}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => handleImageFallbackError(e, DEFAULT_AVATAR_PLACEHOLDER)}
                          className="w-full h-44 object-cover object-top"
                        />
                        <div className="p-4 sm:p-5 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-white text-base truncate">{b.name}</h4>
                            <span className="text-[#D9822B] text-xs font-bold shrink-0">
                              ★ {b.rating}
                            </span>
                          </div>
                          <div className="text-xs text-[#D9822B] font-semibold">
                            {b.specialty} • {b.experience}
                          </div>
                          {b.bio && <p className="text-xs text-slate-400 line-clamp-2">{b.bio}</p>}
                        </div>
                      </div>

                      <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenBarberModal(b)}
                          className="min-h-[36px] flex-1 px-3 py-1.5 rounded-xl bg-[#10151F] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                        >
                          {copy.actions.edit}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirm({ isOpen: true, type: 'barber', id: b.id })
                          }
                          className="min-h-[36px] px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold cursor-pointer"
                        >
                          {isAr ? 'حذف من الفريق' : 'Supprimer du staff'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spatie Roles Directory */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#D9822B]">
                  {copy.teamTab.rolesSection}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {usersList.map((u) => {
                    const roleNames = Array.isArray(u.roles)
                      ? u.roles.map((r) => (typeof r === 'string' ? r : r.name))
                      : [];
                    return (
                      <div
                        key={u.id}
                        className="p-4 rounded-2xl bg-[#182030] border border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={getImageUrl(
                              u.avatar || u.profile_photo_url,
                              DEFAULT_AVATAR_PLACEHOLDER
                            )}
                            alt={u.name}
                            onError={(e) => handleImageFallbackError(e, DEFAULT_AVATAR_PLACEHOLDER)}
                            className="w-10 h-10 rounded-full object-cover border border-[#D9822B]/40 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate">{u.name}</div>
                            <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {roleNames.map((r) => (
                                <span
                                  key={r}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    r === 'admin'
                                      ? 'bg-red-500/20 text-red-300'
                                      : r === 'employe'
                                        ? 'bg-amber-500/20 text-[#D9822B]'
                                        : 'bg-emerald-500/20 text-emerald-300'
                                  }`}
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {u.id === user?.id ? (
                          <span className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold shrink-0 inline-flex items-center gap-1.5">
                            {isAr ? '🔒 المدير الرئيسي (أنت)' : '🔒 Admin Principal (Vous)'}
                          </span>
                        ) : (
                          <select
                            aria-label={copy.teamTab.syncRolesTitle}
                            value={roleNames[0] || 'client'}
                            disabled={updatingRoleUserId === u.id}
                            onChange={(e) => handleSingleRoleChange(u, e.target.value)}
                            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#10151F] hover:bg-slate-800 border border-[#D9822B]/40 text-[#D9822B] text-base sm:text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50 focus:outline-none focus:border-[#D9822B]"
                          >
                            {['client', 'employe', 'admin'].map((roleOption) => (
                              <option key={roleOption} value={roleOption} className="bg-[#10151F] text-white">
                                {copy.teamTab.roleLabels[roleOption]} ({roleOption})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ============================================================ */}
          {/* TAB 6: REVIEWS MODERATION */}
          {/* ============================================================ */}
          {activeTab === 'reviews' && (
            <section className="space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <span>{copy.reviewsTab.title}</span>
                    {reviewsLoading && (
                      <span className="w-4 h-4 border-2 border-[#D9822B]/30 border-t-[#D9822B] rounded-full animate-spin" />
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{copy.reviewsTab.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={loadReviews}
                  className="min-h-[38px] px-4 py-2 rounded-xl bg-[#182030] hover:bg-slate-800 border border-[#D9822B]/40 text-[#D9822B] text-xs font-bold transition cursor-pointer shrink-0"
                >
                  ↻ {copy.refreshBtn}
                </button>
              </div>

              {/* Status Count Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'all', countKey: 'total', label: copy.reviewsTab.filterAll, color: 'text-white', bg: 'bg-[#182030] border-slate-800' },
                  { key: 'pending', countKey: 'pending', label: copy.reviewsTab.filterPending, color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/30' },
                  { key: 'approved', countKey: 'approved', label: copy.reviewsTab.filterApproved, color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/30' },
                  { key: 'rejected', countKey: 'rejected', label: copy.reviewsTab.filterRejected, color: 'text-red-300', bg: 'bg-red-500/10 border-red-500/30' },
                ].map(({ key, countKey, label, color, bg }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setReviewStatusFilter(key)}
                    className={`p-3 sm:p-4 rounded-2xl border text-start transition cursor-pointer ${bg} ${
                      reviewStatusFilter === key ? 'ring-2 ring-[#D9822B]/80 shadow-lg' : 'hover:border-slate-700'
                    }`}
                  >
                    <div className={`text-2xl sm:text-3xl font-black font-mono ${color}`}>
                      {reviewCounts[countKey] ?? 0}
                    </div>
                    <div className="text-[11px] text-slate-400 font-semibold mt-1 truncate">{label}</div>
                  </button>
                ))}
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: 'all', label: copy.reviewsTab.filterAll },
                  { key: 'pending', label: copy.reviewsTab.filterPending },
                  { key: 'approved', label: copy.reviewsTab.filterApproved },
                  { key: 'rejected', label: copy.reviewsTab.filterRejected },
                ].map(({ key, label }) => {
                  const active = reviewStatusFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setReviewStatusFilter(key)}
                      className={`min-h-[34px] px-3.5 py-1 rounded-full text-xs font-bold border transition cursor-pointer ${
                        active
                          ? 'bg-[#D9822B]/20 border-[#D9822B] text-[#D9822B]'
                          : 'bg-[#10151F] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Review Cards List */}
              {(() => {
                const filtered =
                  reviewStatusFilter === 'all'
                    ? reviews
                    : reviews.filter((r) => {
                        const st = r.status || (r.is_approved ? 'approved' : 'pending');
                        return st === reviewStatusFilter;
                      });

                if (filtered.length === 0) {
                  return (
                    <div className="p-10 text-center rounded-2xl bg-[#182030] border border-slate-800 text-xs text-slate-400">
                      {copy.reviewsTab.empty}
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {filtered.map((review) => {
                      const stars = Number(review.rating) || 0;
                      const avatarUrl = getImageUrl(
                        review.client_avatar || review.client?.avatar || review.user?.avatar || review.client?.profile_photo_path,
                        DEFAULT_AVATAR_PLACEHOLDER
                      );
                      const statusStyles = {
                        pending: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
                        approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                        rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
                      };
                      const statusLabels = {
                        pending: copy.reviewsTab.pendingBadge,
                        approved: copy.reviewsTab.approvedBadge,
                        rejected: copy.reviewsTab.rejectedBadge,
                      };
                      const reviewStatus = review.status || (review.is_approved ? 'approved' : 'pending');
                      const isBusy = updatingReviewId === review.id;

                      return (
                        <article
                          key={review.id}
                          className="bg-[#182030] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg hover:border-[#D9822B]/30 transition"
                        >
                          {/* Top Row: Client Avatar + Name + Barber + Status Badge */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <img
                                src={avatarUrl}
                                alt={review.client_name || review.user?.name || 'Client'}
                                onError={(e) => handleImageFallbackError(e, DEFAULT_AVATAR_PLACEHOLDER)}
                                className="w-11 h-11 rounded-full object-cover border border-[#D9822B]/40 shrink-0"
                              />
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-sm sm:text-base font-bold text-white truncate">
                                    {review.client_name || review.user?.name || (isAr ? 'زبون' : 'Client')}
                                  </h3>
                                  {review.city && (
                                    <span className="px-2 py-0.5 rounded bg-[#10151F] border border-slate-800 text-[11px] text-slate-300">
                                      📍 {review.city}
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                  {review.barber_name && (
                                    <span className="px-2 py-0.5 rounded-md bg-[#10151F] border border-slate-800 text-slate-200 font-semibold">
                                      💈 {review.barber_name}
                                    </span>
                                  )}
                                  {review.service_used && (
                                    <span className="px-2 py-0.5 rounded-md bg-[#D9822B]/15 border border-[#D9822B]/35 text-[#D9822B] font-semibold">
                                      ✂️ {review.service_used}
                                    </span>
                                  )}
                                  <span className="font-mono text-[11px] text-slate-500">
                                    {review.created_at}
                                  </span>
                                </div>

                                {/* Star Rating */}
                                <div className="flex items-center gap-1 pt-1">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <span
                                      key={s}
                                      className={`text-base leading-none select-none ${
                                        s <= stars ? 'text-[#D9822B]' : 'text-slate-700'
                                      }`}
                                    >
                                      ★
                                    </span>
                                  ))}
                                  <span className="text-xs font-mono font-bold text-slate-400 ms-1.5">
                                    {stars}/5
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Current Status Badge */}
                            <span
                              className={`inline-flex items-center self-start px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${
                                statusStyles[reviewStatus] || statusStyles.pending
                              }`}
                            >
                              {statusLabels[reviewStatus] || reviewStatus}
                            </span>
                          </div>

                          {/* Review Comment Text */}
                          <div className="p-3.5 rounded-xl bg-[#10151F] border border-slate-800/80 space-y-2">
                            <p className="text-sm text-slate-200 leading-relaxed italic">
                              "{review.comment}"
                            </p>
                            {review.comment_ar && review.comment_ar !== review.comment && (
                              <p dir="rtl" className="text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2 font-arabic">
                                "{review.comment_ar}"
                              </p>
                            )}
                          </div>

                          {/* Moderation Actions Bar */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                            {reviewStatus !== 'approved' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleReviewStatus(review.id, 'approved')}
                                className="min-h-[36px] px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#10151F] text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow"
                              >
                                {isBusy && <span className="w-3 h-3 border-2 border-[#10151F]/30 border-t-[#10151F] rounded-full animate-spin" />}
                                <span>{copy.reviewsTab.approveBtn}</span>
                              </button>
                            )}

                            {reviewStatus !== 'rejected' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleReviewStatus(review.id, 'rejected')}
                                className="min-h-[36px] px-4 py-1.5 rounded-xl border border-amber-500/40 hover:bg-amber-500/10 text-amber-400 text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                              >
                                <span>{copy.reviewsTab.rejectBtn}</span>
                              </button>
                            )}

                            {reviewStatus !== 'pending' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleReviewStatus(review.id, 'pending')}
                                className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-[#10151F] hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                              >
                                <span>{copy.reviewsTab.pendingBtn}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setReviewDeleteConfirm(review.id)}
                              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold transition cursor-pointer disabled:opacity-50 ms-auto"
                            >
                              {copy.reviewsTab.deleteBtn}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                );
              })()}
            </section>
          )}
          {/* ============================================================ */}
          {/* TAB 5: CLIENTS & LOYALTY MANAGEMENT */}
          {/* ============================================================ */}
          {activeTab === 'clients' && (
            <section className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">{copy.clientsTab.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{copy.clientsTab.subtitle}</p>
                </div>
                <input
                  type="search"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder={copy.clientsTab.searchPlaceholder}
                  className="w-full sm:w-80 min-h-[42px] px-4 py-2 rounded-xl bg-[#182030] border border-slate-700 text-white text-base sm:text-sm text-start placeholder-slate-500 outline-none focus:border-[#D9822B]"
                />
              </div>

              {clientUsers.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-[#182030] border border-slate-800 text-xs text-slate-400">
                  {copy.clientsTab.empty}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clientUsers.map((client) => {
                    const isBlocked = (client.status || 'active') === 'blocked';
                    const pts = Number(client.loyalty_points || 0);
                    const madEq = Math.floor(pts / 10);

                    return (
                      <div
                        key={client.id}
                        className={`p-4 sm:p-5 rounded-2xl bg-[#182030] border transition shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isBlocked ? 'border-red-500/40 opacity-85' : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={getImageUrl(
                              client.avatar || client.profile_photo_url,
                              DEFAULT_AVATAR_PLACEHOLDER
                            )}
                            alt={client.name}
                            onError={(e) => handleImageFallbackError(e, DEFAULT_AVATAR_PLACEHOLDER)}
                            className="w-12 h-12 rounded-full object-cover border border-[#D9822B]/40 shrink-0"
                          />
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                                {client.name}
                              </h3>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isBlocked
                                    ? 'bg-red-500/15 border-red-500/40 text-red-300'
                                    : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                }`}
                              >
                                {isBlocked
                                  ? copy.clientsTab.statusBlocked
                                  : copy.clientsTab.statusActive}
                              </span>
                            </div>

                            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                              {client.phone && (
                                <a href={`tel:${client.phone}`} className="font-mono hover:text-[#D9822B]">
                                  📞 <span dir="ltr">{client.phone}</span>
                                </a>
                              )}
                              <span>
                                🗓 {client.appointments_count ?? 0} {copy.clientsTab.bookingsCount}
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-[#D9822B]">
                              ★ {copy.clientsTab.loyaltyLabel} :{' '}
                              <span className="font-mono font-bold">
                                {pts} {copy.common.pts}
                              </span>{' '}
                              ({madEq} {copy.common.currency})
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={togglingUserId === client.id}
                          onClick={() => handleToggleUserStatus(client)}
                          className={`min-h-[38px] px-4 py-2 rounded-xl text-xs font-bold border shrink-0 transition cursor-pointer disabled:opacity-50 ${
                            isBlocked
                              ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/40 text-red-300'
                          }`}
                        >
                          {isBlocked ? copy.clientsTab.unblockBtn : copy.clientsTab.blockBtn}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* ============================================================ */}
      {/* MOBILE & TABLET FIXED BOTTOM NAVIGATION BAR (6 tabs) */}
      {/* ============================================================ */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[#141B29]/95 backdrop-blur-xl border-t border-slate-800/90 px-1 py-1.5 shadow-[0_-10px_30px_rgba(0,0,0,0.65)] print:hidden"
        aria-label="Admin Bottom Navigation"
      >
        <div className="max-w-2xl mx-auto grid grid-cols-6 gap-0.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[52px] px-0.5 py-1.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                  isActive ? 'text-[#D9822B] bg-[#D9822B]/10' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="text-[10px] font-bold truncate max-w-full px-0.5">
                  {item.label}
                </span>
                {item.badge !== null && item.badge !== undefined && (
                  <span className="absolute top-1 end-2 w-4 h-4 rounded-full bg-[#D9822B] text-white text-[9px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ============================================================ */}
      {/* MODALS */}
      {/* ============================================================ */}

      {/* 1. Service Add / Edit Modal (Bilingual FR / AR) */}
      {serviceModal.isOpen && (
        <div
          dir={dir}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <form
            onSubmit={handleSaveService}
            className="w-full max-w-lg rounded-2xl bg-[#182030] border border-slate-700 p-6 space-y-4 shadow-2xl text-start"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {serviceModal.item ? copy.servicesTab.modalEdit : copy.servicesTab.modalAdd}
              </h3>
              <button
                type="button"
                onClick={() => setServiceModal({ isOpen: false, item: null })}
                className="text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Bilingual Titles: Titre (FR) & العنوان (AR) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {copy.servicesTab.titleFrLabel} <span className="text-[#D9822B]">*</span>
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  placeholder="ex: Coupe Signature Barberoza"
                  value={serviceForm.title_fr}
                  onChange={(e) => setServiceForm((p) => ({ ...p, title_fr: e.target.value }))}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {copy.servicesTab.titleArLabel} <span className="text-[#D9822B]">*</span>
                </label>
                <input
                  type="text"
                  required
                  dir="rtl"
                  placeholder="مثال: حلاقة باربيروزا المتميزة"
                  value={serviceForm.title_ar}
                  onChange={(e) => setServiceForm((p) => ({ ...p, title_ar: e.target.value }))}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B]"
                />
              </div>
            </div>

            {/* Category, Duration & Price */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {copy.servicesTab.categoryLabel}
                </label>
                <select
                  value={serviceForm.category}
                  onChange={(e) => setServiceForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B]"
                >
                  {Object.entries(copy.servicesTab.categories).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {copy.servicesTab.durationLabel}
                </label>
                <input
                  type="number"
                  min={10}
                  max={180}
                  required
                  value={serviceForm.duration}
                  onChange={(e) => setServiceForm((p) => ({ ...p, duration: e.target.value }))}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm font-mono outline-none focus:border-[#D9822B]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {copy.servicesTab.priceLabel}
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm((p) => ({ ...p, price: e.target.value }))}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm font-mono outline-none focus:border-[#D9822B]"
                />
              </div>
            </div>

            {/* Bilingual Descriptions: Description (FR) & الوصف (AR) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {copy.servicesTab.descFrLabel}
                </label>
                <textarea
                  rows={2}
                  dir="ltr"
                  placeholder="Description en français..."
                  value={serviceForm.description_fr}
                  onChange={(e) => setServiceForm((p) => ({ ...p, description_fr: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B] resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {copy.servicesTab.descArLabel}
                </label>
                <textarea
                  rows={2}
                  dir="rtl"
                  placeholder="الوصف بالعربية..."
                  value={serviceForm.description_ar}
                  onChange={(e) => setServiceForm((p) => ({ ...p, description_ar: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B] resize-none"
                />
              </div>
            </div>

            {/* Image URL & File */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  {copy.servicesTab.imageUrlLabel}
                </label>
                <input
                  type="text"
                  placeholder="services/haircut.jpg"
                  value={serviceForm.image_url}
                  onChange={(e) => setServiceForm((p) => ({ ...p, image_url: e.target.value }))}
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B]"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  {copy.servicesTab.imageFileLabel}
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    setServiceForm((p) => ({ ...p, imageFile: e.target.files?.[0] || null }))
                  }
                  className="w-full text-xs text-slate-300 file:me-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#D9822B]/20 file:text-[#D9822B] file:font-bold"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
              <input
                type="checkbox"
                checked={serviceForm.is_active}
                onChange={(e) => setServiceForm((p) => ({ ...p, is_active: e.target.checked }))}
                className="rounded bg-[#10151F] text-[#D9822B]"
              />
              <span>{copy.servicesTab.activeLabel}</span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setServiceModal({ isOpen: false, item: null })}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                {copy.actions.close}
              </button>
              <button
                type="submit"
                disabled={serviceSaving}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-[#D9822B] hover:bg-[#e4903a] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {copy.actions.save}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Edit Barber Modal */}
      {barberModal.isOpen && (
        <div
          dir={dir}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <form
            onSubmit={handleSaveBarber}
            className="w-full max-w-md rounded-2xl bg-[#182030] border border-slate-700 p-6 space-y-4 shadow-2xl text-start"
          >
            <h3 className="text-lg font-bold text-white">{copy.teamTab.editBarberTitle}</h3>

            <div>
              <label className="block text-xs text-slate-300 mb-1">{copy.teamTab.fullName}</label>
              <input
                type="text"
                required
                value={barberForm.name}
                onChange={(e) => setBarberForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">{copy.teamTab.specialty}</label>
                <input
                  type="text"
                  required
                  value={barberForm.specialty}
                  onChange={(e) => setBarberForm((p) => ({ ...p, specialty: e.target.value }))}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B]"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  {copy.teamTab.experience}
                </label>
                <input
                  type="text"
                  required
                  value={barberForm.experience}
                  onChange={(e) => setBarberForm((p) => ({ ...p, experience: e.target.value }))}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">{copy.teamTab.photoUrl}</label>
                <input
                  type="text"
                  value={barberForm.image_url}
                  onChange={(e) => setBarberForm((p) => ({ ...p, image_url: e.target.value }))}
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B]"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">{copy.teamTab.photoFile}</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    setBarberForm((p) => ({ ...p, imageFile: e.target.files?.[0] || null }))
                  }
                  className="w-full text-xs text-slate-300 file:me-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#D9822B]/20 file:text-[#D9822B] file:font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">{copy.teamTab.bio}</label>
              <textarea
                rows={2}
                value={barberForm.bio}
                onChange={(e) => setBarberForm((p) => ({ ...p, bio: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBarberModal({ isOpen: false, item: null })}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                {copy.actions.close}
              </button>
              <button
                type="submit"
                disabled={barberSaving}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-[#D9822B] hover:bg-[#e4903a] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {copy.actions.save}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Delete Service / Barber Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div
          dir={dir}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#182030] border border-slate-700 p-6 space-y-4 shadow-2xl text-start">
            <h3 className="text-base font-bold text-white">
              {deleteConfirm.type === 'service'
                ? copy.actions.confirmDeleteService
                : copy.actions.confirmDeleteBarber}
            </h3>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, type: null, id: null })}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                {copy.actions.close}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
              >
                {copy.actions.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Delete Review Confirmation Modal */}
      {reviewDeleteConfirm !== null && (
        <div
          dir={dir}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#182030] border border-slate-700 p-6 space-y-4 shadow-2xl text-start">
            <h3 className="text-base font-bold text-white">
              {copy.reviewsTab.confirmDelete}
            </h3>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewDeleteConfirm(null)}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                {copy.actions.close}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteReview(reviewDeleteConfirm)}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
              >
                {copy.actions.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TOAST FEEDBACK */}
      {/* ============================================================ */}
      {toast && (
        <div className="fixed top-4 end-4 z-[60] max-w-sm print:hidden">
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
    </div>
  );
}
