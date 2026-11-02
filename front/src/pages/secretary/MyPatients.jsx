// src/pages/secretary/MyPatients.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import { secretaryService } from '../../services/secretaryService';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import { Users, Plus, Eye, Edit, Trash2, UserPlus, Phone, Mail, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SecretaryMyPatients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    gender: 'Homme',
    address: '',
    password: ''
  });

  // Retourne le doctor_id du médecin rattaché à la secrétaire (user.doctorId),
  // sinon le récupère depuis le backend (GET /secretaries/me/doctor-id).
  const resolveDocId = async () => {
    try {
      return await secretaryService.resolveDoctorIdForUser(user);
    } catch (err) {
      console.warn('Impossible de récupérer le médecin associé :', err?.message);
      return null;
    }
  };

  useEffect(() => {
    loadPatients();
  }, [user]);

  const loadPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const docId = await resolveDocId();
      if (!docId) {
        setError('Impossible de déterminer le médecin associé.');
        setPatients([]);
        return;
      }
      const list = await patientService.getPatientsByDoctor(docId);
      setPatients(list);
    } catch (err) {
      console.error('Erreur chargement patients:', err);
      setError(err.response?.data?.detail || err.message || 'Erreur lors du chargement des patients.');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const docId = await resolveDocId();
      if (!docId) {
        setError('Impossible de déterminer le médecin associé.');
        return;
      }
      await patientService.addPatient({
        ...formData,
        doctorId: docId,
      });
      setIsAddModalOpen(false);
      resetForm();
      await loadPatients();
    } catch (err) {
      console.error('Erreur création patient:', err);
      setError(err.response?.data?.detail || err.message || 'Erreur lors de la création du patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePatient = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setSubmitting(true);
    setError(null);
    try {
      await patientService.updatePatient(selectedPatient.id, formData);
      setIsEditModalOpen(false);
      resetForm();
      await loadPatients();
    } catch (err) {
      console.error('Erreur modification patient:', err);
      setError(err.response?.data?.detail || err.message || 'Erreur lors de la modification du patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!selectedPatient) return;
    setSubmitting(true);
    setError(null);
    try {
      await patientService.deletePatient(selectedPatient.id);
      setIsDeleteModalOpen(false);
      setSelectedPatient(null);
      await loadPatients();
    } catch (err) {
      console.error('Erreur suppression patient:', err);
      setError(err.response?.data?.detail || err.message || 'Erreur lors de la suppression du patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dob: '',
      gender: 'Homme',
      address: '',
      password: ''
    });
  };

  const openEditModal = (pat) => {
    setSelectedPatient(pat);
    setFormData({
      firstName: pat.firstName || '',
      lastName: pat.lastName || '',
      email: pat.email || '',
      phone: pat.phone || '',
      dob: pat.dob || '',
      gender: pat.gender || 'Homme',
      address: pat.address || '',
      password: ''
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (pat) => {
    setSelectedPatient(pat);
    setIsDeleteModalOpen(true);
  };

  const columns = [
    {
      header: 'Patient',
      render: (pat) => (
        <div className="flex items-center space-x-3">
          <img src={pat.avatar} alt="" className="w-9 h-9 rounded-xl object-cover" />
          <div>
            <span className="font-bold text-slate-900 block">{pat.firstName} {pat.lastName}</span>
            <span className="text-[10px] text-slate-400">{pat.email}</span>
          </div>
        </div>
      )
    },
    { header: 'Téléphone', accessor: 'phone' },
    { header: 'Date de naissance', accessor: 'dob' },
    { header: 'Adresse', accessor: 'address' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestion des Patients du Cabinet</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Recherchez, inscrivez de nouveaux patients ou modifiez leurs données administratives.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="flex items-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Patient
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start space-x-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="font-bold block">Erreur</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold">✕</button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <span className="text-sm font-semibold">Chargement des patients...</span>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={patients}
          searchPlaceholder="Rechercher un patient par nom, e-mail, téléphone..."
          onRowClick={(pat) => navigate(`/secretary/patient-details?id=${pat.id}`)}
          actions={(pat) => (
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => navigate(`/secretary/patient-details?id=${pat.id}`)}
                className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-lg border border-teal-200"
              >
                Fiche & Dossier
              </button>
              <button
                onClick={() => openEditModal(pat)}
                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                title="Modifier les données administratives"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => openDeleteModal(pat)}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                title="Supprimer le patient"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        />
      )}

      {/* Modal Add Patient */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Créer une nouvelle fiche patient">
        <form onSubmit={handleAddPatient} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date Naissance</label>
              <input
                type="date"
                required
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Genre</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="Homme">Homme</option>
                <option value="Femme">Femme</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="8 caractères minimum"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse Domicile</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Enregistrement...' : 'Enregistrer le patient'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Patient */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modifier la fiche administrative">
        <form onSubmit={handleUpdatePatient} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-xs"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Delete Patient */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Supprimer le patient">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Êtes-vous sûr de vouloir supprimer le patient{' '}
            <strong className="text-slate-900">
              {selectedPatient?.firstName} {selectedPatient?.lastName}
            </strong>{' '}
            ? Cette action désactivera son compte et son accès à l'application.
          </p>
          <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDeletePatient}
              disabled={submitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
