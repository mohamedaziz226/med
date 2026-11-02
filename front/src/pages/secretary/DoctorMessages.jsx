// src/pages/secretary/DoctorMessages.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { messageService } from '../../services/messageService';
import { doctorService } from '../../services/doctorService';
import ChatBox from '../../components/ChatBox';
import { Stethoscope, Lock } from 'lucide-react';

export default function DoctorMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);

  const doctorName = user?.doctorName || 'Dr. Slim Ben Ali';

  // L'API messagerie fonctionne sur les identifiants UTILISATEURS (users.id).
  // user.doctorId est le doctor_id (profil) ; on résout le user_id du médecin
  // associé (doctorUserId fourni par /secretaries/me/doctor-id) avec repli sur GET /doctors.
  const resolveDoctorUserId = useCallback(async () => {
    if (user?.doctorUserId) return user.doctorUserId;
    if (!user?.doctorId) return null;
    try {
      const docs = await doctorService.getAllDoctors();
      const doc = docs.find((d) => d.id === user.doctorId);
      return doc?.userId || null;
    } catch (err) {
      console.warn('Impossible de résoudre le médecin associé :', err?.message);
      return null;
    }
  }, [user]);

  const loadConversation = useCallback(async () => {
    if (!user) return;
    const doctorUserId = await resolveDoctorUserId();
    if (!doctorUserId) {
      setMessages([]);
      return;
    }
    const conv = await messageService.getConversationWithUser(doctorUserId);
    setMessages(conv);
  }, [user, resolveDoctorUserId]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  const handleSendMessage = async (text) => {
    if (!user) return;
    const doctorUserId = await resolveDoctorUserId();
    if (!doctorUserId) {
      throw new Error('Aucun médecin associé pour recevoir les messages.');
    }
    await messageService.sendMessage({
      receiverUserId: doctorUserId,
      senderName: `${user.firstName} ${user.lastName} (Secrétaire)`,
      text,
    });
    await loadConversation();
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 p-5 rounded-2xl text-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white/10 rounded-xl">
            <Stethoscope className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{doctorName}</h1>
            <p className="text-xs text-teal-200">Canal de communication direct avec votre médecin référent.</p>
          </div>
        </div>
        <span className="text-xs font-semibold bg-white/10 px-3 py-1 rounded-full text-teal-100 flex items-center">
          <Lock className="w-3.5 h-3.5 mr-1" /> Canal Exclusif Secrétariat
        </span>
      </div>

      <ChatBox
        title={`Discussion sécurisée avec ${doctorName}`}
        messages={messages}
        currentUserId={user?.id || 0}
        onSendMessage={handleSendMessage}
        placeholder={`Message pour le ${doctorName}...`}
        quickReplies={[
          'Docteur, un patient demande le renouvellement de son ordonnance.',
          'Une nouvelle IRM à valider a été déposée.',
          'Planning de cet après-midi complet.'
        ]}
      />
    </div>
  );
}
