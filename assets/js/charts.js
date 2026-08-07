import { dateLabel } from "./utils.js";

const PALETTE = {
  primary: "#0057FF",
  success: "#16C47F",
  warning: "#FFB200",
  danger: "#EF4444",
  info: "#06B6D4",
};

let salesChart, contributionChart;

function baseGrid(isDark) {
  return { color: isDark ? "rgba(255,255,255,.06)" : "rgba(15,23,42,.06)" };
}

function baseTicks(isDark) {
  return { color: isDark ? "rgba(255,255,255,.5)" : "rgba(15,23,42,.5)", font: { family: "Inter", size: 11 } };
}

export function renderCharts(data, isDark) {
  const labels = data.labels.map(dateLabel);

  salesChart = upsertChart(salesChart, "salesTrendChart", {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Sales",
          data: data.sales,
          borderColor: PALETTE.primary,
          backgroundColor: gradient("salesTrendChart", PALETTE.primary),
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          borderWidth: 2.5,
        },
      ],
    },
    options: lineOptions(isDark, (v) => "RM" + v.toLocaleString()),
  });

  const contribColors = [PALETTE.primary, PALETTE.success, PALETTE.warning, PALETTE.info, PALETTE.danger];
  contributionChart = upsertChart(contributionChart, "contributionChart", {
    type: "doughnut",
    data: {
      labels: data.contribution.map((c) => c.agent),
      datasets: [
        {
          data: data.contribution.map((c) => c.sales),
          backgroundColor: contribColors,
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: baseTicks(isDark).color, font: { family: "Inter", size: 11 }, boxWidth: 10, padding: 14 },
        },
        tooltip: tooltipOpts(isDark, (v) => "RM" + v.toLocaleString()),
      },
      animation: { animateScale: true, animateRotate: true },
    },
  });
}

function upsertChart(existing, canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return existing;
  if (existing) {
    existing.data = config.data;
    existing.options = config.options;
    existing.update();
    return existing;
  }
  return new Chart(canvas.getContext("2d"), config);
}

function gradient(canvasId, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return color;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height || 200);
  g.addColorStop(0, hexToRgba(color, 0.28));
  g.addColorStop(1, hexToRgba(color, 0.0));
  return g;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function tooltipOpts(isDark, formatter) {
  return {
    backgroundColor: isDark ? "#1E293B" : "#0F172A",
    titleColor: "#fff",
    bodyColor: "#fff",
    padding: 10,
    cornerRadius: 10,
    displayColors: false,
    callbacks: { label: (ctx) => (formatter ? formatter(ctx.raw) : ctx.raw) },
  };
}

function lineOptions(isDark, formatter) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { display: false }, tooltip: tooltipOpts(isDark, formatter) },
    scales: {
      x: { grid: { display: false }, ticks: baseTicks(isDark) },
      y: { grid: baseGrid(isDark), ticks: { ...baseTicks(isDark), callback: formatter } },
    },
    animation: { duration: 600, easing: "easeOutQuart" },
  };
}
