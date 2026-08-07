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
  commission,
  performanceScore,
  sumReports,
  workingDaysPassed,
  remainingWorkingDays,
  isoDate,
  detectCoachingAlerts,
  teamHealthCounts,
  AGENTS,
} from "./utils.js";

// ----------------------------------------------------------------
// Real backend call helper (Google Apps Script Web App)
// ----------------------------------------------------------------
async function callApi(path, options = {}) {
  const params = new URLSearchParams({ path, ...(options.params || {}) });
  const url = `${CONFIG.API_URL}?${params.toString()}`;
  try {
    const res = await fetch(url, {
      method: options.method || "GET",
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      status: "error",
      message:
        `Could not reach the backend (${err.message}). Check: (1) the Apps Script deployment's ` +
        `"Who has access" is set to "Anyone" — not "Anyone with Google account" — and (2) you deployed ` +
        `a "New version" after the last code change.`,
    };
  }
}

// ----------------------------------------------------------------
// Mock computations — mirrors what Analytics.gs / Dashboard.gs
// would compute server-side from the REPORTS sheet.
// ----------------------------------------------------------------
function agentTarget(agent, settings) {
  if (agent.target) return agent.target;
  return settings.MONTHLY_TARGET / AGENTS.length;
}

function computeAgentStats(agent, rows, settings, passed, workingDays) {
  const agentRows = rows.filter((r) => r.agent === agent.name);
  const totals = sumReports(agentRows);
  const cRate = contactRate(totals.connected, totals.calls);
  const clRate = closingRate(totals.booking, totals.connected);
  const avgSale = averageTicket(totals.sales, totals.booking);
  const target = agentTarget(agent, settings);
  // Pace-adjusted target: how much of the target an agent *should* have
  // hit by this point in the month, so the score is meaningful on day 5
  // as well as day 26 — not just harsh until the month is nearly over.
  const paceTarget = workingDays > 0 ? target * Math.min(passed / workingDays, 1) : target;

  const daysReported = new Set(agentRows.map((r) => r.date)).size;
  const consistency = passed > 0 ? Math.min(daysReported / passed, 1) : 0;
  const reportSubmittedPct = passed > 0 ? Math.min((daysReported / passed) * 100, 100) : 0;

  const score = performanceScore({
    sales: totals.sales,
    target: paceTarget || target,
    cRate,
    clRate,
    booking: totals.booking,
    bookingGoal: 60,
    consistency,
  });

  return {
    agent: agent.name,
    ...totals,
    contactRate: cRate,
    closingRate: clRate,
    bookingRate: bookingRate(totals.booking, totals.connected),
    avgSale,
    score,
    target,
    targetProgress: target > 0 ? (totals.sales / target) * 100 : 0,
    commission: commission(totals.sales, settings.COMMISSION_RATE),
    reportSubmittedPct,
    daysReported,
  };
}

// viewDate: the day the KPI cards / executive summary should reflect (defaults to today)
// rangeDays: how many days the trend charts should cover (defaults to 14)
function mockGetDashboard(viewDate, rangeDays) {
  const settings = Store.getSettings();
  const rows = Store.getReports();
  const day = viewDate || isoDate(new Date());
  const monthPrefix = day.slice(0, 7);
  const dayDateObj = new Date(day + "T00:00:00");

  const dayRows = rows.filter((r) => r.date === day);
  const monthRows = rows.filter((r) => r.date.slice(0, 7) === monthPrefix);

  const dayTotals = sumReports(dayRows);
  const monthTotals = sumReports(monthRows);

  const passed = workingDaysPassed(dayDateObj);
  const remDays = remainingWorkingDays(settings.WORKING_DAYS, dayDateObj);
  const remaining = remainingTarget(settings.MONTHLY_TARGET, monthTotals.sales);
  const forecastAmt = forecast(monthTotals.sales, passed, settings.WORKING_DAYS);

  const perAgentDay = AGENTS.map((a) => computeAgentStats(a, dayRows, settings, passed));
  const perAgentMonth = AGENTS.map((a) => computeAgentStats(a, monthRows, settings, passed));

  const topToday = [...perAgentDay].filter((a) => a.sales > 0).sort((a, b) => b.sales - a.sales)[0] || null;

  // previous day for delta
  const prev = new Date(dayDateObj);
  prev.setDate(prev.getDate() - 1);
  const prevTotals = sumReports(rows.filter((r) => r.date === isoDate(prev)));
  const salesDelta = prevTotals.sales > 0 ? ((dayTotals.sales - prevTotals.sales) / prevTotals.sales) * 100 : 0;

  const needToday = needPerDay(remaining, remDays);

  // Coaching alerts — computed from each agent's own recent daily rows + month stats
  const teamAvgConnected = perAgentMonth.reduce((s, a) => s + a.connected, 0) / (perAgentMonth.length || 1);
  const alerts = [];
  AGENTS.forEach((a) => {
    const agentRowsDesc = rows
      .filter((r) => r.agent === a.name)
      .sort((x, y) => (x.date < y.date ? 1 : -1));
    const monthStats = perAgentMonth.find((m) => m.agent === a.name);
    alerts.push(...detectCoachingAlerts(a.name, agentRowsDesc, monthStats, teamAvgConnected));
  });

  return {
    status: "success",
    date: day,
    settings,
    kpi: {
      todaySales: dayTotals.sales,
      salesDelta,
      contactRate: contactRate(dayTotals.connected, dayTotals.calls),
      bookingRate: bookingRate(dayTotals.booking, dayTotals.connected),
      closingRate: closingRate(dayTotals.booking, dayTotals.connected),
      booking: dayTotals.booking,
      calls: dayTotals.calls,
      connected: dayTotals.connected,
      avgSale: averageTicket(dayTotals.sales, dayTotals.booking),
      performanceScore: perAgentDay.length ? Math.round(perAgentDay.reduce((s, a) => s + a.score, 0) / perAgentDay.length) : 0,
      reportSubmittedPct: perAgentMonth.length ? Math.round(perAgentMonth.reduce((s, a) => s + a.reportSubmittedPct, 0) / perAgentMonth.length) : 0,
    },
    monthly: {
      target: settings.MONTHLY_TARGET,
      current: monthTotals.sales,
      progress: settings.MONTHLY_TARGET > 0 ? (monthTotals.sales / settings.MONTHLY_TARGET) * 100 : 0,
      remaining,
      needPerDay: needToday,
      forecast: forecastAmt,
      daysPassed: passed,
      remainingDays: remDays,
    },
    projection: {
      todayNeed: needToday,
      todayActual: dayTotals.sales,
      todayGap: needToday - dayTotals.sales,
      forecast: forecastAmt,
      forecastVsTarget: settings.MONTHLY_TARGET > 0 ? ((forecastAmt - settings.MONTHLY_TARGET) / settings.MONTHLY_TARGET) * 100 : 0,
    },
    commission: {
      teamTotal: commission(monthTotals.sales, settings.COMMISSION_RATE),
      rate: settings.COMMISSION_RATE,
    },
    funnel: {
      fresh: monthTotals.fresh,
      freezing: monthTotals.freezing,
      leads: monthTotals.fresh + monthTotals.freezing,
      calls: monthTotals.calls,
      connected: monthTotals.connected,
      booking: monthTotals.booking,
      sales: monthTotals.sales,
    },
    executiveSummary: {
      topPerformer: topToday,
    },
    coachingAlerts: alerts,
    teamHealth: teamHealthCounts(perAgentMonth),
    perAgentToday: perAgentDay,
    perAgentMonth,
    chart: buildChartSeries(rows, settings, rangeDays || 14, dayDateObj),
  };
}

function buildChartSeries(rows, settings, days, endDate) {
  const labels = [];
  const sales = [];
  const contact = [];
  const closing = [];
  const booking = [];
  const end = endDate || new Date();

  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(end);
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

  const monthPrefix = isoDate(end).slice(0, 7);
  const contribution = AGENTS.map((a) => {
    const agentRows = rows.filter((r) => r.agent === a.name && r.date.slice(0, 7) === monthPrefix);
    return { agent: a.name, sales: sumReports(agentRows).sales };
  });

  return { labels, sales, contact, closing, booking, contribution };
}

function mockGetLeaderboard(viewDate) {
  const rows = Store.getReports();
  const settings = Store.getSettings();
  const day = viewDate || isoDate(new Date());
  const passed = workingDaysPassed(new Date(day + "T00:00:00"));
  const monthRows = rows.filter((r) => r.date.slice(0, 7) === day.slice(0, 7));
  const list = AGENTS.map((a) => computeAgentStats(a, monthRows, settings, passed));
  return { status: "success", leaderboard: list };
}

function mockGetAgent(name) {
  const rows = Store.getReports();
  const settings = Store.getSettings();
  const agentMeta = AGENTS.find((a) => a.name === name) || { name };
  const agentRows = rows.filter((r) => r.agent === name).sort((a, b) => (a.date < b.date ? 1 : -1));
  const today = isoDate(new Date());
  const monthRows = agentRows.filter((r) => r.date.slice(0, 7) === today.slice(0, 7));
  const passed = workingDaysPassed();
  const stats = computeAgentStats(agentMeta, monthRows, settings, passed);

  // trend: compare last 5 days avg vs prior 5 days avg
  const last5 = agentRows.slice(0, 5).reduce((s, r) => s + r.sales, 0);
  const prev5 = agentRows.slice(5, 10).reduce((s, r) => s + r.sales, 0);
  const trend = last5 > prev5 ? "up" : last5 < prev5 ? "down" : "flat";

  const timeline = agentRows.slice(0, 30).map((r) => ({
    date: r.date,
    sales: r.sales,
    calls: r.calls,
    connected: r.connected,
    booking: r.booking,
  }));
  return { status: "success", agent: name, stats, timeline, trend };
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
    timestamp: new Date().toISOString(),
  });
  return { status: "success", message: "Report Submitted" };
}

// ----------------------------------------------------------------
// Public API — same shape whether mock or real
// opts: { date: "YYYY-MM-DD", range: 7|14|30 }
// ----------------------------------------------------------------
export const API = {
  async getDashboard(opts = {}) {
    if (CONFIG.USE_MOCK_DATA) return mockGetDashboard(opts.date, opts.range);
    const params = {};
    if (opts.date) params.date = opts.date;
    if (opts.range) params.range = opts.range;
    return callApi("dashboard", { params });
  },
  async getLeaderboard(opts = {}) {
    if (CONFIG.USE_MOCK_DATA) return mockGetLeaderboard(opts.date);
    const params = {};
    if (opts.date) params.date = opts.date;
    return callApi("leaderboard", { params });
  },
  async getAgent(name) {
    if (CONFIG.USE_MOCK_DATA) return mockGetAgent(name);
    return callApi("agent", { params: { id: name } });
  },
  async getSettings() {
    if (CONFIG.USE_MOCK_DATA) return { status: "success", settings: Store.getSettings() };
    return callApi("settings");
  },
  async updateSettings(partial) {
    if (CONFIG.USE_MOCK_DATA) return { status: "success", settings: Store.saveSettings(partial) };
    return callApi("settings", { method: "POST", body: partial });
  },
  async submitReport(payload) {
    if (CONFIG.USE_MOCK_DATA) return mockSubmitReport(payload);
    return callApi("submitReport", { method: "POST", body: payload });
  },
  async getAgentsList() {
    if (CONFIG.USE_MOCK_DATA) return { status: "success", agents: Store.getAgents() };
    return callApi("agents");
  },
};
