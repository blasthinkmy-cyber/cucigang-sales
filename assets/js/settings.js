import { initTheme, toggleTheme } from "./layout.js";
import { API } from "./api.js";
import { toast } from "./utils.js";
import { resetMockData } from "./store.js";

initTheme();
lucide.createIcons();
document.getElementById("themeToggle").addEventListener("click", () => toggleTheme());

const fields = {
  companyName: "COMPANY_NAME",
  currency: "CURRENCY",
  monthlyTarget: "MONTHLY_TARGET",
  commissionRate: "COMMISSION_RATE",
  workingDays: "WORKING_DAYS",
  workingHours: "WORKING_HOURS",
  refreshSeconds: "REFRESH_SECONDS",
};

(async () => {
  const { settings } = await API.getSettings();
  Object.entries(fields).forEach(([elId, key]) => {
    document.getElementById(elId).value = settings[key];
  });
  document.getElementById("themePref").value = localStorage.getItem("cspd_theme") || "system";

  const { agents } = await API.getAgentsList();
  document.getElementById("agentList").innerHTML = agents
    .map(
      (a) => `
      <div class="flex items-center justify-between px-4 py-3 rounded-2xl bg-[var(--color-bg)]">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-[#0057FF]/10 flex items-center justify-center text-xs font-semibold text-[#0057FF]">${a.name[0]}</div>
          <div>
            <p class="text-sm font-medium">${a.name}</p>
            <p class="text-xs text-[var(--color-text-soft)]">${a.id} · Team ${a.team}${a.target ? ` · Target RM${Number(a.target).toLocaleString()}` : ""}</p>
          </div>
        </div>
        <span class="chip chip-excellent">Active</span>
      </div>`
    )
    .join("");
})();

document.getElementById("settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const partial = {};
  Object.entries(fields).forEach(([elId, key]) => {
    const val = document.getElementById(elId).value;
    partial[key] = ["MONTHLY_TARGET", "WORKING_DAYS", "WORKING_HOURS", "REFRESH_SECONDS", "COMMISSION_RATE"].includes(key)
      ? Number(val)
      : val;
  });

  const themePref = document.getElementById("themePref").value;
  if (themePref === "system") {
    localStorage.removeItem("cspd_theme");
  } else {
    localStorage.setItem("cspd_theme", themePref);
  }

  await API.updateSettings(partial);
  toast("Settings saved");
});

document.getElementById("resetMock").addEventListener("click", () => {
  resetMockData();
  toast("Demo data reset — reloading…", "warning");
  setTimeout(() => window.location.reload(), 1200);
});
