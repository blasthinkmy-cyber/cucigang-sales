import { CONFIG } from "./config.js";
import * as Store from "./store.js";
import {
  contactRate,
  bookingRate,
  closingRate,
  averageTicket,
  remainingTarget,
  needPerDay,
  forecast,
  performanceScore,
  sumReports,
  workingDaysPassed,
  remainingWorkingDays,
  isoDate,
  AGENTS,
} from "./utils.js";

// ----------------------------------------------------------------
// Real backend call helper (Google Apps Script Web App)
// ----------------------------------------------------------------
async function callApi(path, options = {}) {
  const url = `${CONFIG.API_URL}?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    method: options.method || "GET",
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ----------------------------------------------------------------
// Mock computations — mirrors what Analytics.gs / Dashboard.gs
// would compute server-side from the REPORTS sheet.
// ----------------------------------------------------------------
function computeAgentStats(agentName, rows, settings) {
  const agentRows = rows.filter((r) => r.agent === agentName);
  const totals = sumReports(agentRows);
  const cRate = contactRate(totals.connected, totals.calls);
  const clRate = closingRate(totals.booking, totals.connected);
  const avgSale = averageTicket(totals.sales, totals.booking);

  const daysReported = new Set(agentRows.map((r) => r.date)).size;
  const passed = workingDaysPassed();
  const consistency = passed > 0 ? Math.min(daysReported / passed, 1) : 0;

  const score = performanceScore({
    sales: totals.sales,
    target: settings.MONTHLY_TARGET / AGENTS.length,
    cRate,
    clRate,
    booking: totals.booking,
    bookingGoal: 60,
    consistency,
  });

  return { agent: agentName, ...totals, contactRate: cRate, closingRate: clRate, bookingRate: bookingRate(totals.booking, totals.connected), avgSale, score };
}

function mockGetDashboard() {
  const settings = Store.getSettings();
  const rows = Store.getReports();
  const today = isoDate(new Date());
  const todayRows = rows.filter((r) => r.date === today);
  const monthRows = rows.filter((r) => r.date.slice(0, 7) === today.slice(0, 7));

  const todayTotals = sumReports(todayRows);
  const monthTotals = sumReports(monthRows);

  const passed = workingDaysPassed();
  const remDays = remainingWorkingDays(settings.WORKING_DAYS);
  const remaining = remainingTarget(settings.MONTHLY_TARGET, monthTotals.sales);

  const perAgentToday = AGENTS.map((a) => computeAgentStats(a.name, todayRows, settings));
  const perAgentMonth = AGENTS.map((a) => computeAgentStats(a.name, monthRows, settings));

  const topToday = [...perAgentToday].sort((a, b) => b.sales - a.sales)[0];
  const needsCoaching = [...perAgentMonth].sort((a, b) => a.score - b.score)[0];

  // yesterday for delta
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yestRows = rows.filter((r) => r.date === isoDate(yest));
  const yestTotals = sumReports(yestRows);
  const salesDelta = yestTotals.sales > 0 ? ((todayTotals.sales - yestTotals.sales) / yestTotals.sales) * 100 : 0;

  return {
    status: "success",
    date: today,
    settings,
    kpi: {
      todaySales: todayTotals.sales,
      salesDelta,
      contactRate: contactRate(todayTotals.connected, todayTotals.calls),
      closingRate: closingRate(todayTotals.booking, todayTotals.connected),
      booking: todayTotals.booking,
      calls: todayTotals.calls,
      connected: todayTotals.connected,
      avgSale: averageTicket(todayTotals.sales, todayTotals.booking),
      performanceScore: Math.round(perAgentToday.reduce((s, a) => s + a.score, 0) / perAgentToday.length) || 0,
    },
    monthly: {
      target: settings.MONTHLY_TARGET,
      current: monthTotals.sales,
      progress: settings.MONTHLY_TARGET > 0 ? (monthTotals.sales / settings.MONTHLY_TARGET) * 100 : 0,
      remaining,
      needPerDay: needPerDay(remaining, remDays),
      forecast: forecast(monthTotals.sales, passed, settings.WORKING_DAYS),
      daysPassed: passed,
      remainingDays: remDays,
    },
    executiveSummary: {
      topPerformer: topToday && topToday.sales > 0 ? topToday : null,
      needsCoaching: needsCoaching && needsCoaching.calls > 0 ? needsCoaching : null,
    },
    perAgentToday,
    perAgentMonth,
    chart: buildChartSeries(rows, settings),
  };
}

function buildChartSeries(rows, settings, days = 14) {
  const labels = [];
  const sales = [];
  const contact = [];
  const closing = [];
  const booking = [];
  const today = new Date();
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const iso = isoDate(date);
    const dayRows = rows.filter((r) => r.date === iso);
    const totals = sumReports(dayRows);
    labels.push(iso);
    sales.push(totals.sales);
    contact.push(Math.round(contactRate(totals.connected, totals.calls) * 10) / 10);
    closing.push(Math.round(closingRate(totals.booking, totals.connected) * 10) / 10);
    booking.push(totals.booking);
  }

  const contribution = AGENTS.map((a) => {
    const agentRows = rows.filter((r) => r.agent === a.name && r.date.slice(0, 7) === isoDate(today).slice(0, 7));
    return { agent: a.name, sales: sumReports(agentRows).sales };
  });

  return { labels, sales, contact, closing, booking, contribution };
}

function mockGetLeaderboard() {
  const rows = Store.getReports();
  const settings = Store.getSettings();
  const today = isoDate(new Date());
  const monthRows = rows.filter((r) => r.date.slice(0, 7) === today.slice(0, 7));
  const list = AGENTS.map((a) => computeAgentStats(a.name, monthRows, settings)).sort((a, b) => b.sales - a.sales);
  return { status: "success", leaderboard: list };
}

function mockGetAgent(name) {
  const rows = Store.getReports();
  const settings = Store.getSettings();
  const agentRows = rows.filter((r) => r.agent === name).sort((a, b) => (a.date < b.date ? 1 : -1));
  const monthRows = agentRows.filter((r) => r.date.slice(0, 7) === isoDate(new Date()).slice(0, 7));
  const stats = computeAgentStats(name, monthRows, settings);
  const timeline = agentRows.slice(0, 10).map((r) => ({
    date: r.date,
    sales: r.sales,
    calls: r.calls,
    connected: r.connected,
    booking: r.booking,
  }));
  return { status: "success", agent: name, stats, timeline };
}

function mockSubmitReport(payload) {
  const required = ["name", "date", "calls", "connected", "booking", "sales"];
  for (const f of required) {
    if (payload[f] === undefined || payload[f] === "" || payload[f] === null) {
      return { status: "error", message: `Missing ${f} value` };
    }
  }
  if (Number(payload.connected) > Number(payload.calls)) {
    return { status: "error", message: "Connected cannot exceed Calls" };
  }
  if (Number(payload.booking) > Number(payload.connected)) {
    return { status: "error", message: "Booking cannot exceed Connected" };
  }
  if (Store.hasDuplicate(payload.name, payload.date)) {
    return { status: "error", message: "Report already exists for this agent and date" };
  }
  Store.addReport({
    date: payload.date,
    agent: payload.name,
    fresh: Number(payload.fresh) || 0,
    freezing: Number(payload.freezing) || 0,
    calls: Number(payload.calls) || 0,
    connected: Number(payload.connected) || 0,
    booking: Number(payload.booking) || 0,
    sales: Number(payload.sales) || 0,
    followup: Number(payload.followup) || 0,
    noanswer: Number(payload.noanswer) || 0,
    rejected: Number(payload.rejected) || 0,
    remarks: payload.remarks || "",
    timestamp: new Date().toISOString(),
  });
  return { status: "success", message: "Report Submitted" };
}

// ----------------------------------------------------------------
// Public API — same shape whether mock or real
// ----------------------------------------------------------------
export const API = {
  async getDashboard() {
    if (CONFIG.USE_MOCK_DATA) return mockGetDashboard();
    return callApi("/dashboard");
  },
  async getLeaderboard() {
    if (CONFIG.USE_MOCK_DATA) return mockGetLeaderboard();
    return callApi("/leaderboard");
  },
  async getAgent(name) {
    if (CONFIG.USE_MOCK_DATA) return mockGetAgent(name);
    return callApi(`/agent?id=${encodeURIComponent(name)}`);
  },
  async getSettings() {
    if (CONFIG.USE_MOCK_DATA) return { status: "success", settings: Store.getSettings() };
    return callApi("/settings");
  },
  async updateSettings(partial) {
    if (CONFIG.USE_MOCK_DATA) return { status: "success", settings: Store.saveSettings(partial) };
    return callApi("/settings", { method: "POST", body: partial });
  },
  async submitReport(payload) {
    if (CONFIG.USE_MOCK_DATA) return mockSubmitReport(payload);
    return callApi("/submitReport", { method: "POST", body: payload });
  },
  async getAgentsList() {
    if (CONFIG.USE_MOCK_DATA) return { status: "success", agents: Store.getAgents() };
    return callApi("/agents");
  },
};
