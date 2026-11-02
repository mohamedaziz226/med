// src/components/calendar/dateUtils.js
// Helpers de manipulation des dates en heure MÉTIER Africa/Tunis (UTC+1, pas
// d'heure d'été) — miroir de src/utils/timezone.js et du backend.
//
// Le backend stocke tout en instant UTC réel (ex: 09:00Z = 10:00 à Tunis).
// Pour que la grille positionne / affiche TOUJOURS l'heure métier —
// indépendamment du fuseau du navigateur — l'heure/minute/jour sont extraits
// directement via Intl.DateTimeFormat + timeZone 'Africa/Tunis', exactement
// comme formatTimeBusiness de src/utils/timezone.js. C'est garanti de rester
// identique à la liste « Rendez-vous de la journée ».
const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const BUSINESS_TIMEZONE = 'Africa/Tunis';

const datePartsInZone = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIMEZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  });
  const parts = {};
  dtf.formatToParts(d).forEach(({ type, value: v }) => {
    parts[type] = v;
  });
  return parts;
};

/** Extrait {year, month, day, hour, minute, weekday} en heure Africa/Tunis. */
const businessParts = (value) => {
  const p = datePartsInZone(value);
  if (!p) return null;
  const WEEKDAY_MAP = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const norm = (p.weekday || '').toLowerCase();
  let weekday = WEEKDAY_MAP.findIndex((w) => norm.startsWith(w.replace('.', '')));
  if (weekday < 0) weekday = new Date(value).getDay();
  return {
    year: Number(p.year),
    month: Number(p.month) - 1,
    day: Number(p.day),
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    second: Number(p.second),
    weekday,
  };
};

/**
 * « Maintenant » en heure Africa/Tunis : boucle sur un objet Date dont les
 * accesseurs locaux (~mur) expriment l'heure Tunis. Ne sert qu'à « Aujourd'hui ».
 */
export const businessNow = () => {
  const p = businessParts(new Date());
  if (!p) return new Date();
  return new Date(p.year, p.month, p.day, p.hour, p.minute, p.second);
};

export const toDate = (value) => {
  if (value == null || value === '') return businessNow();
  const p = businessParts(value);
  if (!p) return businessNow();
  // Date-mur dont getDay/getDate/getHours... renvoient l'heure Africa/Tunis.
  return new Date(p.year, p.month, p.day, p.hour, p.minute, p.second);
};

export const toIsoDate = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const addDays = (d, days) => {
  const copy = new Date(d.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
};

export const startOfWeek = (d) => {
  const copy = toDate(d);
  const offset = (copy.getDay() + 6) % 7; // lundi = 0
  copy.setDate(copy.getDate() - offset);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export const weekDays = (anchor) => {
  const monday = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
};

export const weekdayShort = (d) => DAY_LABELS[d.getDay()];

export const formatDayHeader = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  const monthNames = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
  ];
  return `${weekdayShort(d)} ${pad(d.getDate())} ${monthNames[d.getMonth()]}`;
};

/** Heure HH:MM en Africa/Tunis (sans dépendre du fuseau du navigateur). */
export const formatTime = (value) => {
  const p = businessParts(value);
  if (!p || (p.hour === 0 && p.minute === 0)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(p.hour)}:${pad(p.minute)}`;
};

/** Minutes depuis minuit en Africa/Tunis (position verticale sur la grille). */
export const minutesSinceMidnight = (value) => {
  const p = businessParts(value);
  if (!p) return 0;
  return p.hour * 60 + p.minute;
};

export const sameDay = (a, b) => {
  // a et b sont des « dates-mur » (issues de toDate) dont les accesseurs
  // exprimen déjà l'heure Africa/Tunis — comparer directement les getters.
  const da = a ? new Date(a) : null;
  const db = b ? new Date(b) : null;
  if (!da || !db) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};
