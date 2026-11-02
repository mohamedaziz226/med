// src/pages/patient/Notifications.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notificationService';
import { getApiErrorMessage } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { Bell, CheckCheck, CheckCircle2 } from 'lucide-react';

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function PatientNotifications() {
  const navigate = useNavigate();
  const { refresh: refreshBell } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const list = await notificationService.getNotifications();
      setNotifications(list);
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = async (n) => {
    if (!n.isRead) {
      await notificationService.markAsRead(n.id);
      load(false);
      refreshBell();
    }
    // Notification liée à un rendez-vous → espace rendez-vous patient.
    if (n.relatedEntityType === 'appointment') {
      navigate('/patient/appointments');
    }
  };

  const handleMarkAll = async () => {
    try {
      await notificationService.markAllAsRead();
      load(false);
      refreshBell();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rappels de rendez-vous et informations de votre espace patient.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors flex items-center"
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
            Tout marquer comme lu ({unreadCount})
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm divide-y divide-slate-100">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-14 text-slate-400 text-xs">
            <CheckCircle2 className="w-4 h-4 animate-pulse text-blue-500" />
            <span className="ml-2">Chargement des notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-slate-400">
            <Bell className="w-8 h-8 mb-2 text-slate-300" />
            <span className="text-xs font-semibold text-slate-600">Aucune notification</span>
            <span className="text-[11px] text-slate-400 mt-1">
              Les rappels de rendez-vous s'afficheront ici.
            </span>
          </div>
        ) : (
          notifications.map((n) => {
            const isUnread = !n.isRead;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleSelect(n)}
                className={`w-full text-left p-4 transition-colors hover:bg-slate-50 ${
                  isUnread ? 'bg-blue-50/40' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 min-w-0">
                    {isUnread ? (
                      <span className="flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5 shrink-0">
                        NON LUE
                      </span>
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    <span className={`text-xs font-bold truncate ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}>
                      {n.title}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 shrink-0">
                    {formatDate(n.createdAt)} - {formatTime(n.createdAt)}
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-1.5">{n.message}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-semibold text-blue-600">{n.typeLabel}</span>
                  {n.relatedEntityType === 'appointment' && (
                    <span className="text-[10px] text-blue-500 font-semibold">
                      Voir le rendez-vous →
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}