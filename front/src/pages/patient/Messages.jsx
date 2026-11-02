// src/pages/patient/Messages.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { messageService } from '../../services/messageService';
import { patientService } from '../../services/patientService';
import { secretaryService } from '../../services/secretaryService';
import { doctorService } from '../../services/doctorService';
import ChatBox from '../../components/ChatBox';
import { MessageSquare, ShieldCheck } from 'lucide-react';

export default function PatientMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  // Contact du secrétariat : { userId, label }. Résolu dynamiquement car
  // l'API messagerie fonctionne sur les identifiants UTILISATEURS (users.id).
  const [contact, setContact] = useState(null);

  useEffect(() => {
    loadConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, contact]);

  // Résout le destinataire réel : la secrétaire du médecin référent du patient,
  // avec repli sur le médecin lui-même si aucun secrétariat n'est rattaché.
  const resolveContact = async () => {
    if (!user) return null;
    try {
      const me = await patientService.getMe();
      if (me?.doctorId) {
        const secretaries = await secretaryService.getSecretariesByDoctor(me.doctorId);
        const secretary = secretaries.find((s) => s.userId);
        if (secretary) {
          return {
            userId: secretary.userId,
            label: `Secrétariat Médical — ${secretary.firstName} ${secretary.lastName}`,
          };
        }
        const docs = await doctorService.getAllDoctors();
        const doc = docs.find((d) => d.id === me.doctorId);
        if (doc?.userId) {
          return { userId: doc.userId, label: `Dr. ${doc.lastName}` };
        }
      }
    } catch (err) {
      console.warn('Impossible de résoudre le contact du secrétariat :', err?.message);
    }
    return null;
  };

  useEffect(() => {
    let cancelled = false;
    resolveContact().then((c) => {
      if (!cancelled) setContact(c);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadConversation = async () => {
    if (!user || !contact) {
      setMessages([]);
      return;
    }
    const conv = await messageService.getConversationWithUser(contact.userId);
    setMessages(conv);
  };

  const handleSendMessage = async (text) => {
    if (!user) return;
    if (!contact) {
      throw new Error('Aucun contact de secrétariat disponible pour recevoir vos messages.');
    }
    await messageService.sendMessage({
      receiverUserId: contact.userId,
      senderName: `${user.firstName} ${user.lastName}`,
      text,
    });
    await loadConversation();
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 p-5 rounded-2xl text-white flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{contact?.label || 'Secrétariat Médical'}</h1>
          <p className="text-xs text-teal-200">Contact direct avec le cabinet médical.</p>
        </div>
        <span className="text-xs font-semibold bg-white/10 px-3 py-1 rounded-full text-teal-100 flex items-center">
          <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Canal Sécurisé
        </span>
      </div>

      <ChatBox
        title={`Messagerie avec le Secrétariat`}
        messages={messages}
        currentUserId={user?.id || 'pat_1'}
        onSendMessage={handleSendMessage}
        placeholder="Posez une question au secrétariat..."
        quickReplies={[
          'Bonjour, est-il possible de décaler mon rendez-vous ?',
          "Avez-vous bien reçu mon rapport d'IRM ?",
          'Puis-je avoir un reçu pour mon assurance ?',
        ]}
      />
    </div>
  );
}
