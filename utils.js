import { CONFIG, getScoreBand, SCORE_BANDS, ALERT_RULES } from "./config.js";

// ----------------------------------------------------------------
// Formatting
// ----------------------------------------------------------------
export function money(n) {
  const v = Number(n) || 0;
  return `${CONFIG.CURRENCY}${v.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;
}

export function pct(n) {
  const v = Number(n) || 0;
  return `${v.toFixed(1)}%`;
}

export function dateLabel(d) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-MY", { day: "2-digit", month: "short" });
}

export function fullDateLabel(d) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function durationLabel(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

export function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

// ----------------------------------------------------------------
// KPI Formulas — derived entirely from the 8 fields agents submit:
// Date, Agent, Fresh, Freezing, Calls, Connected, Booking, Sales
// ----------------------------------------------------------------
export function contactRate(connected, calls) {
  return calls > 0 ? (connected / calls) * 100 : 0;
}
export function bookingRate(booking, connected) {
  return connected > 0 ? (booking / connected) * 100 : 0;
}
export function interestRate(interested, connected) {
  return connected > 0 ? (interested / connected) * 100 : 0;
}
export function closingRate(booking, interested) {
  return interested > 0 ? (booking / interested) * 100 : 0;
}
export function averageTicket(sales, booking) {
  return booking > 0 ? sales / booking : 0;
}
export function remainingTarget(target, currentSales) {
  return Math.max(target - currentSales, 0);
}
export function needPerDay(remaining, remainingDays) {
  return remainingDays > 0 ? remaining / remainingDays : remaining;
}
export function forecast(currentSales, daysPassed, workingDays) {
  return daysPassed > 0 ? (currentSales / daysPassed) * workingDays : 0;
}
export function commission(sales, ratePct) {
  return (Number(sales) || 0) * ((Number(ratePct) || 0) / 100);
}

// Performance Score: Sales 40% + Contact Rate 20% + Closing Rate 20% + Booking 10% + Reporting Consistency 10%
export function performanceScore({ sales, target, cRate, clRate, booking, bookingGoal, consistency }) {
  const salesScore = Math.min(sales / (target || 1), 1) * 40;
  const contactScore = Math.min(cRate / 100, 1) * 20;
  const closingScore = Math.min(clRate / 100, 1) * 20;
  const bookingScore = Math.min(booking / (bookingGoal || 1), 1) * 10;
  const consistencyScore = Math.min(consistency, 1) * 10;
  return Math.round(salesScore + contactScore + closingScore + bookingScore + consistencyScore);
}

export function statusBadge(score) {
  return getScoreBand(score);
}

// Count agents per performance band — powers the Team Health widget.
export function teamHealthCounts(agentStatsList) {
  const counts = SCORE_BANDS.map((b) => ({ ...b, count: 0 }));
  agentStatsList.forEach((a) => {
    const band = getScoreBand(a.score);
    const bucket = counts.find((c) => c.label === band.label);
    if (bucket) bucket.count++;
  });
  return counts;
}

// ----------------------------------------------------------------
// Coaching Alerts — automatic detection, no manual flagging needed.
// ----------------------------------------------------------------
export function detectCoachingAlerts(agentName, agentDailyRowsDesc, monthStats, teamAvgConnected) {
  const alerts = [];

  // Rule 1: sales fell on each of the last N reported days
  const streak = ALERT_RULES.SALES_DROP_STREAK_DAYS;
  if (agentDailyRowsDesc.length >= streak) {
    const recent = agentDailyRowsDesc.slice(0, streak);
    let dropping = true;
    for (let i = 0; i < recent.length - 1; i++) {
      if (recent[i].sales >= recent[i + 1].sales) {
        dropping = false;
        break;
      }
    }
    if (dropping) {
      alerts.push({ agent: agentName, type: "sales_drop", message: `Sales turun ${streak} hari berturut` });
    }
  }

  // Rule 2: low contact rate
  if (monthStats.calls > 0 && monthStats.contactRate < ALERT_RULES.LOW_CONTACT_RATE) {
    alerts.push({ agent: agentName, type: "low_contact", message: `Contact Rate bawah ${ALERT_RULES.LOW_CONTACT_RATE}%` });
  }

  // Rule 3: low booking rate despite above-average connected volume
  if (
    monthStats.connected > teamAvgConnected &&
    monthStats.bookingRate < ALERT_RULES.LOW_BOOKING_RATE_WITH_HIGH_CONNECTED &&
    monthStats.connected > 0
  ) {
    alerts.push({ agent: agentName, type: "low_booking", message: "Booking rendah walaupun Connected tinggi" });
  }

  return alerts;
}

// ----------------------------------------------------------------
// Deterministic pseudo-random (seeded) so mock data is stable
// across reloads within the same day.
// ----------------------------------------------------------------
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const AGENTS = [
  { id: "AG001", name: "Ali", team: "Alpha", skill: 0.92, target: 20000 },
  { id: "AG002", name: "Mira", team: "Alpha", skill: 0.78, target: 16000 },
  { id: "AG003", name: "Fatin", team: "Bravo", skill: 0.83, target: 18000 },
  { id: "AG004", name: "Aiman", team: "Bravo", skill: 0.65, target: 14000 },
  { id: "AG005", name: "Siti", team: "Bravo", skill: 0.55, target: 12000 },
];

// Generates N days of REPORTS rows — the 9-field schema:
// Date | Agent | Fresh | Freezing | Calls | Connected | Interested | Booking | Sales
export function generateMockReports(days = 30) {
  const rows = [];
  const today = new Date();
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const iso = isoDate(date);
    if (date.getDay() === 0) continue; // Sundays off

    AGENTS.forEach((agent, idx) => {
      const rnd = mulberry32(iso.split("-").join("") * 1 + idx * 97);
      const calls = Math.round(40 + rnd() * 35);
      const connected = Math.round(calls * (0.3 + agent.skill * 0.25 + rnd() * 0.07));
      const interested = Math.round(connected * (0.35 + agent.skill * 0.25 + rnd() * 0.08));
      const booking = Math.round(interested * (0.25 + agent.skill * 0.25 + rnd() * 0.06));
      const avgTicket = 150 + agent.skill * 110 + rnd() * 40;
      const sales = Math.round(booking * avgTicket);
      const fresh = Math.round(30 + rnd() * 40);
      const freezing = Math.round(20 + rnd() * 40);

      rows.push({
        date: iso,
        agentId: agent.id,
        agent: agent.name,
        fresh,
        freezing,
        calls,
        connected,
        interested,
        booking,
        sales,
        timestamp: `${iso}T${9 + (idx % 6)}:${(10 + idx * 7) % 60}:00`,
      });
    });
  }
  return rows;
}

export function sumReports(rows) {
  return rows.reduce(
    (acc, r) => {
      acc.calls += r.calls;
      acc.connected += r.connected;
      acc.interested += r.interested || 0;
      acc.booking += r.booking;
      acc.sales += r.sales;
      acc.fresh += r.fresh;
      acc.freezing += r.freezing;
      return acc;
    },
    { calls: 0, connected: 0, interested: 0, booking: 0, sales: 0, fresh: 0, freezing: 0 }
  );
}

export function workingDaysPassed(today = new Date()) {
  let count = 0;
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) count++;
  }
  return count;
}

export function remainingWorkingDays(workingDays, today = new Date()) {
  const passed = workingDaysPassed(today);
  return Math.max(workingDays - passed, 1);
}

export function toast(message, type = "success") {
  const el = document.createElement("div");
  const colors = {
    success: "bg-[#16C47F]",
    warning: "bg-[#FFB200]",
    error: "bg-[#EF4444]",
  };
  el.className = `toast fixed top-6 right-6 z-[100] ${colors[type]} text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-medium text-sm max-w-sm`;
  el.innerHTML = `<span>${type === "success" ? "✓" : type === "warning" ? "⚠" : "✕"}</span><span>${message}</span>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("toast-in"));
  setTimeout(() => {
    el.classList.remove("toast-in");
    el.classList.add("toast-out");
    setTimeout(() => el.remove(), 350);
  }, 4000);
}

export function animateCount(el, target, opts = {}) {
  const { duration = 900, prefix = "", suffix = "", decimals = 0 } = opts;
  const start = 0;
  const startTime = performance.now();
  function tick(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = start + (target - start) * eased;
    el.textContent = `${prefix}${val.toLocaleString("en-MY", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
