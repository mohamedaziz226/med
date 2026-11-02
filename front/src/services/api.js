// src/services/api.js
import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

// Mapping des champs snake_case (backend) vers camelCase (frontend)
const FIELD_ALIASES = {
  first_name: 'firstName',
  last_name: 'lastName',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  access_token: 'token',
  refresh_token: 'refreshToken',
  is_2fa_enabled: 'is2faEnabled',
  pre_auth_token: 'preAuthToken',
  doctor_id: 'doctorId',
  patient_id: 'patientId',
  user_id: 'userId',
  sender_id: 'senderId',
  receiver_id: 'receiverId',
  is_read: 'isRead',
  read_at: 'readAt',
  medical_notes: 'medicalNotes',
  scheduled_at: 'scheduledAt',
  duration_minutes: 'durationMinutes',
  date_of_birth: 'dateOfBirth',
  blood_type: 'bloodType',
  medical_history: 'medicalHistory',
  emergency_contact_name: 'emergencyContactName',
  emergency_contact_phone: 'emergencyContactPhone',
  social_security_number: 'socialSecurityNumber',
  amount_paid: 'amountPaid',
  due_date: 'dueDate',
  paid_at: 'paidAt',
  invoice_pdf_key: 'invoicePdfKey',
  invoice_number: 'invoiceNumber',
  reminder_sent_count: 'reminderSentCount',
  last_reminder_at: 'lastReminderAt',
  minio_object_key: 'minioObjectKey',
  download_url: 'downloadUrl',
  mime_type: 'mimeType',
  file_size: 'fileSize',
  google_event_id: 'googleEventId',
  license_number: 'licenseNumber',
  related_entity_id: 'relatedEntityId',
  related_entity_type: 'relatedEntityType',
  reminder_type: 'reminderType',
  proposed_at: 'proposedAt',
  start_time: 'startTime',
  end_time: 'endTime',
  is_active: 'isActive',
  blocked_slots: 'blockedSlots',
};

const normalizeApiResponse = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeApiResponse);
  }

  if (value && typeof value === 'object') {
    const normalized = { ...value };

    Object.entries(FIELD_ALIASES).forEach(([from, to]) => {
      if (Object.prototype.hasOwnProperty.call(normalized, from) && !Object.prototype.hasOwnProperty.call(normalized, to)) {
        normalized[to] = normalizeApiResponse(normalized[from]);
        delete normalized[from];
      }
    });

    Object.keys(normalized).forEach((key) => {
      normalized[key] = normalizeApiResponse(normalized[key]);
    });

    return normalized;
  }

  return value;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Injecte le token JWT sur chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medsecretariat_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Normalise les réponses et gère le renouvellement du token (401)
api.interceptors.response.use(
  (response) => {
    if (response && response.data !== undefined) {
      response.data = normalizeApiResponse(response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('medsecretariat_refresh_token');

      if (refreshToken) {
        originalRequest._retry = true;
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const rawData = response.data || {};
          const data = normalizeApiResponse(rawData);

          const newToken = data.token || data.access_token || rawData.access_token;
          const newRefreshToken = data.refreshToken || data.refresh_token || rawData.refresh_token;

          if (newToken) {
            localStorage.setItem('medsecretariat_token', newToken);
            if (newRefreshToken) {
              localStorage.setItem('medsecretariat_refresh_token', newRefreshToken);
            }
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // Refresh impossible → déconnexion
        }
      }

      localStorage.removeItem('medsecretariat_token');
      localStorage.removeItem('medsecretariat_refresh_token');
      localStorage.removeItem('medsecretariat_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Transforme une erreur Axios/FastAPI en message lisible.
 */
export const getApiErrorMessage = (err) => {
  if (!err) return 'Une erreur inattendue est survenue.';

  if (err.code === 'ERR_NETWORK' || !err.response) {
    return 'Impossible de joindre le serveur. Vérifiez que le backend est démarré sur le port configuré (VITE_API_BASE_URL).';
  }

  const status = err.response.status;
  const detail = err.response.data?.detail;
  const detailText = typeof detail === 'string'
    ? detail
    : Array.isArray(detail)
      ? detail.map((d) => d.msg).join(', ')
      : '';

  if (detailText) return detailText;

  const fallback = {
    400: 'Requête invalide.',
    401: 'Session expirée ou identifiants incorrects. Veuillez vous reconnecter.',
    403: 'Accès refusé : vous n\'avez pas les permissions nécessaires pour cette action.',
    404: 'Ressource introuvable sur le serveur.',
    422: 'Données invalides. Vérifiez les champs du formulaire.',
    429: 'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.',
    500: 'Erreur interne du serveur. Veuillez réessayer plus tard.',
  };

  return fallback[status] || `Erreur serveur (${status}).`;
};

export default api;
