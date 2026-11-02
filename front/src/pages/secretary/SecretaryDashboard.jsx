// src/pages/secretary/SecretaryDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import { patientService } from '../../services/patientService';
import { secretaryService } from '../../services/secretaryService';
import { appointmentService } from '../../services/appointmentService';
import { paymentService } from '../../services/paymentService';
import { Users, Calendar, CreditCard, MessageSquare, AlertCircle, Clock, UserPlus, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SecretaryDashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [latePayments, setLatePayments] = useState([]);

  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [patientFormData, setPatientFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '1990-05-15',
    gender: 'Homme',
    address: 'Tunis, Tunisie',
    password: ''
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    const docId = user?.doctorId;
    if (!docId) return;

    try {
      const [myPats, myApts, myPays] = await Promise.all([
        patientService.getPatientsByDoctor(docId).catch(() => []),
        appointmentService.getAppointmentsByDoctor(docId).catch(() => []),
        paymentService.getPaymentsByDoctor(docId).catch(() => []),
      ]);

      setPatients(myPats);
      setAppointments(myApts);
      setLatePayments(myPays.filter(p => p.status === 'En retard' || p.status === 'Partiellement payé' || p.status === 'overdue' || p.status === 'partial'));
    } catch (err) {
      console.error('Erreur chargement dashboard secrétaire:', err);
    }
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    let docId = user?.doctorId;
    if (!docId) {
      try {
        const assigned = await secretaryService.getMyDoctorId();
        docId = assigned?.doctorId;
      } catch (err) {
        console.warn('Impossible de récupérer le médecin associé :', err?.message);
      }
    }
    if (!docId) {
      alert('Erreur: Aucun médecin associé à votre compte secrétaire.');
      return;
    }
    await patientService.addPatient({
      ...patientFormData,
      doctorId: docId
    });
    setIsAddPatientModalOpen(false);
    setPatientFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dob: '1990-05-15',
      gender: 'Homme',
      address: 'Tunis, Tunisie',
      password: ''
    });
    loadData();
  };

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="panel p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A]">
            Tableau de bord Secrétariat — Mme. {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Espace Secrétariat Médical
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setIsAddPatientModalOpen(true)}
            className="px-3.5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-xs rounded-md shadow-2xs flex items-center space-x-1 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Nouveau Patient</span>
          </button>
          <Link
            to="/secretary/appointments"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-md shadow-2xs"
          >
            + RDV
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Patients Totaux"
          value={patients.length}
          icon={Users}
          trendValue="Rattachés au cabinet"
        />
        <StatCard
          title="RDV Aujourd'hui"
          value={appointments.length}
          icon={Calendar}
          trendValue="Consultations enregistrées"
        />
        <StatCard
          title="Factures / Impayés"
          value={latePayments.length}
          icon={CreditCard}
          trendValue="Dossiers en attente"
        />
        <StatCard
          title="Messages Non Lus"
          value="0"
          icon={MessageSquare}
          trendValue="Messagerie interne"
        />
      </div>

      {/* Grid section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Appointments Table Panel */}
        <div className="lg:col-span-7 panel">
          <div className="panel-header">
            <h2 className="panel-title">Rendez-vous de la journée</h2>
            <Link to="/secretary/appointments" className="text-xs font-semibold text-[#3B82F6] hover:underline">
              Voir agenda
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase text-[11px] tracking-wider">
                  <th className="px-4 py-2.5">Patient</th>
                  <th className="px-4 py-2.5">Heure</th>
                  <th className="px-4 py-2.5">Motif</th>
                  <th className="px-4 py-2.5">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-[#0F172A]">{apt.patientName}</td>
                    <td className="px-4 py-2.5 text-slate-600 font-semibold">{apt.time}</td>
                    <td className="px-4 py-2.5 text-slate-500">{apt.reason}</td>
                    <td className="px-4 py-2.5">
                      <span className={`status-tag ${
                        apt.status === 'Confirmé' || apt.status === 'Arrivé' ? 'tag-green' :
                        apt.status === 'En attente' ? 'tag-blue' : 'tag-orange'
                      }`}>
                        {apt.status || 'Confirmé'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Debts & Reminders Panel */}
        <div className="lg:col-span-5 panel">
          <div className="panel-header">
            <h2 className="panel-title flex items-center text-rose-700">
              <AlertCircle className="w-4 h-4 mr-1.5 text-rose-600" />
              Alerte Impayés & Relances
            </h2>
            <Link to="/secretary/payments" className="text-xs text-[#3B82F6] font-semibold hover:underline">
              Relancer
            </Link>
          </div>

          <div className="p-3.5 space-y-2.5 overflow-y-auto max-h-[320px]">
            {latePayments.map((p) => (
              <div key={p.id} className="p-3 bg-[#F8FAFC] rounded-md border border-[#E2E8F0] flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#0F172A] block">{p.patientName}</span>
                  <span className="text-rose-600 font-semibold">Reste dû : {p.remainingAmount} DT</span>
                </div>
                <span className="status-tag tag-orange">
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Add Patient by Secretary */}
      <Modal
        isOpen={isAddPatientModalOpen}
        onClose={() => setIsAddPatientModalOpen(false)}
        title={`Inscrire un Nouveau Patient — Cabinet ${user?.doctorName || 'Dr. Slim Ben Ali'}`}
      >
        <form onSubmit={handleCreatePatient} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Prénom du Patient</label>
              <input
                type="text"
                required
                placeholder="Ex: Yassine"
                value={patientFormData.firstName}
                onChange={(e) => setPatientFormData({ ...patientFormData, firstName: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nom du Patient</label>
              <input
                type="text"
                required
                placeholder="Ex: Trabelsi"
                value={patientFormData.lastName}
                onChange={(e) => setPatientFormData({ ...patientFormData, lastName: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Patient</label>
              <input
                type="email"
                required
                placeholder="yassine.trabelsi@gmail.com"
                value={patientFormData.email}
                onChange={(e) => setPatientFormData({ ...patientFormData, email: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Téléphone Mobile</label>
              <input
                type="text"
                required
                placeholder="+216 98 444 555"
                value={patientFormData.phone}
                onChange={(e) => setPatientFormData({ ...patientFormData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date Naissance</label>
              <input
                type="date"
                required
                value={patientFormData.dob}
                onChange={(e) => setPatientFormData({ ...patientFormData, dob: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sexe</label>
              <select
                value={patientFormData.gender}
                onChange={(e) => setPatientFormData({ ...patientFormData, gender: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md focus:outline-hidden focus:border-[#3B82F6]"
              >
                <option value="Homme">Homme</option>
                <option value="Femme">Femme</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="8 caractères minimum"
              value={patientFormData.password}
              onChange={(e) => setPatientFormData({ ...patientFormData, password: e.target.value })}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md focus:outline-hidden focus:border-[#3B82F6]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Adresse Résidence</label>
            <input
              type="text"
              placeholder="Avenue Habib Bourguiba, Tunis"
              value={patientFormData.address}
              onChange={(e) => setPatientFormData({ ...patientFormData, address: e.target.value })}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md focus:outline-hidden focus:border-[#3B82F6]"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddPatientModalOpen(false)}
              className="px-3.5 py-1.5 border border-[#E2E8F0] rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs rounded-md shadow-2xs"
            >
              Créer la Fiche Patient
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
