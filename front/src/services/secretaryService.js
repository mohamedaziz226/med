// src/services/secretaryService.js
import api from './api';
import { adminService } from './adminService';

const toFrontendSecretary = (sec) => {
  if (!sec) return null;

  return {
    id: sec.id,
    userId: sec.userId ?? sec.user_id ?? sec.id,
    doctorId: sec.doctorId ?? sec.doctor_id,
    firstName: sec.firstName ?? sec.first_name ?? '',
    lastName: sec.lastName ?? sec.last_name ?? '',
    email: sec.email ?? '',
    phone: sec.phone ?? '',
    status: sec.isActive === false ? 'inactive' : (sec.status ?? 'active'),
    avatar: sec.avatar || '',
    createdAt: sec.createdAt ?? sec.created_at,
    updatedAt: sec.updatedAt ?? sec.updated_at,
  };
};

export const secretaryService = {
  /**
   * GET /secretaries/me/doctor-id → doctor_id associé à la secrétaire connectée.
   * NB : l'intercepteur api.js renomme déjà doctor_id → doctorId dans la réponse ;
   * on lit les deux casses par robustesse (doctor_user_id n'est pas aliasé).
   */
  async getMyDoctorId() {
    const res = await api.get('/secretaries/me/doctor-id');
    const data = res.data || {};
    return {
      doctorId: data.doctorId ?? data.doctor_id ?? null,
      doctorUserId: data.doctorUserId ?? data.doctor_user_id ?? null,
    };
  },

  /**
   * Retourne un doctor_id NUMÉRIQUE valide pour la secrétaire connectée.
   * Ignore les valeurs fallback invalides ('doc_1'…) et interroge le backend si besoin.
   */
  async resolveDoctorIdForUser(user) {
    const candidate = Number(user?.doctorId);
    if (Number.isInteger(candidate) && candidate > 0) return candidate;
    const assigned = await this.getMyDoctorId();
    return assigned?.doctorId || null;
  },

  /**
   * Liste complète des secrétaires (GET /secretaries).
   */
  async getAllSecretaries() {
    const res = await api.get('/secretaries');
    return (res.data || []).map(toFrontendSecretary);
  },

  /**
   * Secrétaires d'un médecin (GET /secretaries?doctor_id=...).
   */
  async getSecretariesByDoctor(doctorId) {
    if (!doctorId) return [];
    const res = await api.get('/secretaries', { params: { doctor_id: doctorId } });
    return (res.data || []).map(toFrontendSecretary);
  },

  /**
   * Création d'une secrétaire (POST /secretaries).
   */
  async addSecretary(secData) {
    const payload = {
      email: secData.email,
      password: secData.password || 'Password123!',
      first_name: secData.firstName,
      last_name: secData.lastName,
      phone: secData.phone || null,
      doctor_id: Number(secData.doctorId),
    };
    const res = await api.post('/secretaries', payload);
    return toFrontendSecretary(res.data);
  },

  async updateSecretary() {
    console.warn('Modification de secrétaire non requise.');
  },

  async toggleSecretaryStatus() {
    console.warn('Changement de statut secrétaire non requis.');
  },
};

export default secretaryService;

