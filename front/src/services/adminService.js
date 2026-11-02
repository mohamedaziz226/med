// src/services/adminService.js
import api from './api';

export const adminService = {
  /**
   * Liste tous les utilisateurs (réservé admin).
   * GET /admin/users → UserResponse[]
   */
  async getUsers() {
    const res = await api.get('/admin/users');
    return res.data || [];
  },

  /**
   * Logs du chatbot (réservé admin).
   * GET /admin/chatbot-logs → ChatbotLogResponse[]
   */
  async getChatbotLogs() {
    const res = await api.get('/admin/chatbot-logs');
    return res.data || [];
  },
};

export default adminService;