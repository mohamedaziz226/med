// src/components/calendar/AppointmentRequests.jsx
// Demandes de rendez-vous en attente (vue médecin / secrétaire).
// Actions : accepter (PENDING→CONFIRMED), refuser (PENDING→REJECTED),
// proposer un autre créneau (la demande reste PENDING, proposed_at renseigné).
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, XCircle, Clock, RefreshCw, Inbox } from 'lucide-react';
import Modal from '../Modal';
import { appointmentService } from '../../services/appointmentService';
import { secretaryService } from '../../services/secretaryService';
import { getApiErrorMessage } from '../../services/api';
import { isoToLocalInputValue } from '../../utils/timezone';

// Affichage explicite en heure métier Africa/Tunis (indépendant du navigateur).
const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Africa/Tunis',
      })
    : '';

export default function AppointmentRequests({ doctorId: doctorIdProp, onChanged }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [reschedTarget, setReschedTarget] = useState(null);
  const [reschedValue, setReschedValue] = useState('');
  const [reschedReason, setReschedReason] = useState('');

  const resolveDoctorId = useCallback(async () => {
    if (doctorIdProp) return Number(doctorIdProp);
    return secretaryService.resolveDoctorIdForUser(user);
  }, [doctorIdProp, user]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const docId = await resolveDoctorId();
      if (!docId) {
        setRequests([]);
        return;
      }
      const all = await appointmentService.getAppointmentsByDoctor(docId);
      setRequests(all.filter((a) => a.status === 'En attente'));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [resolveDoctorId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 3500);
  };

  const runAction = async (target, action) => {
    setBusyId(target.id);
    setError('');
    try {
      await action();
      flash('Action appliquée : le patient reçoit une notification.');
      await loadRequests();
      onChanged && onChanged();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleAccept = (request) =>
    runAction(request, () => appointmentService.acceptAppointment(request.id));

  const handleRejectSubmit = (e) => {
    e.preventDefault();
    const target = rejectTarget;
    const reason = rejectReason;
    setRejectTarget(null);
    setRejectReason('');
    runAction(target, () => appointmentService.rejectAppointment(target.id, reason));
  };

  const handleReschedSubmit = (e) => {
    e.preventDefault();
    const target = reschedTarget;
    const proposedAt = reschedValue;
    const reason = reschedReason;
    setReschedTarget(null);
    setReschedValue('');
    setReschedReason('');
    runAction(target, () => appointmentService.rescheduleAppointment(target.id, proposedAt, reason));
  };

  return (
    <div className="space-y-4">
      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
          {notice}
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-sm flex items-center">
          <Inbox className="w-4 h-4 mr-2 text-amber-600" />
          Demandes de Rendez-vous en Attente ({requests.length})
        </h3>
        <button
          onClick={loadRequests}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 text-xs flex items-center cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
          Aucune demande en attente pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">{req.patientName || `Patient #${req.patientId}`}</span>
                  <span className="status-tag tag-orange text-[10px]">En attente</span>
                </div>
                <p className="text-xs text-slate-600 font-semibold">
                  Demandé pour le : <strong className="text-slate-900">{formatDateTime(req.scheduledAt)}</strong>
                </p>
                {req.reason && <p className="text-xs text-slate-500">Motif : {req.reason}</p>}
                {req.proposedAt && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 font-medium">
                    Créneau alternatif proposé : <strong>{formatDateTime(req.proposedAt)}</strong>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => handleAccept(req)}
                  disabled={busyId === req.id}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Accepter</span>
                </button>

                <button
                  onClick={() => {
                    setReschedTarget(req);
                    // Heure murale métier (Africa/Tunis), pas l'heure UTC du navigateur.
                    setReschedValue(isoToLocalInputValue(req.scheduledAt));
                  }}
                  disabled={busyId === req.id}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Autre créneau</span>
                </button>

                <button
                  onClick={() => setRejectTarget(req)}
                  disabled={busyId === req.id}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Refuser</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Refuser */}
      {rejectTarget && (
        <Modal isOpen={Boolean(rejectTarget)} onClose={() => setRejectTarget(null)} title="Refuser la demande de rendez-vous">
          <form onSubmit={handleRejectSubmit} className="space-y-3 text-xs">
            <p className="text-slate-600">
              Êtes-vous sûr de vouloir refuser la demande de <strong>{rejectTarget.patientName}</strong> ?
            </p>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Motif du refus (optionnel)</label>
              <textarea
                rows={3}
                placeholder="ex: Indisponibilité du praticien..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
              />
            </div>
            <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
              <button type="button" onClick={() => setRejectTarget(null)} className="px-3.5 py-2 border rounded-xl font-semibold">
                Annuler
              </button>
              <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-2xs">
                Confirmer le refus
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Proposer autre créneau */}
      {reschedTarget && (
        <Modal isOpen={Boolean(reschedTarget)} onClose={() => setReschedTarget(null)} title="Proposer un autre créneau">
          <form onSubmit={handleReschedSubmit} className="space-y-3 text-xs">
            <p className="text-slate-600">
              Proposer une nouvelle date/heure à <strong>{reschedTarget.patientName}</strong> :
            </p>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nouveau créneau proposé</label>
              <input
                type="datetime-local"
                required
                value={reschedValue}
                onChange={(e) => setReschedValue(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Note d'information au patient</label>
              <textarea
                rows={2}
                placeholder="ex: Créneau initial complet, nous vous proposons ce créneau..."
                value={reschedReason}
                onChange={(e) => setReschedReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
              />
            </div>
            <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
              <button type="button" onClick={() => setReschedTarget(null)} className="px-3.5 py-2 border rounded-xl font-semibold">
                Annuler
              </button>
              <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-2xs">
                Envoyer la proposition
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

