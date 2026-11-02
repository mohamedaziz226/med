// src/pages/patient/PatientDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import { appointmentService } from '../../services/appointmentService';
import { documentService } from '../../services/documentService';
import { paymentService } from '../../services/paymentService';
import { doctorService } from '../../services/doctorService';
import { patientService } from '../../services/patientService';
import { Calendar, FileText, Send, CreditCard, Clock, Plus, Stethoscope, ChevronRight, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [myDoctors, setMyDoctors] = useState([]);
  const [clinicalNotes, setClinicalNotes] = useState([]);

  useEffect(() => {
    loadData();
  }, [user]);

    const loadData = async () => {
    const patId = user?.patientId || user?.id;
    if (!patId) return;

    try {
      const me = await patientService.getMe().catch(() => null);
      const [apts, docs, pays, allDocs] = await Promise.all([
        appointmentService.getAppointmentsByPatient(patId).catch(() => []),
        documentService.getDocumentsByPatient(patId).catch(() => []),
        paymentService.getPaymentsByPatient(patId).catch(() => []),
        doctorService.getAllDoctors().catch(() => []),
      ]);

      // Mes docteurs = les docteurs réellement associés au patient (doctor_id),
      // et non tous les docteurs du système.
      const myDoctorIds = me?.doctorIds || (me?.doctorId ? [me.doctorId] : []);
      const myDocs = allDocs.filter((d) => myDoctorIds.includes(d.id));

      setAppointments(apts);
      setDocuments(docs);
      setPayments(pays);
      setMyDoctors(myDocs);
      setClinicalNotes([]);
    } catch (err) {
      console.error('Erreur chargement dashboard patient:', err);
    }
  };

  const nextAppointment = appointments.find(a => a.status === 'Confirmé' || a.status === 'confirmed');

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="panel p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-[#0F172A] to-slate-800 text-white border-0">
        <div>
          <div className="flex items-center space-x-2">
            <span className="status-tag tag-blue text-[10px] font-bold">Portail Patient Sécurisé</span>
            <span className="text-xs text-slate-300">Mon Dossier Médical</span>
          </div>
          <h1 className="text-lg font-bold text-white mt-1">
            Espace Patient — {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Suivi médical auprès de {myDoctors.length} spécialiste(s) disponible(s).
          </p>
        </div>

        <Link
          to="/patient/my-doctors"
          className="px-3.5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-xs rounded-md shadow-2xs shrink-0 flex items-center space-x-1.5"
        >
          <Stethoscope className="w-3.5 h-3.5" />
          <span>Mes Médecins & Comptes-rendus</span>
        </Link>
      </div>

      {/* Next Appointment Alert */}
      {nextAppointment && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-md shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="status-tag tag-green text-[10px] uppercase font-bold">Prochaine consultation</span>
              <h3 className="font-bold text-[#0F172A] text-xs mt-0.5">{nextAppointment.reason}</h3>
              <p className="text-[11px] text-emerald-900 mt-0.5">
                Le {nextAppointment.date} à <strong>{nextAppointment.time}</strong> — Praticien : {nextAppointment.doctorName}
              </p>
            </div>
          </div>
          <Link
            to="/patient/appointments"
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-md shadow-2xs shrink-0"
          >
            Voir agenda
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Mes Médecins"
          value={myDoctors.length}
          icon={Stethoscope}
          trendValue="Spécialistes suivis"
        />
        <StatCard
          title="Factures / Paiements"
          value={payments.length}
          icon={CreditCard}
          trendValue="Paiements enregistrés"
        />
        <StatCard
          title="Rendez-vous"
          value={appointments.length}
          icon={Calendar}
          trendValue="Historique & à venir"
        />
        <StatCard
          title="Examens / Docs"
          value={documents.length}
          icon={Send}
          trendValue="Biologie & Imagerie"
        />
      </div>

      {/* My Treating Doctors Panel */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title flex items-center">
            <Stethoscope className="w-4 h-4 text-[#3B82F6] mr-2" />
            Mes Médecins Traitants & Spécialités
          </h2>
          <Link to="/patient/my-doctors" className="text-xs text-[#3B82F6] font-semibold hover:underline">
            Voir tous les comptes-rendus
          </Link>
        </div>

        <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {myDoctors.map((doc) => {
            const docNotes = clinicalNotes.filter(n => n.doctorId === doc.id);
            return (
              <div key={doc.id} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img src={doc.avatar} alt="" className="w-10 h-10 rounded-md object-cover ring-1 ring-slate-200" />
                  <div>
                    <span className="font-bold text-xs text-[#0F172A] block">Dr. {doc.firstName} {doc.lastName}</span>
                    <span className="text-[11px] text-[#3B82F6] font-semibold">{doc.specialty}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{doc.address}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="status-tag tag-blue text-[10px] font-bold block mb-1">
                    {docNotes.length} note(s)
                  </span>
                  <Link
                    to="/patient/my-doctors"
                    className="text-xs text-[#3B82F6] font-semibold hover:underline flex items-center justify-end"
                  >
                    Accéder <ChevronRight className="w-3 h-3 ml-0.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/patient/add-document"
          className="panel p-4 hover:border-blue-300 transition-all group flex flex-col justify-between"
        >
          <div className="p-2.5 bg-blue-50 text-[#3B82F6] rounded-md w-fit group-hover:bg-[#3B82F6] group-hover:text-white transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <div className="mt-3">
            <h4 className="font-bold text-[#0F172A] text-xs">Déposer un examen</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Transmettez vos résultats d'IRM, Scanners ou analyses biologiques.</p>
          </div>
        </Link>

        <Link
          to="/patient/request-document"
          className="panel p-4 hover:border-blue-300 transition-all group flex flex-col justify-between"
        >
          <div className="p-2.5 bg-blue-50 text-[#3B82F6] rounded-md w-fit group-hover:bg-[#3B82F6] group-hover:text-white transition-colors">
            <Send className="w-5 h-5" />
          </div>
          <div className="mt-3">
            <h4 className="font-bold text-[#0F172A] text-xs">Demander un compte-rendu</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Sollicitez un renouvellement d'ordonnance ou un bilan.</p>
          </div>
        </Link>

        <Link
          to="/patient/messages"
          className="panel p-4 hover:border-blue-300 transition-all group flex flex-col justify-between"
        >
          <div className="p-2.5 bg-blue-50 text-[#3B82F6] rounded-md w-fit group-hover:bg-[#3B82F6] group-hover:text-white transition-colors">
            <Send className="w-5 h-5" />
          </div>
          <div className="mt-3">
            <h4 className="font-bold text-[#0F172A] text-xs">Écrire au secrétariat</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Contactez l'assistant(e) médicale de votre médecin.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

