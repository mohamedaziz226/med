// src/pages/doctor/MyPatients.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import DataTable from '../../components/DataTable';
import PatientDossierModal from '../../components/PatientDossierModal';
import { Eye } from 'lucide-react';

export default function DoctorMyPatients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);

  useEffect(() => {
    loadMyPatients();
  }, [user]);

  const loadMyPatients = async () => {
    if (!user) return;
    const docId = user?.doctorId;
    if (!docId) {
      setPatients([]);
      return;
    }
    const myPats = await patientService.getPatientsByDoctor(docId);
    setPatients(myPats);
  };

  const handleOpenDossier = (pat) => {
    setSelectedPatient(pat);
    setIsDossierModalOpen(true);
  };

  const columns = [
    {
      header: 'Patient',
      render: (pat) => (
        <div className="flex items-center space-x-3">
          <img
            src={pat.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
            alt=""
            className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200"
          />
          <div>
            <span className="font-bold text-[#0F172A] block text-xs">{pat.firstName} {pat.lastName}</span>
            <span className="text-[10px] text-slate-400">{pat.email}</span>
          </div>
        </div>
      )
    },
    { header: 'Téléphone', accessor: 'phone' },
    { header: 'Date de naissance', accessor: 'dob' },
    {
      header: 'Groupe sanguin',
      render: (pat) => (
        <span className="status-tag tag-rose font-bold">
          {pat.bloodType || 'O+'}
        </span>
      )
    },
    {
      header: 'Allergies',
      render: (pat) => (
        <span className="text-xs font-semibold text-slate-700">
          {pat.allergies ? pat.allergies.join(', ') : 'Aucune'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <div className="panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A]">Dossiers Médicaux Patients</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Accès complet aux informations médicales, examens, imageries et notes de consultations.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={patients}
        searchPlaceholder="Rechercher un patient par nom, e-mail, téléphone..."
        actions={(pat) => (
          <button
            onClick={() => handleOpenDossier(pat)}
            className="flex items-center px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-xs rounded-md shadow-2xs transition-colors"
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Consulter Dossier
          </button>
        )}
      />

      {/* High Density Detailed Patient Medical Record & Notes Modal */}
      {selectedPatient && (
        <PatientDossierModal
          isOpen={isDossierModalOpen}
          onClose={() => setIsDossierModalOpen(false)}
          patient={selectedPatient}
          doctorUser={user}
        />
      )}
    </div>
  );
}

