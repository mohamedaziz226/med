// src/services/doctorService.js
import api from './api';
import { adminService } from './adminService';

/**
 * Normalise la réponse backend (DoctorResponse ou UserResponse de rôle doctor)
 * vers le format attendu par les composants frontend.
 */
const toFrontendDoctor = (doc) => {
  if (!doc) return null;

  return {
    id: doc.id, // userId (via /admin/users) ou doctorId (via /doctors/me)
    userId: doc.userId ?? doc.user_id ?? doc.id,
    firstName: doc.firstName ?? doc.first_name ?? '',
    lastName: doc.lastName ?? doc.last_name ?? '',
    email: doc.email ?? '',
    phone: doc.phone ?? '',
    specialty: doc.specialty ?? '',
    licenseNumber: doc.licenseNumber ?? doc.license_number ?? '',
    address: doc.address ?? '',
    city: doc.city ?? '',
    status: doc.isActive === false ? 'inactive' : (doc.status ?? 'active'),
    avatar: doc.avatar || '',
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
  };
};

export const doctorService = {
  /**
   * GET /doctors/me → profil du praticien connecté.
   */
  async getMyProfile() {
    const res = await api.get('/doctors/me');
    return toFrontendDoctor(res.data);
  },

  /**
   * GET /doctors → Liste complète des médecins avec profil et utilisateur.
   */
  async getAllDoctors() {
    const res = await api.get('/doctors');
    return (res.data || []).map(toFrontendDoctor);
  },

  async getDoctorById() {
    throw new Error('Endpoint backend indisponible pour afficher un médecin par identifiant.');
  },

  async addDoctor(doctorData) {
    const payload = {
      email: doctorData.email,
      password: doctorData.password || 'Password123!',
      first_name: doctorData.firstName,
      last_name: doctorData.lastName,
      phone: doctorData.phone || null,
      specialty: doctorData.specialty,
      address: doctorData.address || null,
      city: doctorData.city || null,
    };
    const res = await api.post('/doctors', payload);
    return toFrontendDoctor(res.data);
  },

  async updateDoctor() {
    throw new Error('Modification de médecin non disponible : aucun endpoint backend dédié.');
  },

  async toggleDoctorStatus() {
    throw new Error('Changement de statut médecin non disponible : aucun endpoint backend.');
  },
};

export default doctorService;
