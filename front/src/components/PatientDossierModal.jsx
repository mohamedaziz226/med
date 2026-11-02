// src/components/PatientDossierModal.jsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { patientService } from '../services/patientService';
import { documentService } from '../services/documentService';
import { appointmentService } from '../services/appointmentService';
import {
  User,
  Stethoscope,
  FileText,
  Calendar,
  Plus,
  FilePlus,
  Phone,
  Mail,
  MapPin,
  Heart,
  AlertTriangle,
  Clock,
  Download,
  Eye,
  CheckCircle2,
  Shield,
  Activity
} from 'lucide-react';

export default function PatientDossierModal({ isOpen, onClose, patient, initialTab = 'notes', doctorUser }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [clinicalNotes, setClinicalNotes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  // New Note Form State
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: '',
    vitals: { bp: '', hr: '', temp: '', weight: '' },
    prescription: '',
    template: ''
  });

  useEffect(() => {
    if (patient && isOpen) {
      loadDossierData();
    }
  }, [patient, isOpen]);

  const loadDossierData = async () => {
    if (!patient) return;
    setLoading(true);
    try {
      const notes = await patientService.getClinicalNotes(patient.id);
      const docs = await documentService.getDocumentsByPatient(patient.id);
      const apts = await appointmentService.getAppointmentsByPatient(patient.id);

      setClinicalNotes(notes);
      setDocuments(docs);
      setAppointments(apts);
    } catch (err) {
      console.error('Error loading dossier data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = (tpl) => {
    if (tpl === 'cardio') {
      setNoteForm(prev => ({
        ...prev,
        title: 'Bilan & Suivi Cardiologique',
        content: 'Patient reçu pour contrôle tensionnel et auscultation. Constantes stables. Rythme sinusal régulier sans souffle surajouté. Auscultation pleuro-pulmonaire libre.',
        vitals: { bp: '130/80', hr: '72', temp: '36.8', weight: '78' },
        prescription: 'Continuer traitement habituel. Contrôle biologique (bilan lipidique + ionogramme) dans 1 mois.'
      }));
    } else if (tpl === 'postop') {
      setNoteForm(prev => ({
        ...prev,
        title: 'Consultation Suivi Post-Opératoire',
        content: 'Examen de cicatrice satisfaisant, absence de signe d\'infection localisée. Douleurs résiduelles modérées.',
        vitals: { bp: '120/75', hr: '68', temp: '37.0', weight: '75' },
        prescription: 'Antalgiques si besoin (Paracétamol 1g). Soins de pansement tous les 2 jours jusqu\'à cicatrisation complète.'
      }));
    } else if (tpl === 'general') {
      setNoteForm(prev => ({
        ...prev,
        title: 'Consultation Générale de Routine',
        content: 'Examen clinique de routine. Bon état général. Bilan global satisfaisant.',
        vitals: { bp: '125/80', hr: '70', temp: '36.6', weight: '76' },
        prescription: 'Renouvellement ordonnance habituelle pour 3 mois.'
      }));
    }
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!patient) return;

    const fullContent = `OBSERVATIONS:\n${noteForm.content}\n\nCONSTANTES:\n• Tension: ${noteForm.vitals.bp || 'N/A'} mmHg\n• Pouls: ${noteForm.vitals.hr || 'N/A'} bpm\n• Température: ${noteForm.vitals.temp || 'N/A'} °C\n• Poids: ${noteForm.vitals.weight || 'N/A'} kg\n\nPRESCRIPTION / CONDUITE À TENIR:\n${noteForm.prescription || 'Aucune prescription spécifique.'}`;

    const newNote = await patientService.addClinicalNote({
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      doctorId: doctorUser?.id || 'doc_1',
      doctorName: `Dr. ${doctorUser?.firstName || 'Slim'} ${doctorUser?.lastName || 'Ben Ali'}`,
      title: noteForm.title || 'Note de Consultation',
      content: fullContent
    });

    setClinicalNotes(prev => [newNote, ...prev]);
    setShowNoteForm(false);
    setNoteForm({
      title: '',
      content: '',
      vitals: { bp: '', hr: '', temp: '', weight: '' },
      prescription: '',
      template: ''
    });
  };

  if (!patient) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Dossier Médical Patient : ${patient.firstName} ${patient.lastName}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Patient Identity Bar (High Density Styling) */}
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs border border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <img
                src={patient.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                alt=""
                className="w-14 h-14 rounded-xl object-cover ring-2 ring-[#3B82F6]"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-lg text-white leading-tight">
                    {patient.firstName} {patient.lastName}
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold text-[11px]">
                    {patient.gender || 'Patient'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-1">
                  <span className="flex items-center"><Phone className="w-3 h-3 mr-1 text-[#3B82F6]" /> {patient.phone}</span>
                  <span className="flex items-center"><Mail className="w-3 h-3 mr-1 text-[#3B82F6]" /> {patient.email}</span>
                  <span className="flex items-center"><MapPin className="w-3 h-3 mr-1 text-[#3B82F6]" /> {patient.address}</span>
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Groupe :</span>
                <span className="status-tag tag-rose font-bold text-xs">{patient.bloodType || 'O+'}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1">Né(e) le {patient.dob || '1988-04-12'}</span>
            </div>
          </div>

          {/* Medical Alerts Banner */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center bg-rose-500/10 border border-rose-500/20 rounded-lg px-2.5 py-1.5 text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 mr-2 shrink-0" />
              <div>
                <strong className="block text-[10px] uppercase font-extrabold text-rose-300">Allergies connues :</strong>
                <span>{patient.allergies?.length ? patient.allergies.join(', ') : 'Aucune allergie connue'}</span>
              </div>
            </div>

            <div className="flex items-center bg-blue-500/10 border border-blue-500/20 rounded-lg px-2.5 py-1.5 text-blue-200">
              <Heart className="w-4 h-4 text-blue-400 mr-2 shrink-0" />
              <div>
                <strong className="block text-[10px] uppercase font-extrabold text-blue-300">Antécédents / Pathologies :</strong>
                <span>{patient.chronicConditions?.length ? patient.chronicConditions.join(', ') : 'Aucun antécédent particulier'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dossier Tabs */}
        <div className="flex space-x-1 border-b border-[#E2E8F0] bg-[#F8FAFC] p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center px-3.5 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-[#3B82F6] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
            <span>Notes de Consultation ({clinicalNotes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center px-3.5 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-[#3B82F6] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            <span>Examens & Imageries ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex items-center px-3.5 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'appointments'
                ? 'bg-[#3B82F6] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            <span>Historique Consultations ({appointments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center px-3.5 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'bg-[#3B82F6] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <User className="w-3.5 h-3.5 mr-1.5" />
            <span>Fiche Administrative</span>
          </button>
        </div>

        {/* TAB 1: Clinical Notes (Notes de consultation) */}
        {activeTab === 'notes' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-[#E2E8F0]">
              <div>
                <h4 className="font-bold text-xs text-[#0F172A] uppercase tracking-wide flex items-center">
                  <Shield className="w-3.5 h-3.5 text-[#3B82F6] mr-1.5" />
                  Notes Médicales & Prescriptions Médicales
                </h4>
                <p className="text-[11px] text-slate-500">
                  Consignées après chaque consultation médicale par le praticien.
                </p>
              </div>
              <button
                onClick={() => setShowNoteForm(!showNoteForm)}
                className="flex items-center px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-xs rounded-md shadow-2xs transition-colors"
              >
                <FilePlus className="w-3.5 h-3.5 mr-1" />
                {showNoteForm ? 'Masquer formulaire' : '+ Nouvelle Note de Consultation'}
              </button>
            </div>

            {/* Note Creation Form */}
            {showNoteForm && (
              <form onSubmit={handleSaveNote} className="bg-blue-50/50 p-4 rounded-xl border border-blue-200/80 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                  <span className="font-bold text-blue-900 text-xs">
                    Rédaction d'une note post-consultation
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] text-slate-500 font-semibold">Modèles rapides :</span>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate('cardio')}
                      className="px-2 py-0.5 bg-white border border-blue-300 text-blue-700 font-medium rounded text-[10px] hover:bg-blue-100"
                    >
                      Cardiologie
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate('postop')}
                      className="px-2 py-0.5 bg-white border border-blue-300 text-blue-700 font-medium rounded text-[10px] hover:bg-blue-100"
                    >
                      Post-Op
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate('general')}
                      className="px-2 py-0.5 bg-white border border-blue-300 text-blue-700 font-medium rounded text-[10px] hover:bg-blue-100"
                    >
                      Générale
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Motif / Titre de la consultation</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Consultation de suivi tensionnel, Examen post-opératoire..."
                    value={noteForm.title}
                    onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-[#3B82F6]"
                  />
                </div>

                {/* Vitals inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500">Tension (mmHg)</span>
                    <input
                      type="text"
                      placeholder="120/80"
                      value={noteForm.vitals.bp}
                      onChange={(e) => setNoteForm({ ...noteForm, vitals: { ...noteForm.vitals, bp: e.target.value } })}
                      className="w-full px-2 py-1 bg-slate-50 border rounded text-xs"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500">Pouls (bpm)</span>
                    <input
                      type="text"
                      placeholder="72"
                      value={noteForm.vitals.hr}
                      onChange={(e) => setNoteForm({ ...noteForm, vitals: { ...noteForm.vitals, hr: e.target.value } })}
                      className="w-full px-2 py-1 bg-slate-50 border rounded text-xs"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500">Température (°C)</span>
                    <input
                      type="text"
                      placeholder="36.8"
                      value={noteForm.vitals.temp}
                      onChange={(e) => setNoteForm({ ...noteForm, vitals: { ...noteForm.vitals, temp: e.target.value } })}
                      className="w-full px-2 py-1 bg-slate-50 border rounded text-xs"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500">Poids (kg)</span>
                    <input
                      type="text"
                      placeholder="75"
                      value={noteForm.vitals.weight}
                      onChange={(e) => setNoteForm({ ...noteForm, vitals: { ...noteForm.vitals, weight: e.target.value } })}
                      className="w-full px-2 py-1 bg-slate-50 border rounded text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Observations cliniques & Compte-rendu</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Inscrivez les observations cliniques, l'examen physique, l'évolution..."
                    value={noteForm.content}
                    onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Prescription & Traitement prescrit</label>
                  <textarea
                    rows={2}
                    placeholder="Médicaments prescrits, posologie, examens secondaires à réaliser..."
                    value={noteForm.prescription}
                    onChange={(e) => setNoteForm({ ...noteForm, prescription: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-[#3B82F6]"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNoteForm(false)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-700 bg-white rounded-md text-xs font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs rounded-md shadow-2xs"
                  >
                    Enregistrer dans le dossier
                  </button>
                </div>
              </form>
            )}

            {/* List of Clinical Notes */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {clinicalNotes.length > 0 ? (
                clinicalNotes.map((note) => (
                  <div key={note.id} className="p-3.5 bg-white rounded-lg border border-[#E2E8F0] shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-[#0F172A]">{note.title}</span>
                        <span className="status-tag tag-blue text-[10px]">Note Médecin</span>
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{note.date}</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-700 mt-2 whitespace-pre-line leading-relaxed">
                      {note.content}
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Rédigé par : <strong>{note.doctorName || 'Dr. Slim Ben Ali'}</strong></span>
                      <span className="text-emerald-600 font-bold flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Dossier médical mis à jour
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 bg-white rounded-lg border border-[#E2E8F0]">
                  <Stethoscope className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-slate-400" />
                  <p className="text-xs">Aucune note de consultation rédigée pour le moment.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Documents & Exams */}
        {activeTab === 'documents' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-[#E2E8F0]">
              <h4 className="font-bold text-xs text-[#0F172A] uppercase tracking-wide">
                Examens, Imageries & Bilan Médicaux ({documents.length})
              </h4>
              <span className="text-xs text-slate-500">IRM, Scanners, Radiographies, Analyses</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto">
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <div key={doc.id} className="p-3 bg-white rounded-lg border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-[#0F172A] block">{doc.title}</span>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="status-tag tag-blue text-[10px]">{doc.type}</span>
                        <span className="text-[10px] text-slate-400">{doc.examDate}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{doc.description}</p>
                    </div>
                    {doc.fileUrl ? (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-md shadow-2xs shrink-0 flex items-center"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-[#3B82F6]" /> Voir
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        title="Fichier indisponible"
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-400 font-bold text-xs rounded-md shrink-0 flex items-center cursor-not-allowed"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Indisponible
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-2 p-8 text-center text-slate-400 bg-white rounded-lg border border-[#E2E8F0]">
                  <FileText className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-slate-400" />
                  <p className="text-xs">Aucun document déposé dans ce dossier.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Appointments */}
        {activeTab === 'appointments' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-[#E2E8F0]">
              <h4 className="font-bold text-xs text-[#0F172A] uppercase tracking-wide">
                Historique des Consultations & Rendez-vous ({appointments.length})
              </h4>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {appointments.length > 0 ? (
                appointments.map((apt) => (
                  <div key={apt.id} className="p-3 bg-white rounded-lg border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-[#0F172A] block">{apt.reason}</span>
                      <span className="text-[11px] text-slate-500">Date : {apt.date} à {apt.time}</span>
                    </div>
                    <span className={`status-tag ${
                      apt.status === 'Confirmé' || apt.status === 'Terminé' ? 'tag-green' : 'tag-orange'
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 bg-white rounded-lg border border-[#E2E8F0]">
                  <Calendar className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-slate-400" />
                  <p className="text-xs">Aucun rendez-vous enregistré.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Info Administrative */}
        {activeTab === 'info' && (
          <div className="p-4 bg-white rounded-lg border border-[#E2E8F0] space-y-4 text-xs text-slate-700">
            <h4 className="font-bold text-xs text-[#0F172A] uppercase border-b border-slate-100 pb-2">
              Informations Administratives & Contacts
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Téléphone</span>
                <span className="font-bold text-[#0F172A]">{patient.phone}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Adresse e-mail</span>
                <span className="font-bold text-[#0F172A]">{patient.email}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Contact d'Urgence</span>
                <span className="font-bold text-[#0F172A]">{patient.emergencyContact || 'Non renseigné'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg col-span-1 sm:col-span-2">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Adresse Résidence</span>
                <span className="font-bold text-[#0F172A]">{patient.address}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
