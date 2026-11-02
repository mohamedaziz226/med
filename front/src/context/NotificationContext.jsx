// src/context/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';

const POLL_INTERVAL_MS = 60000;

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const isPatient = user?.role === 'patient';

  const [notifications, setNotifications] = useState([]);
  const [initialized, setInitialized] = useState(false);

  // Tous les rôles (patient, admin, secrétaire, médecin) récupèrent leurs
  // notifications réelles depuis le backend :
  //  - patient      → ses propres notifications
  //  - admin        → les notifications de tous les patients
  //  - médecin      → celles des patients de son cabinet
  //  - secrétaire   → celles des patients de son cabinet
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const list = await notificationService.getNotifications();
      setNotifications(list);
      setInitialized(true);
    } catch (err) {
      console.warn('Notifications indisponibles :', err?.message);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setInitialized(false);
      return undefined;
    }

    // Chargement initial + polling toutes les 60 secondes.
    refresh();
    const intervalId = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      clearInterval(intervalId);
      setNotifications([]);
      setInitialized(false);
    };
  }, [user, refresh]);

  const markAsRead = useCallback(
    async (id) => {
      try {
        await notificationService.markAsRead(id);
        await refresh();
      } catch (err) {
        console.warn('Impossible de marquer la notification comme lue :', err?.message);
      }
    },
    [refresh]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      await refresh();
    } catch (err) {
      console.warn('Impossible de tout marquer comme lu :', err?.message);
    }
  }, [refresh]);

  const addNotification = useCallback((title, message, type = 'info') => {
    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        title,
        message,
        type,
        time: "À l'instant",
        isRead: false,
      },
      ...prev,
    ]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isPatient,
        initialized,
        refresh,
        markAsRead,
        markAllAsRead,
        addNotification,
        removeNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications doit être utilisé dans NotificationProvider');
  }
  return context;
};
