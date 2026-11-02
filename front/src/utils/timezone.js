// src/utils/timezone.js
// Fuseau métier du cabinet : Africa/Tunis (UTC+1, pas d'heure d'été).
//
// Convention (miroir du backend app/core/business_tz.py) :
//   - toute heure SAISIE sans fuseau (formulaire, datetime-local) représente
//     l'heure métier Africa/Tunis et est convertie en instant ISO UTC exact
//     avant envoi au backend ;
//   - tout AFFICHAGE convertit l'instant reçu vers l'heure Africa/Tunis,
//     indépendamment du fuseau du navigateur.
export const BUSINESS_TIMEZONE = 'Africa/Tunis';

const pad = (n) => String(n).padStart(2, '0');

const partsInZone = (date, options) => {
  const dtf = new Intl.DateTimeFormat('en-GB', { timeZone: BUSINESS_TIMEZONE, hour12: false, ...options });
  const parts = {};
  dtf.formatToParts(date).forEach(({ type, value }) => {
    parts[type] = value;
  });
  return parts;
};

// Décalage (ms) du fuseau métier pour un instant donné.
const tzOffsetMs = (date) => {
  const p = partsInZone(date, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const asUtc = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour) % 24, Number(p.minute), Number(p.second),
  );
  return asUtc - date.getTime();
};

/**
 * Convertit une heure murale métier ("2030-06-10", "10:00") en instant ISO UTC
 * exact ("2030-06-10T09:00:00.000Z" pour 10:00 Africa/Tunis).
 * Retourne null si la date est invalide.
 */
export const wallTimeToIsoUtc = (dateStr, timeStr = '09:00') => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const time = /^\d{2}:\d{2}(:\d{2})?$/.test(timeStr || '') ? timeStr : '09:00';
  // On devine d'abord "heure murale = UTC", puis on retire le décalage réel du
  // fuseau métier à cet instant pour obtenir le vrai instant UTC.
  const guess = new Date(`${dateStr}T${time.length === 5 ? `${time}:00` : time}Z`);
  if (Number.isNaN(guess.getTime())) return null;
  const offset = tzOffsetMs(guess);
  return new Date(guess.getTime() - offset).toISOString();
};

/**
 * Convertit une valeur de payload potentiellement naïve en instant ISO :
 *   - déjà consciente ("...Z", "...+01:00") → inchangée ;
 *   - naïve ("YYYY-MM-DDTHH:mm") → interprétée comme heure métier Africa/Tunis.
 */
export const toIsoInstant = (value) => {
  if (!value || typeof value !== 'string') return value;
  if (/[Zz]$|[+-]\d{2}:\d{2}$/.test(value)) return value;
  return wallTimeToIsoUtc(value.slice(0, 10), value.slice(11, 16)) ?? value;
};

/**
 * Valeur pour <input type="datetime-local"> : heure murale métier
 * ("YYYY-MM-DDTHH:mm") dérivée d'un instant ISO.
 */
export const isoToLocalInputValue = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = partsInZone(d, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

/** Date métier "YYYY-MM-DD". */
export const formatDateBusiness = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = partsInZone(d, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p.year}-${p.month}-${p.day}`;
};

/** Heure métier "HH:mm". */
export const formatTimeBusiness = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = partsInZone(d, { hour: '2-digit', minute: '2-digit' });
  return `${p.hour}:${p.minute}`;
};