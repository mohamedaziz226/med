// src/components/calendar/AvailabilityManager.jsx
// Gestion des disponibilités (règles hebdomadaires ou journées précises) et
// des créneaux bloqués — composant partagé médecin / secrétaire.
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Clock, Ban, RefreshCw } from 'lucide-react';
import Modal from '../Modal';
import { calendarService, weekdayLabel } from '../../services/calendarService';
import { getApiErrorMessage } from '../../services/api';

const WEEKDAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6];

const toTimeInput = (value) => (value ? String(value).slice(0, 5) : '');

export default function AvailabilityManager({ doctorId, onChanged }) {
  const [availabilities, setAvailabilities] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [isAvailModalOpen, setIsAvailModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  const [availForm, setAvailForm] = useState({
    mode: 'weekday',
    weekday: 0,
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
  });
  const [blockForm, setBlockForm] = useState({ start: '', end: '', reason: '' });

  const loadData = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    setError('');
    try {
      const [avails, blocks] = await Promise.all([
        calendarService.getAvailability(doctorId),
        // Endpoint dédié : liste TOUS les blocages, sans paramètre de date
        // (getCalendar exige start_date/end_date → 422 « Field required »).
        calendarService.getBlockedSlots(doctorId),
      ]);
      setAvailabilities(avails);
      setBlockedSlots(blocks);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 3500);
  };

  const refreshAll = async (message) => {
    if (message) flash(message);
    await loadData();
    onChanged && onChanged();
  };

  const handleCreateAvailability = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await calendarService.createAvailability(doctorId, availForm);
      setIsAvailModalOpen(false);
      await refreshAll('Disponibilité enregistrée.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleToggleAvailability = async (availability) => {
    try {
      await calendarService.updateAvailability(availability.id, { isActive: !availability.isActive });
      await loadData();
      onChanged && onChanged();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleDeleteAvailability = async (id) => {
    try {
      await calendarService.deleteAvailability(id);
      await refreshAll('Disponibilité supprimée.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleBlockSlot = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await calendarService.blockSlot(doctorId, blockForm);
      setIsBlockModalOpen(false);
      setBlockForm({ start: '', end: '', reason: '' });
      await refreshAll('Créneau bloqué.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleUnblockSlot = async (id) => {
    try {
      await calendarService.unblockSlot(id);
      await refreshAll('Créneau débloqué.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <div>
          <h3 className="font-bold text-slate-800 text-sm">Gestion des Disponibilités & Congés</h3>
          <p className="text-xs text-slate-500">Configurez les plages de travail hebdomadaires et bloquez vos absences.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAvailModalOpen(true)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            + Disponibilité
          </button>
          <button
            onClick={() => setIsBlockModalOpen(true)}
            className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center shadow-2xs cursor-pointer"
          >
            <Ban className="w-3.5 h-3.5 mr-1.5" />
            + Bloquer Créneau
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Availabilities List */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center">
            <Clock className="w-4 h-4 mr-1.5 text-emerald-600" />
            Plages de Disponibilité ({availabilities.length})
          </h4>

          {availabilities.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Aucune plage définie.
            </div>
          ) : (
            <div className="space-y-2">
              {availabilities.map((a) => (
                <div
                  key={a.id}
                  className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 block">
                      {a.weekday !== null && a.weekday !== undefined
                        ? `Chaque ${weekdayLabel(a.weekday)}`
                        : `Date ponctuelle : ${a.date}`}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {toTimeInput(a.startTime)} — {toTimeInput(a.endTime)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleAvailability(a)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        a.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {a.isActive ? 'Actif' : 'Masqué'}
                    </button>
                    <button
                      onClick={() => handleDeleteAvailability(a.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Blocked Slots List */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center">
            <Ban className="w-4 h-4 mr-1.5 text-rose-600" />
            Créneaux Bloqués & Absences ({blockedSlots.length})
          </h4>

          {blockedSlots.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Aucun créneau bloqué.
            </div>
          ) : (
            <div className="space-y-2">
              {blockedSlots.map((b) => (
                <div
                  key={b.id}
                  className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-rose-900 block">{b.reason || 'Créneau bloqué'}</span>
                    <span className="text-rose-700 text-[11px]">
                      Du {new Date(b.start).toLocaleString('fr-FR')} au {new Date(b.end).toLocaleString('fr-FR')}
                    </span>
                  </div>

                  <button
                    onClick={() => handleUnblockSlot(b.id)}
                    className="p-1 text-rose-400 hover:text-rose-700 rounded-lg"
                    title="Débloquer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Add Availability */}
      <Modal isOpen={isAvailModalOpen} onClose={() => setIsAvailModalOpen(false)} title="Ajouter une plage de disponibilité">
        <form onSubmit={handleCreateAvailability} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Type de répétition</label>
            <select
              value={availForm.mode}
              onChange={(e) => setAvailForm({ ...availForm, mode: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
            >
              <option value="weekday">Hebdomadaire récurrent (ex: Tous les lundis)</option>
              <option value="date">Journée ponctuelle (ex: 2026-09-01)</option>
            </select>
          </div>

          {availForm.mode === 'weekday' ? (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Jour de la semaine</label>
              <select
                value={availForm.weekday}
                onChange={(e) => setAvailForm({ ...availForm, weekday: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
              >
                {WEEKDAY_OPTIONS.map((w) => (
                  <option key={w} value={w}>
                    {weekdayLabel(w)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date précise</label>
              <input
                type="date"
                required
                value={availForm.date}
                onChange={(e) => setAvailForm({ ...availForm, date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Heure de début</label>
              <input
                type="time"
                required
                value={availForm.startTime}
                onChange={(e) => setAvailForm({ ...availForm, startTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Heure de fin</label>
              <input
                type="time"
                required
                value={availForm.endTime}
                onChange={(e) => setAvailForm({ ...availForm, endTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
            <button type="button" onClick={() => setIsAvailModalOpen(false)} className="px-3.5 py-2 border rounded-xl font-semibold">
              Annuler
            </button>
            <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-2xs">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Block Slot */}
      <Modal isOpen={isBlockModalOpen} onClose={() => setIsBlockModalOpen(false)} title="Bloquer un créneau horaire">
        <form onSubmit={handleBlockSlot} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Motif de l'absence / blocage</label>
            <input
              type="text"
              placeholder="ex: Congé, Séminaire, Formation..."
              value={blockForm.reason}
              onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Début du blocage</label>
            <input
              type="datetime-local"
              required
              value={blockForm.start}
              onChange={(e) => setBlockForm({ ...blockForm, start: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fin du blocage</label>
            <input
              type="datetime-local"
              required
              value={blockForm.end}
              onChange={(e) => setBlockForm({ ...blockForm, end: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
            <button type="button" onClick={() => setIsBlockModalOpen(false)} className="px-3.5 py-2 border rounded-xl font-semibold">
              Annuler
            </button>
            <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-2xs">
              Bloquer le créneau
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

