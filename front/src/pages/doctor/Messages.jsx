// src/pages/doctor/Messages.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { messageService } from '../../services/messageService';
import { secretaryService } from '../../services/secretaryService';
import ChatBox from '../../components/ChatBox';

export default function DoctorMessages() {
  const { user } = useAuth();
  const [secretaries, setSecretaries] = useState([]);
  const [selectedSecretary, setSelectedSecretary] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    loadSecretaries();
  }, [user]);

  useEffect(() => {
    if (selectedSecretary) {
      loadConversation();
    }
  }, [selectedSecretary]);

  const loadSecretaries = async () => {
    if (!user) return;
    const docId = user?.doctorId;
    if (!docId) {
      setSecretaries([]);
      return;
    }
    const list = await secretaryService.getSecretariesByDoctor(docId);
    setSecretaries(list);
    if (list.length > 0) {
      setSelectedSecretary(list[0]);
    }
  };

  const loadConversation = async () => {
    if (!selectedSecretary || !user) return;
    const secretaryUserId = selectedSecretary.userId;
    if (!secretaryUserId) {
      setMessages([]);
      return;
    }
    const conv = await messageService.getConversationWithUser(secretaryUserId);
    setMessages(conv);
  };

  const handleSendMessage = async (text) => {
    if (!selectedSecretary || !user) return;
    const secretaryUserId = selectedSecretary.userId;
    if (!secretaryUserId) return;
    await messageService.sendMessage({
      receiverUserId: secretaryUserId,
      senderName: `Dr. ${user.firstName} ${user.lastName}`,
      text
    });
    loadConversation();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Messagerie Interne Médicale</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Échangez en temps réel avec vos secrétaires médicales rattachées.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">Mes Secrétaires</h3>
          <div className="space-y-2">
            {secretaries.length === 0 && (
              <p className="text-xs text-slate-400">Aucune secrétaire rattachée à ce cabinet.</p>
            )}
            {secretaries.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setSelectedSecretary(sec)}
                className={`w-full p-3 rounded-xl flex items-center space-x-3 text-left transition-all ${
                  selectedSecretary?.id === sec.id ? 'bg-teal-50 border border-teal-200 shadow-2xs' : 'hover:bg-slate-50'
                }`}
              >
                <img src={sec.avatar} alt="" className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">{sec.firstName} {sec.lastName}</span>
                  <span className="text-[10px] text-teal-600 font-semibold">{sec.email}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-8">
          {selectedSecretary ? (
            <ChatBox
              title={`Messagerie : ${selectedSecretary.firstName} ${selectedSecretary.lastName}`}
              messages={messages}
              currentUserId={user?.id || 0}
              onSendMessage={handleSendMessage}
              quickReplies={[
                'Pouvez-vous caler le rendez-vous demain à 10h ?',
                'J\'ai validé le compte rendu de l\'IRM.',
                'Transmettez l\'ordonnance de renouvellement.'
              ]}
            />
          ) : (
            <div className="p-12 text-center text-slate-400">Aucune secrétaire sélectionnée.</div>
          )}
        </div>
      </div>
    </div>
  );
}
