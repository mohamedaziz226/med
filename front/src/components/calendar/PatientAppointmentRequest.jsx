// src/components/calendar/PatientAppointmentRequest.jsx
// Demande de rendez-vous côté patient :
// 1. sélection du médecin ;
// 2. consultation des SEULS créneaux réellement libres
//    (GET /calendar/doctors/{id}/slots — aucune donnée privée d'autres patients) ;
// 3. choix date + heure puis envoi → demande créée côté backend avec statut PENDING.
// Le patient reçoit ensuite une notification après validation ou refus
// (voir AppointmentRequests côté staff et les événements n8n).
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Modal';
import { AlertCircle, Loader2 } from 'lucide-react';
import { appointmentService } from '../../services/appointmentService';
import { calendarService } from '../../services/calendarService';
import { getApiErrorMessage } from '../../services/api';

const todayIso = () => new Date().toISOString().split('T')[0];

export default function PatientAppointmentRequest({
  isOpen,
  onClose,
  doctors = [],
  defaultDoctorId,
  patientId,
  patientName,
  onRequested,
}) {
  const [form, setForm] = useState({
    doctorId: '',
    date: todayIso(),
    time: '10:00',
    reason: 'Consultation Générale',
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState('');

  // Réinitialisation à chaque ouverture de la modale.
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setAvailableSlots([]);
    const initial = String(defaultDoctorId || doctors[0]?.id || '');
    setForm((f) => ({
      ...f,
      doctorId: initial,
      date: todayIso(),
      time: '10:00',
      reason: 'Consultation Générale',
    }));
  }, [isOpen, defaultDoctorId, doctors]);

  // Créneaux réellement libres du médecin pour le jour choisi (vision patient).
  const fetchAvailableSlots = useCallback(async (docId, selectedDate) => {
    if (!docId || !selectedDate) return;
    setLoadingSlots(true);
    try {
      const slots = await calendarService.getAvailableSlots(docId, selectedDate, selectedDate);
      setAvailableSlots(slots);
      if (slots.length > 0) {
        const firstTime = new Date(slots[0].start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        setForm((f) => ({ ...f, time: firstTime }));
      }
    } catch (err) {
      console.warn('Erreur chargement créneaux libres:', err);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && form.doctorId && form.date) {
      fetchAvailableSlots(form.doctorId, form.date);
    }
  }, [isOpen, form.doctorId, form.date, fetchAvailableSlots]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const targetDocId = Number(form.doctorId || defaultDoctorId);
    if (!targetDocId) {
      setError('Veuillez sélectionner un médecin.');
      return;
    }

    try {
      const doc = doctors.find((d) => String(d.id) === String(targetDocId));
      await appointmentService.createAppointment({
        patientId: Number(patientId),
        patientName,
        doctorId: targetDocId,
        doctorName: doc ? `Dr. ${doc.firstName} ${doc.lastName}` : 'Dr. Spécialiste',
        date: form.date,
        time: form.time,
        reason: form.reason,
        status: 'En attente',
      });
      onClose?.();
      onRequested?.();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Demander un rendez-vous médical">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {doctors.length > 1 && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Médecin Spécialiste</label>
            <select
              value={form.doctorId}
              onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.firstName} {d.lastName} ({d.specialty || 'Médecin généraliste'})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date souhaitée</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Heure du créneau</label>
            <input
              type="time"
              required
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
            />
          </div>
        </div>

        {loadingSlots && (
          <div className="flex items-center space-x-2 text-slate-500 text-xs p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Recherche des créneaux disponibles...</span>
          </div>
        )}

        {!loadingSlots && availableSlots.length > 0 && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
            <span className="text-[11px] font-bold text-emerald-900 block mb-1.5">
              Créneaux réellement libres ce jour-là :
            </span>
            <div className="flex flex-wrap gap-1.5">
              {availableSlots.map((slot, i) => {
                const timeStr = new Date(slot.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setForm({ ...form, time: timeStr })}
                    className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold border transition-all ${
                      form.time === timeStr
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {timeStr}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!loadingSlots && availableSlots.length === 0 && form.doctorId && (
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-500">
            Aucun créneau disponible ce jour-là. La demande restera « En attente » jusqu'à validation par le secrétariat.
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Motif du rendez-vous</label>
          <input
            type="text"
            required
            placeholder="ex: Bilan annuel, Douleurs, Contrôle..."
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
          />
        </div>

        <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
          <button type="submit" className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-2xs">
            Envoyer la demande
          </button>
        </div>
      </form>
    </Modal>
  );
}

