import { initTheme, toggleTheme } from "./layout.js";
import { API } from "./api.js";
import { isoDate } from "./utils.js";

initTheme();
lucide.createIcons();
document.getElementById("themeToggle").addEventListener("click", () => toggleTheme());

const dateInput = document.getElementById("date");
dateInput.value = isoDate(new Date());
dateInput.max = isoDate(new Date());

(async () => {
  const { agents } = await API.getAgentsList();
  const select = document.getElementById("agent");
  select.innerHTML =
    `<option value="" disabled selected>Pilih agent</option>` +
    agents.map((a) => `<option value="${a.name}">${a.name}</option>`).join("");
})();

const form = document.getElementById("reportForm");
const errorEl = document.getElementById("formError");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.classList.add("hidden");

  const payload = {
    name: document.getElementById("agent").value,
    date: document.getElementById("date").value,
    fresh: document.getElementById("fresh").value,
    freezing: document.getElementById("freezing").value,
    calls: document.getElementById("calls").value,
    connected: document.getElementById("connected").value,
    interested: document.getElementById("interested").value,
    booking: document.getElementById("booking").value,
    sales: document.getElementById("sales").value,
  };

  const submitBtn = form.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  try {
    const res = await API.submitReport(payload);
    if (res.status === "error") {
      errorEl.textContent = res.message;
      errorEl.classList.remove("hidden");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Report";
      return;
    }
    const overlay = document.getElementById("successOverlay");
    overlay.classList.remove("hidden");
    overlay.classList.add("flex");
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1800);
  } catch (err) {
    errorEl.textContent = "Something went wrong. Please try again.";
    errorEl.classList.remove("hidden");
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Report";
  }
});
