// ============================================================
// CONFIG — mirrors the Google Sheet "SETTINGS" tab.
// In production, point API_URL at your deployed Apps Script
// Web App and flip USE_MOCK_DATA to false.
// ============================================================

export const CONFIG = {
  // Paste your Google Apps Script Web App URL here after deployment.
  // Example: "https://script.google.com/macros/s/AKfycbxxxx/exec"
  API_URL: "https://script.google.com/macros/s/AKfycbxaAfzqSs5Kexby8YExtculrehE4TJTa3pm8yoyzRRjjb_sWvbiWggKVF36JRTyTyGO/exec",

  // While true, the app runs entirely on generated local data so it
  // works instantly with no backend. Flip to false once API_URL is set.
  USE_MOCK_DATA: false,

  COMPANY_NAME: "CUCIGANG",
  CURRENCY: "RM",
  MONTHLY_TARGET: 80000,
  WORKING_DAYS: 26,
  WORKING_HOURS: 9,
  REFRESH_SECONDS: 30,
  COMMISSION_RATE: 20, // percent of sales paid as commission
  VERSION: "2.0.0",
};

// Performance Score status bands
export const SCORE_BANDS = [
  { min: 95, label: "Elite", color: "elite", emoji: "🟢" },
  { min: 90, label: "Excellent", color: "excellent", emoji: "🔵" },
  { min: 80, label: "Strong", color: "strong", emoji: "🟡" },
  { min: 70, label: "Average", color: "average", emoji: "🟠" },
  { min: 0, label: "Need Coaching", color: "coaching", emoji: "🔴" },
];

export function getScoreBand(score) {
  return SCORE_BANDS.find((b) => score >= b.min) || SCORE_BANDS[SCORE_BANDS.length - 1];
}

// Coaching-alert thresholds — tune to taste in one place.
export const ALERT_RULES = {
  SALES_DROP_STREAK_DAYS: 3, // flag if sales fell for this many consecutive reported days
  LOW_CONTACT_RATE: 35, // % — flag if an agent's contact rate falls below this
  LOW_BOOKING_RATE_WITH_HIGH_CONNECTED: 15, // % — flag if booking rate is below this despite above-average connected volume
};

// Forecast-vs-target status bands
export function projectionStatus(forecast, target) {
  if (!target) return { label: "No Target Set", color: "average", emoji: "⚪" };
  const ratio = forecast / target;
  if (ratio >= 1) return { label: "On Track", color: "elite", emoji: "🟢" };
  if (ratio >= 0.9) return { label: "At Risk", color: "average", emoji: "🟡" };
  return { label: "Behind Target", color: "coaching", emoji: "🔴" };
}
