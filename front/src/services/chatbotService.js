// src/services/chatbotService.js
import api from './api';

export const chatbotService = {
  async sendMessage(userMessage, contextRole = 'patient', userDetails = {}) {
    const response = await api.post('/chatbot/chat', {
      question: userMessage,
      context: JSON.stringify({ role: contextRole, user: userDetails }),
    });
    return response.data.answer || response.data.reply;
  },
};

export default chatbotService;

