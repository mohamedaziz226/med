// src/services/appointmentService.js
import api from './api';
import { patientService } from './patientService';
import { formatDateBusiness, formatTimeBusiness, toIsoInstant, wallTimeToIsoUtc } from '../utils/timezone';

// Statuts backend (enum) → libellés affichés dans l'interface
const STATUS_FR = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  rejected: 'Refusé',
  cancelled: 'Annulé',
  completed: 'Terminé',
  no_show: 'Absent',
};

const STATUS_BACKEND = {
  'En attente': 'pending',
  'Confirmé': 'confirmed',
  'Refusé': 'rejected',
  'Annulé': 'cancelled',
  'Terminé': 'completed',
  'Absent': 'no_show',
  pending: 'pending',
  confirmed: 'confirmed',
  rejected: 'rejected',
  cancelled: 'cancelled',
  completed: 'completed',
  no_show: 'no_show',
};

const formatDateFr = (date) => {
  // Heure métier Africa/Tunis, indépendamment du fuseau du navigateur.
  return formatDateBusiness(date);
};

const formatTimeFr = (date) => {
  return formatTimeBusiness(date);
};

const toFrontendAppointment = (apt, patientName) => ({
  id: apt.id,
  patientId: apt.patientId,
  doctorId: apt.doctorId,
  patientName: patientName || '',
  doctorName: apt.doctorName || '',
  date: formatDateFr(apt.scheduledAt),
  time: formatTimeFr(apt.scheduledAt),
  reason: apt.reason || '',
  notes: apt.notes || '',
  status: STATUS_FR[apt.status] || apt.status || '',
  scheduledAt: apt.scheduledAt,
  proposedAt: apt.proposedAt ?? apt.proposed_at ?? null,
  durationMinutes: apt.durationMinutes,
  createdAt: apt.createdAt,
});

/**
 * Construit l'instant ISO UTC exact pour une heure murale métier
 * (Africa/Tunis). "2030-06-10" + "10:00" → "2030-06-10T09:00:00.000Z",
 * de sorte que le backend stocke et ré-affiche bien 10:00 heure tunisienne.
 */
const buildScheduledAt = (date, time) => {
  if (!date) return null;
  return wallTimeToIsoUtc(date, time || '09:00');
};

export const appointmentService = {
  /**
   * Rendez-vous d'un médecin.
   * GET /appointments?doctor_id=...
   * Enrichit le nom du patient à partir de GET /patients (même scope).
   */
  async getAppointmentsByDoctor(doctorId) {
    if (!doctorId) return [];

    const [aptsRes, patients] = await Promise.all([
      api.get('/appointments', { params: { doctor_id: doctorId } }),
      patientService.getPatientsByDoctor(doctorId).catch(() => []),
    ]);

    const patientNames = new Map((patients || []).map((p) => [p.id, `${p.firstName} ${p.lastName}`]));

    return (aptsRes.data || []).map((apt) =>
      toFrontendAppointment(apt, patientNames.get(apt.patientId) || '')
    );
  },

  /**
   * Rendez-vous d'un patient.
   * GET /appointments?patient_id=...
   */
  async getAppointmentsByPatient(patientId) {
    if (!patientId) return [];
    const res = await api.get('/appointments', { params: { patient_id: patientId } });
    return (res.data || []).map((apt) => toFrontendAppointment(apt));
  },

  /**
   * Création d'un rendez-vous.
   * POST /appointments → payload conforme à AppointmentCreate.
   * data attendu : { patientId, doctorId, date, time, reason, notes?, durationMinutes? }
   */
  async createAppointment(data) {
    const scheduledAt = buildScheduledAt(data.date, data.time) || data.scheduledAt;

    if (!scheduledAt) {
      throw new Error('Une date est requise pour planifier le rendez-vous.');
    }

    const payload = {
      patient_id: data.patientId,
      doctor_id: data.doctorId,
      scheduled_at: scheduledAt,
      duration_minutes: data.durationMinutes || 30,
      reason: data.reason || null,
      notes: data.notes || null,
    };

    const res = await api.post('/appointments', payload);
    return toFrontendAppointment(res.data, data.patientName);
  },

  /**
   * Mise à jour d'un rendez-vous (date/heure/statut...).
   * PATCH /appointments/{id} → AppointmentUpdate
   */
  async updateAppointment(id, updateData) {
    const payload = {};
    if (updateData.date && updateData.time) {
      payload.scheduled_at = buildScheduledAt(updateData.date, updateData.time);
      payload.scheduled_at = payload.scheduled_at || updateData.scheduledAt;
    }
    if (updateData.durationMinutes !== undefined) payload.duration_minutes = updateData.durationMinutes;
    if (updateData.status) payload.status = STATUS_BACKEND[updateData.status] || updateData.status;
    if (updateData.reason !== undefined) payload.reason = updateData.reason;
    if (updateData.notes !== undefined) payload.notes = updateData.notes;

    const res = await api.patch(`/appointments/${id}`, payload);
    return toFrontendAppointment(res.data);
  },

  /**
   * Changement de statut (confirmé/annulé/terminé...).
   * PATCH /appointments/{id} { status }
   */
  async updateStatus(id, status) {
    const backendStatus = STATUS_BACKEND[status] || status;
    const res = await api.patch(`/appointments/${id}`, { status: backendStatus });
    return toFrontendAppointment(res.data);
  },

  /**
   * Accepte une demande : PENDING → CONFIRMED.
   * POST /appointments/{id}/accept
   */
  async acceptAppointment(id) {
    const res = await api.post(`/appointments/${id}/accept`);
    return toFrontendAppointment(res.data);
  },

  /**
   * Le patient accepte la proposition de créneau du secrétariat :
   * PENDING → CONFIRMED, proposed_at purgé.
   * POST /appointments/{id}/confirm
   */
  async confirmAppointment(id) {
    const res = await api.post(`/appointments/${id}/confirm`);
    return toFrontendAppointment(res.data);
  },

  /**
   * Annule une demande / un rendez-vous (utilisé pour refuser une proposition).
   * PATCH /appointments/{id} { status: "cancelled" }
   */
  async cancelAppointment(id) {
    return this.updateStatus(id, 'Annulé');
  },

  /**
   * Refuse une demande : PENDING → REJECTED.
   * POST /appointments/{id}/reject
   */
  async rejectAppointment(id, reason = '') {
    const res = await api.post(`/appointments/${id}/reject`, { reason });
    return toFrontendAppointment(res.data);
  },

  /**
   * Propose un autre créneau (la demande reste PENDING).
   * POST /appointments/{id}/reschedule
   * proposedAt peut être une valeur datetime-local naïve (heure métier
   * Africa/Tunis) ou un instant ISO explicite.
   */
  async rescheduleAppointment(id, proposedAt, reason = '') {
    const res = await api.post(`/appointments/${id}/reschedule`, {
      proposed_at: toIsoInstant(proposedAt),
      reason,
    });
    return toFrontendAppointment(res.data);
  },
};

export default appointmentService;
