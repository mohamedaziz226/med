// Reproduce the n8n "Prepare Reminders" daysUntil computation for appointment 23
const TZ_OPTS = { timeZone: 'Africa/Tunis' };
const ymdFmt = new Intl.DateTimeFormat('en-CA', { ...TZ_OPTS, year: 'numeric', month: '2-digit', day: '2-digit' });
const tunisDayUtcMidnight = (dateObj) => {
  const parts = {};
  for (const part of ymdFmt.formatToParts(dateObj)) parts[part.type] = part.value;
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
};

const todayMidnight = tunisDayUtcMidnight(new Date());
const rdvDate = new Date("2026-09-07T09:00:00Z");
const rdvMidnight = tunisDayUtcMidnight(rdvDate);
const daysUntil = Math.round((rdvMidnight - todayMidnight) / 86400000);

console.log("date now:", new Date().toISOString());
console.log("todayMidnight:", new Date(todayMidnight).toISOString());
console.log("rdvMidnight:", new Date(rdvMidnight).toISOString());
console.log("daysUntil:", daysUntil);

// Also test the en-CA formatted day for rdv
const parts = {};
for (const part of ymdFmt.formatToParts(rdvDate)) parts[part.type] = part.value;
console.log("en-CA parts for rdv:", parts);