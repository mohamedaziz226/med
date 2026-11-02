// src/pages/admin/Users.jsx
import React, { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
import { adminService } from '../../services/adminService';
import { Users as UsersIcon, ShieldCheck, Stethoscope, Briefcase, User } from 'lucide-react';

export default function Users() {
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await adminService.getUsers();
        const list = (users || []).map((u) => ({
          id: u.id,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          email: u.email,
          role: u.role,
          status: u.isActive ? 'active' : 'inactive'
        }));
        setAllUsers(list);
      } catch (error) {
        console.error('Impossible de charger les utilisateurs :', error);
        setAllUsers([]);
      }
    };

    loadUsers();
  }, []);

  const roleBadges = {
    admin: { label: 'Administrateur', color: 'bg-purple-100 text-purple-800' },
    doctor: { label: 'Médecin', color: 'bg-teal-100 text-teal-800' },
    secretary: { label: 'Secrétaire', color: 'bg-blue-100 text-blue-800' },
    patient: { label: 'Patient', color: 'bg-emerald-100 text-emerald-800' }
  };

  const columns = [
    { header: 'Nom & Prénom', accessor: 'name' },
    { header: 'Adresse Email', accessor: 'email' },
    {
      header: 'Rôle',
      render: (u) => {
        const info = roleBadges[u.role] || roleBadges.patient;
        return (
          <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${info.color}`}>
            {info.label}
          </span>
        );
      }
    },
    {
      header: 'Statut',
      render: (u) => (
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
          {u.status === 'active' ? 'Actif' : 'Inactif'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestion des Utilisateurs</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Annuaire global de tous les comptes enregistrés dans le système MedSecretariat.
        </p>
      </div>

      <DataTable columns={columns} data={allUsers} searchPlaceholder="Rechercher par nom, email, rôle..." />
    </div>
  );
}
