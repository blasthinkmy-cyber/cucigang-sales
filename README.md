# CUCIGANG Sales Performance Dashboard (CSPD)

A telesales performance dashboard that replaces manual WhatsApp + Google
Sheets reporting with a single interactive app: agents submit a daily
report in under a minute, and managers get auto-calculated KPIs,
leaderboards, and coaching signals.

**This build runs immediately with no setup** — it ships with a mock
data layer so you can open `index.html` and see a fully working app.
When you're ready to go live, connect the included Google Apps Script
backend (steps below) and flip one flag.

---

## What's included

```
/cspd
├── index.html          Landing page
├── dashboard.html       Manager dashboard (KPIs, charts, leaderboard, table)
├── report.html          Agent daily reporting form
├── settings.html        Manager settings page
├── assets/
│   ├── css/style.css     Design tokens + component styles
│   └── js/
│       ├── config.js      App configuration (edit API_URL here)
│       ├── api.js         API layer — mock or real, same interface
│       ├── store.js        Mock persistence (localStorage), stands in for Sheets
│       ├── utils.js        Formatting + KPI formulas + mock data generator
│       ├── charts.js       Chart.js builders
│       ├── layout.js       Dark mode, nav, header scroll behavior
│       ├── dashboard.js     Dashboard page controller
│       ├── report.js        Report page controller
│       └── settings.js      Settings page controller
└── gas/                  Google Apps Script backend (deploy to Sheets)
    ├── Code.gs            doGet/doPost router
    ├── Report.gs           submitReport(), getAgentsList()
    ├── Dashboard.gs         getDashboard()
    ├── Analytics.gs         KPI formulas, getLeaderboard(), getAgent()
    ├── Settings.gs          getSettings(), updateSettings()
    ├── Validation.gs        Field + duplicate-report validation
    └── Utils.gs             Sheet helpers, logging
```

## Tech stack

Frontend: HTML5, Tailwind CSS (CDN), Vanilla JavaScript (ES modules),
Chart.js, Lucide Icons, Inter (Google Fonts).
Backend: Google Apps Script. Database: Google Sheets. Hosting: GitHub Pages.

## KPI formulas

| Metric | Formula |
|---|---|
| Contact Rate | Connected ÷ Calls × 100 |
| Booking Rate | Booking ÷ Connected × 100 |
| Closing Rate | Booking ÷ Connected × 100 |
| Average Sale | Sales ÷ Booking |
| Remaining Target | Monthly Target − Current Sales |
| Need Per Day | Remaining Target ÷ Remaining Working Days |
| Forecast | (Current Sales ÷ Days Passed) × Working Days |

**Performance Score** (0–100): Sales 40% + Contact Rate 20% + Closing Rate
20% + Booking 10% + Reporting Consistency 10%.
95–100 🟢 Elite · 90–94 🔵 Excellent · 80–89 🟡 Strong · 70–79 🟠 Average · <70 🔴 Need Coaching

> Note: the source spec defines Closing Rate and Booking Rate with the
> same formula (Booking ÷ Connected). Both are implemented as written;
> if you intend them to measure different things (e.g. Closing Rate =
> Booking ÷ Follow-ups), update `closingRate()` in `utils.js` and
> `closingRate_()` in `Analytics.gs`.

---

## Running locally (mock mode — default)

No install needed. Because the pages use ES modules (`type="module"`),
open them through a local server rather than double-clicking the file:

```bash
cd cspd
python3 -m http.server 8000
# visit http://localhost:8000
```

Mock mode generates 30 days of realistic report data for 5 agents (Ali,
Mira, Fatin, Aiman, Siti) on first load and stores it in
`localStorage`, so submitting a report on the Daily Report page updates
the dashboard immediately. Reset it anytime from **Settings → Reset
demo data**.

---

## Going live with Google Sheets + Apps Script

### Step 1 — Create the spreadsheet
Create a Google Sheet named **CUCIGANG SALES DATABASE** with 6 tabs,
matching headers exactly:

**SETTINGS** (columns `KEY`, `VALUE`)
```
Company Name   CUCIGANG
Monthly Target 80000
Working Days   26
Working Hours  9
Currency       RM
Theme          Dark
Dashboard Refresh  30
```

**AGENTS** (columns `ID`, `Agent`, `Phone`, `Team`, `Status`)
```
AG001  Ali   0111111111  Alpha  Active
AG002  Mira  0111111112  Alpha  Active
```

**REPORTS** (columns `Date`, `Agent`, `Fresh`, `Freezing`, `Calls`,
`Connected`, `Booking`, `Sales`, `Follow Up`, `No Answer`, `Rejected`,
`Remarks`, `Timestamp`) — leave empty except the header row; the app
writes to it.

**SUMMARY**, **LEADERBOARD**, **LOGS** — create the tabs; they don't
need headers, the app reads/writes via the API rather than sheet
formulas.

### Step 2 — Add the Apps Script
1. Open the Sheet → **Extensions → Apps Script**.
2. Delete the default `Code.gs` content.
3. Create each file in `/gas` (same filenames) and paste its contents.

### Step 3 — Deploy as a Web App
1. **Deploy → New deployment → Web app**.
2. Execute as: **Me**.
3. Who has access: **Anyone** (or **Anyone with the link**).
4. Click **Deploy** and copy the Web App URL.

### Step 4 — Connect the frontend
In `assets/js/config.js`:
```js
export const CONFIG = {
  API_URL: "https://script.google.com/macros/s/XXXXXXXX/exec",
  USE_MOCK_DATA: false,
  // ...
};
```

### Step 5 — Deploy to GitHub Pages
1. Push the `cspd/` folder contents to a repo (e.g. `cucigang-sales-dashboard`).
2. **Settings → Pages → Deploy from branch → main → /root**.
3. Your app is live at `https://yourusername.github.io/cucigang-sales-dashboard/`.

### Testing checklist
- [ ] Submit a report from `report.html` — row appears in REPORTS
- [ ] Duplicate agent+date submission is rejected
- [ ] KPI cards on the dashboard update
- [ ] Leaderboard sorts by sales, descending
- [ ] Charts render for the last 14 days
- [ ] Settings changes persist back to the SETTINGS sheet
- [ ] Dashboard auto-refreshes every `Dashboard Refresh` seconds
- [ ] Dark mode and mobile layout both work

---

## Notes on scope

Per the PRD's "Future API" section, PDF/Excel export, WhatsApp/Telegram
summaries, and email reports are intentionally not built — the API and
folder structure leave room for them (`Utils.gs` is the natural home for
an `exportPdf()`/`exportExcel()` function later).
