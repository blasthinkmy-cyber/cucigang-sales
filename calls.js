import { initTheme, toggleTheme, initMobileNav, markActiveNav, initHeaderScroll } from "./layout.js";
import { API } from "./api.js";
import { fullDateLabel, dateLabel, durationLabel, isoDate } from "./utils.js";
import { CONFIG } from "./config.js";

initTheme();
lucide.createIcons();
initMobileNav();
markActiveNav();
initHeaderScroll();

document.getElementById("themeToggle").addEventListener("click", () => toggleTheme());
document.getElementById("todayDate").textContent = fullDateLabel(new Date());

if (CONFIG.USE_MOCK_DATA) {
  document.getElementById("setupNotice").classList.remove("hidden");
}

const todayStr = isoDate(new Date());
let viewDate = todayStr;

const viewDateInput = document.getElementById("viewDate");
viewDateInput.max = todayStr;
viewDateInput.value = todayStr;
viewDateInput.addEventListener("change", (e) => {
  viewDate = e.target.value || todayStr;
  load();
});

document.getElementById("jumpToday").addEventListener("click", () => {
  viewDate = todayStr;
  viewDateInput.value = todayStr;
  load();
});

const TYPE_LABELS = {
  connected: { label: "Connected", emoji: "✅", color: "excellent" },
  rejected: { label: "Rejected", emoji: "🚫", color: "coaching" },
  no_answer: { label: "No Answer", emoji: "📵", color: "average" },
  other: { label: "Lain-lain", emoji: "❔", color: "strong" },
};

function callTypeChip(type) {
  const t = String(type).toLowerCase();
  if (t.includes("reject") || t === "missed") return TYPE_LABELS.rejected;
  if (t.includes("no_answer") || t.includes("noanswer")) return TYPE_LABELS.no_answer;
  if (t.includes("outgoing") || t.includes("incoming") || t === "connected") return TYPE_LABELS.connected;
  return TYPE_LABELS.other;
}

function renderBreakdown(byType, isToday) {
  document.getElementById("breakdownDateLabel").textContent = isToday ? "· hari ini" : `· ${dateLabel(viewDate)}`;
  const el = document.getElementById("callTypeBreakdown");
  const entries = [
    { key: "connected", ...TYPE_LABELS.connected },
    { key: "rejected", ...TYPE_LABELS.rejected },
    { key: "no_answer", ...TYPE_LABELS.no_answer },
    { key: "other", ...TYPE_LABELS.other },
  ];
  el.innerHTML = entries
    .map(
      (t) => `
      <div class="rounded-2xl p-4 bg-[var(--color-bg)]">
        <p class="text-2xl mb-1">${t.emoji}</p>
        <p class="text-lg font-bold">${byType[t.key] || 0}</p>
        <p class="text-xs text-[var(--color-text-soft)]">${t.label}</p>
      </div>`
    )
    .join("");
}

function renderTable(logs) {
  const body = document.getElementById("callLogBody");
  const empty = document.getElementById("emptyState");
  if (!logs.length) {
    body.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  body.innerHTML = logs
    .map((l) => {
      const chip = callTypeChip(l.callType);
      return `
      <tr class="table-row border-t border-[var(--color-border)]">
        <td class="py-3.5 text-[var(--color-text-soft)]">${l.timestamp}</td>
        <td class="py-3.5 font-medium">${l.staff}</td>
        <td class="py-3.5 text-[var(--color-text-soft)]">${l.phone}</td>
        <td class="py-3.5"><span class="chip chip-${chip.color}">${chip.emoji} ${chip.label}</span></td>
        <td class="py-3.5 text-[var(--color-text-soft)]">${l.duration > 0 ? durationLabel(l.duration) : "—"}</td>
        <td class="py-3.5">
          ${
            l.audioUrl
              ? `<a href="${l.audioUrl}" target="_blank" rel="noopener" class="btn btn-primary px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1">▶ Play Audio</a>`
              : `<span class="text-xs text-[var(--color-text-soft)]">Tiada rakaman</span>`
          }
        </td>
      </tr>`;
    })
    .join("");
}

async function load() {
  const res = await API.getCallLogs({ date: viewDate });
  if (res.status !== "success") {
    document.getElementById("callLogBody").innerHTML = "";
    document.getElementById("emptyState").textContent = res.message || "Gagal memuatkan data.";
    document.getElementById("emptyState").classList.remove("hidden");
    return;
  }
  const isToday = viewDate === todayStr;
  const s = res.summary;
  document.getElementById("statTotalCalls").textContent = s.totalCalls;
  document.getElementById("statAvgDuration").textContent = durationLabel(s.avgDurationSeconds);
  document.getElementById("statTopAgent").textContent = s.topAgent ? `${s.topAgent} (${s.topAgentCalls})` : "—";
  document.getElementById("statRejected").textContent = `${s.byType.rejected} / ${s.byType.no_answer}`;
  renderBreakdown(s.byType, isToday);
  renderTable(res.logs);
  lucide.createIcons();
}

load();
setInterval(load, CONFIG.REFRESH_SECONDS * 1000);
