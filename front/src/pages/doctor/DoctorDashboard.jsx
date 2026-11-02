// src/pages/doctor/DoctorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import PatientDossierModal from '../../components/PatientDossierModal';
import Modal from '../../components/Modal';
import { patientService } from '../../services/patientService';
import { appointmentService } from '../../services/appointmentService';
import { documentService } from '../../services/documentService';
import { secretaryService } from '../../services/secretaryService';
import { Users, Calendar, FileText, Send, Briefcase, Eye, Stethoscope, Plus, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [todayApts, setTodayApts] = useState([]);
  const [pendingDocReqs, setPendingDocReqs] = useState([]);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const [isAddSecModalOpen, setIsAddSecModalOpen] = useState(false);
  const [secFormData, setSecFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '+216 20 111 222',
    password: ''
  });

  const [secretaries, setSecretaries] = useState([]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    const docId = user?.doctorId || user?.id;
    if (!docId) return;

    try {
      const [myPats, myApts, docs, secs] = await Promise.all([
        patientService.getPatientsByDoctor(docId).catch(() => []),
        appointmentService.getAppointmentsByDoctor(docId).catch(() => []),
        documentService.getDocumentsByDoctor(docId).catch(() => []),
        secretaryService.getSecretariesByDoctor(docId).catch(() => []),
      ]);

      setPatients(myPats);
      setTodayApts(myApts);
      setPendingDocReqs(docs.filter(d => d.status === 'En attente' || d.status === 'pending'));
      setSecretaries(secs);
    } catch (err) {
      console.error('Erreur chargement dashboard docteur:', err);
    }
  };

  const handleOpenPatientDossier = (patientId) => {
    const found = patients.find(p => p.id === patientId) || patients[0];
    if (found) {
      setSelectedPatient(found);
      setIsDossierOpen(true);
    }
  };

  const handleCreateSecretary = async (e) => {
    e.preventDefault();
    await secretaryService.addSecretary({
      ...secFormData,
      doctorId: user?.doctorId || user?.id,
      doctorName: `Dr. ${user?.firstName} ${user?.lastName}`
    });
    setIsAddSecModalOpen(false);
    setSecFormData({ firstName: '', lastName: '', email: '', phone: '+216 20 111 222', password: '' });
    loadData();
  };

  return (
    <div className="space-y-5">
      {/* Welcome Panel */}
      <div className="panel p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
        <div>
          <div className="flex items-center space-x-2">
            <span className="status-tag tag-blue text-[10px] font-bold">Espace Praticien</span>
            <span className="text-xs text-slate-300">Spécialité : {user?.specialty || 'Cardiologie'}</span>
          </div>
          <h1 className="text-lg font-bold text-white mt-1">
            Tableau de Bord Médical — Dr. {user?.firstName} {user?.lastName}
          </h1>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setIsAddSecModalOpen(true)}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs rounded-md shadow-2xs flex items-center space-x-1 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Secrétaire</span>
          </button>
          <Link
            to="/doctor/my-patients"
            className="px-3.5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-xs rounded-md shadow-2xs flex items-center space-x-1.5"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Consulter Dossiers Patients</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Patients Autorisés"
          value={patients.length}
          icon={Users}
          trendValue="Suivi actif"
        />
        <StatCard
          title="Rendez-vous Jour"
          value={todayApts.length}
          icon={Calendar}
          trendValue="Consultations programmées"
        />
        <StatCard
          title="Documents à valider"
          value={pendingDocReqs.length}
          icon={Send}
          trendValue="Validation requise"
        />
        <StatCard
          title="Secrétaires Associées"
          value={secretaries.length}
          icon={Briefcase}
          trendValue="Assistant(e)s cabinet"
        />
      </div>

      {/* Two Column Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Appointments List */}
        <div className="lg:col-span-7 panel">
          <div className="panel-header">
            <h2 className="panel-title flex items-center">
              <Calendar className="w-4 h-4 text-[#3B82F6] mr-2" />
              Planning des Consultations du Jour
            </h2>
            <Link to="/doctor/appointments" className="text-xs text-[#3B82F6] hover:underline font-semibold">
              Gérer l'agenda
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {todayApts.length > 0 ? (
              todayApts.map((apt) => (
                <div key={apt.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[#0F172A] text-xs">{apt.patientName}</span>
                      <span className="status-tag tag-blue font-bold text-[10px]">
                        {apt.time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{apt.reason}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`status-tag ${
                      apt.status === 'Confirmé' ? 'tag-green' : 'tag-orange'
                    }`}>
                      {apt.status}
                    </span>
                    <button
                      onClick={() => handleOpenPatientDossier(apt.patientId)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-md shadow-2xs flex items-center"
                      title="Ouvrir le dossier médical"
                    >
                      <Eye className="w-3 h-3 mr-1 text-[#3B82F6]" /> Dossier
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">Aucun rendez-vous aujourd'hui.</p>
            )}
          </div>
        </div>

        {/* Document Requests Pending */}
        <div className="lg:col-span-5 panel">
          <div className="panel-header">
            <h2 className="panel-title flex items-center">
              <Send className="w-4 h-4 text-amber-600 mr-2" />
              Demandes de Documents Patients
            </h2>
            <Link to="/doctor/document-requests" className="text-xs text-[#3B82F6] font-semibold hover:underline">
              Traiter
            </Link>
          </div>

          <div className="p-3.5 space-y-2.5">
            {pendingDocReqs.length > 0 ? (
              pendingDocReqs.map((req) => (
                <div key={req.id} className="p-3 bg-[#F8FAFC] rounded-md border border-[#E2E8F0]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#0F172A]">{req.patientName}</span>
                    <span className="status-tag tag-orange text-[10px]">{req.documentType}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{req.message}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">Aucune demande en attente.</p>
            )}
          </div>
        </div>
      </div>

      {/* Patient Detailed Medical Dossier Modal */}
      {selectedPatient && (
        <PatientDossierModal
          isOpen={isDossierOpen}
          onClose={() => setIsDossierOpen(false)}
          patient={selectedPatient}
          doctorUser={user}
        />
      )}

      {/* Modal Add Secretary by Doctor */}
      <Modal
        isOpen={isAddSecModalOpen}
        onClose={() => setIsAddSecModalOpen(false)}
        title={`Rattacher une Secrétaire — Dr. ${user?.firstName} ${user?.lastName}`}
      >
        <form onSubmit={handleCreateSecretary} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Prénom de la Secrétaire</label>
              <input
                type="text"
                required
                placeholder="Ex: Selma"
                value={secFormData.firstName}
                onChange={(e) => setSecFormData({ ...secFormData, firstName: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nom de la Secrétaire</label>
              <input
                type="text"
                required
                placeholder="Ex: Mansour"
                value={secFormData.lastName}
                onChange={(e) => setSecFormData({ ...secFormData, lastName: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Professionnel</label>
            <input
              type="email"
              required
              placeholder="selma.secretaire@medsecretariat.tn"
              value={secFormData.email}
              onChange={(e) => setSecFormData({ ...secFormData, email: e.target.value })}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md focus:outline-hidden focus:border-[#3B82F6]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Téléphone Direct Cabinet</label>
            <input
              type="text"
              required
              placeholder="+216 20 111 222"
              value={secFormData.phone}
              onChange={(e) => setSecFormData({ ...secFormData, phone: e.target.value })}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md focus:outline-hidden focus:border-[#3B82F6]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="8 caractères minimum"
              value={secFormData.password}
              onChange={(e) => setSecFormData({ ...secFormData, password: e.target.value })}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md focus:outline-hidden focus:border-[#3B82F6]"
            />
          </div>

          <div className="p-3 bg-blue-50/60 rounded-md border border-blue-100 text-slate-600 text-[11px]">
            <p className="font-semibold text-[#3B82F6]">Lien de Rattachement Automatique :</p>
            Cette secrétaire sera directement associée au cabinet du <strong>Dr. {user?.firstName} {user?.lastName}</strong> ({user?.specialty || 'Cardiologie'}).
          </div>

          <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddSecModalOpen(false)}
              className="px-3.5 py-1.5 border border-[#E2E8F0] rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs rounded-md shadow-2xs"
            >
              Créer la Secrétaire
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

