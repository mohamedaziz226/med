// src/pages/patient/AddDocument.jsx
import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { documentService } from '../../services/documentService';
import { Upload, FileText, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PatientAddDocument() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    type: 'IRM',
    title: '',
    examDate: new Date().toISOString().split('T')[0],
    description: '',
    file: null,
    fileName: ''
  });
  const fileInputRef = useRef(null);

    const handleSubmit = async (e) => {
    e.preventDefault();
    await documentService.addDocument({
      ...form,
      patientId: user?.patientId || user?.id,
      patientName: `${user?.firstName} ${user?.lastName}`,
      doctorId: 'doc_1',
      uploadedBy: 'patient',
      status: 'En attente'
    });
    setSuccess(true);
    setTimeout(() => {
      navigate('/patient/my-documents');
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-xs font-bold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Retour
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Déposer un examen médical</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Transmettez directement une IRM, un Scanner, des radiographies ou analyses à votre médecin.
        </p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl font-bold text-xs flex items-center">
          <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" />
          Document déposé avec succès ! Transmission au Dr. Slim Ben Ali...
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Type d'examen médical</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          >
            <option value="IRM">IRM (Imagerie par Résonance Magnétique)</option>
            <option value="Scanner">Scanner / TDM</option>
            <option value="Radiographie">Radiographie X</option>
            <option value="Analyse biologique">Analyse Biologique / Prélèvement Sang</option>
            <option value="Échographie">Échographie</option>
            <option value="Ordonnance extérieure">Ordonnance extérieure</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Titre de l'examen</label>
          <input
            type="text"
            required
            placeholder="ex: IRM Cérébrale du 12 Mars, Bilan sanguin complet..."
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Date d'effet / réalisation de l'examen</label>
          <input
            type="date"
            required
            value={form.examDate}
            onChange={(e) => setForm({ ...form, examDate: e.target.value })}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Zone de Téléversement Fichier (Image HD, PDF, Dicom)</label>
          <input
            ref={fileInputRef}
            type="file"
            required
            accept=".png,.jpg,.jpeg,.gif,.pdf,.dcm,.dicom,image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setForm({ ...form, file, fileName: file ? file.name : '' });
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-teal-200 rounded-2xl p-6 text-center bg-teal-50/20 hover:bg-teal-50/50 transition-all cursor-pointer"
          >
            {form.file ? (
              <span className="text-xs font-bold text-teal-800 flex items-center justify-center">
                <FileText className="w-4 h-4 mr-2" /> {form.fileName}
              </span>
            ) : (
              <>
                <Upload className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                <span className="text-xs font-bold text-slate-800 block">Glissez-déposez ou cliquez pour sélectionner votre fichier d'examen</span>
                <span className="text-[10px] text-slate-400">Formats acceptés : DICOM, PNG, JPEG, PDF (max 25 Mo)</span>
              </>
            )}
          </button>
          {form.file && (
            <button
              type="button"
              onClick={() => { setForm({ ...form, file: null, fileName: '' }); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              className="mt-2 text-[11px] font-semibold text-rose-500 hover:text-rose-700"
            >
              Retirer le fichier
            </button>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Remarques ou symptômes associés</label>
          <textarea
            rows={3}
            placeholder="Précisez tout détail utile pour le médecin..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <div className="pt-3 flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border rounded-xl text-xs"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs"
          >
            Transmettre le document
          </button>
        </div>
      </form>
    </div>
  );
}
