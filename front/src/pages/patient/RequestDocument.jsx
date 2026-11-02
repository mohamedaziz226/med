// src/pages/patient/RequestDocument.jsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { documentService } from '../../services/documentService';
import { Send, CheckCircle2, FileCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PatientRequestDocument() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    documentType: 'Bulletin de soin',
    message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
        await documentService.createDocumentRequest({
      patientId: user?.patientId || user?.id,
      patientName: `${user?.firstName} ${user?.lastName}`,
      doctorId: 'doc_1',
      documentType: form.documentType,
      type: form.documentType,
      message: form.message
    });
    setSuccess(true);
    setTimeout(() => {
      navigate('/patient/dashboard');
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Demander un Document Administratif ou Médical</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Demandez au secrétariat le renouvellement d'une ordonnance, un justificatif ou un compte-rendu d'IRM.
        </p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl font-bold text-xs flex items-center">
          <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" />
          Demande envoyée au secrétariat médical !
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Type de document sollicité</label>
          <select
            value={form.documentType}
            onChange={(e) => setForm({ ...form, documentType: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          >
            <option value="Bulletin de soin">Bulletin de soin</option>
            <option value="Examen complémentaire">Examen complémentaire</option>
            <option value="Certificat médical">Certificat médical</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Précisions & Détails pour la secrétaire</label>
          <textarea
            required
            rows={4}
            placeholder="Saisissez la liste des médicaments à renouveler ou le motif précis..."
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Transmettre la demande</span>
          </button>
        </div>
      </form>
    </div>
  );
}
