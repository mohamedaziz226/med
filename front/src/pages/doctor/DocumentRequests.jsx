// src/pages/doctor/DocumentRequests.jsx
import React, { useState, useEffect } from 'react';
import { documentService } from '../../services/documentService';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import { Send, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function DocumentRequests() {
  const [requests, setRequests] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const list = await documentService.getDocumentRequests();
    setRequests(list);
  };

  const handleProcessRequest = async (status) => {
    if (!selectedReq) return;
    await documentService.updateRequestStatus(selectedReq.id, status, responseText);
    setSelectedReq(null);
    setResponseText('');
    loadRequests();
  };

  const columns = [
    { header: 'Patient', accessor: 'patientName' },
    {
      header: 'Type de document',
      render: (r) => (
        <span className="px-2.5 py-1 bg-amber-50 text-amber-800 font-bold text-xs rounded-lg border border-amber-100">
          {r.documentType}
        </span>
      )
    },
    { header: 'Message / Motif', accessor: 'message' },
    { header: 'Date Soumission', accessor: 'createdAt' },
    {
      header: 'Statut',
      render: (r) => (
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
          r.status === 'Validée' ? 'bg-emerald-100 text-emerald-800' : r.status === 'Refusée' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {r.status}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Demandes de Documents Patients</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Répondez aux demandes officielles d'ordonnances, duplicatas ou comptes-rendus d'IRM/Scanner.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={requests}
        searchPlaceholder="Rechercher une demande..."
        actions={(req) => (
          <button
            onClick={() => {
              setSelectedReq(req);
              setResponseText(req.response || '');
            }}
            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-xl border border-teal-200 transition-colors"
          >
            Traiter
          </button>
        )}
      />

      {selectedReq && (
        <Modal isOpen={!!selectedReq} onClose={() => setSelectedReq(null)} title={`Traiter la demande : ${selectedReq.documentType}`}>
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <p className="font-bold text-slate-900">{selectedReq.patientName}</p>
              <p className="text-slate-600 mt-1">"{selectedReq.message}"</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Message de réponse au patient</label>
              <textarea
                rows={3}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Rédigez vos instructions ou confirmation d'envoi..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
              />
            </div>

            <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
              <button
                onClick={() => handleProcessRequest('Refusée')}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200"
              >
                Refuser
              </button>
              <button
                onClick={() => handleProcessRequest('Validée')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Valider & Envoyer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
