// src/pages/secretary/Appointments.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { appointmentService } from '../../services/appointmentService';
import { secretaryService } from '../../services/secretaryService';
import { patientService } from '../../services/patientService';
import { calendarService } from '../../services/calendarService';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import CalendarGrid from '../../components/calendar/CalendarGrid';
import AppointmentRequests from '../../components/calendar/AppointmentRequests';
import AvailabilityManager from '../../components/calendar/AvailabilityManager';
import { weekDays, toIsoDate, addDays } from '../../components/calendar/dateUtils';
import { getApiErrorMessage } from '../../services/api';
import { Calendar as CalendarIcon, Plus, CheckCircle, XCircle, Clock, ShieldAlert, List, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

export default function SecretaryAppointments() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'requests' | 'availability' | 'table'

  const [docId, setDocId] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [calendarData, setCalendarData] = useState({ availability: [], blockedSlots: [], appointments: [] });
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // Feedback utilisateur (même mécanisme que AppointmentRequests / AvailabilityManager)
  const [notice, setNotice] = useState('');       // succès (bandeau vert)
  const [actionError, setActionError] = useState(''); // erreur hors modale (bandeau rouge)
  const [formError, setFormError] = useState(''); // erreur dans la modale de création
  const [saving, setSaving] = useState(false);

  // Week navigation
  const [anchorDate, setAnchorDate] = useState(new Date());
  const currentWeekDays = weekDays(anchorDate);
  const startDateStr = toIsoDate(currentWeekDays[0]);
  const endDateStr = toIsoDate(currentWeekDays[6]);

  const [form, setForm] = useState({
    patientId: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    reason: 'Consultation Générale',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const resolvedDocId = user?.doctorId || (await secretaryService.getMyDoctorId().then((r) => r.doctorId).catch(() => null));
      setDocId(resolvedDocId);

      if (!resolvedDocId) {
        setAppointments([]);
        setPatients([]);
        return;
      }

      const [aptsList, patsList, cal] = await Promise.all([
        appointmentService.getAppointmentsByDoctor(resolvedDocId).catch(() => []),
        patientService.getPatientsByDoctor(resolvedDocId).catch(() => []),
        calendarService.getCalendar(resolvedDocId, startDateStr, endDateStr).catch(() => ({ availability: [], blockedSlots: [], appointments: [] })),
      ]);

      setAppointments(aptsList);
      setPatients(patsList);
      setCalendarData(cal);
      if (patsList.length > 0 && !form.patientId) {
        setForm((f) => ({ ...f, patientId: patsList[0].id }));
      }
    } catch (err) {
      console.error('Erreur chargement agenda secrétariat:', err);
    } finally {
      setLoading(false);
    }
  }, [user, startDateStr, endDateStr, form.patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 3500);
  };

  /**
   * Traduit une erreur API en message clair pour la secrétaire.
   * Couvre 400 / 401 / 403 / 404 / 422 / 500 via getApiErrorMessage,
   * avec un libellé dédié pour le conflit de créneau (400).
   */
  const buildCreateErrorMessage = (err) => {
    const detail = err?.response?.data?.detail;
    if (
      err?.response?.status === 400 &&
      typeof detail === 'string' &&
      /available|disponible|bloqu/i.test(detail)
    ) {
      return "Ce créneau n'est plus disponible. Veuillez choisir une autre heure.";
    }
    return getApiErrorMessage(err);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!docId) {
      setFormError("Aucun médecin n'est associé à votre compte secrétaire.");
      return;
    }
    setSaving(true);
    try {
      const pat = patients.find((p) => String(p.id) === String(form.patientId));
      await appointmentService.createAppointment({
        ...form,
        patientId: Number(form.patientId),
        patientName: pat ? `${pat.firstName} ${pat.lastName}` : 'Patient',
        doctorId: Number(docId),
        doctorName: user?.doctorName || 'Dr. Slim Ben Ali',
        status: 'Confirmé',
        createdBy: `${user?.firstName || 'Secrétaire'}`,
      });
      setIsAddModalOpen(false);
      flash('Rendez-vous créé avec succès. Le médecin a été notifié.');
      await loadData();
    } catch (err) {
      // La modale reste ouverte : la secrétaire peut corriger l'heure directement.
      console.error('Erreur création rendez-vous:', err);
      setFormError(buildCreateErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    setActionError('');
    try {
      await appointmentService.updateStatus(id, status);
      await loadData();
    } catch (err) {
      console.error('Erreur changement de statut:', err);
      if (err?.response?.status === 409 || err?.response?.status === 400) {
        setActionError("Impossible de confirmer : ce créneau n'est plus disponible.");
      } else {
        setActionError(getApiErrorMessage(err));
      }
    }
  };

  const pendingCount = appointments.filter((a) => a.status === 'En attente' || a.status === 'pending').length;

  const columns = [
    { header: 'Patient', accessor: 'patientName' },
    { header: 'Date', accessor: 'date' },
    { header: 'Heure', accessor: 'time' },
    { header: 'Motif', accessor: 'reason' },
    {
      header: 'Statut',
      render: (a) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
            a.status === 'Confirmé'
              ? 'bg-emerald-100 text-emerald-800'
              : a.status === 'Annulé' || a.status === 'Refusé'
              ? 'bg-rose-100 text-rose-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {a.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Bandeaux de feedback */}
      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
          {notice}
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
          {actionError}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestion & Agenda du Cabinet</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Consultez le calendrier partagé, validez les demandes patients et fixez des rendez-vous.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={loadData}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Fixer un Rendez-vous
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`pb-2.5 px-3 flex items-center space-x-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'border-teal-600 text-teal-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Agenda Partagé</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-2.5 px-3 flex items-center space-x-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'requests'
              ? 'border-teal-600 text-teal-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Demandes en Attente</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-extrabold ml-1">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('availability')}
          className={`pb-2.5 px-3 flex items-center space-x-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'availability'
              ? 'border-teal-600 text-teal-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Disponibilités & Blocages</span>
        </button>

        <button
          onClick={() => setActiveTab('table')}
          className={`pb-2.5 px-3 flex items-center space-x-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'table'
              ? 'border-teal-600 text-teal-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <List className="w-4 h-4" />
          <span>Liste Rendez-vous</span>
        </button>
      </div>

      {/* Tab 1: Calendar Grid */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAnchorDate((d) => addDays(d, -7))}
                className="p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAnchorDate(new Date())}
                className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
              >
                Aujourd'hui
              </button>
              <button
                onClick={() => setAnchorDate((d) => addDays(d, 7))}
                className="p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <span className="text-xs font-bold text-slate-700">
              Semaine du {startDateStr} au {endDateStr}
            </span>
          </div>

          <CalendarGrid
            days={currentWeekDays}
            availabilityBlocks={calendarData.availability}
            appointments={calendarData.appointments}
            blockedSlots={calendarData.blockedSlots}
          />
        </div>
      )}

      {/* Tab 2: Appointment Requests */}
      {activeTab === 'requests' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <AppointmentRequests doctorId={docId} onChanged={loadData} />
        </div>
      )}

      {/* Tab 3: Availability & Blocked Slots */}
      {activeTab === 'availability' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <AvailabilityManager doctorId={docId} onChanged={loadData} />
        </div>
      )}

      {/* Tab 4: Table View */}
      {activeTab === 'table' && (
        <DataTable
          columns={columns}
          data={appointments}
          searchPlaceholder="Rechercher par patient ou date..."
          actions={(a) => (
            <div className="flex items-center justify-end space-x-1.5">
              {a.status !== 'Confirmé' && (
                <button
                  onClick={() => handleUpdateStatus(a.id, 'Confirmé')}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                  title="Confirmer"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
              {a.status !== 'Annulé' && (
                <button
                  onClick={() => handleUpdateStatus(a.id, 'Annulé')}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  title="Annuler"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        />
      )}

      {/* Modal Créer un Rendez-vous */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setFormError('');
        }}
        title="Créer un Rendez-vous"
      >
        <form onSubmit={handleCreate} className="space-y-3">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Patient</label>
            <select
              value={form.patientId}
              onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Heure</label>
              <input
                type="time"
                required
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Motif de consultation</label>
            <input
              type="text"
              required
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-2xs cursor-pointer">
              {saving ? 'Enregistrement…' : 'Valider le Rendez-vous'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
