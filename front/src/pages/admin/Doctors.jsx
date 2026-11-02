// src/pages/admin/Doctors.jsx
import React, { useState, useEffect } from 'react';
import { doctorService } from '../../services/doctorService';
import { secretaryService } from '../../services/secretaryService';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import { Stethoscope, Plus, CheckCircle, XCircle, Eye, Edit, Briefcase, Mail, Phone, MapPin } from 'lucide-react';

export default function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [secretaries, setSecretaries] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialty: 'Cardiologie',
    password: '',
    address: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const docList = await doctorService.getAllDoctors();
    const secList = await secretaryService.getAllSecretaries();
    setDoctors(docList);
    setSecretaries(secList);
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    await doctorService.addDoctor(formData);
    setIsAddModalOpen(false);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      specialty: 'Cardiologie',
      password: '',
      address: ''
    });
    loadData();
  };

  const handleToggleStatus = async (docId) => {
    await doctorService.toggleDoctorStatus(docId);
    loadData();
  };

  const columns = [
    {
      header: 'Médecin',
      render: (doc) => (
        <div className="flex items-center space-x-3">
          <img
            src={doc.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'}
            alt=""
            className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-100"
          />
          <div>
            <span className="font-bold text-slate-900 block">Dr. {doc.firstName} {doc.lastName}</span>
            <span className="text-[10px] text-slate-400">{doc.email}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Spécialité',
      render: (doc) => (
        <span className="px-2.5 py-1 bg-teal-50 text-teal-700 font-semibold text-xs rounded-lg border border-teal-100">
          {doc.specialty}
        </span>
      )
    },
    { header: 'Téléphone', accessor: 'phone' },
    {
      header: 'Secrétaires Rattachées',
      render: (doc) => {
        const associatedSecs = secretaries.filter(s => s.doctorId === doc.id);
        return (
          <div className="flex items-center space-x-1">
            <Briefcase className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <span className="font-bold text-slate-800 text-xs">
              {associatedSecs.length > 0 ? associatedSecs.map(s => `${s.firstName} ${s.lastName}`).join(', ') : 'Aucune'}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Statut',
      render: (doc) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
            doc.status === 'active'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-rose-100 text-rose-800 border border-rose-200'
          }`}
        >
          {doc.status === 'active' ? 'Actif' : 'Inactif'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestion des Médecins</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gérez la liste des praticiens autorisés et leurs secrétaires médicales associées.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-teal-600/30 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un médecin
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={doctors}
        searchPlaceholder="Rechercher par nom, spécialité, e-mail..."
        actions={(doc) => (
          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={() => {
                setSelectedDoctor(doc);
                setIsViewModalOpen(true);
              }}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Voir détails"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleToggleStatus(doc.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                doc.status === 'active'
                  ? 'text-rose-600 hover:bg-rose-50'
                  : 'text-emerald-600 hover:bg-emerald-50'
              }`}
              title={doc.status === 'active' ? 'Désactiver' : 'Activer'}
            >
              {doc.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            </button>
          </div>
        )}
      />

      {/* Modal Add Doctor */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Ajouter un nouveau médecin"
      >
        <form onSubmit={handleCreateDoctor} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email professionnel</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-teal-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Spécialité</label>
              <select
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-teal-600"
              >
                <option value="Cardiologie">Cardiologie</option>
                <option value="Radiologie & Imagerie">Radiologie & Imagerie</option>
                <option value="Neurologie">Neurologie</option>
                <option value="Médecine Générale">Médecine Générale</option>
                <option value="Pédiatrie">Pédiatrie</option>
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse du cabinet</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-teal-600"
            />
          </div>

          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Enregistrer le médecin
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal View Doctor */}
      {selectedDoctor && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Fiche Médecin : Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}`}
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-4 pb-4 border-b border-slate-100">
              <img
                src={selectedDoctor.avatar}
                alt=""
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-teal-500/20"
              />
              <div>
                <h4 className="font-bold text-slate-900 text-base">Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}</h4>
                <p className="text-xs text-teal-600 font-semibold">{selectedDoctor.specialty}</p>
                <span className="text-[10px] text-slate-400">Inscrit le : {selectedDoctor.createdAt}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <p className="flex items-center"><Mail className="w-4 h-4 text-teal-600 mr-2" /> {selectedDoctor.email}</p>
              <p className="flex items-center"><Phone className="w-4 h-4 text-teal-600 mr-2" /> {selectedDoctor.phone}</p>
              <p className="flex items-center"><MapPin className="w-4 h-4 text-teal-600 mr-2" /> {selectedDoctor.address}</p>
            </div>

            {/* Secrétaires associées */}
            <div className="pt-4 border-t border-slate-100">
              <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-2">Secrétaires Rattachées</h5>
              {secretaries.filter(s => s.doctorId === selectedDoctor.id).length > 0 ? (
                secretaries.filter(s => s.doctorId === selectedDoctor.id).map(sec => (
                  <div key={sec.id} className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center space-x-2">
                      <img src={sec.avatar} alt="" className="w-7 h-7 rounded-lg object-cover" />
                      <span className="font-bold text-slate-800">{sec.firstName} {sec.lastName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{sec.phone}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">Aucune secrétaire rattachée pour le moment.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
