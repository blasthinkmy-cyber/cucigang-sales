import { initTheme, toggleTheme, initMobileNav, markActiveNav, initHeaderScroll } from "./layout.js";
import { API } from "./api.js";
import { renderCharts } from "./charts.js";
import { money, pct, greeting, fullDateLabel, animateCount, statusBadge, dateLabel, isoDate, toast } from "./utils.js";
import { CONFIG, projectionStatus } from "./config.js";

let isDark = initTheme();
lucide.createIcons();
initMobileNav();
markActiveNav();
initHeaderScroll();

document.getElementById("themeToggle").addEventListener("click", () => {
  isDark = toggleTheme(() => load());
});

document.getElementById("greeting").textContent = `${greeting()}, Nazril 👋`;
document.getElementById("todayDate").textContent = fullDateLabel(new Date());

function chipClass(color) {
  return `chip chip-${color}`;
}

// ----------------------------------------------------------------
// State
// ----------------------------------------------------------------
const todayStr = isoDate(new Date());
let viewDate = todayStr;
let rangeDays = 14;
let lbCategory = "sales";
let lastLeaderboard = [];

const viewDateInput = document.getElementById("viewDate");
const viewDateMobileInput = document.getElementById("viewDateMobile");
[viewDateInput, viewDateMobileInput].forEach((el) => {
  if (!el) return;
  el.max = todayStr;
  el.value = todayStr;
  el.addEventListener("change", (e) => {
    viewDate = e.target.value || todayStr;
    [viewDateInput, viewDateMobileInput].forEach((other) => other && (other.value = viewDate));
    load();
  });
});

document.getElementById("jumpToday")?.addEventListener("click", () => {
  viewDate = todayStr;
  [viewDateInput, viewDateMobileInput].forEach((el) => el && (el.value = todayStr));
  load();
});

document.querySelectorAll(".range-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    rangeDays = Number(btn.dataset.range);
    document.querySelectorAll(".range-btn").forEach((b) => b.classList.toggle("active", b === btn));
    loadChartOnly();
  });
});
document.querySelector(`.range-btn[data-range="${rangeDays}"]`)?.classList.add("active");

document.querySelectorAll(".lb-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    lbCategory = btn.dataset.lb;
    document.querySelectorAll(".lb-tab").forEach((b) => b.classList.toggle("active", b === btn));
    renderLeaderboard(lastLeaderboard);
  });
});
document.querySelector(`.lb-tab[data-lb="${lbCategory}"]`)?.classList.add("active");

// ----------------------------------------------------------------
// Renderers
// ----------------------------------------------------------------
function renderExecutiveOverview(data) {
  const { kpi, monthly, projection } = data;
  const isToday = viewDate === todayStr;

  document.getElementById("ovSalesLabel").textContent = isToday ? "Today's Sales" : `Sales — ${dateLabel(viewDate)}`;
  document.getElementById("execOverviewTitle").textContent = isToday ? "📊 Executive Overview" : `📊 Executive Overview — ${dateLabel(viewDate)}`;

  animateCount(document.querySelector("#ovSales [data-value]"), kpi.todaySales, { prefix: "RM" });
  const deltaEl = document.querySelector("#ovSales [data-delta]");
  deltaEl.textContent = `${kpi.salesDelta >= 0 ? "↑" : "↓"} ${Math.abs(kpi.salesDelta).toFixed(0)}%`;
  deltaEl.style.color = kpi.salesDelta >= 0 ? "#16C47F" : "#EF4444";

  document.getElementById("ovMpCurrent").textContent = money(monthly.current);
  document.getElementById("ovMpTarget").textContent = money(monthly.target);
  document.getElementById("ovMpPercent").textContent = pct(monthly.progress);
  requestAnimationFrame(() => {
    document.getElementById("ovMpBar").style.width = `${Math.min(monthly.progress, 100)}%`;
  });

  document.getElementById("ovForecast").textContent = money(monthly.forecast);
  const fStatus = projectionStatus(monthly.forecast, monthly.target);
  const fEl = document.getElementById("ovForecastStatus");
  fEl.textContent = `${fStatus.emoji} ${fStatus.label}`;
  fEl.className = chipClass(fStatus.color);

  document.getElementById("ovNeedPerDay").textContent = money(monthly.needPerDay);

  // Sales Projection card
  document.getElementById("projActual").textContent = money(projection.todayActual);
  document.getElementById("projNeed").textContent = money(projection.todayNeed);
  const gapEl = document.getElementById("projGap");
  gapEl.textContent = projection.todayGap > 0 ? money(projection.todayGap) : "Tercapai ✓";
  gapEl.style.color = projection.todayGap > 0 ? "#EF4444" : "#16C47F";
  document.getElementById("projForecast").textContent = money(projection.forecast);
  const pStatus = projectionStatus(projection.forecast, monthly.target);
  const pEl = document.getElementById("projStatus");
  const diffLabel = projection.forecastVsTarget >= 0 ? `+${projection.forecastVsTarget.toFixed(1)}%` : `${projection.forecastVsTarget.toFixed(1)}%`;
  pEl.textContent = `${pStatus.emoji} ${pStatus.label} (${diffLabel})`;
  pEl.className = chipClass(pStatus.color);
}

function renderTeamHealth(teamHealth) {
  const el = document.getElementById("teamHealth");
  el.innerHTML = teamHealth
    .map(
      (b) => `
      <div class="card rounded-2xl p-4 text-center">
        <p class="text-2xl mb-1">${b.emoji}</p>
        <p class="text-xl font-bold">${b.count}</p>
        <p class="text-[11px] text-[var(--color-text-soft)]">${b.label}</p>
      </div>`
    )
    .join("");
}

function renderKpis(data) {
  const { kpi } = data;
  document.getElementById("kpiContact").textContent = pct(kpi.contactRate);
  document.getElementById("kpiBookingRate").textContent = pct(kpi.bookingRate);
  document.getElementById("kpiClosing").textContent = pct(kpi.closingRate);
  document.getElementById("kpiAvgSale").textContent = money(kpi.avgSale);
  document.getElementById("kpiPerformance").textContent = kpi.performanceScore;
  document.getElementById("kpiReportSubmitted").textContent = pct(kpi.reportSubmittedPct);
}

function renderCommission(data) {
  document.getElementById("commSales").textContent = money(data.monthly.current);
  document.getElementById("commAmount").textContent = money(data.commission.teamTotal);
  document.getElementById("commRateLabel").textContent = `Commission (${data.commission.rate}%)`;
}

function renderFunnel(funnel) {
  const stages = [
    { label: "Leads", value: funnel.leads, icon: "👥" },
    { label: "Call", value: funnel.calls, icon: "📞" },
    { label: "Connected", value: funnel.connected, icon: "🔗" },
    { label: "Booking", value: funnel.booking, icon: "📅" },
    { label: "Sales", value: null, money: funnel.sales, icon: "💰" },
  ];
  const el = document.getElementById("funnel");
  el.className = "grid gap-1 md:gap-2 items-center";
  el.style.gridTemplateColumns = "repeat(9, minmax(0,1fr))";
  const parts = [];
  stages.forEach((s, i) => {
    const prev = i > 0 ? stages[i - 1].value : null;
    const dropPct = prev && s.value !== null ? Math.round((1 - s.value / prev) * 100) : null;
    parts.push(`
      <div class="text-center col-span-2 md:col-span-2">
        <div class="card rounded-2xl p-3 md:p-4 mb-1">
          <p class="text-base md:text-lg mb-1">${s.icon}</p>
          <p class="text-sm md:text-lg font-bold">${s.value !== null ? s.value.toLocaleString() : money(s.money)}</p>
          <p class="text-[10px] md:text-[11px] text-[var(--color-text-soft)]">${s.label}</p>
        </div>
        ${dropPct !== null ? `<p class="text-[10px] text-[#EF4444] font-medium">↓${dropPct}%</p>` : ""}
      </div>`);
    if (i < stages.length - 1) {
      parts.push(`<div class="text-center col-span-1 text-[var(--color-text-soft)] text-lg">→</div>`);
    }
  });
  el.innerHTML = parts.join("");
}

function renderCoachingAlerts(alerts) {
  const el = document.getElementById("coachingAlerts");
  if (!alerts.length) {
    el.innerHTML = `<p class="text-sm text-[var(--color-text-soft)] py-6 text-center">Tiada isu dikesan setakat ini. Team performing well 👍</p>`;
    return;
  }
  const icons = { sales_drop: "📉", low_contact: "☎", low_booking: "📅" };
  el.innerHTML = alerts
    .map(
      (a) => `
      <button data-agent="${a.agent}" class="alert-row w-full flex items-center gap-3 p-3.5 rounded-2xl bg-[#EF4444]/5 hover:bg-[#EF4444]/10 transition-colors text-left">
        <span class="text-lg">${icons[a.type] || "⚠️"}</span>
        <div class="flex-1">
          <p class="font-semibold text-sm">${a.agent}</p>
          <p class="text-xs text-[var(--color-text-soft)]">${a.message}</p>
        </div>
        <i data-lucide="chevron-right" class="w-4 h-4 text-[var(--color-text-soft)]"></i>
      </button>`
    )
    .join("");
  el.querySelectorAll(".alert-row").forEach((btn) => btn.addEventListener("click", () => openAgentModal(btn.dataset.agent)));
  lucide.createIcons();
}

function renderLeaderboard(list) {
  lastLeaderboard = list;
  const medals = ["🥇", "🥈", "🥉"];
  const el = document.getElementById("leaderboardList");

  const sorted = [...list].sort((a, b) => b[lbCategory] - a[lbCategory]);
  const valueFmt = {
    sales: (a) => money(a.sales),
    contactRate: (a) => pct(a.contactRate),
    reportSubmittedPct: (a) => pct(a.reportSubmittedPct),
    score: (a) => a.score,
  }[lbCategory];

  el.innerHTML = sorted
    .slice(0, 6)
    .map((a, i) => {
      const band = statusBadge(a.score);
      return `
      <button data-agent="${a.agent}" class="agent-row w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl hover:bg-[var(--color-primary-soft)] transition-colors text-left">
        <div class="flex items-center gap-3">
          <span class="text-lg w-7 text-center">${medals[i] || `#${i + 1}`}</span>
          <div class="w-9 h-9 rounded-full bg-[#0057FF]/10 flex items-center justify-center font-semibold text-[#0057FF] text-sm">${a.agent[0]}</div>
          <div>
            <p class="font-semibold text-sm">${a.agent}</p>
            <p class="text-xs text-[var(--color-text-soft)]">${valueFmt(a)}</p>
          </div>
        </div>
        <span class="${chipClass(band.color)}">${band.emoji} ${band.label}</span>
      </button>`;
    })
    .join("");

  el.querySelectorAll(".agent-row").forEach((btn) => btn.addEventListener("click", () => openAgentModal(btn.dataset.agent)));
}

function renderTable(list) {
  const body = document.getElementById("perfTableBody");
  body.innerHTML = list
    .map((a) => {
      const band = statusBadge(a.score);
      return `
      <tr class="table-row border-t border-[var(--color-border)] cursor-pointer" data-agent="${a.agent}">
        <td class="py-3.5 font-medium">${a.agent}</td>
        <td class="py-3.5 text-[var(--color-text-soft)]">${a.calls}</td>
        <td class="py-3.5 text-[var(--color-text-soft)]">${a.connected}</td>
        <td class="py-3.5 text-[var(--color-text-soft)]">${a.booking}</td>
        <td class="py-3.5 font-medium">${money(a.sales)}</td>
        <td class="py-3.5 text-[#16C47F] font-medium">${money(a.commission)}</td>
        <td class="py-3.5">
          <div class="flex items-center gap-2">
            <div class="w-16 progress-track h-1.5"><div class="progress-fill" style="width:${a.score}%"></div></div>
            <span class="text-xs font-semibold">${a.score}</span>
          </div>
        </td>
        <td class="py-3.5"><span class="${chipClass(band.color)}">${band.emoji} ${band.label}</span></td>
      </tr>`;
    })
    .join("");

  body.querySelectorAll("tr").forEach((row) => row.addEventListener("click", () => openAgentModal(row.dataset.agent)));
}

async function openAgentModal(name) {
  const modal = document.getElementById("agentModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  const content = document.getElementById("agentModalContent");
  content.innerHTML = `<div class="skeleton h-40"></div>`;

  const res = await API.getAgent(name);
  if (res.status !== "success") {
    content.innerHTML = `<p class="text-sm text-[#EF4444] py-8 text-center">${res.message || "Could not load this agent's data."}</p>`;
    return;
  }
  const { stats, timeline, trend } = res;
  const band = statusBadge(stats.score);
  const trendIcon = trend === "up" ? "📈" : trend === "down" ? "📉" : "➖";

  content.innerHTML = `
    <div class="flex items-center gap-3 mb-6">
      <div class="w-12 h-12 rounded-full bg-[#0057FF]/10 flex items-center justify-center font-bold text-[#0057FF]">${stats.agent[0]}</div>
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <p class="font-bold text-lg">${stats.agent}</p>
          <span class="text-lg">${trendIcon}</span>
        </div>
        <span class="${chipClass(band.color)}">${band.emoji} ${band.label}</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="card rounded-2xl p-4">
        <p class="text-[11px] text-[var(--color-text-soft)]">Sales</p>
        <p class="font-bold text-lg">${money(stats.sales)}</p>
      </div>
      <div class="card rounded-2xl p-4">
        <p class="text-[11px] text-[var(--color-text-soft)]">Commission</p>
        <p class="font-bold text-lg text-[#16C47F]">${money(stats.commission)}</p>
      </div>
    </div>

    <div class="mb-5">
      <div class="flex items-center justify-between mb-1.5">
        <p class="text-xs font-semibold">Performance</p>
        <p class="text-xs font-semibold">${stats.score}</p>
      </div>
      <div class="progress-track h-2 mb-3"><div class="progress-fill" style="width:${stats.score}%"></div></div>
      <div class="flex items-center justify-between mb-1.5">
        <p class="text-xs font-semibold">Target (${money(stats.target)})</p>
        <p class="text-xs font-semibold">${pct(stats.targetProgress)}</p>
      </div>
      <div class="progress-track h-2"><div class="progress-fill" style="width:${Math.min(stats.targetProgress, 100)}%"></div></div>
      ${stats.targetProgress < 100 ? `<p class="text-[11px] text-[var(--color-text-soft)] mt-1">Remaining to target: ${money(Math.max(stats.target - stats.sales, 0))}</p>` : ""}
    </div>

    <div class="grid grid-cols-3 gap-3 mb-6">
      <div class="card rounded-2xl p-3.5"><p class="text-[11px] text-[var(--color-text-soft)]">Calls</p><p class="font-bold">${stats.calls}</p></div>
      <div class="card rounded-2xl p-3.5"><p class="text-[11px] text-[var(--color-text-soft)]">Connected</p><p class="font-bold">${stats.connected}</p></div>
      <div class="card rounded-2xl p-3.5"><p class="text-[11px] text-[var(--color-text-soft)]">Booking</p><p class="font-bold">${stats.booking}</p></div>
      <div class="card rounded-2xl p-3.5"><p class="text-[11px] text-[var(--color-text-soft)]">Contact Rate</p><p class="font-bold">${pct(stats.contactRate)}</p></div>
      <div class="card rounded-2xl p-3.5"><p class="text-[11px] text-[var(--color-text-soft)]">Closing Rate</p><p class="font-bold">${pct(stats.closingRate)}</p></div>
      <div class="card rounded-2xl p-3.5"><p class="text-[11px] text-[var(--color-text-soft)]">Avg Sale</p><p class="font-bold">${money(stats.avgSale)}</p></div>
    </div>

    <p class="text-sm font-semibold mb-3">Performance Timeline <span class="text-[var(--color-text-soft)] font-normal">· 30 hari</span></p>
    <div class="space-y-0 max-h-64 overflow-y-auto">
      ${
        timeline.length
          ? timeline
              .map((t, i) => {
                const mark = t.sales > 700 ? "⭐" : t.sales < 200 ? "⚠" : "✅";
                return `
        <div class="flex items-center justify-between py-3 ${i < timeline.length - 1 ? "border-b border-[var(--color-border)]" : ""}">
          <span class="text-xs text-[var(--color-text-soft)]">${dateLabel(t.date)}</span>
          <span class="text-sm font-semibold">${money(t.sales)} ${mark}</span>
        </div>`;
              })
              .join("")
          : `<p class="text-xs text-[var(--color-text-soft)] py-4 text-center">Tiada laporan lagi.</p>`
      }
    </div>
  `;
  lucide.createIcons();
}

document.querySelectorAll("[data-modal-close]").forEach((el) =>
  el.addEventListener("click", () => {
    const modal = document.getElementById("agentModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  })
);

// ----------------------------------------------------------------
// Load
// ----------------------------------------------------------------
async function load() {
  const data = await API.getDashboard({ date: viewDate, range: rangeDays });
  if (data.status !== "success") {
    toast(data.message || "Failed to load dashboard data", "error");
    return;
  }

  renderExecutiveOverview(data);
  renderTeamHealth(data.teamHealth);
  renderKpis(data);
  renderCommission(data);
  renderFunnel(data.funnel);
  renderCoachingAlerts(data.coachingAlerts);
  renderCharts(data.chart, document.documentElement.classList.contains("dark"));

  const leaderboardRes = await API.getLeaderboard({ date: viewDate });
  if (leaderboardRes.status !== "success") {
    toast(leaderboardRes.message || "Failed to load leaderboard", "error");
    return;
  }
  renderLeaderboard(leaderboardRes.leaderboard);
  renderTable([...leaderboardRes.leaderboard].sort((a, b) => b.sales - a.sales));
  lucide.createIcons();
}

async function loadChartOnly() {
  const data = await API.getDashboard({ date: viewDate, range: rangeDays });
  if (data.status !== "success") return;
  renderCharts(data.chart, document.documentElement.classList.contains("dark"));
}

load();
setInterval(load, CONFIG.REFRESH_SECONDS * 1000);
