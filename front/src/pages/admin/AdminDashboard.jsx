// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import { adminService } from '../../services/adminService';
import { doctorService } from '../../services/doctorService';
import { Stethoscope, Briefcase, Users, UserCheck, ShieldCheck, Activity, Plus, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    doctorsCount: 0,
    secretariesCount: 0,
    patientsCount: 0,
    totalUsersCount: 0,
    recentActivity: []
  });

  const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialty: 'Cardiologie',
    password: '',
    address: 'Tunis, Tunisie'
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const users = await adminService.getUsers();
      const doctorsCount = (users || []).filter((u) => u.role === 'doctor').length;
      const secretariesCount = (users || []).filter((u) => u.role === 'secretary').length;
      const patientsCount = (users || []).filter((u) => u.role === 'patient').length;
      const totalUsersCount = (users || []).length;

      setStats({
        doctorsCount,
        secretariesCount,
        patientsCount,
        totalUsersCount,
        recentActivity: []
      });
    } catch (error) {
      console.error('Impossible de charger le dashboard admin :', error);
      setStats({
        doctorsCount: 0,
        secretariesCount: 0,
        patientsCount: 0,
        totalUsersCount: 0,
        recentActivity: []
      });
    }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    await doctorService.addDoctor(formData);
    setIsAddDoctorModalOpen(false);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      specialty: 'Cardiologie',
      password: '',
      address: 'Tunis, Tunisie'
    });
    loadDashboardData();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="panel p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
        <div>
          <div className="flex items-center space-x-2">
            <span className="status-tag tag-blue text-[10px] font-bold">Portail Super Admin</span>
            <span className="text-xs text-slate-300">Gestion Globale des Cabinets</span>
          </div>
          <h1 className="text-lg font-bold text-white mt-1">
            Tableau de Bord Administrateur
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Supervision du réseau médical, création de comptes praticiens et journal des activités.
          </p>
        </div>

        <button
          onClick={() => setIsAddDoctorModalOpen(true)}
          className="px-3.5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-xs rounded-md shadow-2xs shrink-0 flex items-center space-x-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un Médecin</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Médecins Enregistrés"
          value={stats.doctorsCount}
          icon={Stethoscope}
          trendValue="Actifs au réseau"
        />
        <StatCard
          title="Secrétaires Médicales"
          value={stats.secretariesCount}
          icon={Briefcase}
          trendValue="Rattachées aux cabinets"
        />
        <StatCard
          title="Patients Inscrites"
          value={stats.patientsCount}
          icon={Users}
          trendValue="Base de données globale"
        />
        <StatCard
          title="Utilisateurs Actifs"
          value={stats.totalUsersCount}
          icon={UserCheck}
          trendValue="Accès sécurisé"
        />
      </div>

      {/* Quick Action Navigation Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="panel p-4 flex items-center justify-between">
          <div>
            <span className="font-bold text-xs text-[#0F172A] block">Administration Médecins</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Ajouter, modifier ou suspendre des praticiens</p>
          </div>
          <Link
            to="/admin/doctors"
            className="px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-xs rounded-md shadow-2xs shrink-0"
          >
            Gérer Médecins
          </Link>
        </div>

        <div className="panel p-4 flex items-center justify-between">
          <div>
            <span className="font-bold text-xs text-[#0F172A] block">Comptes Utilisateurs</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Consulter tous les rôles et identifiants</p>
          </div>
          <Link
            to="/admin/users"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-md shrink-0"
          >
            Gérer Rôles
          </Link>
        </div>

        <div className="panel p-4 flex items-center justify-between">
          <div>
            <span className="font-bold text-xs text-[#0F172A] block">Logs & Sécurité</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Historique des actions administrateur et accès</p>
          </div>
          <Link
            to="/admin/activity-logs"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-md shrink-0"
          >
            Journal Système
          </Link>
        </div>
      </div>

      {/* Activity Log Section */}
      <div className="panel">
        <div className="panel-header">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-[#3B82F6]" />
            <h2 className="panel-title">Activité Récente du Système & Journal d'Audit</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">Temps réel</span>
        </div>

        <div className="p-3.5 space-y-2.5 divide-y divide-slate-100">
          {stats.recentActivity.map((log) => (
            <div key={log.id} className="pt-2.5 first:pt-0 flex items-start justify-between text-xs">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-[#0F172A]">{log.user}</span>
                  <span className="status-tag tag-blue text-[10px]">
                    {log.role}
                  </span>
                </div>
                <p className="text-slate-600 mt-1">{log.details}</p>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0 ml-4">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Add Doctor from Dashboard */}
      <Modal
        isOpen={isAddDoctorModalOpen}
        onClose={() => setIsAddDoctorModalOpen(false)}
        title="Ajouter un Nouveau Médecin (Par l'Admin)"
      >
        <form onSubmit={handleCreateDoctor} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Prénom du Médecin</label>
              <input
                type="text"
                required
                placeholder="Dr. Moncef"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nom du Médecin</label>
              <input
                type="text"
                required
                placeholder="Gharbi"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Professionnel</label>
            <input
              type="email"
              required
              placeholder="dr.gharbi@medsecretariat.tn"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs focus:outline-hidden focus:border-[#3B82F6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Téléphone Cabinet</label>
              <input
                type="text"
                required
                placeholder="+216 71 333 444"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Spécialité Médicale</label>
              <select
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs focus:outline-hidden focus:border-[#3B82F6]"
              >
                <option value="Cardiologie">Cardiologie</option>
                <option value="Radiologie & Imagerie">Radiologie & Imagerie</option>
                <option value="Neurologie">Neurologie</option>
                <option value="Médecine Générale">Médecine Générale</option>
                <option value="Pédiatrie">Pédiatrie</option>
                <option value="Orthopédie">Orthopédie</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mot de passe</label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="8 caractères minimum"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Adresse Cabinet</label>
              <input
                type="text"
                placeholder="Centre Médical Pasteur, Tunis"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddDoctorModalOpen(false)}
              className="px-3.5 py-1.5 border border-[#E2E8F0] rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs rounded-md shadow-2xs"
            >
              Créer le Médecin
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

