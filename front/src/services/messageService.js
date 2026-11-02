// src/services/messageService.js
import api from './api';

// Les endpoints messages du backend fonctionnent sur les identifiants utilisateurs (users.id).
// On fournit donc ici les méthodes adaptées, avec mapping vers le format attendu par ChatBox.

const toFrontendMessage = (msg) => ({
  id: msg.id,
  senderId: msg.senderId,
  receiverId: msg.receiverId,
  senderName: msg.senderName || '',
  text: msg.content || '',
  timestamp: msg.createdAt,
  isRead: msg.isRead,
});

export const messageService = {
  /**
   * Conversation entre deux utilisateurs (user ids).
   * GET /messages/conversation/{other_user_id}
   */
  async getConversationWithUser(otherUserId) {
    if (!otherUserId) return [];
    const res = await api.get(`/messages/conversation/${otherUserId}`);
    return (res.data || []).map(toFrontendMessage);
  },

  /**
   * Conversation entre une secrétaire et un patient (user ids).
   */
  async getConversationWithPatient(secretaryUserId, patientUserId) {
    return messageService.getConversationWithUser(patientUserId);
  },

  /**
   * Conversation entre une secrétaire et son médecin (user ids).
   */
  async getConversationWithDoctor(secretaryUserId, doctorUserId) {
    return messageService.getConversationWithUser(doctorUserId);
  },

  /**
   * Envoi d'un message.
   * POST /messages → MessageCreate { receiver_id, content }
   * msgData : { receiverUserId, text }
   */
  async sendMessage(msgData) {
    if (!msgData.receiverUserId) {
      throw new Error('Destinataire invalide : identifiant utilisateur requis (receiverUserId).');
    }

    const res = await api.post('/messages', {
      receiver_id: msgData.receiverUserId,
      content: msgData.text || msgData.content,
    });
    return toFrontendMessage({ ...res.data, senderName: msgData.senderName });
  },

  /**
   * Marque un message comme lu.
   * POST /messages/{id}/read
   */
  async markAsRead(messageId) {
    await api.post(`/messages/${messageId}/read`);
    return true;
  },

  /**
   * Nombre de messages non lus de l'utilisateur connecté.
   * GET /messages/unread/count
   */
  async getUnreadCount() {
    const res = await api.get('/messages/unread/count');
    return res.data?.count || 0;
  },
};

export default messageService;
