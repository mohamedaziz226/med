// src/pages/patient/MyDocuments.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { documentService } from '../../services/documentService';
import { getApiErrorMessage } from '../../services/api';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import {
  FileText,
  Eye,
  Download,
  Upload,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const REQUEST_DOC_TYPES = [
  'Bulletin de soin',
  'Examen complémentaire',
  'Certificat médical',
];

const EXAM_TYPES = [
  { value: 'IRM', label: "IRM (Imagerie par Résonance Magnétique)" },
  { value: 'Scanner', label: 'Scanner / TDM' },
  { value: 'Radiographie', label: 'Radiographie X' },
  { value: 'Analyse biologique', label: 'Analyse Biologique / Prélèvement Sang' },
  { value: 'Échographie', label: 'Échographie' },
  { value: 'Ordonnance extérieure', label: 'Ordonnance extérieure' },
];

const emptyAddForm = () => ({
  type: 'IRM',
  title: '',
  examDate: new Date().toISOString().split('T')[0],
  description: '',
  file: null,
  fileName: '',
});

const emptyRequestForm = () => ({
  documentType: REQUEST_DOC_TYPES[0],
  message: '',
});

export default function PatientMyDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Fenêtre unique : « Déposer » et « Demander » s'ouvrent en modales dans cette page.
  const [activeModal, setActiveModal] = useState(null); // 'add' | 'request'
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [requestForm, setRequestForm] = useState(emptyRequestForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState(null);
  const addFileRef = useRef(null);

  const patientId = user?.patientId || user?.id || 'pat_1';
  const patientName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Patient';

  useEffect(() => {
    loadDocs();
    loadRequests();
  }, [user]);

  const loadDocs = async () => {
    try {
      const list = await documentService.getDocumentsByPatient(patientId);
      setDocuments(list);
    } catch (err) {
      setNotice({ type: 'error', text: getApiErrorMessage(err) });
    }
  };

  const loadRequests = async () => {
    try {
      const list = await documentService.getDocumentRequests();
      setRequests(list);
    } catch (err) {
      console.warn('Demandes de documents indisponibles', err?.message);
    }
  };

  const showNotice = (type, text) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 4500);
  };

  const openModal = (which) => {
    setFormError('');
    setActiveModal(which);
  };

  const closeModal = () => {
    setActiveModal(null);
    setFormError('');
    setAddForm(emptyAddForm());
    setRequestForm(emptyRequestForm());
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const created = await documentService.addDocument({
        ...addForm,
        patientId,
        patientName,
        doctorId: user?.doctorId || 'doc_1',
        uploadedBy: 'patient',
        status: 'En attente',
      });
      closeModal();
      showNotice('success', `Document « ${created.title || addForm.title} » transmis avec succès.`);
      loadDocs();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await documentService.createDocumentRequest({
        patientId,
        patientName,
        doctorId: user?.doctorId || 'doc_1',
        documentType: requestForm.documentType,
        message: requestForm.message,
        status: 'En attente',
      });
      closeModal();
      showNotice('success', 'Demande envoyée au secrétariat médical !');
      loadRequests();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Type d\'Examen',
      render: (d) => (
        <span className="px-2.5 py-1 bg-teal-50 text-teal-800 font-bold text-xs rounded-lg border border-teal-100">
          {d.type}
        </span>
      )
    },
    { header: 'Titre', accessor: 'title' },
    { header: 'Date Examen', accessor: 'examDate' },
    {
      header: 'Validation Médicale',
      render: (d) => (
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
          d.status === 'Validé' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {d.status}
        </span>
      )
    }
  ];

  const requestColumns = [
    {
      header: 'Type de Document',
      render: (r) => (
        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 font-bold text-xs rounded-lg border border-indigo-100">
          {r.documentType || r.title || 'Document'}
        </span>
      ),
    },
    {
      header: 'Message',
      render: (r) => (
        <span className="block max-w-[280px] truncate text-xs text-slate-600" title={r.message}>
          {r.message || '—'}
        </span>
      ),
    },
    {
      header: 'Date de Demande',
      render: (r) => (
        <span className="text-xs text-slate-600">
          {r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '—'}
        </span>
      ),
    },
    {
      header: 'Statut',
      render: (r) => (
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
          r.status === 'Validée'
            ? 'bg-emerald-100 text-emerald-800'
            : r.status === 'Refusée'
              ? 'bg-rose-100 text-rose-800'
              : 'bg-amber-100 text-amber-800'
        }`}>
          {r.status || 'En attente'}
        </span>
      ),
    },
    {
      header: 'Réponse',
      render: (r) => (
        <span className="block max-w-[220px] truncate text-xs text-slate-600" title={r.response}>
          {r.response || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête + actions rapides */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mes Documents & Examens Médicaux</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Consultez vos comptes-rendus d'IRM, Scanners, Radiographies et Analyses — déposez un document
            ou envoyez une demande de document directement depuis cette page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openModal('add')}
            className="flex items-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Upload className="w-4 h-4 mr-1.5" /> Déposer un document
          </button>
          <button
            onClick={() => openModal('request')}
            className="flex items-center px-4 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Send className="w-4 h-4 mr-1.5" /> Demander un document
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`p-4 rounded-2xl font-bold text-xs flex items-center ${
            notice.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {notice.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600 shrink-0" />
            : <AlertCircle className="w-5 h-5 mr-2 text-rose-600 shrink-0" />}
          {notice.text}
        </div>
      )}

      <DataTable
        columns={columns}
        data={documents}
        searchPlaceholder="Rechercher par type d'examen ou titre..."
        actions={(doc) => (
          <button
            onClick={() => setSelectedDoc(doc)}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            title="Aperçu"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
      />

      {/* Tableau des demandes de documents envoyées */}
      <div className="pt-2">
        <h2 className="flex items-center text-sm font-bold text-slate-900 mb-3">
          <Send className="w-4 h-4 mr-2 text-[#0F172A]" />
          Mes Demandes de Documents
        </h2>
        <DataTable
          columns={requestColumns}
          data={requests}
          searchPlaceholder="Rechercher par type, message ou statut..."
          itemsPerPage={5}
        />
      </div>

      {selectedDoc && (
        <Modal isOpen={!!selectedDoc} onClose={() => setSelectedDoc(null)} title={selectedDoc.title}>
          <div className="space-y-4">
            <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Examen : {selectedDoc.type}</span>
                <span className="text-slate-500">Date : {selectedDoc.examDate}</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">
                {selectedDoc.status}
              </span>
            </div>

            <p className="text-xs text-slate-700">{selectedDoc.description}</p>

            <img src={selectedDoc.fileUrl} alt="" className="rounded-xl border max-h-80 w-full object-contain bg-slate-900" />

            <div className="flex justify-end pt-2">
              <a
                href={selectedDoc.fileUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="px-4 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Télécharger HD
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* Modale « Déposer un document » */}
      <Modal isOpen={activeModal === 'add'} onClose={closeModal} title="Déposer un examen médical" maxWidth="max-w-2xl">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" /> {formError}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type d'examen médical</label>
              <select
                value={addForm.type}
                onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                {EXAM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date d'effet / réalisation</label>
              <input
                type="date"
                required
                value={addForm.examDate}
                onChange={(e) => setAddForm({ ...addForm, examDate: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Titre de l'examen</label>
            <input
              type="text"
              required
              placeholder="ex: IRM Cérébrale du 12 Mars, Bilan sanguin complet..."
              value={addForm.title}
              onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Téléversement du fichier (Image HD, PDF, DICOM)</label>
            <input
              ref={addFileRef}
              type="file"
              required
              accept=".png,.jpg,.jpeg,.gif,.pdf,.dcm,.dicom,image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setAddForm({ ...addForm, file, fileName: file ? file.name : '' });
              }}
            />
            <button
              type="button"
              onClick={() => addFileRef.current?.click()}
              className="w-full border-2 border-dashed border-teal-200 rounded-2xl p-6 text-center bg-teal-50/20 hover:bg-teal-50/50 transition-all"
            >
              {addForm.file ? (
                <span className="text-xs font-bold text-teal-800 flex items-center justify-center">
                  <FileText className="w-4 h-4 mr-2 shrink-0" /> {addForm.fileName}
                </span>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                  <span className="text-xs font-bold text-slate-800 block">Cliquez pour sélectionner votre fichier d'examen</span>
                  <span className="text-[10px] text-slate-400">Formats acceptés : DICOM, PNG, JPEG, PDF (max 25 Mo)</span>
                </>
              )}
            </button>
            {addForm.file && (
              <button
                type="button"
                onClick={() => {
                  setAddForm({ ...addForm, file: null, fileName: '' });
                  if (addFileRef.current) addFileRef.current.value = '';
                }}
                className="mt-2 text-[11px] font-semibold text-rose-500 hover:text-rose-700"
              >
                Retirer le fichier
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarques ou symptômes associés</label>
            <textarea
              rows={3}
              placeholder="Précisez tout détail utile pour le médecin..."
              value={addForm.description}
              onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
            <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-xl text-xs">
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {submitting ? 'Transmission en cours...' : 'Transmettre le document'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modale « Demander un document » */}
      <Modal
        isOpen={activeModal === 'request'}
        onClose={closeModal}
        title="Demander un document administratif ou médical"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" /> {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Type de document sollicité</label>
            <select
              value={requestForm.documentType}
              onChange={(e) => setRequestForm({ ...requestForm, documentType: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
            >
              {REQUEST_DOC_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Précisions & Détails pour la secrétaire</label>
            <textarea
              required
              rows={4}
              placeholder="Saisissez la liste des médicaments à renouveler ou le motif précis..."
              value={requestForm.message}
              onChange={(e) => setRequestForm({ ...requestForm, message: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {submitting ? (
                'Envoi en cours...'
              ) : (
                <><Send className="w-4 h-4 mr-1.5" /> Transmettre la demande</>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
