// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { doctorService } from '../services/doctorService';
import { secretaryService } from '../services/secretaryService';
import { patientService } from '../services/patientService';

const AuthContext = createContext(null);

/**
 * Enrichit l'utilisateur connecté avec les identifiants propres à son rôle
 * (doctorId/patientId) en interrogeant le backend.
 */
const enrichUser = async (user) => {
  if (!user) return user;
  const enriched = { ...user };

  if (user.role === 'doctor') {
    try {
      const profile = await doctorService.getMyProfile();
      if (profile) {
        enriched.doctorId = profile.id ?? profile.doctorId;
        enriched.specialty = profile.specialty ?? enriched.specialty;
        enriched.address = profile.address ?? enriched.address;
        enriched.licenseNumber = profile.licenseNumber ?? enriched.licenseNumber;
      }
    } catch (err) {
      console.warn('Impossible de récupérer le profil praticien :', err?.message);
    }
  } else if (user.role === 'secretary') {
    try {
      const { doctorId, doctorUserId } = await secretaryService.getMyDoctorId();
      enriched.doctorId = doctorId;
      enriched.doctorUserId = doctorUserId;
    } catch (err) {
      console.warn('Impossible de récupérer le médecin associé :', err?.message);
    }
  } else if (user.role === 'patient') {
    try {
      const profile = await patientService.getMe();
      if (profile) {
        enriched.patientId = profile.id;
        enriched.doctorId = profile.doctorId;
      }
    } catch (err) {
      console.warn('Impossible de récupérer le profil patient :', err?.message);
    }
  }

  return enriched;
};


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('medsecretariat_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      if (!localStorage.getItem('medsecretariat_token')) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser();
        if (!currentUser) {
          authService.logout();
          if (!cancelled) setToken(null);
        } else {
          const enrichedUser = await enrichUser(currentUser);
          if (!cancelled) {
            setUser(enrichedUser);
            localStorage.setItem('medsecretariat_user', JSON.stringify(enrichedUser));
          }
        }
      } catch (err) {
        authService.logout();
        if (!cancelled) setToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    if (data.requires2fa) {
      return data;
    }

    const rawUser = data.user;
    if (!rawUser) {
      throw new Error('La réponse du serveur ne contient pas les informations utilisateur.');
    }

    const enrichedUser = await enrichUser(rawUser);
    setUser(enrichedUser);
    setToken(data.token || localStorage.getItem('medsecretariat_token') || null);
    localStorage.setItem('medsecretariat_user', JSON.stringify(enrichedUser));
    return enrichedUser;
  };

  const verify2FA = async (preAuthToken, otpCode) => {
    const data = await authService.verify2FA(preAuthToken, otpCode);
    const rawUser = data.user;
    if (!rawUser) {
      throw new Error('Code OTP valide mais informations utilisateur manquantes.');
    }

    const enrichedUser = await enrichUser(rawUser);
    setUser(enrichedUser);
    setToken(data.token || localStorage.getItem('medsecretariat_token') || null);
    localStorage.setItem('medsecretariat_user', JSON.stringify(enrichedUser));
    return enrichedUser;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  const updateUserProfile = (updatedFields) => {
    if (!user) return;
    const newUserData = { ...user, ...updatedFields };
    setUser(newUserData);
    localStorage.setItem('medsecretariat_user', JSON.stringify(newUserData));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, verify2FA, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};
