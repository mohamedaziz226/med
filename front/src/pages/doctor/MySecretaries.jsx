// src/pages/doctor/MySecretaries.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { secretaryService } from '../../services/secretaryService';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import { Briefcase, Plus, CheckCircle, XCircle, Mail, Phone } from 'lucide-react';

export default function MySecretaries() {
  const { user } = useAuth();
  const [secretaries, setSecretaries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    loadSecretaries();
  }, [user]);

  const loadSecretaries = async () => {
    const docId = user?.doctorId || user?.id;
    if (!docId) return;
    const secs = await secretaryService.getSecretariesByDoctor(docId);
    setSecretaries(secs);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await secretaryService.addSecretary({
      ...formData,
      doctorId: user?.doctorId || user?.id,
      doctorName: `Dr. ${user?.firstName} ${user?.lastName}`
    });
    setIsModalOpen(false);
    setFormData({ firstName: '', lastName: '', email: '', phone: '' });
    loadSecretaries();
  };

  const handleToggleStatus = async (secId) => {
    await secretaryService.toggleSecretaryStatus(secId);
    loadSecretaries();
  };

  const columns = [
    {
      header: 'Secrétaire',
      render: (sec) => (
        <div className="flex items-center space-x-3">
          <img src={sec.avatar} alt="" className="w-9 h-9 rounded-xl object-cover" />
          <div>
            <span className="font-bold text-slate-900 block">{sec.firstName} {sec.lastName}</span>
            <span className="text-[10px] text-slate-400">{sec.email}</span>
          </div>
        </div>
      )
    },
    { header: 'Téléphone', accessor: 'phone' },
    {
      header: 'Statut',
      render: (sec) => (
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${sec.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
          {sec.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mes Secrétaires Médicales</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gérez vos assistant(e)s de cabinet rattaché(e)s.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une secrétaire
        </button>
      </div>

      <DataTable
        columns={columns}
        data={secretaries}
        searchPlaceholder="Rechercher une secrétaire..."
        actions={(sec) => (
          <button
            onClick={() => handleToggleStatus(sec.id)}
            className={`p-1.5 rounded-lg transition-colors ${sec.status === 'active' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
            title={sec.status === 'active' ? 'Désactiver' : 'Activer'}
          >
            {sec.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          </button>
        )}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Ajouter une secrétaire">
        <form onSubmit={handleCreate} className="space-y-4">
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

          <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Créer la secrétaire
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
