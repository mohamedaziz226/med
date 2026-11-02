// src/pages/secretary/AIChatbot.jsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { chatbotService } from '../../services/chatbotService';
import { Bot, Send, RefreshCw, Cpu } from 'lucide-react';

export default function SecretaryAIChatbot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'bot_init',
      sender: 'ai',
      text: `Bonjour Mme. ${user?.lastName || ''}. Je suis l'assistant IA spécialisé en gestion de secrétariat médical. Je peux vous aider à rédiger des rappels de rendez-vous, formuler des relances de paiement ou répondre aux questions courantes.`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { id: `u_${Date.now()}`, sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    const currentQuery = input;
    setInput('');
    setLoading(true);

    try {
      const reply = await chatbotService.sendMessage(currentQuery, 'secretary', user);
      setMessages(prev => [...prev, { id: `ai_${Date.now()}`, sender: 'ai', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { id: `ai_${Date.now()}`, sender: 'ai', text: 'Service IA indisponible.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <Bot className="w-6 h-6 text-teal-600 mr-2" />
            Assistant IA Secrétariat
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Génération automatique de modèles de courriers, relances et aide administrative.
          </p>
        </div>
        <span className="px-3 py-1 bg-teal-100 text-teal-800 text-xs font-bold rounded-full border border-teal-200 flex items-center">
          <Cpu className="w-3.5 h-3.5 mr-1" /> IA Assistant Rôle Secrétaire
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-[520px] overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">Chatbot Secrétariat Médical</span>
          <button onClick={() => setMessages([messages[0]])} className="text-xs text-slate-400">
            Effacer la conversation
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs sm:text-sm ${
                m.sender === 'user'
                  ? 'bg-teal-600 text-white rounded-tr-xs'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs whitespace-pre-line'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center space-x-2 text-xs text-teal-600 p-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Génération en cours...</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Demandez un modèle de SMS, rappel de rendez-vous ou relance..."
            className="flex-1 px-4 py-2 text-xs sm:text-sm bg-slate-100 rounded-xl border focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
