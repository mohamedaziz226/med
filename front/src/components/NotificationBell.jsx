// src/components/NotificationBell.jsx
import React from 'react';
import { Bell } from 'lucide-react';

/**
 * Cloche de notifications avec badge du nombre de notifications non lues.
 */
export default function NotificationBell({ unreadCount, onClick }) {
  return (
    <button
      onClick={onClick}
      title="Notifications"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 relative transition-colors focus:outline-hidden"
    >
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}