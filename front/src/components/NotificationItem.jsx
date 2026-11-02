// src/components/NotificationItem.jsx
import React from 'react';

/**
 * Temps écoulé relatif ("Il y a 2 heures") ou date si plus ancien.
 */
export const timeAgo = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "À l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Une notification affichée dans le dropdown / la liste.
 */
export default function NotificationItem({ notification, onSelect }) {
  const { title, message, isRead, typeLabel } = notification;

  return (
    <button
      type="button"
      onClick={() => onSelect && onSelect(notification)}
      className={`w-full text-left p-3 hover:bg-slate-50 transition-colors ${
        isRead ? '' : 'bg-blue-50/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold text-slate-900">{title}</span>
        <span className="text-[10px] text-slate-400 shrink-0">
          {notification.time || timeAgo(notification.createdAt)}
        </span>
      </div>
      <p className="text-[11px] text-slate-600 mt-0.5">{message}</p>
      {typeLabel && !isRead && (
        <span className="text-[10px] text-blue-600 font-semibold mt-1 block">{typeLabel}</span>
      )}
    </button>
  );
}