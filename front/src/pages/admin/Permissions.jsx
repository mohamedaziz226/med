// src/pages/admin/Permissions.jsx
import React from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

const roles = [
  {
    role: 'admin',
    permissions: ['Voir tous les utilisateurs', 'Gérer les accès', 'Consulter les journaux', 'Valider les actions système']
  },
  {
    role: 'doctor',
    permissions: ['Voir ses patients', 'Créer et modifier les dossiers médicaux', 'Gérer les rendez-vous', 'Consulter les documents']
  },
  {
    role: 'secretary',
    permissions: ['Planifier les rendez-vous', 'Gérer les documents administratifs', 'Suivre les paiements', 'Assister les médecins']
  },
  {
    role: 'patient',
    permissions: ['Voir son profil', 'Consulter ses documents', 'Demander des pièces justificatives', 'Communiquer avec le cabinet']
  }
];

export default function Permissions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Rôles et Permissions</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Matrice d'accès et d'habilitations sécurité pour les 4 catégories d'utilisateurs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((item, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">{item.role}</h3>
            </div>

            <ul className="mt-4 space-y-2.5">
              {item.permissions.map((perm, pIdx) => (
                <li key={pIdx} className="flex items-start text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 shrink-0 mt-0.5" />
                  <span>{perm}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
