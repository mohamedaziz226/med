// src/services/patientService.js
import api from './api';

// Mapping des champs frontend (camelCase) vers backend (snake_case)
const toBackendPatient = (data) => {
  const payload = {};

  if (data.firstName !== undefined) payload.first_name = data.firstName;
  if (data.lastName !== undefined) payload.last_name = data.lastName;
  if (data.email !== undefined) payload.email = data.email;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.password !== undefined) payload.password = data.password;
  if (data.doctorId !== undefined) payload.doctor_id = data.doctorId;
  if (data.dob !== undefined) payload.date_of_birth = data.dob;
  if (data.bloodType !== undefined) payload.blood_type = data.bloodType;
  if (data.allergies !== undefined) {
    payload.allergies = Array.isArray(data.allergies) ? data.allergies.join(', ') : data.allergies;
  }
  if (data.medicalHistory !== undefined) payload.medical_history = data.medicalHistory;
  if (data.emergencyContactName !== undefined) payload.emergency_contact_name = data.emergencyContactName;
  if (data.emergencyContactPhone !== undefined) payload.emergency_contact_phone = data.emergencyContactPhone;
  if (data.socialSecurityNumber !== undefined) payload.social_security_number = data.socialSecurityNumber;

  return payload;
};

// Mapping des réponses backend (snake_case) vers frontend (camelCase)
const fromBackendPatient = (pat) => {
  if (!pat) return null;

  return {
    id: pat.id,
    userId: pat.userId ?? pat.user_id,
    doctorId: pat.doctorId ?? pat.doctor_id,
    firstName: pat.firstName ?? pat.first_name ?? '',
    lastName: pat.lastName ?? pat.last_name ?? '',
    email: pat.email ?? '',
    phone: pat.phone ?? '',
    dob: pat.dateOfBirth ?? pat.date_of_birth ?? '',
    bloodType: pat.bloodType ?? pat.blood_type ?? '',
    allergies: pat.allergies
      ? typeof pat.allergies === 'string'
        ? pat.allergies.split(',').map((a) => a.trim()).filter(Boolean)
        : pat.allergies
      : [],
    medicalHistory: pat.medicalHistory ?? pat.medical_history ?? '',
    emergencyContactName: pat.emergencyContactName ?? pat.emergency_contact_name ?? '',
    emergencyContactPhone: pat.emergencyContactPhone ?? pat.emergency_contact_phone ?? '',
    socialSecurityNumber: pat.socialSecurityNumber ?? pat.social_security_number ?? '',
    createdAt: pat.createdAt ?? pat.created_at,
    updatedAt: pat.updatedAt ?? pat.updated_at,
    // Champs hérités du mock (non présents dans le backend)
    avatar: pat.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    gender: pat.gender || 'Homme',
    address: pat.address || '',
    doctorIds: pat.doctorIds || (pat.doctorId ? [pat.doctorId] : []),
    chronicConditions: pat.chronicConditions || [],
    emergencyContact: pat.emergencyContact || '',
  };
};

export const patientService = {
  /**
   * Liste des patients d'un médecin (doctor_id requis par le backend).
   * GET /patients?doctor_id=...
   */
  async getPatientsByDoctor(doctorId) {
    if (!doctorId) return [];
    const res = await api.get('/patients', { params: { doctor_id: doctorId } });
    return (res.data || []).map(fromBackendPatient);
  },

  /**
   * Recherche de patients au sein d'un médecin.
   * GET /patients?doctor_id=...&search=...
   */
  async searchPatients(doctorId, query) {
    if (!doctorId) return [];
    const res = await api.get('/patients', {
      params: { doctor_id: doctorId, search: query },
    });
    return (res.data || []).map(fromBackendPatient);
  },

  /**
   * Détail d'un patient.
   * GET /patients/{patient_id}
   */
  async getPatientById(id) {
    if (!id) return null;
    const res = await api.get(`/patients/${id}`);
    return fromBackendPatient(res.data);
  },

  /**
   * Profil du patient connecté (GET /patients/me).
   */
  async getMe() {
    const res = await api.get('/patients/me');
    return fromBackendPatient(res.data);
  },

  /**
   * Création d'un patient (profil patient + compte utilisateur).
   * POST /patients
   */
  async addPatient(patientData) {
    const dataWithPassword = {
      ...patientData,
      password: patientData.password || 'Password123!',
    };
    const payload = toBackendPatient(dataWithPassword);
    const res = await api.post('/patients', payload);
    return fromBackendPatient(res.data);
  },

  /**
   * Mise à jour d'un patient.
   * PATCH /patients/{patient_id}
   */
  async updatePatient(id, updateData) {
    const payload = toBackendPatient(updateData);
    const res = await api.patch(`/patients/${id}`, payload);
    return fromBackendPatient(res.data);
  },

  /**
   * Suppression (désactivation) d'un patient.
   * DELETE /patients/{patient_id}
   */
  async deletePatient(id) {
    await api.delete(`/patients/${id}`);
    return true;
  },

  // ── Notes médicales ────────────────────────────────────────────────
  // Le backend ne fournit pas d'endpoint de notes cliniques.
  // On retourne donc un tableau vide : aucune donnée n'est inventée.

  async getClinicalNotes() {
    console.warn('Notes cliniques : endpoint backend non disponible (/clinical-notes).');
    return [];
  },

  async addClinicalNote() {
    throw new Error('Ajout de note médicale non disponible : aucun endpoint backend.');
  },
};