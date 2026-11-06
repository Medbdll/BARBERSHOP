/**
 * Utility functions for date and time calculations in the user's local timezone.
 */

/**
 * Returns today's date formatted as YYYY-MM-DD in the local timezone.
 */
export const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns the current local time formatted as HH:mm.
 */
export const getCurrentTimeString = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Checks whether a given slot (HH:mm) on a given date (YYYY-MM-DD) is in the past
 * relative to the user's exact current local moment.
 *
 * @param {string} slotTime - "HH:mm" (e.g. "14:30")
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {boolean}
 */
export const isSlotInPast = (slotTime, dateStr) => {
  if (!slotTime || !dateStr) return false;
  const todayStr = getTodayDateString();

  if (dateStr < todayStr) return true;
  if (dateStr > todayStr) return false;

  // On today's date, compare slot time against current moment
  const [slotH, slotM] = slotTime.split(':').map(Number);
  const now = new Date();
  const currentH = now.getHours();
  const currentM = now.getMinutes();

  if (slotH < currentH) return true;
  if (slotH === currentH && slotM <= currentM) return true;
  return false;
};

/**
 * Computes a dynamic relative time status for today's appointment schedule.
 * e.g. "Starts in 10 mins", "Now / In Chair", "Overdue by 5 mins", "Coupe terminée"
 *
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {string} startTime - "HH:mm"
 * @param {string} endTime - "HH:mm"
 * @param {Date} now - current Date object
 * @param {string} status - appointment status ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')
 * @returns {{ type: string, label: string, badgeClass: string, isLive?: boolean }}
 */
export const getRelativeScheduleStatus = (dateStr, startTime, endTime, now = new Date(), status = null) => {
  if (!dateStr || !startTime) return null;

  // 1. Explicit terminal statuses
  if (status === 'completed') {
    return {
      type: 'completed',
      label: 'Coupe terminée',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    };
  }

  if (status === 'cancelled') {
    return {
      type: 'cancelled',
      label: 'Rendez-vous annulé',
      badgeClass: 'bg-red-500/10 text-red-400 border border-red-500/20',
    };
  }

  if (status === 'no_show') {
    return {
      type: 'no_show',
      label: 'Client non présenté (No-Show)',
      badgeClass: 'bg-gray-800 text-gray-400 border border-gray-700',
    };
  }

  // 2. Explicit In-Chair status
  if (status === 'in_progress') {
    return {
      type: 'in_chair',
      label: 'Au fauteuil / En cours',
      badgeClass: 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/60 font-bold animate-pulse shadow-sm shadow-emerald-500/30',
      isLive: true,
    };
  }

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  if (dateStr < todayStr) {
    return {
      type: 'past_date',
      label: `Passé (${dateStr})`,
      badgeClass: 'bg-gray-800 text-gray-400 border border-gray-700',
    };
  }

  // Detect Tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowYear = tomorrow.getFullYear();
  const tomorrowMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const tomorrowDay = String(tomorrow.getDate()).padStart(2, '0');
  const tomorrowStr = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;

  if (dateStr === tomorrowStr) {
    return {
      type: 'tomorrow',
      label: `Demain à ${startTime.slice(0, 5)}`,
      badgeClass: 'bg-amber-500/15 text-amber-300 border border-amber-500/40 font-semibold',
    };
  }

  if (dateStr > todayStr) {
    return {
      type: 'future_date',
      label: `Prévu le ${dateStr}`,
      badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
    };
  }

  // On today's date:
  const [startH, startM] = startTime.slice(0, 5).split(':').map(Number);
  const startMin = startH * 60 + startM;

  let endMin = startMin + 30;
  if (endTime) {
    const [endH, endM] = endTime.slice(0, 5).split(':').map(Number);
    endMin = endH * 60 + endM;
  }

  const nowMin = now.getHours() * 60 + now.getMinutes();

  // If currently within the slot duration and status is confirmed or pending
  if (nowMin >= startMin && nowMin < endMin) {
    const remaining = endMin - nowMin;
    return {
      type: 'in_progress',
      label: `Créneau en cours (${remaining} min rest.)`,
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 animate-pulse',
      isLive: true,
    };
  }

  // If now is past startMin and appointment hasn't started/completed -> Overdue!
  if (nowMin >= endMin) {
    const overdueMin = nowMin - startMin;
    return {
      type: 'overdue',
      label: `En retard de ${overdueMin} min`,
      badgeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/50 font-bold animate-pulse',
      isLive: true,
    };
  }

  // Upcoming today
  if (nowMin < startMin) {
    const diff = startMin - nowMin;
    if (diff <= 60) {
      return {
        type: 'starting_soon',
        label: `Commence dans ${diff} min`,
        badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/50 font-bold',
      };
    }
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return {
      type: 'upcoming_today',
      label: `Dans ${hours}h${mins > 0 ? ` ${mins}m` : ''}`,
      badgeClass: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
    };
  }

  return {
    type: 'passed_today',
    label: 'Créneau passé',
    badgeClass: 'bg-gray-800/60 text-gray-500 border border-gray-800',
  };
};

