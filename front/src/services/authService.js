// src/services/authService.js
import api from './api';

const TOKEN_KEY = 'medsecretariat_token';
const REFRESH_TOKEN_KEY = 'medsecretariat_refresh_token';
const USER_KEY = 'medsecretariat_user';

const normalizeUser = (user) => {
  if (!user) return null;

  return {
    ...user,
    firstName: user.firstName ?? user.first_name ?? '',
    lastName: user.lastName ?? user.last_name ?? '',
    is2faEnabled: user.is2faEnabled ?? user.is_2fa_enabled ?? false,
    createdAt: user.createdAt ?? user.created_at,
    updatedAt: user.updatedAt ?? user.updated_at,
  };
};

export const authService = {
  /**
   * Connexion réelle via le backend FastAPI.
   * POST /auth/login → TokenResponse { access_token, refresh_token, user, requires_2fa }
   */
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    const data = response.data || {};

    const requires2fa = data.requires2fa || data.requires_2fa || false;
    const preAuthToken = data.preAuthToken || data.pre_auth_token;

    if (requires2fa) {
      if (preAuthToken) {
        localStorage.setItem('medsecretariat_pre_auth_token', preAuthToken);
      }
      return {
        requires2fa: true,
        preAuthToken,
        message: data.message || 'Code OTP envoyé à votre adresse email.',
      };
    }

    const token = data.token || data.access_token;
    const refreshToken = data.refreshToken || data.refresh_token;

    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }

    const user = data.user ? normalizeUser(data.user) : null;
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    return { ...data, token, user, requires2fa: false };
  },

  /**
   * Vérification 2FA avec code OTP.
   * POST /auth/verify-2fa → TokenResponse
   */
  async verify2FA(preAuthToken, otpCode) {
    const tokenToUse = preAuthToken || localStorage.getItem('medsecretariat_pre_auth_token');
    const response = await api.post('/auth/verify-2fa', {
      pre_auth_token: tokenToUse,
      otp_code: otpCode,
    });
    const data = response.data || {};

    const token = data.token || data.access_token;
    const refreshToken = data.refreshToken || data.refresh_token;

    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem('medsecretariat_pre_auth_token');
    }
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }

    const user = data.user ? normalizeUser(data.user) : null;
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    return { ...data, token, user };
  },

  /**
   * Récupère l'utilisateur courant via GET /auth/me.
   */
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    const user = normalizeUser(response.data);
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    return user;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('medsecretariat_pre_auth_token');
  },
};

export default authService;
