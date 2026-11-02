// src/components/ProfileModal.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { X, User, Mail, Phone, MapPin, Calendar, Award, Shield, FileText, Stethoscope } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose }) {
  const { user } = useAuth();

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 transform transition-all">
        {/* Header banner */}
        <div className="h-28 bg-gradient-to-r from-teal-600 via-teal-700 to-slate-800 p-4 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar badge overlapping */}
        <div className="px-6 relative -mt-14 pb-6">
          <div className="flex items-end justify-between mb-4">
            <img
              src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={`${user.firstName} ${user.lastName}`}
              className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white shadow-lg bg-white"
            />
            <span className="px-3 py-1 bg-teal-100 text-teal-800 font-bold text-xs rounded-full uppercase tracking-wider">
              {user.role}
            </span>
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {user.role === 'doctor' && 'Dr. '}
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-xs text-teal-600 font-medium">
              {user.specialty || user.doctorName || user.title || 'Utilisateur MedSecretariat'}
            </p>
          </div>

          <div className="mt-6 space-y-3.5 divide-y divide-slate-100 text-xs text-slate-700">
            <div className="pt-2 flex items-center">
              <Mail className="w-4 h-4 text-teal-600 mr-3 shrink-0" />
              <div>
                <span className="block text-[10px] text-slate-400 font-medium uppercase">Email</span>
                <span className="font-semibold text-slate-800">{user.email}</span>
              </div>
            </div>

            {user.phone && (
              <div className="pt-3 flex items-center">
                <Phone className="w-4 h-4 text-teal-600 mr-3 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-400 font-medium uppercase">Téléphone</span>
                  <span className="font-semibold text-slate-800">{user.phone}</span>
                </div>
              </div>
            )}

            {user.address && (
              <div className="pt-3 flex items-center">
                <MapPin className="w-4 h-4 text-teal-600 mr-3 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-400 font-medium uppercase">Adresse</span>
                  <span className="font-semibold text-slate-800">{user.address}</span>
                </div>
              </div>
            )}

            {user.licenseNumber && (
              <div className="pt-3 flex items-center">
                <Award className="w-4 h-4 text-teal-600 mr-3 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-400 font-medium uppercase">N° RPPS / Licence</span>
                  <span className="font-semibold text-slate-800">{user.licenseNumber}</span>
                </div>
              </div>
            )}

            {user.dob && (
              <div className="pt-3 flex items-center">
                <Calendar className="w-4 h-4 text-teal-600 mr-3 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-400 font-medium uppercase">Date de naissance</span>
                  <span className="font-semibold text-slate-800">{user.dob}</span>
                </div>
              </div>
            )}

            {user.emergencyContact && (
              <div className="pt-3 flex items-center">
                <Shield className="w-4 h-4 text-rose-500 mr-3 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-400 font-medium uppercase">Contact d'urgence</span>
                  <span className="font-semibold text-slate-800">{user.emergencyContact}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors shadow-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
