import { generateMockReports, AGENTS } from "./utils.js";
import { CONFIG } from "./config.js";

const REPORTS_KEY = "cspd_reports_v1";
const SETTINGS_KEY = "cspd_settings_v1";

function seedReportsIfNeeded() {
  if (!localStorage.getItem(REPORTS_KEY)) {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(generateMockReports(30)));
  }
}

export function getReports() {
  seedReportsIfNeeded();
  try {
    return JSON.parse(localStorage.getItem(REPORTS_KEY)) || [];
  } catch {
    return [];
  }
}

export function addReport(row) {
  const rows = getReports();
  rows.push(row);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(rows));
}

export function hasDuplicate(agentName, date) {
  return getReports().some((r) => r.agent === agentName && r.date === date);
}

export function getAgents() {
  return AGENTS;
}

export function getSettings() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
    try {
      return { ...CONFIG, ...JSON.parse(saved) };
    } catch {
      /* noop */
    }
  }
  return { ...CONFIG };
}

export function saveSettings(partial) {
  const current = getSettings();
  const merged = { ...current, ...partial };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

export function resetMockData() {
  localStorage.removeItem(REPORTS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
}
