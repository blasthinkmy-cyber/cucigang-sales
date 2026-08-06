import { initTheme, toggleTheme, initMobileNav, markActiveNav, initHeaderScroll } from "./layout.js";
import { API } from "./api.js";
import { renderCharts } from "./charts.js";
import { money, pct, greeting, fullDateLabel, animateCount, statusBadge, dateLabel } from "./utils.js";
import { CONFIG } from "./config.js";

let isDark = initTheme();
lucide.createIcons();
initMobileNav();
markActiveNav();
initHeaderScroll();

document.getElementById("themeToggle").addEventListener("click", () => {
  isDark = toggleTheme((dark) => load(true));
});

document.getElementById("greeting").textContent = `${greeting()}, Nazril 👋`;
document.getElementById("todayDate").textContent = fullDateLabel(new Date());

function chipClass(color) {
  return `chip chip-${color}`;
}

function renderExecSummary(data) {
  const { kpi, monthly, executiveSummary } = data;
  const el = document.getElementById("execSummary");
  const top = executiveSummary.topPerformer;
  const coach = executiveSummary.needsCoaching;
  el.innerHTML = `
    <div>
      <p class="text-white/50 text-xs mb-1">✅ Sales Today</p>
      <p class="font-bold text-lg">${money(kpi.todaySales)} <span class="text-xs font-medium ${kpi.salesDelta >= 0 ? "text-[#16C47F]" : "text-[#EF4444]"}">${kpi.salesDelta >= 0 ? "+" : ""}${kpi.salesDelta.toFixed(0)}%</span></p>
    </div>
    <div>
      <p class="text-white/50 text-xs mb-1">📞 Calls Made</p>
      <p class="font-bold text-lg">${kpi.calls.toLocaleString()}</p>
    </div>
    <div>
      <p class="text-white/50 text-xs mb-1">📲 Contact Rate</p>
      <p class="font-bold text-lg">${pct(kpi.contactRate)}</p>
    </div>
    <div>
      <p class="text-white/50 text-xs mb-1">📅 Bookings</p>
      <p class="font-bold text-lg">${kpi.booking}</p>
    </div>
    <div>
      <p class="text-white/50 text-xs mb-1">💰 Average Sale</p>
      <p class="font-bold text-lg">${money(kpi.avgSale)}</p>
    </div>
    <div>
      <p class="text-white/50 text-xs mb-1">🎯 Monthly Progress</p>
      <p class="font-bold text-lg">${pct(monthly.progress)}</p>
    </div>
    <div>
      <p class="text-white/50 text-xs mb-1">🔥 Top Performer</p>
      <p class="font-bold text-lg">${top ? `${top.agent} <span class="text-xs font-medium text-white/60">(${money(top.sales)})</span>` : "—"}</p>
    </div>
    <div>
      <p class="text-white/50 text-xs mb-1">⚠️ Needs Coaching</p>
      <p class="font-bold text-lg">${coach ? `${coach.agent} <span class="text-xs font-medium text-white/60">(${pct(coach.contactRate)} contact)</span>` : "—"}</p>
    </div>
  `;
}

function renderKpis(data) {
  const { kpi } = data;
  animateCount(document.querySelector("#kpiSales [data-value]"), kpi.todaySales, { prefix: "RM" });
  const deltaEl = document.querySelector("#kpiSales [data-delta]");
  deltaEl.textContent = `${kpi.salesDelta >= 0 ? "↑" : "↓"} ${Math.abs(kpi.salesDelta).toFixed(0)}% vs yesterday`;
  deltaEl.style.color = kpi.salesDelta >= 0 ? "#16C47F" : "#EF4444";

  document.getElementById("kpiContact").textContent = pct(kpi.contactRate);
  document.getElementById("kpiClosing").textContent = pct(kpi.closingRate);
  document.getElementById("kpiBooking").textContent = kpi.booking;
  document.getElementById("kpiPerformance").textContent = kpi.performanceScore;
}

function renderMonthly(data) {
  const { monthly } = data;
  document.getElementById("mpCurrent").textContent = money(monthly.current);
  document.getElementById("mpTarget").textContent = money(monthly.target);
  document.getElementById("mpRemaining").textContent = money(monthly.remaining);
  document.getElementById("mpNeedPerDay").textContent = money(monthly.needPerDay);
  document.getElementById("mpForecast").textContent = money(monthly.forecast);
  document.getElementById("mpPercent").textContent = pct(monthly.progress);
  requestAnimationFrame(() => {
    document.getElementById("mpBar").style.width = `${Math.min(monthly.progress, 100)}%`;
  });
}

function renderLeaderboard(list) {
  const medals = ["🥇", "🥈", "🥉"];
  const el = document.getElementById("leaderboardList");
  el.innerHTML = list
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
            <p class="text-xs text-[var(--color-text-soft)]">${money(a.sales)}</p>
          </div>
        </div>
        <span class="${chipClass(band.color)}">${band.emoji} ${band.label}</span>
      </button>`;
    })
    .join("");

  el.querySelectorAll(".agent-row").forEach((btn) => {
    btn.addEventListener("click", () => openAgentModal(btn.dataset.agent));
  });
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

  body.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => openAgentModal(row.dataset.agent));
  });
}

async function openAgentModal(name) {
  const modal = document.getElementById("agentModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  const content = document.getElementById("agentModalContent");
  content.innerHTML = `<div class="skeleton h-40"></div>`;

  const { stats, timeline } = await API.getAgent(name);
  const band = statusBadge(stats.score);

  content.innerHTML = `
    <div class="flex items-center gap-3 mb-6">
      <div class="w-12 h-12 rounded-full bg-[#0057FF]/10 flex items-center justify-center font-bold text-[#0057FF]">${stats.agent[0]}</div>
      <div>
        <p class="font-bold text-lg">${stats.agent}</p>
        <span class="${chipClass(band.color)}">${band.emoji} ${band.label}</span>
      </div>
    </div>
    <div class="grid grid-cols-3 gap-3 mb-6">
      <div class="card rounded-2xl p-3.5"><p class="text-[11px] text-[var(--color-text-soft)]">Sales</p><p class="font-bold">${money(stats.sales)}</p></div>
      <div class="card rounded-2xl p-3.5"><p class="text-[11px] text-[var(--color-text-soft)]">Calls</p><p class="font-bold">${stats.calls}</p></div>
      <div class="card rounded-2xl p-3.5"><p class="text-[11px] text-[var(--color-text-soft)]">Connected</p><p class="font-bold">${stats.connected}</p></div>
      <div class="card rounded-2xl p-3.5"><p class="text-[11px] text-[var(--color-text-soft)]">Booking</p><p class="font-bold">${stats.booking}</p></div>
      <div class="card rounded-2xl p-3.5"><p class="text-[11px] text-[var(--color-text-soft)]">Closing</p><p class="font-bold">${pct(stats.closingRate)}</p></div>
      <div class="card rounded-2xl p-3.5"><p class="text-[11px] text-[var(--color-text-soft)]">Avg Sale</p><p class="font-bold">${money(stats.avgSale)}</p></div>
    </div>
    <p class="text-sm font-semibold mb-3">Performance Timeline</p>
    <div class="space-y-0">
      ${timeline
        .map((t, i) => {
          const mark = t.sales > 3000 ? "⭐" : t.sales < 1500 ? "⚠" : "✅";
          return `
        <div class="flex items-center justify-between py-3 ${i < timeline.length - 1 ? "border-b border-[var(--color-border)]" : ""}">
          <span class="text-xs text-[var(--color-text-soft)]">${dateLabel(t.date)}</span>
          <span class="text-sm font-semibold">${money(t.sales)} ${mark}</span>
        </div>`;
        })
        .join("")}
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

async function load(skipChartFade) {
  const data = await API.getDashboard();
  renderExecSummary(data);
  renderKpis(data);
  renderMonthly(data);
  renderCharts(data.chart, document.documentElement.classList.contains("dark"));

  const { leaderboard } = await API.getLeaderboard();
  renderLeaderboard(leaderboard);
  renderTable(leaderboard);
  lucide.createIcons();
}

load();
setInterval(load, CONFIG.REFRESH_SECONDS * 1000);
