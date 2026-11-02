// src/services/documentService.js
import api from './api';
import { patientService } from './patientService';

// Mapping types affichés (FR) → enum DocumentType du backend
const TYPE_BACKEND = {
  'IRM': 'irm',
  'Scanner': 'scanner',
  'Radiographie': 'radiography',
  'Analyse biologique': 'biology',
  'Ordonnance': 'prescription',
  'Compte rendu': 'report',
  'Échographie': 'other',
  'Ordonnance extérieure': 'other',
  'Autre': 'other',
  'Bulletin de soin': 'other',
  'Certificat médical': 'other',
  'Examen complémentaire': 'other',
};

const TYPE_FR = {
  irm: 'IRM',
  scanner: 'Scanner',
  radiography: 'Radiographie',
  biology: 'Analyse biologique',
  prescription: 'Ordonnance',
  report: 'Compte rendu',
  other: 'Autre',
};

const STATUS_FR = {
  pending: 'En attente',
  validated: 'Validé',
  rejected: 'Refusé',
};

// Libellés affichés pour les DEMANDES de documents.
// La page médecin existante comparaît 'Validée'/'Refusée' ; on renvoie ces formes.
const REQUEST_STATUS_FR = {
  pending: 'En attente',
  validated: 'Validée',
  rejected: 'Refusée',
};

const normalizeRequestStatus = (status) => {
  if (!status) return undefined;
  const s = String(status).toLowerCase();
  if (s === 'validé' || s === 'validée' || s === 'validated') return 'validated';
  if (s === 'refusé' || s === 'refusée' || s === 'rejected') return 'rejected';
  if (s === 'en attente' || s === 'pending') return 'pending';
  return String(status);
};

const toFrontendDocument = (doc, patientName) => ({
  id: doc.id,
  patientId: doc.patientId,
  patientName: patientName || '',
  type: TYPE_FR[doc.type] || doc.type || '',
  title: doc.title || '',
  description: doc.description || '',
  examDate: doc.createdAt ? String(doc.createdAt).slice(0, 10) : '',
  fileUrl: doc.downloadUrl || '',
  filename: doc.filename || '',
  mimeType: doc.mimeType || '',
  fileSize: doc.fileSize || 0,
  status: STATUS_FR[doc.status] || doc.status || '',
  uploadedBy: doc.uploadedBy,
  createdAt: doc.createdAt,
});

const toFrontendRequest = (req) => ({
  id: req.id,
  patientId: req.patientId,
  patientName:
    req.patientName ||
    [req.patientFirstName ?? req.patient_first_name, req.patientLastName ?? req.patient_last_name]
      .filter(Boolean)
      .join(' ') ||
    '',
  doctorId: req.doctorId,
  type: TYPE_FR[req.type] || req.type || '',
  documentType: TYPE_FR[req.type] || req.type || '',
  title: req.title || '',
  message: req.message || '',
  status: REQUEST_STATUS_FR[req.status] || req.status || '',
  response: req.response || '',
  respondedBy: req.respondedBy,
  createdAt: req.createdAt,
  updatedAt: req.updatedAt,
});

export const documentService = {
  /** Documents d'un patient. GET /documents/patient/{patient_id} */
  async getDocumentsByPatient(patientId) {
    if (!patientId) return [];
    const res = await api.get(`/documents/patient/${patientId}`);
    return (res.data || []).map((doc) => toFrontendDocument(doc));
  },

  /** Documents de tous les patients d'un médecin. */
  async getDocumentsByDoctor(doctorId) {
    if (!doctorId) return [];
    const patients = await patientService.getPatientsByDoctor(doctorId);
    const enriched = [];
    for (const patient of patients) {
      try {
        const res = await api.get(`/documents/patient/${patient.id}`);
        const patientName = `${patient.firstName} ${patient.lastName}`;
        (res.data || []).forEach((doc) => enriched.push(toFrontendDocument(doc, patientName)));
      } catch (err) {
        console.warn(`Documents indisponibles pour le patient ${patient.id}`, err?.message);
      }
    }
    return enriched;
  },

  /** Upload d'un document médical. POST /documents/upload → multipart/form-data */
  async addDocument(data) {
    if (!data.file) {
      throw new Error('Veuillez sélectionner un fichier à téléverser.');
    }
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('patient_id', data.patientId);
    formData.append('type', TYPE_BACKEND[data.type] || 'other');
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    const res = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return toFrontendDocument(res.data, data.patientName);
  },

  /** Validation / refus d'un document. POST /documents/{id}/validate */
  async updateDocumentStatus(id, status) {
    const backendStatus = status === 'Validé' ? 'validated' : status === 'Refusé' ? 'rejected' : status;
    const res = await api.post(`/documents/${id}/validate`, { status: backendStatus });
    return toFrontendDocument(res.data);
  },

  /**
   * Suppression définitive d'un document (base + fichier MinIO).
   * DELETE /documents/{id}
   */
  async deleteDocument(id) {
    await api.delete(`/documents/${id}`);
    return true;
  },

  async getAllDocuments() {
    throw new Error('Liste globale des documents indisponible : aucun endpoint backend.');
  },

  // ── Demandes de documents (backend /documents/requests) ───────────────

  /**
   * Liste les demandes visibles par l'utilisateur courant.
   * GET /documents/requests
   */
  async getDocumentRequests() {
    const res = await api.get('/documents/requests');
    return (res.data || []).map(toFrontendRequest);
  },

  /**
   * Patient / secrétaire crée une demande de document.
   * POST /documents/requests
   */
  async createDocumentRequest(data) {
    const backendType = TYPE_BACKEND[data.type] || TYPE_BACKEND[data.documentType] || 'other';
    const res = await api.post('/documents/requests', {
      patient_id: data.patientId,
      type: backendType,
      title: data.title || data.documentType || 'Document',
      message: data.message || '',
    });
    return toFrontendRequest(res.data);
  },

  /** Alias historique. */
  async requestDocument(data) {
    return this.createDocumentRequest(data);
  },

  /**
   * Secrétaire / médecin répond à une demande.
   * PATCH /documents/requests/{id}
   */
  async updateRequestStatus(id, status, responseText = '') {
    const backendStatus = normalizeRequestStatus(status) || 'pending';
    const res = await api.patch(`/documents/requests/${id}`, {
      status: backendStatus,
      response: responseText,
    });
    return toFrontendRequest(res.data);
  },
};

export default documentService;

