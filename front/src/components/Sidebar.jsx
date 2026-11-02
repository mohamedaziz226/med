// src/components/Sidebar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  Calendar,
  CreditCard,
  MessageSquare,
  Bot,
  User,
  LogOut,
  ShieldAlert,
  History,
  Stethoscope,
  Briefcase,
  Send,
  Bell,
  X
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const role = user?.role || 'patient';

  const menuConfig = {
    admin: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/admin/doctors', label: 'Gestion des médecins', icon: Stethoscope },
      { path: '/admin/users', label: 'Gestion des utilisateurs', icon: Users },
      { path: '/admin/permissions', label: 'Rôles & Permissions', icon: ShieldAlert },
      { path: '/admin/activity-logs', label: "Journaux d'activité", icon: History },
    ],
    doctor: [
      { path: '/doctor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/doctor/my-patients', label: 'Mes patients', icon: Users },
      { path: '/doctor/my-secretaries', label: 'Mes secrétaires', icon: Briefcase },
      { path: '/doctor/document-requests', label: 'Demandes de documents', icon: Send },
      { path: '/doctor/appointments', label: 'Rendez-vous', icon: Calendar },
      { path: '/doctor/messages', label: 'Messagerie', icon: MessageSquare },
      { path: '/doctor/ai-chatbot', label: 'Chatbot IA', icon: Bot },
    ],
    secretary: [
      { path: '/secretary/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/secretary/my-patients', label: 'Mes patients', icon: Users },
      { path: '/secretary/appointments', label: 'Rendez-vous', icon: Calendar },
      { path: '/secretary/payments', label: 'Paiements et dettes', icon: CreditCard },
      { path: '/secretary/patient-messages', label: 'Messages patients', icon: MessageSquare },
      { path: '/secretary/doctor-messages', label: 'Messages médecin', icon: Stethoscope },
      { path: '/secretary/document-requests', label: 'Demandes de documents', icon: FileText },
      { path: '/secretary/ai-chatbot', label: 'Chatbot IA', icon: Bot },
    ],
    patient: [
      { path: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/patient/my-doctors', label: 'Mes médecins & comptes-rendus', icon: Stethoscope },
      { path: '/patient/profile', label: 'Mon profil', icon: User },
      { path: '/patient/appointments', label: 'Mes rendez-vous', icon: Calendar },
      { path: '/patient/my-documents', label: 'Mes documents', icon: FileText },
      { path: '/patient/notifications', label: 'Notifications', icon: Bell },
      { path: '/patient/messages', label: 'Messages', icon: MessageSquare },
      { path: '/patient/ai-chatbot', label: 'Chatbot IA', icon: Bot },
    ]
  };

  const navItems = menuConfig[role] || menuConfig.patient;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-[220px] bg-[#0F172A] text-[#F8FAFC] z-50 transition-transform duration-300 ease-in-out flex flex-col border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-[60px] px-5 flex items-center justify-between border-b border-white/10 bg-[#1E293B] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
              M+
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-[#3B82F6] block">MedSecretariat</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center px-5 py-2.5 text-[13px] transition-all duration-150 ${
                    isActive
                      ? 'bg-[#3B82F6] text-white font-semibold'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 mr-3 shrink-0 opacity-80" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Logout Section */}
        <div className="p-3 border-t border-white/10 mt-auto bg-[#0F172A]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3.5 py-2 rounded-lg text-[13px] font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2.5 shrink-0" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}
