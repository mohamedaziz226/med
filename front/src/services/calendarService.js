// src/services/calendarService.js
import api from './api';

/**
 * Service du calendrier partagé MedSecretariat.
 * API : /calendar/doctors/{doctor_id}/... (voir backend app/api/v1/calendar.py)
 */
const WEEKDAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const weekdayLabel = (index) => WEEKDAYS_FR[index] ?? String(index);

const toFrontendAvailability = (a) => ({
  id: a.id,
  doctorId: a.doctorId ?? a.doctor_id,
  weekday: a.weekday ?? null,
  date: a.date ?? null,
  startTime: a.startTime ?? a.start_time,
  endTime: a.endTime ?? a.end_time,
  isActive: a.isActive ?? a.is_active ?? true,
});

const toFrontendBlocked = (b) => ({
  id: b.id,
  doctorId: b.doctorId ?? b.doctor_id,
  start: b.startTime ?? b.start_time,
  end: b.endTime ?? b.end_time,
  reason: b.reason ?? '',
});

export const calendarService = {
  /**
   * Grille hebdomadaire partagée (disponibilités + blocages + RDV).
   * GET /calendar/doctors/{doctorId}/calendar?start_date&end_date
   */
  async getCalendar(doctorId, startDate, endDate) {
    if (!doctorId) return { availability: [], blockedSlots: [], appointments: [] };
    const res = await api.get(`/calendar/doctors/${doctorId}/calendar`, {
      params: { start_date: startDate, end_date: endDate },
    });
    const data = res.data || {};
    return {
      availability: (data.availability || []).map(toFrontendAvailability),
      blockedSlots: (data.blockedSlots || data.blocked_slots || []).map(toFrontendBlocked),
      appointments: data.appointments || [],
    };
  },

  /**
   * Créneaux réellement libres d'un médecin (vision patient).
   * GET /calendar/doctors/{doctorId}/slots?start_date&end_date
   */
  async getAvailableSlots(doctorId, startDate, endDate, durationMinutes = 30) {
    if (!doctorId) return [];
    const res = await api.get(`/calendar/doctors/${doctorId}/slots`, {
      params: { start_date: startDate, end_date: endDate, duration_minutes: durationMinutes },
    });
    return (res.data || []).map((s) => ({ start: s.start, end: s.end }));
  },

  /** Disponibilités d'un médecin (staff). */
  async getAvailability(doctorId) {
    if (!doctorId) return [];
    const res = await api.get(`/calendar/doctors/${doctorId}/availability`);
    return (res.data || []).map(toFrontendAvailability);
  },

  /**
   * Tous les créneaux bloqués d'un médecin (staff).
   * GET /calendar/doctors/{doctorId}/blocked-slots — aucun paramètre de date requis
   * (contrairement à /calendar qui exige start_date et end_date).
   */
  async getBlockedSlots(doctorId) {
    if (!doctorId) return [];
    const res = await api.get(`/calendar/doctors/${doctorId}/blocked-slots`);
    return (res.data || []).map(toFrontendBlocked);
  },

  /** Créer une disponibilité (weekday OU date + horaires). */
  async createAvailability(doctorId, payload) {
    const body = {
      start_time: payload.startTime,
      end_time: payload.endTime,
    };
    if (payload.weekday !== null && payload.weekday !== undefined && payload.weekday !== '') {
      body.weekday = Number(payload.weekday);
    } else if (payload.date) {
      body.date = payload.date;
    }
    const res = await api.post(`/calendar/doctors/${doctorId}/availability`, body);
    return toFrontendAvailability(res.data);
  },

  /** Modifier une disponibilité. */
  async updateAvailability(id, payload) {
    const body = {};
    if (payload.startTime !== undefined) body.start_time = payload.startTime;
    if (payload.endTime !== undefined) body.end_time = payload.endTime;
    if (payload.isActive !== undefined) body.is_active = payload.isActive;
    const res = await api.patch(`/calendar/availability/${id}`, body);
    return toFrontendAvailability(res.data);
  },

  /** Supprimer une disponibilité. */
  async deleteAvailability(id) {
    await api.delete(`/calendar/availability/${id}`);
    return true;
  },

  /** Bloquer un créneau (start/end ISO). */
  async blockSlot(doctorId, payload) {
    const res = await api.post(`/calendar/doctors/${doctorId}/blocked-slots`, {
      start: payload.start,
      end: payload.end,
      reason: payload.reason || null,
    });
    return toFrontendBlocked(res.data);
  },

  /** Supprimer un créneau bloqué. */
  async unblockSlot(id) {
    await api.delete(`/calendar/blocked-slots/${id}`);
    return true;
  },
};

export default calendarService;