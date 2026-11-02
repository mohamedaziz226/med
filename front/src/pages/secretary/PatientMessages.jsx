// src/pages/secretary/PatientMessages.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import { secretaryService } from '../../services/secretaryService';
import { messageService } from '../../services/messageService';
import ChatBox from '../../components/ChatBox';
import { Search, User, MessageSquare } from 'lucide-react';

export default function PatientMessages() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPatients();
  }, [user]);

  useEffect(() => {
    if (selectedPatient) {
      loadConversation();
    }
  }, [selectedPatient]);

  const loadPatients = async () => {
    const docId = await secretaryService.resolveDoctorIdForUser(user);
    if (!docId) {
      setPatients([]);
      return;
    }
    const list = await patientService.getPatientsByDoctor(docId);
    setPatients(list);
    if (list.length > 0) {
      setSelectedPatient(list[0]);
    }
  };

  const loadConversation = async () => {
    if (!selectedPatient || !user) return;
    // L'API messagerie fonctionne sur les identifiants UTILISATEURS (users.id).
    // selectedPatient.id est l'id du PROFIL patient : il faut utiliser userId,
    // sinon on risque d'afficher une autre conversation (ex. secrétaire ↔ médecin).
    if (!selectedPatient.userId) {
      setMessages([]);
      return;
    }
    const conv = await messageService.getConversationWithPatient(user.id, selectedPatient.userId);
    setMessages(conv);
  };

  const handleSendMessage = async (text) => {
    if (!selectedPatient || !user) return;
    if (!selectedPatient.userId) {
      throw new Error("Ce patient n'a pas de compte utilisateur : impossible de lui écrire.");
    }
    await messageService.sendMessage({
      receiverUserId: selectedPatient.userId,
      senderName: `${user.firstName} ${user.lastName} (Secrétaire)`,
      text
    });
    await loadConversation();
  };

  const filteredPatients = patients.filter(p =>
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Messagerie Patients</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Échangez directement avec les patients suivis par votre médecin référent.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Side: Patient List */}
        <div className="md:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col h-[520px]">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">Patients</h3>

          {/* Search Patient Box */}
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Rechercher un patient..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border rounded-xl focus:outline-hidden"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredPatients.map((pat) => (
              <button
                key={pat.id}
                onClick={() => setSelectedPatient(pat)}
                className={`w-full p-3 rounded-xl flex items-center space-x-3 text-left transition-all ${
                  selectedPatient?.id === pat.id ? 'bg-teal-50 border border-teal-200 shadow-2xs' : 'hover:bg-slate-50'
                }`}
              >
                <img src={pat.avatar} alt="" className="w-9 h-9 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-xs text-slate-900 block truncate">
                    {pat.firstName} {pat.lastName}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">{pat.phone}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Conversation Panel */}
        <div className="md:col-span-8">
          {selectedPatient ? (
            <ChatBox
              title={`Conversation avec ${selectedPatient.firstName} ${selectedPatient.lastName}`}
              messages={messages}
              currentUserId={user?.id || 'sec_1'}
              onSendMessage={handleSendMessage}
              placeholder={`Écrire à ${selectedPatient.firstName}...`}
              quickReplies={[
                'Votre rendez-vous est bien confirmé.',
                'Le Dr. Ben Ali a validé votre document.',
                'Merci d\'apporter votre carte de tiers payant.'
              ]}
            />
          ) : (
            <div className="p-12 text-center text-slate-400">Aucun patient sélectionné.</div>
          )}
        </div>
      </div>
    </div>
  );
}
