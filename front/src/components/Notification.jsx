// src/components/Notification.jsx
import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export default function Notification({ type = 'info', title, message, onClose }) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-900 icon-blue-600',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900 icon-emerald-600',
    warning: 'bg-amber-50 border-amber-200 text-amber-900 icon-amber-600',
    error: 'bg-rose-50 border-rose-200 text-rose-900 icon-rose-600',
  };

  const icons = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertCircle,
  };

  const Icon = icons[type] || Info;

  return (
    <div className={`p-4 rounded-2xl border shadow-md flex items-start justify-between ${styles[type]}`}>
      <div className="flex items-start space-x-3">
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          {title && <h5 className="font-bold text-xs uppercase tracking-wider">{title}</h5>}
          <p className="text-xs mt-0.5">{message}</p>
        </div>
      </div>
      {onClose && (
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
