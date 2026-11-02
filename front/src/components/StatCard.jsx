// src/components/StatCard.jsx
import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StatCard({ title, value, icon: Icon, trend, trendValue }) {
  return (
    <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">{title}</div>
          <div className="text-2xl font-bold text-[#0F172A] mt-1">{value}</div>
        </div>
        {Icon && (
          <div className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#3B82F6]">
            <Icon className="w-5 h-5 shrink-0" />
          </div>
        )}
      </div>

      {trendValue ? (
        <div className="text-[11px] font-semibold text-[#10B981] mt-2 flex items-center">
          <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
          <span>{trendValue}</span>
        </div>
      ) : (
        <div className="text-[11px] font-medium text-slate-400 mt-2">Actif aujourd'hui</div>
      )}
    </div>
  );
}
