# CUCIGANG Sales Performance Dashboard (CSPD) — v2

A telesales performance dashboard built on one principle: **input minimum,
output maksimum**. Agents fill in 8 numbers a day; everything else —
KPIs, commission, coaching alerts, forecasts — is calculated
automatically.

**This build runs immediately with no setup** — it ships with a mock
data layer so you can open `index.html` and see a fully working app.
When you're ready to go live, connect the included Google Apps Script
backend (steps below) and flip one flag.

---

## What agents actually fill in

```
Date · Agent · Fresh Leads · Freezing Leads · Calls · Connected · Booking · Sales (RM)
```

That's it — 8 fields, under a minute. Everything below is derived.

## What's included

```
/cspd
├── index.html          Landing page
├── dashboard.html       Manager dashboard
├── report.html          Agent daily reporting form (8 fields)
├── settings.html        Manager settings page
├── assets/
│   ├── css/style.css     Design tokens + component styles
│   └── js/
│       ├── config.js       App configuration (API_URL, commission rate, alert thresholds)
│       ├── api.js          API layer — mock or real, same interface
│       ├── store.js        Mock persistence (localStorage), stands in for Sheets
│       ├── utils.js        Formatting + KPI formulas + coaching-alert rules + mock data
│       ├── charts.js       Chart.js builders (Sales Trend + Agent Contribution)
│       ├── layout.js       Dark mode, nav, header scroll behavior
│       ├── dashboard.js     Dashboard page controller
│       ├── report.js        Report page controller
│       └── settings.js      Settings page controller
└── gas/                  Google Apps Script backend (deploy to Sheets)
    ├── Code.gs            doGet/doPost router
    ├── Report.gs           submitReport(), getAgentsList()
    ├── Dashboard.gs         getDashboard() — Executive Overview, funnel, projection, alerts
    ├── Analytics.gs         KPI/commission formulas, getLeaderboard(), getAgent()
    ├── Settings.gs          getSettings(), updateSettings()
    ├── Validation.gs        Field + duplicate-report validation
    └── Utils.gs             Sheet helpers, logging
```

## Dashboard sections

- **Executive Overview** — Today's Sales (with delta), Monthly Progress bar,
  Forecast (🟢 On Track / 🟡 At Risk / 🔴 Behind Target), Need Per Day
- **Team Health** — headcount by performance band (Elite/Excellent/Strong/Average/Coaching)
- **KPI Cards** — Contact Rate, Booking Rate, Closing Rate, Avg Sales/Booking,
  Performance Score, Report Submitted %
- **Commission Estimator** — team month-to-date commission at the configured rate
- **Sales Projection** — today's actual vs. need, and month-end forecast vs. target
- **Sales Funnel** — Leads → Calls → Connected → Booking → Sales (month-to-date,
  Fresh + Freezing combined — see note below)
- **Coaching Alerts** (automatic) — sales dropping 3 days straight, contact rate
  below 35%, or booking rate low despite above-average connected volume
- **Leaderboard** — switchable by Sales / Contact Rate / Reporting % / Performance Score
- **Agent modal** — commission, target progress, 30-day timeline, trend indicator

> **Funnel note:** the 8-field form doesn't record calls/connected/booking
> *per lead type*, so the funnel shows one combined Leads→Sales flow rather
> than two separate Fresh/Freezing funnels. If you want true separate
> funnels later, that needs 2 more fields (Fresh Calls, Freezing Calls) —
> against the minimal-input principle, so it's left out unless you ask
> for it.

## KPI formulas

| Metric | Formula |
|---|---|
| Contact Rate | Connected ÷ Calls × 100 |
| Booking Rate | Booking ÷ Connected × 100 |
| Closing Rate | Booking ÷ Connected × 100 |
| Average Sale | Sales ÷ Booking |
| Commission | Sales × Commission Rate |
| Remaining Target | Monthly Target − Current Sales |
| Need Per Day | Remaining Target ÷ Remaining Working Days |
| Forecast | (Current Sales ÷ Days Passed) × Working Days |
| Report Submitted % | Days Reported ÷ Working Days Passed |

**Performance Score** (0–100): Sales 40% + Contact Rate 20% + Closing Rate
20% + Booking 10% + Reporting Consistency 10%.
95–100 🟢 Elite · 90–94 🔵 Excellent · 80–89 🟡 Strong · 70–79 🟠 Average · <70 🔴 Need Coaching

**Coaching alert rules** (tune in `assets/js/config.js` → `ALERT_RULES`,
and `gas/Analytics.gs` → `ALERT_RULES_`):
- Sales fell on each of the last 3 reported days
- Contact Rate below 35%
- Booking Rate below 15% despite above-average Connected volume

---

## Running locally (mock mode — default)

```bash
cd cspd
python3 -m http.server 8000
# visit http://localhost:8000
```

Mock mode generates 30 days of realistic report data for 5 agents (Ali,
Mira, Fatin, Aiman, Siti) on first load and stores it in `localStorage`.
Reset it anytime from **Settings → Reset demo data**.

---

## Going live with Google Sheets + Apps Script

### Step 1 — Create the spreadsheet
Create a Google Sheet with 4 tabs (or just upload the included
`CUCIGANG_SALES_DATABASE.xlsx` and convert it to Sheets):

**SETTINGS** (`KEY`, `VALUE`)
```
Company Name       CUCIGANG
Monthly Target     80000
Commission Rate    20
Working Days       26
Working Hours      9
Currency           RM
Theme              Dark
Dashboard Refresh  30
```

**AGENTS** (`ID`, `Agent`, `Phone`, `Team`, `Status`, `Target`)
```
AG001  Ali   0111111111  Alpha  Active  20000
AG002  Mira  0111111112  Alpha  Active  16000
```
`Target` is each agent's individual monthly target — leave blank to
split the team target equally instead.

**REPORTS** (`Date`, `Agent`, `Fresh`, `Freezing`, `Calls`, `Connected`,
`Booking`, `Sales`, `Timestamp`) — leave empty except the header row;
the app writes to it.

**LOGS** — just create the tab; the app writes to it.

### Step 2 — Add the Apps Script
Open the Sheet → **Extensions → Apps Script** → delete the default
`Code.gs` content → create each file in `/gas` (same filenames) and
paste its contents.

### Step 3 — Deploy as a Web App
**Deploy → New deployment → Web app** → Execute as **Me** → Who has
access **Anyone** → Deploy → copy the Web App URL.

> If your dashboard shows a CORS error in the browser console, this
> is almost always because "Who has access" is set to something other
> than **Anyone** (e.g. "Anyone with Google account"). Re-check the
> deployment settings and redeploy a **New version**.

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
Push the contents of `cspd/` to a repo, then **Settings → Pages →
Deploy from branch → main → /root**.

### Testing checklist
- [ ] Submit a report from `report.html` — row appears in REPORTS
- [ ] Duplicate agent+date submission is rejected
- [ ] Executive Overview, KPI cards, funnel, commission all update
- [ ] Date picker changes the day the dashboard reflects
- [ ] Coaching alerts appear when the rules are met
- [ ] Leaderboard tabs (Sales/Contact Rate/Reporting/Performance) work
- [ ] Clicking an agent name opens the modal with real data
- [ ] Settings changes (incl. Commission Rate) persist back to the sheet

## Call Log add-on (optional) — MacroDroid + audio recording

`calls.html` shows automated call tracking: every call an agent makes
is logged as its own row the moment it ends, with the recording
attached — no manual entry, so it's naturally broken down per call
and per day (never merged like a manual report could be).

**How data flows:** Agent's Android phone (via MacroDroid) → POSTs
call metadata + audio (base64) directly to the Apps Script Web App →
`CallLog.gs` saves the audio to Drive and logs a row in
`LOGPANGGILAN` → `calls.html` reads it back via the same JSONP
pattern as the rest of the dashboard.

This is a real POST from MacroDroid (not a browser), so it is **not**
affected by the CORS/JSONP issue described above — only fetch() calls
made from a browser hit that limitation.

### Setup
1. **Create a Drive folder** for recordings. Open it, copy the ID from
   the URL (`drive.google.com/drive/folders/THIS_PART`).
2. **Open `CallLog.gs`** in Apps Script, paste the ID into
   `CALL_RECORDINGS_FOLDER_ID`.
3. **Add a shared secret** — in the SETTINGS sheet, set `Call Log
   Secret` to any random string. MacroDroid must send the same value
   as `secret` in its POST body, or the request is rejected (this
   endpoint is public, so this stops randoms from spamming your
   Sheet/Drive).
4. **Deploy a new version** (Deploy → Manage deployments → pencil →
   New version) so the new endpoint goes live.
5. **In MacroDroid**, create a macro triggered on "Call Ends":
   - Action: HTTP Request (POST) to your Web App exec URL
   - Content-Type: `application/json`
   - Body:
     ```json
     {
       "path": "logCall",
       "secret": "the same random string from step 3",
       "staff_name": "Ali",
       "phone_number": "[call_number]",
       "call_type": "[call_type]",
       "duration": "[call_duration]",
       "audio_base64": "[last_file_base64:/storage/emulated/0/CallRecordings]"
     }
     ```
   - Adjust the recording folder path in `[last_file_base64:...]` to
     match wherever the phone's call recorder actually saves files —
     this varies by Android build/recorder app.

### Legal note
Call recording consent laws vary by state/country and by whether the
call is with a customer or between staff. Check your local
requirements (and consider a recorded disclosure at the start of
calls) before turning this on.

## Intentionally left out

Per the minimal-input principle: Attendance, Product Performance,
Product Category, Service Breakdown, manual Commission/KPI entry, and
Team Schedule are not built — none of them help a manager make a daily
call without adding agent typing.
