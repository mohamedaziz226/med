// src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Menu, Search } from 'lucide-react';
import ProfileModal from './ProfileModal';
import NotificationBell from './NotificationBell';
import NotificationDropdown from './NotificationDropdown';

export default function Navbar({ onMenuClick }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, isPatient, markAllAsRead, markAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const notificationRef = useRef(null);

  // Fermer le dropdown quand on clique à l'extérieur.
  useEffect(() => {
    if (!showNotifications) return undefined;
    const handleClickOutside = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const handleSelectNotification = (n) => {
    if (n && !n.isRead) markAsRead(n.id);
    setShowNotifications(false);

    // Notification de rappel de rendez-vous → espace rendez-vous patient.
    if (isPatient && n?.relatedEntityType === 'appointment') {
      navigate('/patient/appointments');
    }
  };

  return (
    <>
      <header className="h-[60px] bg-white border-b border-[#E2E8F0] sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-2xs">
        {/* Left Side: Mobile Menu Toggle, Doctor Badge & Search */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onMenuClick}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden focus:outline-hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* High Density Doctor Badge if user has a doctor attached */}
          {user?.role === 'secretary' && (
            <div className="hidden md:flex items-center bg-[#EFF6FF] text-[#2563EB] px-3 py-1 rounded-full text-xs font-semibold border border-[#BFDBFE]">
              <span>Secrétaire de : {user?.doctorName || 'Dr. Ben Ali'}</span>
            </div>
          )}

          <div className="hidden sm:flex items-center bg-white rounded-lg px-3 py-1.5 border border-[#E2E8F0] w-56 md:w-64 focus-within:border-[#3B82F6] transition-all">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden w-full"
            />
          </div>
        </div>

        {/* Right Side: Notifications & Profile Avatar */}
        <div className="flex items-center space-x-3">
          {/* Notifications Popover */}
          <div className="relative" ref={notificationRef}>
            <NotificationBell
              unreadCount={unreadCount}
              onClick={() => setShowNotifications((s) => !s)}
            />

            {showNotifications && (
              <NotificationDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                isPatient={isPatient}
                onSelect={handleSelectNotification}
                onMarkAllAsRead={markAllAsRead}
                viewAllPath={isPatient ? '/patient/notifications' : null}
              />
            )}
          </div>

          {/* User Photo Avatar */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center space-x-2 p-1 rounded-lg hover:bg-slate-100 transition-all focus:outline-hidden group"
            title="Profil"
          >
            <div className="w-8 h-8 rounded-full bg-[#3B82F6] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {user?.firstName ? user.firstName.charAt(0) + (user.lastName ? user.lastName.charAt(0) : '') : 'SM'}
            </div>
            <div className="hidden md:block text-left">
              <span className="block text-xs font-bold text-[#0F172A] leading-none">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </button>
        </div>
      </header>

      {/* Modal Profile Info when tapping photo */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </>
  );
}
