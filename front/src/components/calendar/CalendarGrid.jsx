// src/components/calendar/CalendarGrid.jsx
// Grille hebdomadaire de l'agenda partagé (médecin / secrétaire).
// Met en évidence : disponibilités (fond vert), RDV (bleu/ambre) et blocages (rouge).
import React from 'react';
import { formatDayHeader, formatTime, minutesSinceMidnight, sameDay, toDate, businessNow } from './dateUtils';

const HOUR_START = 7;
const HOUR_END = 19;
const PX_PER_HOUR = 56;
const RANGE_MINUTES = (HOUR_END - HOUR_START) * 60;

const entryTop = (value) => {
  const minutes = minutesSinceMidnight(value) - HOUR_START * 60;
  return Math.max(0, minutes) * (PX_PER_HOUR / 60);
};

const entryHeight = (start, end) => {
  const diff = minutesSinceMidnight(end) - minutesSinceMidnight(start);
  return Math.max(24, diff * (PX_PER_HOUR / 60));
};

const appointmentsOn = (day, appointments) =>
  (appointments || []).filter((apt) => sameDay(toDate(apt.scheduledAt), day));

const sameDayOrAfter = (day, value) => {
  const d = toDate(value);
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dStart = new Date(d);
  dStart.setHours(0, 0, 0, 0);
  return dayStart >= dStart;
};

const includesDay = (block, day) => {
  const start = toDate(block.start);
  return sameDay(start, day) || sameDayOrAfter(day, start);
};

const APPOINTMENT_COLORS = {
  pending: 'bg-amber-50 border-amber-300 text-amber-900',
  confirmed: 'bg-sky-50 border-sky-300 text-sky-900',
  completed: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  cancelled: 'bg-slate-100 border-slate-300 text-slate-500 line-through',
  rejected: 'bg-rose-50 border-rose-300 text-rose-900',
  no_show: 'bg-orange-50 border-orange-300 text-orange-900',
};

export default function CalendarGrid({
  days,
  availabilityBlocks = [],
  appointments = [],
  blockedSlots = [],
  onAppointmentClick,
  renderAppointmentLabel,
}) {
  const hours = [];
  for (let h = HOUR_START; h < HOUR_END; h += 1) hours.push(h);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[860px]">
        {/* Header jours */}
        <div
          className="grid border border-slate-200 rounded-t-lg overflow-hidden bg-white"
          style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}
        >
          <div className="py-2 text-center text-[10px] font-bold text-slate-400 uppercase bg-slate-50 border-r border-slate-100">
            Heure
          </div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`py-2 text-center border-r border-slate-100 last:border-r-0 ${
                sameDay(day, businessNow()) ? 'bg-blue-50' : 'bg-slate-50'
              }`}
            >
              <span className="text-[11px] font-bold text-slate-700">{formatDayHeader(day)}</span>
            </div>
          ))}
        </div>

        {/* Corps de la grille */}
        <div
          className="grid relative border-x border-b border-[#E2E8F0] rounded-b-lg bg-white"
          style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}
        >
          {/* Colonne des heures */}
          <div className="relative" style={{ height: RANGE_MINUTES * (PX_PER_HOUR / 60) }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-0 grid place-items-center text-[10px] font-semibold text-slate-400 border-t border-slate-100"
                style={{ top: (h - HOUR_START) * PX_PER_HOUR, height: PX_PER_HOUR }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Colonnes jours */}
          {days.map((day) => {
            const dayAvail = availabilityBlocks.filter((a) => sameDay(toDate(a.start), day));
            return (
              <div
                key={day.toISOString()}
                className="relative border-l border-slate-100 first:border-l-0"
                style={{ height: RANGE_MINUTES * (PX_PER_HOUR / 60) }}
              >
                {/* Lignes des heures */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-slate-50"
                    style={{ top: (h - HOUR_START) * PX_PER_HOUR }}
                  />
                ))}

                {/* Bandes de disponibilité */}
                {dayAvail.map((block, idx) => (
                  <div
                    key={`avail-${idx}`}
                    className="absolute left-1 right-1 rounded-md bg-emerald-50 border border-emerald-100 pointer-events-none"
                    style={{ top: entryTop(block.start), height: entryHeight(block.start, block.end) }}
                    title={`Disponible : ${formatTime(block.start)} - ${formatTime(block.end)}`}
                  />
                ))}

                {/* Créneaux bloqués */}
                {blockedSlots
                  .filter((b) => includesDay(b, day))
                  .map((b) => (
                    <div
                      key={`blk-${b.id}`}
                      className="absolute left-1 right-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] px-1.5 py-0.5 overflow-hidden"
                      style={{ top: entryTop(b.start), height: entryHeight(b.start, b.end) }}
                      title={b.reason || 'Créneau bloqué'}
                    >
                      🚫 {b.reason || 'Bloqué'}
                    </div>
                  ))}

                {/* Rendez-vous */}
                {appointmentsOn(day, appointments).map((apt) => {
                  // scheduledAt brut (ISO UTC) : formatTime / minutesSinceMidnight
                  // (via entryTop) se chargent de la conversion Africa/Tunis.
                  const startISO = apt.scheduledAt;
                  const colorClass = APPOINTMENT_COLORS[apt.status] || APPOINTMENT_COLORS.pending;
                  const label =
                    (renderAppointmentLabel && renderAppointmentLabel(apt)) ||
                    apt.patientName ||
                    `RDV #${apt.id}`;
                  return (
                    <button
                      key={`apt-${apt.id}`}
                      onClick={onAppointmentClick ? () => onAppointmentClick(apt) : undefined}
                      className={`absolute left-1 right-5 rounded-md border text-[10px] px-1.5 py-1 text-left shadow-2xs overflow-hidden hover:z-10 cursor-pointer ${colorClass}`}
                      style={{
                        top: entryTop(startISO),
                        height: Math.max(26, (apt.durationMinutes || 30) * (PX_PER_HOUR / 60)),
                      }}
                      title={`${label} — ${formatTime(startISO)}`}
                    >
                      <span className="font-bold block truncate">{label}</span>
                      <span className="opacity-75 block truncate">{formatTime(startISO)}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Légende */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-[10px] text-slate-500">
          <span className="flex items-center">
            <i className="w-3 h-3 inline-block rounded bg-emerald-100 border border-emerald-200 mr-1" />
            Disponibilité
          </span>
          <span className="flex items-center">
            <i className="w-3 h-3 inline-block rounded bg-sky-100 border border-sky-200 mr-1" />
            Rendez-vous confirmé
          </span>
          <span className="flex items-center">
            <i className="w-3 h-3 inline-block rounded bg-amber-100 border border-amber-200 mr-1" />
            Demande en attente
          </span>
          <span className="flex items-center">
            <i className="w-3 h-3 inline-block rounded bg-rose-100 border border-rose-200 mr-1" />
            Créneau bloqué
          </span>
        </div>
      </div>
    </div>
  );
}