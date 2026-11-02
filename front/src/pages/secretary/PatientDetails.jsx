// src/pages/secretary/PatientDetails.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import { documentService } from '../../services/documentService';
import { secretaryService } from '../../services/secretaryService';
import { getApiErrorMessage } from '../../services/api';
import { appointmentService } from '../../services/appointmentService';
import { paymentService } from '../../services/paymentService';
import { messageService } from '../../services/messageService';
import Modal from '../../components/Modal';
import { User, FileText, Calendar, CreditCard, Send, MessageSquare, Phone, Mail, MapPin, Stethoscope, Plus, Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PatientDetails() {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('id') || 'pat_1';

  const [patient, setPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('Informations');
  const [documents, setDocuments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const { user } = useAuth();
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({ type: 'IRM', title: '', description: '', file: null, fileName: '' });
  const [docSubmitting, setDocSubmitting] = useState(false);
  const [docError, setDocError] = useState('');
  const [docNotice, setDocNotice] = useState(null);
  const docFileRef = useRef(null);

  useEffect(() => {
    loadPatientFullData();
  }, [patientId]);

  const loadPatientFullData = async () => {
    const pat = await patientService.getPatientById(patientId);
    setPatient(pat);

    const docs = await documentService.getDocumentsByPatient(patientId);
    setDocuments(docs);

    const apts = await appointmentService.getAppointmentsByPatient(patientId);
    setAppointments(apts);

    const pays = await paymentService.getAllPayments();
    setPayments(pays.filter(p => p.patientId === patientId));

    const reqs = await documentService.getDocumentRequests();
    setRequests(reqs.filter(r => r.patientId === patientId));

    const msgs = await messageService.getAllMessages();
    setMessages(msgs.filter(m => m.patientId === patientId));
  };

  const reloadDocuments = async () => {
    const docs = await documentService.getDocumentsByPatient(patientId);
    setDocuments(docs);
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    setDocSubmitting(true);
    setDocError('');
    try {
      const docId = await secretaryService.resolveDoctorIdForUser(user);
      const created = await documentService.addDocument({
        ...docForm,
        patientId,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Patient',
        doctorId: docId || 'doc_1',
        uploadedBy: 'secretariat',
      });
      setDocModalOpen(false);
      setDocForm({ type: 'IRM', title: '', description: '', file: null, fileName: '' });
      setDocNotice(`Document « ${created.title || docForm.title} » ajouté avec succès.`);
      reloadDocuments();
      window.setTimeout(() => setDocNotice(null), 4000);
    } catch (err) {
      setDocError(getApiErrorMessage(err));
    } finally {
      setDocSubmitting(false);
    }
  };

  if (!patient) {
    return <div className="p-8 text-center text-slate-500">Chargement du dossier patient...</div>;
  }

  const tabs = [
    { name: 'Informations', icon: User },
    { name: 'Documents', icon: FileText },
    { name: 'Rendez-vous', icon: Calendar },
    { name: 'Paiements', icon: CreditCard },
    { name: 'Demandes', icon: Send },
    { name: 'Messages', icon: MessageSquare }
  ];

  return (
    <div className="space-y-6">
      {/* Patient Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <img src={patient.avatar} alt="" className="w-20 h-20 rounded-2xl object-cover ring-4 ring-teal-500/20" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{patient.firstName} {patient.lastName}</h1>
            <p className="text-xs text-teal-700 font-semibold mt-0.5">Né(e) le {patient.dob} ({patient.gender})</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600">
              <span className="flex items-center"><Phone className="w-3.5 h-3.5 mr-1 text-teal-600" /> {patient.phone}</span>
              <span className="flex items-center"><Mail className="w-3.5 h-3.5 mr-1 text-teal-600" /> {patient.email}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Médecin Référent</span>
          <span className="font-bold text-slate-900 block text-sm">Dr. Slim Ben Ali</span>
          <span className="text-slate-500 block">Spécialité : Cardiologie</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex space-x-2 border-b border-slate-200 bg-white px-3 py-2 rounded-2xl shadow-xs overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.name
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4 mr-2 shrink-0" />
              <span>[{tab.name}]</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs min-h-[300px]">
        {activeTab === 'Informations' && (
          <div className="space-y-4 text-xs text-slate-700">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2">Informations Administratives</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Adresse</span>
                <span className="font-bold text-slate-800">{patient.address || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Groupe Sanguin</span>
                <span className="font-bold text-rose-700">{patient.bloodType || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Date de naissance</span>
                <span className="font-bold text-slate-800">{patient.dob || '—'} ({patient.gender || '—'})</span>
              </div>
            </div>

            <h3 className="font-bold text-sm text-slate-900 border-b pb-2 pt-2">Dossier Médical</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl sm:col-span-2">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Antécédents médicaux</span>
                <span className="font-bold text-slate-800">{patient.medicalHistory || 'Aucun antécédent renseigné'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl sm:col-span-2">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Allergies</span>
                {patient.allergies && patient.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {patient.allergies.map((a, i) => (
                      <span key={i} className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-lg font-bold">{a}</span>
                    ))}
                  </div>
                ) : (
                  <span className="font-bold text-slate-800">Aucune allergie connue</span>
                )}
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Contact d'urgence</span>
                <span className="font-bold text-slate-800">
                  {[patient.emergencyContactName, patient.emergencyContactPhone].filter(Boolean).join(' — ') || '—'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">N° Sécurité Sociale</span>
                <span className="font-bold text-slate-800">{patient.socialSecurityNumber || '—'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Documents' && (
          <div className="space-y-3">
            {docNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" /> {docNotice}
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900">Documents Médicaux du Patient</h3>
              <button
                onClick={() => { setDocError(''); setDocModalOpen(true); }}
                className="flex items-center px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter un document
              </button>
            </div>
            {documents.length > 0 ? (
              documents.map(d => (
                <div key={d.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{d.title}</span>
                    <span className="text-teal-700 font-semibold">{d.type} — {d.examDate}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">{d.status}</span>
                </div>
              ))
            ) : <p className="text-xs text-slate-400">Aucun document.</p>}
          </div>
        )}

        {activeTab === 'Rendez-vous' && (
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 mb-3">Historique des Rendez-vous</h3>
            {appointments.length > 0 ? (
              appointments.map(a => (
                <div key={a.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{a.reason}</span>
                    <span className="text-slate-500">{a.date} à {a.time}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-bold">{a.status}</span>
                </div>
              ))
            ) : <p className="text-xs text-slate-400">Aucun rendez-vous.</p>}
          </div>
        )}

        {activeTab === 'Paiements' && (
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 mb-3">Paiements & Historique Financier</h3>
            {payments.length > 0 ? (
              payments.map(p => (
                <div key={p.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">Montant Total : {p.totalAmount} DT</span>
                    <span className="text-slate-500">Payé : {p.paidAmount} DT | Restant : {p.remainingAmount} DT</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">{p.status}</span>
                </div>
              ))
            ) : <p className="text-xs text-slate-400">Aucun paiement enregistré.</p>}
          </div>
        )}

        {activeTab === 'Demandes' && (
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 mb-3">Demandes de Documents</h3>
            {requests.length > 0 ? (
              requests.map(r => (
                <div key={r.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{r.documentType}</span>
                    <span className="text-slate-500">"{r.message}"</span>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">{r.status}</span>
                </div>
              ))
            ) : <p className="text-xs text-slate-400">Aucune demande.</p>}
          </div>
        )}

        {activeTab === 'Messages' && (
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 mb-3">Historique des Messages Secrétariat</h3>
            {messages.length > 0 ? (
              messages.map(m => (
                <div key={m.id} className="p-3 bg-slate-50 rounded-xl text-xs">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{m.senderName}</span>
                    <span className="text-[10px] text-slate-400">{m.timestamp}</span>
                  </div>
                  <p className="text-slate-600 mt-1">{m.text}</p>
                </div>
              ))
            ) : <p className="text-xs text-slate-400">Aucun message échange.</p>}
          </div>
        )}

        {/* Modal : Ajouter un document */}
        <Modal isOpen={docModalOpen} onClose={() => setDocModalOpen(false)} title="Ajouter un document médical" maxWidth="max-w-xl">
          <form onSubmit={handleAddDocument} className="space-y-4">
            {docError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" /> {docError}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type de document</label>
                <select
                  value={docForm.type}
                  onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="IRM">IRM</option>
                  <option value="Scanner">Scanner</option>
                  <option value="Radiographie">Radiographie</option>
                  <option value="Analyse biologique">Analyse biologique</option>
                  <option value="Ordonnance">Ordonnance</option>
                  <option value="Compte rendu">Compte rendu</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fichier (Image, PDF, DICOM)</label>
                <input
                  ref={docFileRef}
                  type="file"
                  required
                  accept=".png,.jpg,.jpeg,.gif,.pdf,.dcm,.dicom,image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setDocForm({ ...docForm, file, fileName: file ? file.name : '' });
                  }}
                />
                <button
                  type="button"
                  onClick={() => docFileRef.current?.click()}
                  className="w-full border-2 border-dashed border-teal-200 rounded-xl p-4 text-center bg-teal-50/20 hover:bg-teal-50/50 transition-all"
                >
                  {docForm.file ? (
                    <span className="text-xs font-bold text-teal-800 flex items-center justify-center">
                      <FileText className="w-4 h-4 mr-2 shrink-0" /> {docForm.fileName}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Cliquez pour sélectionner un fichier</span>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Titre du document</label>
              <input
                type="text"
                required
                placeholder="ex: Radiographie Pulmonaire de contrôle"
                value={docForm.title}
                onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Remarques</label>
              <textarea
                rows={3}
                value={docForm.description}
                onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
              <button type="button" onClick={() => setDocModalOpen(false)} className="px-4 py-2 border rounded-xl text-xs">
                Annuler
              </button>
              <button
                type="submit"
                disabled={docSubmitting}
                className="flex items-center px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {docSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                {docSubmitting ? 'Ajout en cours...' : 'Enregistrer & Associer'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
