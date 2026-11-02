// src/pages/doctor/Appointments.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { appointmentService } from '../../services/appointmentService';
import { patientService } from '../../services/patientService';
import { calendarService } from '../../services/calendarService';
import DataTable from '../../components/DataTable';
import PatientDossierModal from '../../components/PatientDossierModal';
import CalendarGrid from '../../components/calendar/CalendarGrid';
import AppointmentRequests from '../../components/calendar/AppointmentRequests';
import AvailabilityManager from '../../components/calendar/AvailabilityManager';
import { weekDays, toIsoDate, addDays } from '../../components/calendar/dateUtils';
import { CheckCircle, XCircle, Eye, Calendar as CalendarIcon, Clock, ShieldAlert, List, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

export default function DoctorAppointments() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'requests' | 'availability' | 'table'

  // Data states
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [calendarData, setCalendarData] = useState({ availability: [], blockedSlots: [], appointments: [] });
  const [loading, setLoading] = useState(false);

  // Week navigation for calendar tab
  const [anchorDate, setAnchorDate] = useState(new Date());
  const currentWeekDays = weekDays(anchorDate);
  const startDateStr = toIsoDate(currentWeekDays[0]);
  const endDateStr = toIsoDate(currentWeekDays[6]);

  // Modal for Patient Dossier
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const docId = user?.doctorId || user?.id;

  const loadData = useCallback(async () => {
    if (!docId) return;
    setLoading(true);
    try {
      const [aptsList, patsList, cal] = await Promise.all([
        appointmentService.getAppointmentsByDoctor(docId).catch(() => []),
        patientService.getPatientsByDoctor(docId).catch(() => []),
        calendarService.getCalendar(docId, startDateStr, endDateStr).catch(() => ({ availability: [], blockedSlots: [], appointments: [] })),
      ]);

      setAppointments(aptsList);
      setPatients(patsList);
      setCalendarData(cal);
    } catch (err) {
      console.error('Erreur chargement agenda médecin:', err);
    } finally {
      setLoading(false);
    }
  }, [docId, startDateStr, endDateStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateStatus = async (id, status) => {
    await appointmentService.updateStatus(id, status);
    loadData();
  };

  const handleOpenDossierForAppointment = (apt) => {
    const found = patients.find((p) => p.id === apt.patientId) || {
      id: apt.patientId,
      firstName: apt.patientName?.split(' ')[0] || 'Patient',
      lastName: apt.patientName?.split(' ')[1] || '',
      phone: '+216 98 111 222',
      email: 'patient@medsecretariat.tn',
      address: 'Tunis, Tunisie',
      bloodType: 'O+',
      allergies: [],
      chronicConditions: [],
    };
    setSelectedPatient(found);
    setIsDossierOpen(true);
  };

  const pendingCount = appointments.filter((a) => a.status === 'En attente' || a.status === 'pending').length;

  const columns = [
    {
      header: 'Patient',
      render: (a) => (
        <div>
          <span className="font-bold text-[#0F172A] block text-xs">{a.patientName}</span>
          <span className="text-[10px] text-slate-400">ID: {a.patientId}</span>
        </div>
      ),
    },
    { header: 'Date', accessor: 'date' },
    { header: 'Heure', accessor: 'time' },
    { header: 'Motif de consultation', accessor: 'reason' },
    {
      header: 'Statut',
      render: (a) => (
        <span
          className={`status-tag ${
            a.status === 'Confirmé' || a.status === 'Terminé'
              ? 'tag-green'
              : a.status === 'Annulé' || a.status === 'Refusé'
              ? 'tag-rose'
              : 'tag-orange'
          }`}
        >
          {a.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A]">Agenda & Calendrier Médical Partagé</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gérez vos disponibilités, validez les demandes de rendez-vous et consultez votre planning.
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-md shadow-2xs flex items-center space-x-1 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`pb-2.5 px-3 flex items-center space-x-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'border-[#3B82F6] text-[#3B82F6] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Agenda Hebdomadaire</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-2.5 px-3 flex items-center space-x-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'requests'
              ? 'border-[#3B82F6] text-[#3B82F6] font-bold'
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
              ? 'border-[#3B82F6] text-[#3B82F6] font-bold'
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
              ? 'border-[#3B82F6] text-[#3B82F6] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <List className="w-4 h-4" />
          <span>Liste Consultations</span>
        </button>
      </div>

      {/* Tab 1: Calendar Grid */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAnchorDate((d) => addDays(d, -7))}
                className="p-1.5 hover:bg-slate-100 rounded-md border border-slate-200 text-slate-600 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAnchorDate(new Date())}
                className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 cursor-pointer"
              >
                Aujourd'hui
              </button>
              <button
                onClick={() => setAnchorDate((d) => addDays(d, 7))}
                className="p-1.5 hover:bg-slate-100 rounded-md border border-slate-200 text-slate-600 cursor-pointer"
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
            onAppointmentClick={(apt) => handleOpenDossierForAppointment(apt)}
          />
        </div>
      )}

      {/* Tab 2: Appointment Requests */}
      {activeTab === 'requests' && (
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <AppointmentRequests doctorId={docId} onChanged={loadData} />
        </div>
      )}

      {/* Tab 3: Availability & Blocked Slots */}
      {activeTab === 'availability' && (
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <AvailabilityManager doctorId={docId} onChanged={loadData} />
        </div>
      )}

      {/* Tab 4: Table View */}
      {activeTab === 'table' && (
        <DataTable
          columns={columns}
          data={appointments}
          searchPlaceholder="Rechercher par nom de patient, motif..."
          actions={(a) => (
            <div className="flex items-center justify-end space-x-1.5">
              <button
                onClick={() => handleOpenDossierForAppointment(a)}
                className="px-2.5 py-1 bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-xs rounded-md shadow-2xs flex items-center cursor-pointer"
                title="Consulter le dossier et rédiger une note"
              >
                <Eye className="w-3.5 h-3.5 mr-1" /> Dossier & Notes
              </button>
              {a.status !== 'Confirmé' && a.status !== 'Terminé' && (
                <button
                  onClick={() => handleUpdateStatus(a.id, 'Confirmé')}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                  title="Confirmer"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
              {a.status !== 'Terminé' && (
                <button
                  onClick={() => {
                    handleUpdateStatus(a.id, 'Terminé');
                    handleOpenDossierForAppointment(a);
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-md cursor-pointer"
                  title="Terminer et rédiger note"
                >
                  Terminer
                </button>
              )}
              {a.status !== 'Annulé' && (
                <button
                  onClick={() => handleUpdateStatus(a.id, 'Annulé')}
                  className="p-1 text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                  title="Annuler"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        />
      )}

      {/* Patient Dossier & Consultation Notes Modal */}
      {selectedPatient && (
        <PatientDossierModal
          isOpen={isDossierOpen}
          onClose={() => setIsDossierOpen(false)}
          patient={selectedPatient}
          initialTab="notes"
          doctorUser={user}
        />
      )}
    </div>
  );
}

