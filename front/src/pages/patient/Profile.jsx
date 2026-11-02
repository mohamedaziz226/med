// src/pages/patient/Profile.jsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Phone, Mail, MapPin, Heart, AlertCircle, ShieldCheck, Check } from 'lucide-react';

export default function PatientProfile() {
  const { user, updateUserProfile } = useAuth();
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: user?.address || '',
    allergies: user?.allergies ? user.allergies.join(', ') : '',
    chronicConditions: user?.chronicConditions ? user.chronicConditions.join(', ') : '',
    bloodType: user?.bloodType || 'O+'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUserProfile({
      ...form,
      allergies: form.allergies.split(',').map(s => s.trim()).filter(Boolean),
      chronicConditions: form.chronicConditions.split(',').map(s => s.trim()).filter(Boolean)
    });
    setSuccessMsg('Profil mis à jour avec succès.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mon Profil Médical & Personnel</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Gérez vos données personnelles, coordonnées, allergies et antécédents médicaux.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center">
          <Check className="w-4 h-4 mr-2" />
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center space-x-4 border-b border-slate-100 pb-6">
          <img src={user?.avatar} alt="" className="w-20 h-20 rounded-2xl object-cover ring-4 ring-teal-500/20" />
          <div>
            <h3 className="font-bold text-slate-900 text-lg">{user?.firstName} {user?.lastName}</h3>
            <p className="text-xs text-teal-700 font-semibold">{user?.email}</p>
            <span className="mt-1 px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full inline-block">
              Sang : {form.bloodType}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom</label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nom</label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse Domicile</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h4 className="font-bold text-sm text-slate-900 flex items-center">
            <Heart className="w-4 h-4 text-rose-600 mr-2" />
            Informations Santé & Antécédents
          </h4>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Allergies Connues (séparées par une virgule)</label>
            <input
              type="text"
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              placeholder="ex: Pénicilline, Pollen..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Pathologies Chroniques ou Antécédents</label>
            <input
              type="text"
              value={form.chronicConditions}
              onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })}
              placeholder="ex: Hypertension artérielle..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>

        <div className="pt-3 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs"
          >
            Sauvegarder mon profil
          </button>
        </div>
      </form>
    </div>
  );
}
