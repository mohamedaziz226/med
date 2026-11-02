// src/services/notificationService.js
import api from './api';

// Types backend (enum NotificationType) → libellés affichés
const TYPE_LABELS = {
  appointment_reminder: 'Rappel de rendez-vous',
  debt_reminder: 'Rappel de paiement',
  document_ready: 'Document disponible',
  document_rejected: 'Document refusé',
  message: 'Message',
  system: 'Information',
};

const toFrontendNotification = (n) => ({
  id: n.id,
  patientId: n.patientId ?? n.patient_id ?? null,
  title: n.title || '',
  message: n.message || '',
  type: n.type || '',
  typeLabel: TYPE_LABELS[n.type] || n.type || 'Notification',
  isRead: Boolean(n.isRead ?? n.is_read ?? false),
  readAt: n.readAt || n.read_at || null,
  relatedEntityId: n.relatedEntityId ?? n.related_entity_id ?? null,
  relatedEntityType: n.relatedEntityType ?? n.related_entity_type ?? null,
  reminderType: n.reminderType ?? n.reminder_type ?? null,
  createdAt: n.createdAt || n.created_at || null,
});

export const notificationTypeLabel = (type) => TYPE_LABELS[type] || type || 'Notification';

export const notificationService = {
  /**
   * Notifications du patient connecté.
   * GET /notifications
   */
  async getNotifications() {
    const res = await api.get('/notifications');
    return (res.data || []).map(toFrontendNotification);
  },

  /**
   * Notifications non lues uniquement.
   * GET /notifications/unread
   */
  async getUnreadNotifications() {
    const res = await api.get('/notifications/unread');
    return (res.data || []).map(toFrontendNotification);
  },

  /**
   * Nombre de notifications non lues (badge de la cloche).
   * GET /notifications/unread/count
   */
  async getUnreadCount() {
    const res = await api.get('/notifications/unread/count');
    return Number(res.data?.count || 0);
  },

  /**
   * Marque une notification comme lue.
   * PATCH /notifications/{id}/read
   */
  async markAsRead(id) {
    const res = await api.patch(`/notifications/${id}/read`);
    return toFrontendNotification(res.data);
  },

  /**
   * Marque toutes les notifications comme lues.
   * PATCH /notifications/read-all
   */
  async markAllAsRead() {
    const res = await api.patch('/notifications/read-all');
    return res.data || { updated: 0 };
  },
};

export default notificationService;