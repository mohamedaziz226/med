// src/pages/patient/MyDoctors.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doctorService } from '../../services/doctorService';
import { patientService } from '../../services/patientService';
import Modal from '../../components/Modal';
import {
  Stethoscope,
  FileText,
  Phone,
  Mail,
  MapPin,
  Clock,
  Printer,
  Calendar,
  Building,
  User,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export default function PatientMyDoctors() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctorId, setSelectedDoctorId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);

  useEffect(() => {
    loadData();
  }, [user]);

    const loadData = async () => {
    setLoading(true);
    try {
      // /patients/me (et non /patients/{user.id}) car l'API attend l'id du
      // PROFIL patient et résout le bon profil à partir de user_id.
      const patData = await patientService.getMe();
      const allDocs = await doctorService.getAllDoctors();
      const allNotes = await patientService.getClinicalNotes(patData?.id);

      // Mes docteurs = docteurs réellement associés à ce patient (doctor_id),
      // et non tous les docteurs du système.
      const patDocIds = patData?.doctorIds || (patData?.doctorId ? [patData.doctorId] : []);
      const myDocs = allDocs.filter((d) => patDocIds.includes(d.id));

      setDoctors(myDocs);
      setNotes(allNotes);
    } catch (err) {
      console.error('Error loading patient doctors data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = notes.filter(n => {
    const matchesDoc = selectedDoctorId === 'all' || n.doctorId === selectedDoctorId;
    const matchesSearch =
      n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.content?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDoc && matchesSearch;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#0F172A] to-slate-800 text-white border-0">
        <div>
          <div className="flex items-center space-x-2">
            <span className="status-tag tag-blue text-[10px] font-bold">Portail Médical Patient</span>
            <span className="text-xs text-slate-300">Suivi Multidisciplinaire</span>
          </div>
          <h1 className="text-lg font-bold text-white mt-1">
            Mes Médecins Traitants & Comptes-Rendus de Consultation
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Consultez les spécialités de vos praticiens et accédez directement à vos bilans médicaux signés.
          </p>
        </div>
      </div>

      {/* List of Treating Doctors by Specialty */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title flex items-center">
            <Stethoscope className="w-4 h-4 text-[#3B82F6] mr-2" />
            Équipe Médicale Suivante ({doctors.length} Spécialistes)
          </h2>
          <span className="text-xs text-slate-500 font-medium">Cabinet & Praticiens agréés</span>
        </div>

        <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoctorId(selectedDoctorId === doc.id ? 'all' : doc.id)}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                selectedDoctorId === doc.id
                  ? 'border-[#3B82F6] bg-blue-50/60 ring-2 ring-blue-500/20'
                  : 'border-[#E2E8F0] bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start space-x-3">
                <img
                  src={doc.avatar}
                  alt=""
                  className="w-11 h-11 rounded-lg object-cover ring-2 ring-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-[#0F172A] truncate">
                      Dr. {doc.firstName} {doc.lastName}
                    </h3>
                    <span className="status-tag tag-blue text-[10px] shrink-0">
                      {doc.specialty?.split('&')[0]}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#3B82F6] font-semibold mt-0.5">
                    {doc.specialty}
                  </p>

                  <div className="space-y-1 text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center truncate">
                      <Phone className="w-3 h-3 text-slate-400 mr-1.5 shrink-0" />
                      <span className="truncate">{doc.phone}</span>
                    </div>
                    <div className="flex items-center truncate">
                      <Building className="w-3 h-3 text-slate-400 mr-1.5 shrink-0" />
                      <span className="truncate">{doc.address || 'Cabinet Médical Tunis'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">
                  {notes.filter(n => n.doctorId === doc.id).length} compte(s)-rendu(s)
                </span>
                <span className="text-[#3B82F6] font-semibold flex items-center">
                  {selectedDoctorId === doc.id ? 'Filtre actif' : 'Voir comptes-rendus'}
                  <ChevronRight className="w-3 h-3 ml-0.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Consultation Reports Section (Comptes-Rendus) */}
      <div className="panel">
        <div className="panel-header flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="panel-title flex items-center">
              <FileText className="w-4 h-4 text-[#3B82F6] mr-2" />
              Historique des Comptes-Rendus de Consultation ({filteredNotes.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Accédez aux observations cliniques, bilans et ordonnances rédigés par vos médecins.
            </p>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {/* Filter by Doctor Dropdown */}
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-[#3B82F6]"
            >
              <option value="all">Tous les médecins</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName} ({d.specialty})</option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher mot-clé..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>
          </div>
        </div>

        <div className="p-3.5 space-y-3">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => {
              const docInfo = doctors.find(d => d.id === note.doctorId) || {
                firstName: 'Slim',
                lastName: 'Ben Ali',
                specialty: 'Cardiologie'
              };

              return (
                <div
                  key={note.id}
                  className="p-4 bg-white rounded-lg border border-[#E2E8F0] hover:border-blue-300 transition-all shadow-2xs space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-[#0F172A]">{note.title}</span>
                        <span className="status-tag tag-blue text-[10px]">Compte-Rendu Officiel</span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                        <span className="font-semibold text-[#3B82F6]">
                          Praticien : Dr. {note.doctorName || `${docInfo.firstName} ${docInfo.lastName}`}
                        </span>
                        <span>• Spécialité : {docInfo.specialty}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-xs text-slate-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {note.date}
                      </span>
                      <button
                        onClick={() => setSelectedNote({ ...note, docInfo })}
                        className="px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-xs rounded-md shadow-2xs flex items-center"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Consulter Compte-Rendu
                      </button>
                    </div>
                  </div>

                  {/* Summary content preview */}
                  <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed bg-[#F8FAFC] p-3 rounded-md border border-slate-100 line-clamp-3">
                    {note.content}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Document signé électroniquement
                    </span>
                    <span>Classé dans le dossier médical patient</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-10 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-semibold text-slate-600">Aucun compte-rendu médical trouvé.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sélectionnez un autre médecin ou modifiez vos critères de recherche.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Official Medical Report Modal */}
      {selectedNote && (
        <Modal
          isOpen={!!selectedNote}
          onClose={() => setSelectedNote(null)}
          title="Compte-Rendu Médical de Consultation"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs text-slate-800">
            {/* Document Header */}
            <div className="bg-[#0F172A] text-white p-4 rounded-xl flex items-center justify-between border border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 bg-[#3B82F6] text-white font-extrabold flex items-center justify-center rounded-md text-xs">
                    M+
                  </div>
                  <span className="font-bold text-sm tracking-tight text-white">Cabinet Médical MedSecretariat</span>
                </div>
                <h3 className="font-extrabold text-base text-blue-300 mt-2">
                  Dr. {selectedNote.doctorName || `${selectedNote.docInfo?.firstName} ${selectedNote.docInfo?.lastName}`}
                </h3>
                <p className="text-xs text-slate-300 font-semibold">{selectedNote.docInfo?.specialty || 'Spécialiste'}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{selectedNote.docInfo?.address || 'Clinique Pasteur, Tunis'}</p>
              </div>

              <div className="text-right border-l border-slate-700 pl-4">
                <span className="status-tag tag-blue text-[10px] block font-bold mb-1">
                  Document Officiel
                </span>
                <span className="text-[10px] text-slate-300 block">Date de consultation :</span>
                <span className="font-bold text-white text-xs">{selectedNote.date}</span>
              </div>
            </div>

            {/* Patient Info Header Bar */}
            <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Patient Suivi :</span>
                <span className="font-bold text-[#0F172A] text-sm">{user?.firstName} {user?.lastName}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Identifiant Patient :</span>
                <span className="font-semibold text-slate-700">{user?.id || 'pat_1'}</span>
              </div>
            </div>

            {/* Report Content Body */}
            <div className="p-4 bg-white rounded-lg border border-[#E2E8F0] space-y-3">
              <h4 className="font-bold text-sm text-[#0F172A] pb-2 border-b border-slate-100 flex items-center">
                <Stethoscope className="w-4 h-4 text-[#3B82F6] mr-2" />
                {selectedNote.title}
              </h4>

              <div className="text-slate-800 text-xs whitespace-pre-line leading-relaxed font-sans pt-1">
                {selectedNote.content}
              </div>
            </div>

            {/* Footer Signature & Print Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div className="flex items-center space-x-1.5 text-emerald-700 font-bold text-[11px]">
                <ShieldCheck className="w-4 h-4" />
                <span>Authentifié et archivé dans le dossier médical partagé</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-md shadow-2xs flex items-center"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Imprimer / Télécharger PDF
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
