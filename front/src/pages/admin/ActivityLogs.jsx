// src/pages/admin/ActivityLogs.jsx
import React, { useEffect, useState } from 'react';
import DataTable from '../../components/DataTable';
import { adminService } from '../../services/adminService';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const data = await adminService.getChatbotLogs();
        const normalized = (data || []).map((log) => ({
          user: log.user?.email || 'Système',
          role: log.user?.role || 'system',
          action: log.action || 'chatbot',
          details: log.message || 'Aucune information',
          timestamp: log.createdAt || log.created_at || ''
        }));
        setLogs(normalized);
      } catch (error) {
        console.error('Impossible de charger les logs :', error);
        setLogs([]);
      }
    };

    loadLogs();
  }, []);

  const columns = [
    { header: 'Utilisateur', accessor: 'user' },
    {
      header: 'Rôle',
      render: (l) => (
        <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-800">
          {l.role}
        </span>
      )
    },
    { header: 'Action', accessor: 'action' },
    { header: 'Détails', accessor: 'details' },
    { header: 'Horodatage', accessor: 'timestamp' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Journaux d'activité</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Historique d'audit complet de toutes les actions et transactions du secrétariat médical.
        </p>
      </div>

      <DataTable columns={columns} data={logs} searchPlaceholder="Filtrer les journaux..." />
    </div>
  );
}
