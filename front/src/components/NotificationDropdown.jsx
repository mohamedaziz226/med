// src/components/NotificationDropdown.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import NotificationItem from './NotificationItem';

/**
 * Dropdown « Notifications » — dernières notifications + actions.
 */
export default function NotificationDropdown({
  notifications,
  unreadCount,
  isPatient,
  onSelect,
  onMarkAllAsRead,
  viewAllPath,
}) {
  if (!notifications || notifications.length === 0) {
    return (
      <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-6 z-50">
        <div className="flex flex-col items-center text-center px-6">
          <Bell className="w-6 h-6 text-slate-300 mb-2" />
          <span className="text-xs font-bold text-slate-700">Notifications</span>
          <span className="text-[11px] text-slate-500 mt-1">Aucune notification pour le moment.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-2 z-50">
      <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
        <span className="font-bold text-xs text-slate-900">Notifications</span>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="text-[11px] text-[#3B82F6] hover:underline font-semibold"
          >
            Tout marquer lu
          </button>
        )}
      </div>

      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
        {notifications.slice(0, 8).map((n) => (
          <NotificationItem key={n.id} notification={n} onSelect={onSelect} />
        ))}
      </div>

      {isPatient && viewAllPath && (
        <Link
          to={viewAllPath}
          className="block text-center text-[11px] font-bold text-[#3B82F6] py-2.5 border-t border-slate-100 hover:bg-blue-50/50"
        >
          Voir toutes les notifications
        </Link>
      )}
    </div>
  );
}