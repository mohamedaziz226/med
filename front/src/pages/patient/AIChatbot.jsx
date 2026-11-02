// src/pages/patient/AIChatbot.jsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { chatbotService } from '../../services/chatbotService';
import { Bot, Send, RefreshCw, HeartPulse } from 'lucide-react';

export default function PatientAIChatbot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'bot_init',
      sender: 'ai',
      text: `Bonjour ${user?.firstName || ''}. Je suis votre assistant virtuel de santé MedSecretariat. Je peux répondre à vos questions sur la préparation d'examens (IRM, Scanner, prise de sang) ou vous conseiller sur la prise de rendez-vous.`
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
      const reply = await chatbotService.sendMessage(currentQuery, 'patient', user);
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
            Assistant Virtuel Patient
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Questions fréquentes, conseils de préparation aux examens d'imagerie et d'analyse.
          </p>
        </div>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200 flex items-center">
          <HeartPulse className="w-3.5 h-3.5 mr-1" /> IA Conseil Santé
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-[520px] overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">Chatbot Patient MedSecretariat</span>
          <button onClick={() => setMessages([messages[0]])} className="text-xs text-slate-400">
            Réinitialiser
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
              <span>Réponse de l'assistant en cours...</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez une question (ex: Comment se préparer à une IRM ? Est-on à jeun ?)"
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
