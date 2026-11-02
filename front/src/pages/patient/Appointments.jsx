// src/pages/patient/Appointments.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { appointmentService } from '../../services/appointmentService';
import { doctorService } from '../../services/doctorService';
import DataTable from '../../components/DataTable';
import PatientAppointmentRequest from '../../components/calendar/PatientAppointmentRequest';
import Modal from '../../components/Modal';
import { getApiErrorMessage } from '../../services/api';
import { Plus, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

// Heure métier du cabinet, affichée explicitement en Africa/Tunis.
const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Africa/Tunis',
      })
    : '';

export default function PatientAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  // Feedback des actions « accepter / refuser la proposition ».
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [refuseTarget, setRefuseTarget] = useState(null);

  const patId = user?.patientId || user?.id;

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 4000);
  };

  const loadAppointments = useCallback(async () => {
    if (!patId) return;
    try {
      const list = await appointmentService.getAppointmentsByPatient(patId);
      setAppointments(list);
    } catch (err) {
      console.error('Erreur chargement rendez-vous patient:', err);
    }
  }, [patId]);

  const loadDoctors = useCallback(async () => {
    try {
      const docs = await doctorService.getAllDoctors();
      setDoctors(docs);
      if (docs.length > 0) {
        const defaultDocId = user?.doctorId || docs[0].id;
        setSelectedDoctorId(String(defaultDocId));
      }
    } catch (err) {
      console.error('Erreur chargement médecins:', err);
    }
  }, [user]);

  useEffect(() => {
    loadAppointments();
    loadDoctors();
  }, [loadAppointments, loadDoctors]);

  const handleAcceptProposition = async (apt) => {
    setBusyId(apt.id);
    setActionError('');
    try {
      await appointmentService.confirmAppointment(apt.id);
      flash('Proposition acceptée : votre rendez-vous est confirmé.');
      loadAppointments();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (apt) => {
    setBusyId(apt.id);
    setActionError('');
    try {
      await appointmentService.cancelAppointment(apt.id);
      flash('Votre rendez-vous a été annulé.');
      loadAppointments();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleRefuseSubmit = (e) => {
    e.preventDefault();
    const target = refuseTarget;
    setRefuseTarget(null);
    if (target) handleCancel(target);
  };

  const columns = [
    { header: 'Médecin', accessor: 'doctorName' },
    { header: 'Date', accessor: 'date' },
    { header: 'Heure', accessor: 'time' },
    { header: 'Motif', accessor: 'reason' },
    {
      header: 'Statut',
      render: (a) => (
        <div className="flex flex-col gap-1">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold w-fit ${
              a.status === 'Confirmé'
                ? 'bg-emerald-100 text-emerald-800'
                : a.status === 'Annulé' || a.status === 'Refusé'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {a.status}
          </span>
          {/* Proposition de créneau du secrétariat (demande toujours PENDING) */}
          {a.status === 'En attente' && a.proposedAt && (
            <span className="text-[11px] font-semibold text-amber-700">
              Nouvelle proposition de rendez-vous : {formatDateTime(a.proposedAt)}
            </span>
          )}
        </div>
      ),
    },
  ];

  // Actions patient : accepter / refuser la proposition du secrétariat.
  const actions = (a) => {
    const pendingWithProposal = a.status === 'En attente' && a.proposedAt;
    if (!pendingWithProposal && a.status !== 'En attente') {
      return <span className="text-slate-300 text-[11px]">—</span>;
    }
    return (
      <div className="flex items-center justify-end gap-1.5">
        {pendingWithProposal && (
          <button
            disabled={busyId === a.id}
            onClick={() => handleAcceptProposition(a)}
            className="flex items-center px-2.5 py-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
          >
            {busyId === a.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            )}
            Accepter la proposition
          </button>
        )}
        <button
          disabled={busyId === a.id}
          onClick={() => setRefuseTarget(a)}
          title={pendingWithProposal ? 'Refuser la proposition et annuler la demande' : 'Annuler la demande'}
          className="flex items-center px-2.5 py-1 border border-rose-200 hover:bg-rose-50 disabled:opacity-50 text-rose-600 font-semibold text-[11px] rounded-lg transition-colors cursor-pointer"
        >
          <XCircle className="w-3.5 h-3.5 mr-1" />
          Refuser
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mes Rendez-vous Médicaux</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Consultez les créneaux disponibles de votre médecin et effectuez une demande de rendez-vous en ligne.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Demander un Rendez-vous
        </button>
      </div>

      {(notice || actionError) && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold border ${
            notice
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {notice || actionError}
        </div>
      )}

      <DataTable
        columns={columns}
        data={appointments}
        searchPlaceholder="Rechercher un rendez-vous..."
        actions={actions}
      />

      {/* Demande de rendez-vous (composant calendrier patient) */}
      <PatientAppointmentRequest
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        doctors={doctors}
        defaultDoctorId={selectedDoctorId || user?.doctorId}
        patientId={Number(patId)}
        patientName={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}
        onRequested={loadAppointments}
      />

      {/* Confirmation du refus : annule la demande via PATCH status=cancelled */}
      {refuseTarget && (
        <Modal isOpen={Boolean(refuseTarget)} onClose={() => setRefuseTarget(null)} title="Refuser la proposition">
          <form onSubmit={handleRefuseSubmit} className="space-y-3 text-xs">
            <p className="text-slate-600">
              Refuser la proposition du{' '}
              <strong>{formatDateTime(refuseTarget.proposedAt)}</strong> pour le rendez-vous «{' '}
              {refuseTarget.reason || 'Consultation'} » ? La demande sera annulée ; vous pourrez
              en faire une nouvelle depuis les créneaux disponibles.
            </p>
            <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRefuseTarget(null)}
                className="px-3.5 py-2 border rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={busyId === refuseTarget.id}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-2xs cursor-pointer"
              >
                Confirmer le refus
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

