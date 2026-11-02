// src/services/paymentService.js
import api from './api';
import { patientService } from './patientService';

const STATUS_FR = {
  paid: 'Payé',
  pending: 'En attente',
  overdue: 'En retard',
  partial: 'Partiellement payé',
};

const STATUS_BACKEND = {
  'Payé': 'paid',
  'En attente': 'pending',
  'En retard': 'overdue',
  'Partiellement payé': 'partial',
};

const toFrontendPayment = (payment, patientName) => {
  const total = Number(payment.amount ?? 0);
  const paid = Number(payment.amountPaid ?? 0);

  return {
    id: payment.id,
    patientId: payment.patientId,
    patientName: patientName || '',
    doctorId: payment.doctorId || '',
    totalAmount: total,
    paidAmount: paid,
    remainingAmount: Math.max(0, total - paid),
    dueDate: payment.dueDate || '',
    status: STATUS_FR[payment.status] || payment.status || '',
    invoiceNumber: payment.invoiceNumber,
    invoiceUrl: payment.invoiceUrl,
    remindersSent: payment.reminderSentCount ?? 0,
    reminderHistory: buildReminderHistory(payment),
    description: payment.description || '',
    createdAt: payment.createdAt,
  };
};

const buildReminderHistory = (payment) => {
  const history = [];
  let last = payment.lastReminderAt;
  const count = payment.reminderSentCount ?? 0;
  for (let i = 0; i < count; i++) {
    if (last) {
      history.push({ date: String(last).slice(0, 10), note: `Relance envoyée (n°${count - i}).` });
      last = null; // le backend ne conserve qu'une date de dernière relance
    }
  }
  return history;
};

export const paymentService = {
  /**
   * Paiements d'un patient.
   * GET /payments?patient_id=...
   */
  async getPaymentsByPatient(patientId) {
    if (!patientId) return [];
    const res = await api.get('/payments', { params: { patient_id: patientId } });
    return (res.data || []).map((p) => toFrontendPayment(p));
  },

  /**
   * Paiements de tous les patients d'un médecin (agrégation par patient).
   */
  async getPaymentsByDoctor(doctorId) {
    if (!doctorId) return [];

    const patients = await patientService.getPatientsByDoctor(doctorId);

    const enriched = [];
    for (const patient of patients) {
      try {
        const res = await api.get('/payments', { params: { patient_id: patient.id } });
        const patientName = `${patient.firstName} ${patient.lastName}`;
        (res.data || []).forEach((p) => enriched.push(toFrontendPayment(p, patientName)));
      } catch (err) {
        console.warn(`Paiements indisponibles pour le patient ${patient.id}`, err?.message);
      }
    }

    return enriched;
  },

  /**
   * Création d'un paiement.
   * POST /payments → PaymentCreate { patient_id, amount, due_date, description }
   */
  async createPayment(data) {
    const res = await api.post('/payments', {
      patient_id: data.patientId,
      amount: data.amount,
      due_date: data.dueDate,
      description: data.description || null,
    });
    return toFrontendPayment(res.data, data.patientName);
  },

  /**
   * Encaissement d'un paiement.
   * PATCH /payments/{id} { amount_paid }
   */
  async recordPayment(paymentId, amountPaid) {
    const res = await api.patch(`/payments/${paymentId}`, {
      amount_paid: Number(amountPaid),
    });
    return toFrontendPayment(res.data);
  },

  /**
   * Mise à jour (montant/statut/échéance).
   * PATCH /payments/{id}
   */
  async updatePayment(paymentId, data) {
    const res = await api.patch(`/payments/${paymentId}`, data);
    return toFrontendPayment(res.data);
  },

  /**
   * Suppression d'un paiement.
   * DELETE /payments/{id}
   */
  async deletePayment(paymentId) {
    await api.delete(`/payments/${paymentId}`);
    return true;
  },

  /**
   * Génération de la facture PDF (stockée MinIO + email au patient).
   * POST /payments/invoices/generate
   */
  async generateInvoice(paymentId) {
    const res = await api.post('/payments/invoices/generate', { payment_id: paymentId });
    return toFrontendPayment(res.data);
  },

  async sendPaymentReminder(paymentId, note = '') {
    const res = await api.post(`/payments/${paymentId}/remind`, { note: note || null });
    return toFrontendPayment(res.data);
  },
};

export default paymentService;
