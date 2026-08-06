const THEME_KEY = "cspd_theme";

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = saved ? saved === "dark" : prefersDark;
  document.documentElement.classList.toggle("dark", isDark);
  updateToggleIcon(isDark);
  return isDark;
}

export function toggleTheme(onChange) {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  updateToggleIcon(isDark);
  if (onChange) onChange(isDark);
  return isDark;
}

function updateToggleIcon(isDark) {
  document.querySelectorAll("[data-theme-icon]").forEach((el) => {
    el.setAttribute("data-lucide", isDark ? "sun" : "moon");
  });
  if (window.lucide) window.lucide.createIcons();
}

export function initMobileNav() {
  const btn = document.querySelector("[data-nav-toggle]");
  const panel = document.querySelector("[data-nav-panel]");
  if (!btn || !panel) return;
  btn.addEventListener("click", () => {
    panel.classList.toggle("hidden");
  });
}

export function markActiveNav() {
  const page = document.body.dataset.page;
  document.querySelectorAll("[data-nav-link]").forEach((el) => {
    if (el.dataset.navLink === page) el.classList.add("active");
  });
}

export function initHeaderScroll() {
  const header = document.querySelector("[data-header]");
  if (!header) return;
  let lastY = window.scrollY;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (y > lastY && y > 80) {
      header.style.transform = "translateY(-100%)";
    } else {
      header.style.transform = "translateY(0)";
    }
    lastY = y;
  });
}
