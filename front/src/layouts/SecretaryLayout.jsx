// src/layouts/SecretaryLayout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, ShieldCheck } from 'lucide-react';

export default function SecretaryLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  const doctorName = user?.doctorName || 'Dr. Slim Ben Ali';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-800">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:pl-[220px] flex flex-col min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Secretary Top Banner Requirement */}
        <div className="bg-[#1E293B] text-white px-4 sm:px-6 py-2 shadow-2xs flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-2 text-xs font-semibold tracking-wide">
            <div className="p-1 bg-[#3B82F6]/20 rounded-md">
              <Stethoscope className="w-3.5 h-3.5 text-[#3B82F6]" />
            </div>
            <span>
              Secrétaire de : <strong className="text-blue-300">{doctorName}</strong>
            </span>
          </div>
          <span className="hidden md:inline-flex items-center text-[11px] font-semibold bg-[#EFF6FF] text-[#2563EB] px-3 py-0.5 rounded-full border border-[#BFDBFE]">
            <ShieldCheck className="w-3 h-3 mr-1" /> Cabinet Rattaché
          </span>
        </div>

        <main className="flex-1 p-4 sm:p-5 lg:p-6 max-w-7xl w-full mx-auto space-y-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
