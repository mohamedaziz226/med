// src/pages/doctor/AIChatbot.jsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { chatbotService } from '../../services/chatbotService';
import { Bot, Send, Sparkles, User, RefreshCw, Cpu } from 'lucide-react';

export default function DoctorAIChatbot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'bot_init',
      sender: 'ai',
      text: `Bonjour Dr. ${user?.lastName || ''}. Je suis votre assistant virtuel IA MedSecretariat. Je peux vous assister dans la rédaction de synthèses de consultations, la recherche dans les procédures médicales ou la préparation des demandes administratives.`
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
      const reply = await chatbotService.sendMessage(currentQuery, 'doctor', user);
      setMessages(prev => [...prev, { id: `ai_${Date.now()}`, sender: 'ai', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { id: `ai_${Date.now()}`, sender: 'ai', text: 'Service IA temporairement indisponible.' }]);
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
            Chatbot IA Assistant Médical
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Assistant intelligent prêt pour l'intégration RAG, LLM et FastAPI.
          </p>
        </div>
        <span className="px-3 py-1 bg-teal-100 text-teal-800 text-xs font-bold rounded-full border border-teal-200 flex items-center">
          <Cpu className="w-3.5 h-3.5 mr-1" /> Modèle Médical Actif
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-[540px] overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-800">Intelligence Artificielle Médicale</span>
          </div>
          <button onClick={() => setMessages([messages[0]])} className="text-xs text-slate-400 hover:text-slate-600">
            Réinitialiser
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl text-xs sm:text-sm shadow-xs ${
                m.sender === 'user'
                  ? 'bg-teal-600 text-white rounded-tr-xs'
                  : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs whitespace-pre-line'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center space-x-2 text-xs text-teal-600 font-semibold p-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Génération de la réponse médicale en cours...</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question (ex: Bilan type pour hypertension, procédure IRM...)"
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-100 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-600 focus:bg-white"
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
