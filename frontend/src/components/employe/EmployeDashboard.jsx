import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import BrandLogo from '../common/BrandLogo';
import LanguageSwitcher from '../common/LanguageSwitcher';
import AvatarUploader from '../common/AvatarUploader';
import {
  getEmployeSchedule,
  updateEmployeeAppointmentStatus,
  updateWorkingHours,
  updateEmployeeAvailability,
  updateEmployeeProfile,
} from '../../api/barberApi';
import { getTodayDateString, getRelativeScheduleStatus } from '../../utils/dateTime';

const DEFAULT_WORKING_HOURS = [
  { day_of_week: 0, is_day_off: true, start_time: '09:30', end_time: '20:30', break_start: '13:00', break_end: '14:00' },
  { day_of_week: 1, is_day_off: false, start_time: '09:30', end_time: '20:30', break_start: '13:00', break_end: '14:00' },
  { day_of_week: 2, is_day_off: false, start_time: '09:30', end_time: '20:30', break_start: '13:00', break_end: '14:00' },
  { day_of_week: 3, is_day_off: false, start_time: '09:30', end_time: '20:30', break_start: '13:00', break_end: '14:00' },
  { day_of_week: 4, is_day_off: false, start_time: '09:30', end_time: '20:30', break_start: '13:00', break_end: '14:00' },
  { day_of_week: 5, is_day_off: false, start_time: '09:30', end_time: '20:30', break_start: '13:00', break_end: '14:00' },
  { day_of_week: 6, is_day_off: false, start_time: '09:30', end_time: '20:30', break_start: '13:00', break_end: '14:00' },
];

const DASHBOARD_COPY = {
  fr: {
    brandSubtitle: 'Espace Barbier Pro',
    languageLabel: 'Langue',
    logout: 'Déconnexion',
    welcome: 'Bonjour',
    welcomeSubtitle: 'Pilotez votre fauteuil en direct, gérez la file d’attente et ajustez vos horaires.',
    liveSync: 'Synchro en direct • 15s',
    refreshBtn: 'Actualiser',
    nav: {
      queue: 'Planning du Jour',
      calendar: 'Calendrier',
      hours: 'Mes Horaires',
      profile: 'Mon Profil',
    },
    availability: {
      active: 'En service',
      paused: 'En pause / Congé',
      activeHint: 'Visible à la réservation client en ligne',
      pausedHint: 'Masqué temporairement des réservations publiques',
      cardTitle: 'Disponibilité en Direct',
      cardSubtitle: 'Basculez entre Service Actif et Pause / Congé instantanément.',
      updatedToast: 'Disponibilité mise à jour.',
    },
    kpi: {
      totalToday: 'RDV du Jour',
      totalHint: 'Rendez-vous programmés',
      waitingQueue: 'Clients en Attente',
      waitingHint: 'Prestations restantes',
      waitingDone: 'File d’attente vide',
      completedToday: 'Coupes Terminées',
      completedHint: 'Effectuées aujourd’hui',
      revenueToday: 'Recette du Jour (MAD)',
      revenueHint: 'Encaissé sur coupes terminées',
    },
    spotlight: {
      titleInChair: 'AU FAUTEUIL ACTUELLEMENT',
      titleNext: 'PROCHAIN CLIENT DANS LA FILE',
      emptyTitle: 'Aucun client en attente pour le moment',
      emptyDesc: 'Les nouvelles réservations apparaîtront ici automatiquement toutes les 15 secondes.',
      callClient: 'Appeler',
      loyaltyDiscount: 'Fidélité : -{amount} MAD (-{pts} pts)',
      clientNotes: 'Note client',
      startChair: 'Au fauteuil',
    },
    actions: {
      complete: '✓ Terminer',
      confirm: 'Confirmer',
      noShow: 'Absent (No-Show)',
      cancel: 'Annuler',
      start: 'Démarrer',
      confirmNoShowTitle: 'Confirmer l’absence (No-Show)',
      confirmNoShowDesc: 'Marquer {client} comme absent pour le créneau de {time} ? Le client suivant dans la file avancera immédiatement.',
      confirmCancelTitle: 'Annuler ce rendez-vous',
      confirmCancelDesc: 'Annuler le rendez-vous de {client} à {time} ? Si le client a utilisé des points de fidélité, ils lui seront automatiquement remboursés.',
      keepBtn: 'Conserver',
      confirmBtn: 'Confirmer',
    },
    statuses: {
      pending: 'En attente',
      confirmed: 'Confirmé',
      in_progress: 'Au fauteuil',
      completed: 'Terminé',
      cancelled: 'Annulé',
      no_show: 'Absent',
    },
    queueTab: {
      title: 'File d’attente & Planning du Jour',
      subtitle: 'Actualisation automatique toutes les 15 secondes pour votre poste.',
      searchPlaceholder: 'Rechercher par nom, téléphone ou service...',
      emptyTitle: 'Aucun rendez-vous prévu aujourd’hui',
      emptyDesc: 'Vos rendez-vous réservés en ligne s’afficheront ici en temps réel.',
    },
    calendarTab: {
      title: 'Calendrier & Historique des RDV',
      subtitle: 'Consultez vos créneaux par date et filtrez selon le statut.',
      today: 'Aujourd’hui',
      tomorrow: 'Demain',
      customDate: 'Date personnalisée',
      allStatuses: 'Tous',
      emptyTitle: 'Aucun rendez-vous pour cette sélection',
      emptyDesc: 'Sélectionnez une autre date ou modifiez le filtre de statut.',
      appointmentsCount: '{count} rendez-vous trouvé(s)',
    },
    hoursTab: {
      title: 'Horaires de Travail & Pauses',
      subtitle: 'Définissez vos plages d’ouverture quotidiennes et votre pause déjeuner.',
      days: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
      working: 'Ouvert',
      dayOff: 'Jour de repos',
      shiftStart: 'Début de service',
      shiftEnd: 'Fin de service',
      breakStart: 'Début pause déjeuner',
      breakEnd: 'Fin pause déjeuner',
      saveBtn: 'Enregistrer mes horaires',
      saving: 'Enregistrement...',
      savedSuccess: 'Horaires et pauses enregistrés avec succès.',
    },
    profileTab: {
      title: 'Mon Profil Barbier',
      subtitle: 'Mettez à jour votre photo publique, votre spécialité et votre présentation.',
      avatarTitle: 'Photo de profil publique',
      avatarSubtitle: 'Synchronisée automatiquement avec votre fiche barbier visible par les clients.',
      nameLabel: 'Nom complet',
      emailLabel: 'Adresse e-mail',
      phoneLabel: 'Téléphone',
      specialtyLabel: 'Spécialité barbier',
      specialtyPlaceholder: 'Ex: Master Fade & Barbe',
      bioLabel: 'Biographie / Présentation',
      bioPlaceholder: 'Décrivez votre savoir-faire, votre expérience et vos spécialités...',
      saveBtn: 'Mettre à jour mon profil',
      saving: 'Mise à jour...',
      savedSuccess: 'Profil barbier mis à jour et synchronisé.',
      avatarSuccess: 'Photo de profil mise à jour et synchronisée.',
    },
    common: {
      currency: 'MAD',
      minutes: 'min',
      pts: 'pts',
    },
  },
  ar: {
    brandSubtitle: 'فضاء الحلاق المحترف',
    languageLabel: 'اللغة',
    logout: 'تسجيل الخروج',
    welcome: 'مرحباً،',
    welcomeSubtitle: 'تتبع مواعيدك مباشرة، نظّم قائمة الانتظار واضبط أوقات عملك بسهولة.',
    liveSync: 'تحديث مباشر • 15 ثانية',
    refreshBtn: 'تحديث',
    nav: {
      queue: 'برنامج اليوم',
      calendar: 'التقويم',
      hours: 'أوقات العمل',
      profile: 'ملفي الشخصي',
    },
    availability: {
      active: 'في الخدمة',
      paused: 'في استراحة / عطلة',
      activeHint: 'ظاهر للزبناء في الحجز المباشر',
      pausedHint: 'مخفي مؤقتاً من صفحة الحجز العامة',
      cardTitle: 'حالة التوفر المباشرة',
      cardSubtitle: 'بدّل فوراً بين وضع العمل أو الاستراحة / العطلة.',
      updatedToast: 'تم تحديث حالة التوفر بنجاح.',
    },
    kpi: {
      totalToday: 'مواعيد اليوم',
      totalHint: 'المواعيد المبرمجة',
      waitingQueue: 'في الانتظار',
      waitingHint: 'حصص متبقية اليوم',
      waitingDone: 'لا يوجد انتظار حالياً',
      completedToday: 'القصات المكتملة',
      completedHint: 'أُنجزت اليوم',
      revenueToday: 'مداخيل اليوم (درهم)',
      revenueHint: 'مجموع المواعيد المكتملة',
    },
    spotlight: {
      titleInChair: 'في الكرسي الآن',
      titleNext: 'الزبون التالي في الانتظار',
      emptyTitle: 'لا يوجد زبون في الانتظار حالياً',
      emptyDesc: 'ستظهر الحجوزات الجديدة هنا تلقائياً كل 15 ثانية.',
      callClient: 'اتصال',
      loyaltyDiscount: 'خصم الولاء: -{amount} درهم (-{pts} نقطة)',
      clientNotes: 'ملاحظة الزبون',
      startChair: 'بدء الحصة',
    },
    actions: {
      complete: '✓ إنهاء',
      confirm: 'تأكيد',
      noShow: 'متغيب',
      cancel: 'إلغاء',
      start: 'بدء الآن',
      confirmNoShowTitle: 'تأكيد الغياب',
      confirmNoShowDesc: 'تحديد {client} كمتغيب في موعد {time}؟ سيتقدم الزبون التالي تلقائياً.',
      confirmCancelTitle: 'إلغاء الموعد',
      confirmCancelDesc: 'إلغاء موعد {client} على الساعة {time}؟ إذا استعمل الزبون نقاط الولاء فسيتم إرجاعها تلقائياً.',
      keepBtn: 'تراجع',
      confirmBtn: 'تأكيد',
    },
    statuses: {
      pending: 'قيد الانتظار',
      confirmed: 'مؤكد',
      in_progress: 'في الكرسي',
      completed: 'مكتمل',
      cancelled: 'ملغى',
      no_show: 'متغيب',
    },
    queueTab: {
      title: 'قائمة الانتظار وبرنامج اليوم',
      subtitle: 'تحديث تلقائي كل 15 ثانية لجدول عملك.',
      searchPlaceholder: 'ابحث بالاسم أو الهاتف أو الخدمة...',
      emptyTitle: 'لا توجد مواعيد مبرمجة اليوم',
      emptyDesc: 'ستظهر الحجوزات القادمة هنا فور حجزها.',
    },
    calendarTab: {
      title: 'التقويم وسجل المواعيد',
      subtitle: 'تصفح مواعيدك حسب التاريخ وقم بالتصفية حسب الحالة.',
      today: 'اليوم',
      tomorrow: 'غداً',
      customDate: 'تاريخ مخصص',
      allStatuses: 'الكل',
      emptyTitle: 'لا توجد مواعيد مطابقة',
      emptyDesc: 'جرّب اختيار تاريخ آخر أو تغيير حالة التصفية.',
      appointmentsCount: 'تم العثور على {count} موعد',
    },
    hoursTab: {
      title: 'أوقات العمل وفترات الراحة',
      subtitle: 'حدّد ساعات العمل اليومية وفترة الاستراحة.',
      days: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
      working: 'أيام العمل',
      dayOff: 'يوم راحة',
      shiftStart: 'بداية الدوام',
      shiftEnd: 'نهاية الدوام',
      breakStart: 'بداية الاستراحة',
      breakEnd: 'نهاية الاستراحة',
      saveBtn: 'حفظ أوقات العمل',
      saving: 'جاري الحفظ...',
      savedSuccess: 'تم حفظ أوقات العمل وفترات الراحة بنجاح.',
    },
    profileTab: {
      title: 'ملفي الشخصي كحلاق',
      subtitle: 'حدّث صورتك العامة وتخصصك والنبذة التعريفية.',
      avatarTitle: 'صورة الملف الشخصي العامة',
      avatarSubtitle: 'تتزامن تلقائياً مع ملفك الظاهر للزبناء.',
      nameLabel: 'الاسم الكامل',
      emailLabel: 'البريد الإلكتروني',
      phoneLabel: 'رقم الهاتف',
      specialtyLabel: 'التخصص',
      specialtyPlaceholder: 'مثال: Master Fade & Barbe',
      bioLabel: 'النبذة التعريفية',
      bioPlaceholder: 'عرّف بخبرتك ومهاراتك في الحلاقة والعناية...',
      saveBtn: 'تحديث الملف الشخصي',
      saving: 'جاري التحديث...',
      savedSuccess: 'تم تحديث ملف الحلاق بنجاح.',
      avatarSuccess: 'تم تحديث الصورة ومزامنتها بنجاح.',
    },
    common: {
      currency: 'درهم',
      minutes: 'دقيقة',
      pts: 'نقطة',
    },
  },
};

function addDaysToDateStr(dateStr, offsetDays) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + offsetDays);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeWorkingHoursList(rawHours) {
  const byDay = new Map();
  if (Array.isArray(rawHours)) {
    rawHours.forEach((item) => {
      byDay.set(Number(item.day_of_week), item);
    });
  }

  return DEFAULT_WORKING_HOURS.map((fallback) => {
    const existing = byDay.get(fallback.day_of_week);
    if (!existing) return { ...fallback };
    return {
      day_of_week: fallback.day_of_week,
      is_day_off: Boolean(existing.is_day_off),
      start_time: existing.start_time ? String(existing.start_time).slice(0, 5) : fallback.start_time,
      end_time: existing.end_time ? String(existing.end_time).slice(0, 5) : fallback.end_time,
      break_start: existing.break_start ? String(existing.break_start).slice(0, 5) : '',
      break_end: existing.break_end ? String(existing.break_end).slice(0, 5) : '',
    };
  });
}

function AppointmentStatusBadge({ status, copy }) {
  const styles = {
    pending: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
    confirmed: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
    in_progress: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 animate-pulse',
    completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
    no_show: 'bg-slate-700/60 text-slate-300 border-slate-600/60',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${
        styles[status] || styles.pending
      }`}
    >
      {copy.statuses[status] || status}
    </span>
  );
}

function AppointmentCard({
  appt,
  copy,
  isAr,
  updatingId,
  clockNow,
  onStatusChange,
  onRequestConfirmAction,
  showDateBadge = false,
}) {
  const isBusy = updatingId === appt.id;
  const isFinalized = ['completed', 'cancelled', 'no_show'].includes(appt.status);
  const relStatus = getRelativeScheduleStatus(
    appt.appointment_date,
    appt.start_time,
    appt.end_time,
    clockNow,
    appt.status
  );

  const clientName = appt.client?.name || (isAr ? 'زبون' : 'Client');
  const clientInitial = clientName.trim().charAt(0).toUpperCase() || 'C';
  const hasDiscount = Number(appt.discount_amount || 0) > 0 || Number(appt.points_used || 0) > 0;

  return (
    <article
      className={`p-4 sm:p-5 rounded-2xl bg-[#182030] border transition-all shadow-lg space-y-4 ${
        appt.status === 'in_progress'
          ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
          : 'border-slate-800 hover:border-[#D9822B]/40'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Time Badge + Client Initial */}
          <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-[#10151F] border border-slate-800 shrink-0 min-w-[74px]">
            <span className="text-sm font-black font-mono text-[#D9822B] leading-none">
              {appt.start_time}
            </span>
            <span className="text-[10px] font-mono text-slate-400 mt-1">
              → {appt.end_time}
            </span>
          </div>

          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#D9822B]/20 border border-[#D9822B]/40 text-[#D9822B] text-xs font-black flex items-center justify-center shrink-0">
                {clientInitial}
              </div>
              <h3 className="text-base font-bold text-white truncate">{clientName}</h3>
              {showDateBadge && (
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px]">
                  {appt.appointment_date}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {appt.service?.name && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#D9822B]/15 border border-[#D9822B]/35 text-[#D9822B] font-semibold">
                  <span>✂️</span>
                  <span>{appt.service.name}</span>
                  {appt.service?.duration && (
                    <span className="opacity-80">
                      ({appt.service.duration} {copy.common.minutes})
                    </span>
                  )}
                </span>
              )}

              {appt.client?.phone && (
                <a
                  href={`tel:${appt.client.phone}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#10151F] border border-slate-700/80 text-slate-200 hover:text-[#D9822B] hover:border-[#D9822B]/50 font-mono transition"
                >
                  <span>📞</span>
                  <span dir="ltr">{appt.client.phone}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Status & Total Price */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
          <AppointmentStatusBadge status={appt.status} copy={copy} />

          <div className="text-end">
            <div className="flex items-baseline justify-end gap-1.5">
              {hasDiscount && (
                <span className="text-xs font-mono text-slate-500 line-through">
                  {appt.subtotal_price} {copy.common.currency}
                </span>
              )}
              <span className="text-base sm:text-lg font-black font-mono text-white">
                {appt.total_price} {copy.common.currency}
              </span>
            </div>
            {hasDiscount && (
              <div className="text-[11px] font-semibold text-emerald-400">
                {copy.spotlight.loyaltyDiscount
                  .replace('{amount}', String(appt.discount_amount || 0))
                  .replace('{pts}', String(appt.points_used || 0))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Relative Time Notice & Client Special Notes */}
      {(relStatus || appt.notes) && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          {relStatus && !isFinalized && (
            <span className={`px-2.5 py-1 rounded-lg text-[11px] ${relStatus.badgeClass}`}>
              {relStatus.label}
            </span>
          )}
          {appt.notes && (
            <div className="w-full sm:w-auto flex-1 px-3 py-2 rounded-xl bg-[#10151F] border border-amber-500/20 text-xs text-amber-200/90">
              <span className="font-bold text-[#D9822B]">{copy.spotlight.clientNotes} : </span>
              <span>« {appt.notes} »</span>
            </div>
          )}
        </div>
      )}

      {/* 1-Click Status Actions */}
      {!isFinalized && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          {appt.status === 'pending' && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onStatusChange(appt.id, 'confirmed')}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              {copy.actions.confirm}
            </button>
          )}

          {appt.status !== 'in_progress' && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onStatusChange(appt.id, 'in_progress')}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#D9822B]/15 hover:bg-[#D9822B]/25 border border-[#D9822B]/40 text-[#D9822B] text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              ✂️ {copy.spotlight.startChair}
            </button>
          )}

          <button
            type="button"
            disabled={isBusy}
            onClick={() => onStatusChange(appt.id, 'completed')}
            className="min-h-[38px] px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition cursor-pointer disabled:opacity-50"
          >
            {copy.actions.complete}
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRequestConfirmAction(appt, 'no_show')}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            {copy.actions.noShow}
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRequestConfirmAction(appt, 'cancelled')}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            {copy.actions.cancel}
          </button>
        </div>
      )}
    </article>
  );
}

export default function EmployeDashboard() {
  const { user, logout, updateUser } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';
  const copy = DASHBOARD_COPY[isAr ? 'ar' : 'fr'];
  const navigate = useNavigate();

  const todayStr = getTodayDateString();
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'calendar' | 'hours' | 'profile'

  // Live Queue & Barber State
  const [barberProfile, setBarberProfile] = useState(null);
  const [dailyStats, setDailyStats] = useState({
    total_today: 0,
    completed_today: 0,
    remaining_queue: 0,
    revenue_today: 0,
    next_client: null,
  });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [queueSearch, setQueueSearch] = useState('');
  const [clockNow, setClockNow] = useState(() => new Date());

  // Tab 2 Calendar State
  const [calendarDate, setCalendarDate] = useState(todayStr);
  const [calendarStatus, setCalendarStatus] = useState('all');
  const [calendarAppointments, setCalendarAppointments] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Tab 3 Working Hours & Live Availability State
  const [isBarberActive, setIsBarberActive] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [workingHours, setWorkingHours] = useState(DEFAULT_WORKING_HOURS);
  const [savingHours, setSavingHours] = useState(false);

  // Tab 4 Barber Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    specialty: '',
    bio: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const profileInitializedRef = useRef(false);

  // Action & Modal State
  const [updatingId, setUpdatingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    appointment: null,
    targetStatus: null,
  });

  // Toast State
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

  // Hydrate barber profile & working hours from API response
  const syncBarberMetadata = useCallback((barber) => {
    if (!barber) return;
    setBarberProfile(barber);
    if (typeof barber.is_active === 'boolean') {
      setIsBarberActive(barber.is_active);
    }
    if (Array.isArray(barber.working_hours) && barber.working_hours.length > 0) {
      setWorkingHours(normalizeWorkingHoursList(barber.working_hours));
    }
    if (!profileInitializedRef.current) {
      profileInitializedRef.current = true;
      setProfileForm({
        name: barber.name || '',
        phone: user?.phone || '',
        specialty: barber.specialty || '',
        bio: barber.bio || '',
      });
    }
  }, [user?.phone]);

  // Load Today's Queue + KPI stats via GET /api/employe/schedule?date=YYYY-MM-DD
  const loadTodaySchedule = useCallback(async (silent = false) => {
    if (!silent) setLoadingQueue(true);
    try {
      const res = await getEmployeSchedule({ date: getTodayDateString() });
      const list = Array.isArray(res?.data) ? res.data : [];
      setTodayAppointments(list);
      if (res?.daily_stats) {
        setDailyStats(res.daily_stats);
      }
      if (res?.barber) {
        syncBarberMetadata(res.barber);
      }
    } catch (err) {
      if (!silent) {
        showToast(
          err?.response?.data?.message ||
            (isAr ? 'تعذر تحميل برنامج اليوم.' : 'Impossible de charger le planning du jour.'),
          'error'
        );
      }
    } finally {
      setLoadingQueue(false);
    }
  }, [isAr, showToast, syncBarberMetadata]);

  // Load Calendar Tab appointments via GET /api/employe/schedule?date=YYYY-MM-DD
  const loadCalendarSchedule = useCallback(async (dateValue, statusValue, silent = false) => {
    if (!silent) setLoadingCalendar(true);
    try {
      const params = { date: dateValue };
      if (statusValue && statusValue !== 'all') {
        params.status = statusValue;
      }
      const res = await getEmployeSchedule(params);
      setCalendarAppointments(Array.isArray(res?.data) ? res.data : []);
      if (res?.daily_stats) {
        setDailyStats(res.daily_stats);
      }
    } catch (err) {
      if (!silent) {
        showToast(
          err?.response?.data?.message ||
            (isAr ? 'تعذر تحميل مواعيد هذا التاريخ.' : 'Erreur lors du chargement du calendrier.'),
          'error'
        );
      }
    } finally {
      setLoadingCalendar(false);
    }
  }, [isAr, showToast]);

  // Initial Schedule Load + 15s Live Queue Polling (when tab is visible)
  useEffect(() => {
    let cancelled = false;
    getEmployeSchedule({ date: getTodayDateString() })
      .then((res) => {
        if (cancelled) return;
        setTodayAppointments(Array.isArray(res?.data) ? res.data : []);
        if (res?.daily_stats) setDailyStats(res.daily_stats);
        if (res?.barber) syncBarberMetadata(res.barber);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingQueue(false);
      });

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadTodaySchedule(true);
        setClockNow(new Date());
      }
    }, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadTodaySchedule(true);
        setClockNow(new Date());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadTodaySchedule, syncBarberMetadata]);

  // Fetch Calendar Tab whenever switching to calendar or changing its date/status
  useEffect(() => {
    if (activeTab !== 'calendar') return;
    let cancelled = false;
    const params = { date: calendarDate };
    if (calendarStatus !== 'all') params.status = calendarStatus;

    getEmployeSchedule(params)
      .then((res) => {
        if (cancelled) return;
        setCalendarAppointments(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingCalendar(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, calendarDate, calendarStatus]);

  // Status update handler (PATCH /api/employe/appointments/{id}/status)
  const handleStatusChange = async (appointmentId, newStatus) => {
    setUpdatingId(appointmentId);
    try {
      const res = await updateEmployeeAppointmentStatus(appointmentId, newStatus);
      const updated = res?.data;

      // Refresh both views silently
      await Promise.all([
        loadTodaySchedule(true),
        activeTab === 'calendar'
          ? loadCalendarSchedule(calendarDate, calendarStatus, true)
          : Promise.resolve(),
      ]);

      if (newStatus === 'completed') {
        const earned = Number(updated?.points_earned || 0);
        showToast(
          earned > 0
            ? isAr
              ? `✓ تم إنهاء الحصة واحتساب +${earned} نقطة ولاء للزبون.`
              : `✓ Prestation terminée ! +${earned} pts de fidélité crédités au client.`
            : isAr
              ? '✓ تم إنهاء الحصة بنجاح.'
              : '✓ Prestation terminée avec succès.'
        );
      } else {
        showToast(
          isAr
            ? `تم تحديث الحالة : ${copy.statuses[newStatus] || newStatus}`
            : `Statut mis à jour : ${copy.statuses[newStatus] || newStatus}`
        );
      }
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
          (isAr ? 'تعذر تحديث الحالة.' : 'Erreur lors de la mise à jour du statut.'),
        'error'
      );
    } finally {
      setUpdatingId(null);
      setConfirmModal({ isOpen: false, appointment: null, targetStatus: null });
    }
  };

  // Toggle Barber Live Status ("En service" vs "En pause / Congé")
  const handleToggleAvailability = async () => {
    if (togglingAvailability) return;
    const nextValue = !isBarberActive;
    setIsBarberActive(nextValue);
    setTogglingAvailability(true);
    try {
      const res = await updateEmployeeAvailability(nextValue);
      if (res?.barber) {
        syncBarberMetadata(res.barber);
      }
      showToast(copy.availability.updatedToast);
    } catch (err) {
      setIsBarberActive(!nextValue);
      showToast(
        err?.response?.data?.message ||
          (isAr ? 'تعذر تحديث الحالة.' : 'Impossible de modifier la disponibilité.'),
        'error'
      );
    } finally {
      setTogglingAvailability(false);
    }
  };

  // Save Weekly Working Hours (PUT /api/employe/working-hours)
  const handleSaveHours = async (e) => {
    e.preventDefault();
    setSavingHours(true);
    try {
      const payload = workingHours.map((wh) => ({
        day_of_week: wh.day_of_week,
        is_day_off: Boolean(wh.is_day_off),
        start_time: wh.start_time || '09:30',
        end_time: wh.end_time || '20:30',
        break_start: wh.break_start || null,
        break_end: wh.break_end || null,
      }));
      const res = await updateWorkingHours(payload, isBarberActive);
      if (res?.barber) {
        syncBarberMetadata(res.barber);
      }
      showToast(copy.hoursTab.savedSuccess);
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
          (isAr ? 'تعذر حفظ أوقات العمل.' : 'Erreur lors de la sauvegarde des horaires.'),
        'error'
      );
    } finally {
      setSavingHours(false);
    }
  };

  const handleHourFieldChange = (dayOfWeek, field, value) => {
    setWorkingHours((prev) =>
      prev.map((wh) => (wh.day_of_week === dayOfWeek ? { ...wh, [field]: value } : wh))
    );
  };

  // Save Barber Profile Specialty & Bio (PUT /api/employe/profile)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await updateEmployeeProfile({
        name: profileForm.name,
        phone: profileForm.phone,
        specialty: profileForm.specialty,
        bio: profileForm.bio,
      });
      if (res?.user && updateUser) {
        updateUser(res.user);
      }
      if (res?.barber) {
        setBarberProfile(res.barber);
      }
      showToast(copy.profileTab.savedSuccess);
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
          (isAr ? 'تعذر تحديث الملف الشخصي.' : 'Erreur lors de la mise à jour du profil.'),
        'error'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Spotlight appointment (either in_progress or next active today)
  const spotlightAppt = useMemo(() => {
    const inChair = todayAppointments.find((a) => a.status === 'in_progress');
    if (inChair) return inChair;
    const nextQueued = todayAppointments.find((a) => ['confirmed', 'pending'].includes(a.status));
    if (nextQueued) return nextQueued;
    return dailyStats.next_client || null;
  }, [todayAppointments, dailyStats.next_client]);

  // Filtered today's queue for Tab 1 search
  const filteredTodayAppointments = useMemo(() => {
    const q = queueSearch.trim().toLowerCase();
    if (!q) return todayAppointments;
    return todayAppointments.filter(
      (appt) =>
        appt.client?.name?.toLowerCase().includes(q) ||
        appt.client?.phone?.toLowerCase().includes(q) ||
        appt.service?.name?.toLowerCase().includes(q)
    );
  }, [todayAppointments, queueSearch]);

  // 7-day quick calendar chips
  const quickDates = useMemo(() => {
    const locale = isAr ? 'ar-MA' : 'fr-FR';
    return Array.from({ length: 7 }, (_, i) => {
      const value = addDaysToDateStr(todayStr, i);
      const [y, m, d] = value.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const label =
        i === 0
          ? copy.calendarTab.today
          : i === 1
            ? copy.calendarTab.tomorrow
            : dateObj.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
      return { value, label };
    });
  }, [todayStr, isAr, copy.calendarTab.today, copy.calendarTab.tomorrow]);

  const userAvatarUrl =
    user?.avatar ||
    barberProfile?.image_url ||
    (user?.profile_photo_url && !user.profile_photo_url.includes('ui-avatars.com')
      ? user.profile_photo_url
      : null);

  const userInitial = (barberProfile?.name || user?.name || 'B').trim().charAt(0).toUpperCase() || 'B';

  const navItems = useMemo(
    () => [
      {
        id: 'queue',
        label: copy.nav.queue,
        badge: dailyStats.remaining_queue > 0 ? dailyStats.remaining_queue : null,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        id: 'calendar',
        label: copy.nav.calendar,
        badge: null,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        id: 'hours',
        label: copy.nav.hours,
        badge: null,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        ),
      },
      {
        id: 'profile',
        label: copy.nav.profile,
        badge: null,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
      },
    ],
    [copy.nav, dailyStats.remaining_queue]
  );

  const calendarStatuses = [
    { key: 'all', label: copy.calendarTab.allStatuses },
    { key: 'pending', label: copy.statuses.pending },
    { key: 'confirmed', label: copy.statuses.confirmed },
    { key: 'in_progress', label: copy.statuses.in_progress },
    { key: 'completed', label: copy.statuses.completed },
    { key: 'cancelled', label: copy.statuses.cancelled },
    { key: 'no_show', label: copy.statuses.no_show },
  ];

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
                — SHOP —
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleAvailability}
            disabled={togglingAvailability}
            className={`w-full min-h-[40px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 transition cursor-pointer disabled:opacity-60 ${
              isBarberActive
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-red-500/15 border-red-500/40 text-red-300'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isBarberActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                }`}
              />
              <span className="truncate">
                {isBarberActive ? copy.availability.active : copy.availability.paused}
              </span>
            </span>
            <span className="text-[10px] opacity-80">{isBarberActive ? '🟢' : '🔴'}</span>
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

        {/* Sidebar Footer: FR | العربية Switcher + Barber Card + Logout */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400 font-medium">{copy.languageLabel}</span>
            <LanguageSwitcher variant="pills" />
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#182030] border border-slate-800 text-start">
            <div className="w-9 h-9 rounded-full bg-[#10151F] border border-[#D9822B] text-[#D9822B] font-bold text-sm flex items-center justify-center overflow-hidden shrink-0">
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt={user?.name || 'Barber'} className="w-full h-full object-cover" />
              ) : (
                userInitial
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {barberProfile?.name || user?.name}
              </div>
              <div className="text-[11px] text-[#D9822B] truncate">
                {barberProfile?.specialty || copy.brandSubtitle}
              </div>
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
                <img src={userAvatarUrl} alt={user?.name || 'Barber'} className="w-full h-full object-cover" />
              ) : (
                userInitial
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {barberProfile?.name || user?.name}
              </div>
              <div className="text-[10px] font-semibold text-[#D9822B] uppercase tracking-wider truncate">
                BARBEROZA SHOP • {isBarberActive ? '🟢' : '🔴'}
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
          {/* Welcome Header + Live Polling Controls */}
          <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {copy.welcome}{' '}
                <span className="text-[#D9822B]">{barberProfile?.name || user?.name}</span>
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
                  loadTodaySchedule(false);
                  if (activeTab === 'calendar') {
                    loadCalendarSchedule(calendarDate, calendarStatus, false);
                  }
                }}
                className="min-h-[38px] px-4 py-2 rounded-xl bg-[#182030] hover:bg-slate-800 border border-[#D9822B]/40 text-[#D9822B] text-xs font-bold transition cursor-pointer"
              >
                ↻ {copy.refreshBtn}
              </button>
            </div>
          </section>

          {/* Top 4 KPI Summary Banner */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Today's Appointments */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#182030] border border-slate-800 hover:border-[#D9822B]/40 transition shadow-lg">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span className="truncate">{copy.kpi.totalToday}</span>
                <span className="text-sky-400">📅</span>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-white">
                {dailyStats.total_today ?? 0}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 truncate">{copy.kpi.totalHint}</div>
            </div>

            {/* 2. Clients Waiting in Queue */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#182030] border border-slate-800 hover:border-[#D9822B]/40 transition shadow-lg">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span className="truncate">{copy.kpi.waitingQueue}</span>
                <span className="text-[#D9822B]">⏳</span>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-[#D9822B]">
                {dailyStats.remaining_queue ?? 0}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 truncate">
                {(dailyStats.remaining_queue ?? 0) > 0 ? copy.kpi.waitingHint : copy.kpi.waitingDone}
              </div>
            </div>

            {/* 3. Completed Cuts Today */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#182030] border border-slate-800 hover:border-[#D9822B]/40 transition shadow-lg">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span className="truncate">{copy.kpi.completedToday}</span>
                <span className="text-emerald-400">✂️</span>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                {dailyStats.completed_today ?? 0}
              </div>
              <div className="mt-1 text-[11px] text-emerald-400/90 truncate">
                {copy.kpi.completedHint}
              </div>
            </div>

            {/* 4. Today's Revenue (MAD) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#182030] border border-[#D9822B]/35 hover:border-[#D9822B]/70 transition shadow-lg">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span className="truncate">{copy.kpi.revenueToday}</span>
                <span className="text-[#D9822B]">💰</span>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-white">
                {Number(dailyStats.revenue_today ?? 0)}{' '}
                <span className="text-xs font-bold text-[#D9822B]">{copy.common.currency}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400 truncate">{copy.kpi.revenueHint}</div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* TAB 1: LIVE CLIENT QUEUE & TODAY'S SCHEDULE */}
          {/* ============================================================ */}
          {activeTab === 'queue' && (
            <section className="space-y-6">
              {/* Highlighted Spotlight Card: Current / Next Client on Chair */}
              <div
                className={`p-5 sm:p-6 rounded-2xl border shadow-2xl transition-all ${
                  spotlightAppt?.status === 'in_progress'
                    ? 'bg-gradient-to-br from-[#182030] via-[#182030] to-emerald-950/30 border-emerald-500/70 ring-2 ring-emerald-500/25 animate-pulse'
                    : spotlightAppt
                      ? 'bg-gradient-to-br from-[#182030] via-[#182030] to-[#231b14] border-[#D9822B]/70 ring-1 ring-[#D9822B]/30'
                      : 'bg-[#182030] border-slate-800'
                }`}
              >
                {spotlightAppt ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            spotlightAppt.status === 'in_progress'
                              ? 'bg-emerald-400 animate-ping'
                              : 'bg-[#D9822B] animate-pulse'
                          }`}
                        />
                        <span
                          className={
                            spotlightAppt.status === 'in_progress' ? 'text-emerald-300' : 'text-[#D9822B]'
                          }
                        >
                          {spotlightAppt.status === 'in_progress'
                            ? copy.spotlight.titleInChair
                            : copy.spotlight.titleNext}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-[#10151F] border border-slate-700 font-mono text-xs font-bold text-[#D9822B]">
                          {spotlightAppt.start_time} – {spotlightAppt.end_time}
                        </span>
                        <AppointmentStatusBadge status={spotlightAppt.status} copy={copy} />
                      </div>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h2 className="text-xl sm:text-2xl font-black text-white">
                            {spotlightAppt.client?.name || 'Client'}
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#10151F] border border-[#D9822B]/40 text-[#D9822B] text-xs font-mono font-bold">
                            {spotlightAppt.total_price} {copy.common.currency}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {spotlightAppt.service?.name && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#D9822B]/15 border border-[#D9822B]/35 text-[#D9822B] font-semibold">
                              <span>✂️</span>
                              <span>{spotlightAppt.service.name}</span>
                              {spotlightAppt.service?.duration && (
                                <span>
                                  ({spotlightAppt.service.duration} {copy.common.minutes})
                                </span>
                              )}
                            </span>
                          )}

                          {spotlightAppt.client?.phone && (
                            <a
                              href={`tel:${spotlightAppt.client.phone}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#10151F] border border-slate-700 text-white hover:border-[#D9822B] hover:text-[#D9822B] font-mono transition"
                            >
                              <span>📞</span>
                              <span dir="ltr">{spotlightAppt.client.phone}</span>
                            </a>
                          )}

                          {Number(spotlightAppt.discount_amount || 0) > 0 && (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-semibold">
                              {copy.spotlight.loyaltyDiscount
                                .replace('{amount}', String(spotlightAppt.discount_amount))
                                .replace('{pts}', String(spotlightAppt.points_used || 0))}
                            </span>
                          )}
                        </div>

                        {spotlightAppt.notes && (
                          <div className="p-2.5 rounded-xl bg-[#10151F]/90 border border-amber-500/20 text-xs text-amber-200">
                            <span className="font-bold text-[#D9822B]">
                              {copy.spotlight.clientNotes} :{' '}
                            </span>
                            {spotlightAppt.notes}
                          </div>
                        )}
                      </div>

                      {/* Spotlight 1-Click Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {spotlightAppt.status === 'pending' && (
                          <button
                            type="button"
                            disabled={updatingId === spotlightAppt.id}
                            onClick={() => handleStatusChange(spotlightAppt.id, 'confirmed')}
                            className="min-h-[42px] px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 text-xs font-bold transition cursor-pointer"
                          >
                            {copy.actions.confirm}
                          </button>
                        )}

                        {spotlightAppt.status !== 'in_progress' &&
                          spotlightAppt.status !== 'completed' && (
                            <button
                              type="button"
                              disabled={updatingId === spotlightAppt.id}
                              onClick={() => handleStatusChange(spotlightAppt.id, 'in_progress')}
                              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#D9822B] hover:bg-[#e4903a] text-white text-xs font-bold shadow-lg shadow-[#D9822B]/25 transition cursor-pointer"
                            >
                              ✂️ {copy.spotlight.startChair}
                            </button>
                          )}

                        {spotlightAppt.status !== 'completed' && (
                          <button
                            type="button"
                            disabled={updatingId === spotlightAppt.id}
                            onClick={() => handleStatusChange(spotlightAppt.id, 'completed')}
                            className="min-h-[42px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition cursor-pointer"
                          >
                            {copy.actions.complete}
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={updatingId === spotlightAppt.id}
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              appointment: spotlightAppt,
                              targetStatus: 'no_show',
                            })
                          }
                          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                        >
                          {copy.actions.noShow}
                        </button>

                        <button
                          type="button"
                          disabled={updatingId === spotlightAppt.id}
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              appointment: spotlightAppt,
                              targetStatus: 'cancelled',
                            })
                          }
                          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold transition cursor-pointer"
                        >
                          {copy.actions.cancel}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 py-1">
                    <div className="w-12 h-12 rounded-2xl bg-[#10151F] border border-slate-800 flex items-center justify-center text-2xl shrink-0">
                      💈
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">{copy.spotlight.emptyTitle}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{copy.spotlight.emptyDesc}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Queue Header + Quick Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <span>{copy.queueTab.title}</span>
                    {loadingQueue && (
                      <span className="w-4 h-4 border-2 border-[#D9822B]/30 border-t-[#D9822B] rounded-full animate-spin" />
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{copy.queueTab.subtitle}</p>
                </div>

                <input
                  type="search"
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  placeholder={copy.queueTab.searchPlaceholder}
                  className="w-full sm:w-72 min-h-[42px] px-4 py-2 rounded-xl bg-[#182030] border border-slate-700 text-white text-base sm:text-sm text-start placeholder-slate-500 outline-none focus:border-[#D9822B]"
                />
              </div>

              {filteredTodayAppointments.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-[#182030] border border-slate-800 space-y-2">
                  <div className="text-3xl">🗓️</div>
                  <h3 className="text-base font-bold text-white">{copy.queueTab.emptyTitle}</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">{copy.queueTab.emptyDesc}</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredTodayAppointments.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appt={appt}
                      copy={copy}
                      isAr={isAr}
                      updatingId={updatingId}
                      clockNow={clockNow}
                      onStatusChange={handleStatusChange}
                      onRequestConfirmAction={(appointment, targetStatus) =>
                        setConfirmModal({ isOpen: true, appointment, targetStatus })
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ============================================================ */}
          {/* TAB 2: WEEKLY / DATE FILTER CALENDAR */}
          {/* ============================================================ */}
          {activeTab === 'calendar' && (
            <section className="space-y-5">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span>{copy.calendarTab.title}</span>
                  {loadingCalendar && (
                    <span className="w-4 h-4 border-2 border-[#D9822B]/30 border-t-[#D9822B] rounded-full animate-spin" />
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{copy.calendarTab.subtitle}</p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#182030] border border-slate-800 space-y-4">
                {/* Horizontal Quick Date Picker + Custom Date Input */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {quickDates.map((d) => {
                      const active = calendarDate === d.value;
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => {
                            setLoadingCalendar(true);
                            setCalendarDate(d.value);
                          }}
                          className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                            active
                              ? 'bg-[#D9822B] text-white border-[#D9822B] shadow-md shadow-[#D9822B]/20'
                              : 'bg-[#10151F] text-slate-300 border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label
                      htmlFor="calendar-custom-date"
                      className="text-xs text-slate-400 font-medium whitespace-nowrap"
                    >
                      {copy.calendarTab.customDate}
                    </label>
                    <input
                      id="calendar-custom-date"
                      type="date"
                      value={calendarDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setLoadingCalendar(true);
                          setCalendarDate(e.target.value);
                        }
                      }}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B]"
                    />
                  </div>
                </div>

                {/* Status Filter Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                  {calendarStatuses.map((st) => {
                    const active = calendarStatus === st.key;
                    return (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => {
                          setLoadingCalendar(true);
                          setCalendarStatus(st.key);
                        }}
                        className={`min-h-[34px] px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer border ${
                          active
                            ? 'bg-[#D9822B]/20 border-[#D9822B] text-[#D9822B]'
                            : 'bg-[#10151F] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-xs text-slate-400 font-medium">
                {copy.calendarTab.appointmentsCount.replace(
                  '{count}',
                  String(calendarAppointments.length)
                )}
              </div>

              {calendarAppointments.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-[#182030] border border-slate-800 space-y-2">
                  <div className="text-3xl">📆</div>
                  <h3 className="text-base font-bold text-white">{copy.calendarTab.emptyTitle}</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {copy.calendarTab.emptyDesc}
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {calendarAppointments.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appt={appt}
                      copy={copy}
                      isAr={isAr}
                      updatingId={updatingId}
                      clockNow={clockNow}
                      showDateBadge
                      onStatusChange={handleStatusChange}
                      onRequestConfirmAction={(appointment, targetStatus) =>
                        setConfirmModal({ isOpen: true, appointment, targetStatus })
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ============================================================ */}
          {/* TAB 3: WORKING HOURS & LIVE AVAILABILITY */}
          {/* ============================================================ */}
          {activeTab === 'hours' && (
            <section className="space-y-6">
              {/* Live Service Toggle Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#182030] border border-[#D9822B]/35 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{copy.availability.cardTitle}</h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        isBarberActive
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-500/15 border-red-500/40 text-red-300'
                      }`}
                    >
                      {isBarberActive ? `${copy.availability.active} 🟢` : `${copy.availability.paused} 🔴`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {isBarberActive ? copy.availability.activeHint : copy.availability.pausedHint}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isBarberActive}
                  disabled={togglingAvailability}
                  onClick={handleToggleAvailability}
                  className={`relative inline-flex items-center w-14 h-8 p-1 rounded-full shrink-0 transition-colors cursor-pointer disabled:opacity-50 ${
                    isBarberActive ? 'bg-emerald-500 justify-end' : 'bg-red-500/70 justify-start'
                  }`}
                >
                  <span className="w-6 h-6 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Weekly Working Hours Form */}
              <form
                onSubmit={handleSaveHours}
                className="p-5 sm:p-6 rounded-2xl bg-[#182030] border border-slate-800 shadow-xl space-y-5"
              >
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">{copy.hoursTab.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{copy.hoursTab.subtitle}</p>
                </div>

                <div className="space-y-3">
                  {workingHours.map((wh) => {
                    const dayName = copy.hoursTab.days[wh.day_of_week] || '';
                    return (
                      <div
                        key={wh.day_of_week}
                        className={`p-4 rounded-xl border transition ${
                          wh.is_day_off
                            ? 'bg-[#10151F]/60 border-slate-800/70 opacity-75'
                            : 'bg-[#10151F] border-slate-800'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Day Name & Open/Day-off Switch */}
                          <div className="flex items-center justify-between lg:w-52 shrink-0 gap-3">
                            <span className="text-sm font-bold text-white">{dayName}</span>
                            <button
                              type="button"
                              onClick={() => handleHourFieldChange(wh.day_of_week, 'is_day_off', !wh.is_day_off)}
                              className={`min-h-[34px] px-3 py-1 rounded-full text-xs font-bold border transition cursor-pointer ${
                                wh.is_day_off
                                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                                  : 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                              }`}
                            >
                              {wh.is_day_off ? copy.hoursTab.dayOff : copy.hoursTab.working}
                            </button>
                          </div>

                          {/* Time Inputs */}
                          {!wh.is_day_off && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                              <div>
                                <label className="block text-[11px] text-slate-400 mb-1">
                                  {copy.hoursTab.shiftStart}
                                </label>
                                <input
                                  type="time"
                                  required
                                  value={wh.start_time}
                                  onChange={(e) =>
                                    handleHourFieldChange(wh.day_of_week, 'start_time', e.target.value)
                                  }
                                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg bg-[#182030] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B]"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] text-slate-400 mb-1">
                                  {copy.hoursTab.shiftEnd}
                                </label>
                                <input
                                  type="time"
                                  required
                                  value={wh.end_time}
                                  onChange={(e) =>
                                    handleHourFieldChange(wh.day_of_week, 'end_time', e.target.value)
                                  }
                                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg bg-[#182030] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B]"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] text-slate-400 mb-1">
                                  {copy.hoursTab.breakStart}
                                </label>
                                <input
                                  type="time"
                                  value={wh.break_start || ''}
                                  onChange={(e) =>
                                    handleHourFieldChange(wh.day_of_week, 'break_start', e.target.value)
                                  }
                                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg bg-[#182030] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B]"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] text-slate-400 mb-1">
                                  {copy.hoursTab.breakEnd}
                                </label>
                                <input
                                  type="time"
                                  value={wh.break_end || ''}
                                  onChange={(e) =>
                                    handleHourFieldChange(wh.day_of_week, 'break_end', e.target.value)
                                  }
                                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg bg-[#182030] border border-slate-700 text-white text-base sm:text-sm outline-none focus:border-[#D9822B]"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingHours}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-[#D9822B] to-[#b86719] hover:from-[#e4903a] hover:to-[#D9822B] shadow-lg shadow-[#D9822B]/20 transition cursor-pointer disabled:opacity-50"
                  >
                    {savingHours ? copy.hoursTab.saving : copy.hoursTab.saveBtn}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* ============================================================ */}
          {/* TAB 4: BARBER PROFILE & PHOTO UPLOAD */}
          {/* ============================================================ */}
          {activeTab === 'profile' && (
            <section className="max-w-2xl">
              <form
                onSubmit={handleSaveProfile}
                className="p-5 sm:p-7 rounded-2xl bg-[#182030] border border-slate-800 shadow-xl space-y-5"
              >
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    {copy.profileTab.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">{copy.profileTab.subtitle}</p>
                </div>

                {/* Circular Avatar Uploader (syncs users.avatar & barbers.photo) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-[#10151F]/70 border border-slate-800/90">
                  <AvatarUploader
                    size="lg"
                    lang={lang}
                    currentImage={userAvatarUrl}
                    showHint
                    onUploadSuccess={(res) => {
                      const newUrl = res?.avatar_url;
                      if (newUrl) {
                        setBarberProfile((prev) =>
                          prev ? { ...prev, image_url: newUrl } : prev
                        );
                      }
                      showToast(copy.profileTab.avatarSuccess);
                    }}
                    onError={(msg) => showToast(msg, 'error')}
                  />
                  <div className="space-y-1 text-start">
                    <h3 className="text-sm font-bold text-white">{copy.profileTab.avatarTitle}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {copy.profileTab.avatarSubtitle}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {copy.profileTab.nameLabel}
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm text-start outline-none focus:border-[#D9822B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {copy.profileTab.phoneLabel}
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="+212 6 00 00 00 00"
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm text-start outline-none focus:border-[#D9822B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {copy.profileTab.emailLabel}
                    </label>
                    <input
                      type="email"
                      readOnly
                      value={user?.email || ''}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#10151F]/50 border border-slate-800 text-slate-400 text-base sm:text-sm text-start outline-none cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {copy.profileTab.specialtyLabel}
                    </label>
                    <input
                      type="text"
                      maxLength={255}
                      value={profileForm.specialty}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, specialty: e.target.value }))
                      }
                      placeholder={copy.profileTab.specialtyPlaceholder}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm text-start outline-none focus:border-[#D9822B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {copy.profileTab.bioLabel}
                  </label>
                  <textarea
                    rows={4}
                    maxLength={1000}
                    value={profileForm.bio}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    placeholder={copy.profileTab.bioPlaceholder}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#10151F] border border-slate-700 text-white text-base sm:text-sm text-start outline-none focus:border-[#D9822B] resize-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-[#D9822B] to-[#b86719] hover:from-[#e4903a] hover:to-[#D9822B] shadow-lg shadow-[#D9822B]/20 transition cursor-pointer disabled:opacity-50"
                  >
                    {savingProfile ? copy.profileTab.saving : copy.profileTab.saveBtn}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </main>

      {/* ============================================================ */}
      {/* MOBILE & TABLET FIXED BOTTOM NAVIGATION BAR (4 tabs) */}
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
      {/* CONFIRMATION MODAL FOR CANCEL / NO-SHOW */}
      {/* ============================================================ */}
      {confirmModal.isOpen && confirmModal.appointment && (
        <div
          dir={dir}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#182030] border border-slate-700 p-6 space-y-4 shadow-2xl text-start">
            <h3 className="text-lg font-bold text-white">
              {confirmModal.targetStatus === 'no_show'
                ? copy.actions.confirmNoShowTitle
                : copy.actions.confirmCancelTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {(confirmModal.targetStatus === 'no_show'
                ? copy.actions.confirmNoShowDesc
                : copy.actions.confirmCancelDesc
              )
                .replace('{client}', confirmModal.appointment.client?.name || 'Client')
                .replace('{time}', confirmModal.appointment.start_time || '')}
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setConfirmModal({ isOpen: false, appointment: null, targetStatus: null })
                }
                className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                {copy.actions.keepBtn}
              </button>
              <button
                type="button"
                disabled={updatingId === confirmModal.appointment.id}
                onClick={() =>
                  handleStatusChange(confirmModal.appointment.id, confirmModal.targetStatus)
                }
                className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {copy.actions.confirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
