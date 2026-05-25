# NGW Planner Command Workbook

**Premium operational software, implemented in Google Sheets.** Not a wedding
template — an execution system that makes a planner feel *"I can run my entire
event from this."* Studio Matte aesthetic: dark surfaces, restrained accent,
strong hierarchy, zero clutter. It also doubles as the operational blueprint for
the NGW Events SaaS.

---

## How to build it
1. Create a blank Google Sheet → **Extensions → Apps Script**.
2. Paste `Code.gs`, **Save**, run **`buildWorkbook()`** (authorize once).
3. Back in the sheet: 20 themed tabs, seeded with a realistic example, live
   formulas, conditional formatting, and a working Command Center.
4. Re-run any time to rebuild — safe and idempotent.

> v1 scope: the script builds **all 20 tabs** with the theme, schema, seed data,
> formulas, conditional formatting, the cross-tab summaries, and the Command
> Center. It's syntax-verified; first run authorizes the script.

---

## 1. Workbook architecture
A **hub-and-spoke** model, not disconnected tabs:
- **Settings** = single source of truth (event, date, venue, capacity, RSVP deadline).
- **Spoke tabs** = where you *enter* operational data (Guests, Vendors, Budget, Payments, Timeline, Run of Show, Tasks, Updates, Notes, Logistics).
- **Computed tabs** = read-only rollups (RSVP, Meals, F&B Summary, Dashboard Metrics, Event Overview).
- **Command Center** = the cockpit; reads everything, surfaces only what needs action.

Data flows **one direction**: entry tabs → computed tabs → Command Center. You never edit a number in two places.

## 2. Tab-by-tab
| # | Tab | Role |
|---|-----|------|
| 1 | **Command Center** | Cockpit: countdown, RSVP/budget/vendor/task groups, live operational warnings |
| 2 | Event Overview | One-glance event facts (from Settings + rollups) |
| 3 | Guests | Master guest list (RSVP, meal, dietary, accessibility, household, plus-one) |
| 4 | Households | Party groupings, invite/RSVP status |
| 5 | RSVP | Computed response funnel + rate + est. attending |
| 6 | Meals | Computed meal counts + gaps + dietary roster |
| 7 | Vendors | Roster: status, cost, deposit, balance, pay-due, tags |
| 8 | Preferred Vendors | Trust library — reliability-led, tags as discovery context |
| 9 | Vendor Performance | Lightweight scoring inputs → Reliability (or "Not enough history") |
| 10 | Budget | Estimated / committed / spent / balance / % / status + totals |
| 11 | Payments | Scheduled outflows with overdue detection |
| 12 | Timeline | Milestones, owners, dependencies, overdue flags |
| 13 | Run of Show | Day-of sequence + arrival-conflict detection |
| 14 | Tasks | To-dos with checkbox done + overdue flags |
| 15 | Client Updates | Client-facing log (type, sent, read, approval) |
| 16 | Internal Notes | **Planner-only** — risk flags, never shared |
| 17 | F&B Summary | Caterer-ready counts pulled from Guests |
| 18 | Venue & Logistics | Capacity, load-in, access, AV |
| 19 | Dashboard Metrics | Raw metric grid that feeds the cockpit |
| 20 | Settings | Config / source of truth |

## 3. Data schema (key columns)
- **Guests:** Name · Household · Plus-One · RSVP {Yes/No/Maybe} · Meal · Dietary · Accessibility · Invited · Email · Phone · Notes
- **Vendors:** Vendor · Category · Status {Considering→Confirmed} · Contact · Phone/Email · Total · Deposit · *Balance Due (formula)* · Pay Due · Tags · Notes
- **Vendor Performance:** Vendor · Events Completed · On-Time% · Avg Response · Comm(1-5) · Issues(1-5) · Trust(1-5) · Repeat · Successful% · *Reliability (formula)*
- **Budget:** Category · Estimated · Committed · Spent · *Balance · %Spent · Status* (all formula) + TOTAL row
- **Payments:** Payee · Linked To · Amount · Due · Status · Method · Paid Date
- **Timeline / Run of Show / Tasks:** sequence/owner/vendor/status + date or checkbox

## 4. Formula strategy
- All rollups use **whole-column ranges** (`Guests!D2:D`) wrapped in `IFERROR`, so adding rows needs no formula edits.
- Counting via `COUNTIF/COUNTIFS/SUMPRODUCT`; money via `SUM`; dates via `TODAY()` deltas.
- Cross-tab refs are **single-quoted** sheet names; computed tabs never hold source data.

## 5. Conditional formatting strategy
- **Status colors** (text rules): Confirmed/Paid → green, in-progress → teal, attention → amber, risk/overdue → red, idle → muted.
- **Overdue** (formula rules): `date < TODAY()` AND not done/paid → red.
- **Gaps**: RSVP=Yes with blank meal → amber highlight.
- **Zebra**: `=ISEVEN(ROW())` → subtle surface tint (no fragile banding API).

## 6. Automation opportunities (Apps Script)
- `buildWorkbook()` (shipped) — generates/refreshes the whole system.
- **`installAutomations()` (shipped, opt-in)** — run once + authorize to enable:
  - `onEditStampPaid` — stamps **Payments → Paid Date** the instant a row's Status becomes "Paid".
  - `emailDailyWarnings` — emails you the Command Center operational warnings every morning (7am), to the sheet owner; "✓ All clear" subject when nothing fires.
  - Turn off with `removeAutomations()`. Both are idempotent and fail-soft (a trigger error never breaks the sheet).
- Possible next: a "Push to caterer" that emails the F&B Summary.

## 7. Dashboard layout
Command Center = title + countdown banner, then a **2-column grid** of metric groups (RSVP & Guests / Budget & Payments / Vendors / Tasks & Timeline), then a single **Operational Warnings** panel. No charts, no noise — labels + right-aligned values + one alert block.

## 8. Operational intelligence rules (live in the warnings panel)
- RSVP response < 50%
- Meal selections missing for confirmed guests
- Unconfirmed vendors remain
- Payments overdue · Tasks overdue
- Run-of-show arrival conflicts
- **Estimated attendance > venue capacity**
- Client approvals pending

Each is a one-line formula concatenated with `TEXTJOIN`; "✓ All clear" when none fire.

## 9. Vendor scoring logic
`Reliability = round(0.25·OnTime% + 0.15·(100−response·6) + 0.15·comm/5·100 + 0.15·issues/5·100 + 0.15·trust/5·100 + 0.15·successful%)`.
**< 3 completed events → "Not enough operational history"** — never a faked score. Tiers (Standard/Preferred/Elite/Certified) and tags are discovery context, never a demographic ranking.

## 10. RSVP logic
Invited (Invited="Yes") → Confirmed/Declined/Maybe via `COUNTIF`. Response rate = responded/invited. **Est. attending = Yes + 0.6·Maybe**. Deadline + days-to-deadline from Settings.

## 11. UX hierarchy
Every tab opens on what to *act on*: Command Center leads with countdown + warnings; computed tabs lead with the number, then the breakdown; entry tabs are clean tables. Color is meaning, not decoration.

## 12. Mobile / tablet
Frozen header rows, generous row heights, fixed sensible column widths, no horizontal sprawl on the dashboard (label/value pairs stay narrow). Readable on tablet + laptop + external monitor.

## 13. Apps Script usage (recommended, light)
Generator only for v1. Keep scripts shallow and resilient — prefer formulas + conditional formatting over script for anything live. Add `onEdit`/time-triggers only for genuine workflow wins.

## 14. Risks
- Sheet-name changes break formulas (names are the contract — don't rename tabs).
- Transaction-pooler-style fragility doesn't apply here, but heavy `onEdit` scripts can feel laggy — keep them out unless needed.
- Manual data entry quality drives the intelligence (garbage in → garbage warnings).

## 15. Simplifications (deliberate)
No charts, no realtime, no multi-event in one file (one workbook = one event), no scripting where a formula suffices. RSVP/Meals/F&B are computed views rather than editable tabs.

## 16. Future migration into the SaaS
The workbook's schema **mirrors the NGW Events app** (events, guests, vendors w/ reliability, budget, payments, timeline, run-of-show, comms with read/approval, F&B summary). That's intentional: it's a low-friction on-ramp — a planner can run on Sheets today, and the same mental model + columns map cleanly into the app's data model when they graduate to the SaaS (CSV import → tables; vendor reliability + tags already aligned; comms read/approval already modeled).
