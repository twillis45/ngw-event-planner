# NGW Event Boss — Coordinator Test Script

A structured walkthrough for an event coordinator to run against the live app.
Different in shape from `HUMAN_VALIDATION_PROTOCOL.md` (slice-level observation):
this is a **full-workflow UAT** — does the app actually work for a planner's
real day, end-to-end.

**Time budget:** 30–45 minutes
**Device:** Desktop primary (≥1280 wide). Mobile section at end.
**Recording:** Optional but recommended — a phone propped at the screen with
audio capturing your verbal "huh?" / "wait, where's…?" moments is worth more
than written feedback.

---

## How to use this script

1. **Work through the sections in order.** Each step is concrete — do the action,
   check the expected outcome.
2. **Don't fix things you don't like — note them.** The "Notes" field after each
   section is where surprises, hesitations, and confusions go. We want raw
   reactions, not polished feedback.
3. **Rate each section** on a 1–5 scale at the end. The rubric:
   - **5** — worked, felt obvious, would use this daily
   - **4** — worked, minor friction
   - **3** — worked but I had to think about it
   - **2** — half-broken, I figured it out but a coordinator wouldn't
   - **1** — broken / blocked
4. **Don't fix bugs in your head.** If something is broken or confusing,
   write down what you saw. Don't reason about what it "should" do.

---

## Setup (5 minutes — before you start the timer)

| Step | Expected |
|---|---|
| 1. Open the app URL provided by Todd. | LoginScreen appears with "Planner sign-in" and email field. |
| 2. Sign in via magic link or Google. | After auth: lands on **Studio Home** with a welcome surface OR populated dashboard. |
| 3. If you see "Welcome to NGW Event Boss" hero with 3 cards, pick **"Explore with sample data — Recommended"**. | The 4 sample events load: Todd & Sarah's Wedding · Hartwell Legal Aid · Rivera & Okafor Wedding · TechCorp Holiday Party. A **"DEMO · You're exploring with sample data"** banner shows at the top. |

**If sign-in fails:** stop here. Note the error message verbatim and send to Todd
before continuing. You can't proceed without a session.

---

## Section 1 — Studio Home triage (5 min)

You've just signed in. You're looking at Studio Home.

| Step | Expected |
|---|---|
| 1.1 | Read the greeting line (e.g. "Good evening, Todd · 4 active events · 11 items need your attention"). | The number after "need your attention" should be **clickable** and visibly hoverable. |
| 1.2 | Click it. | You jump into a specific event on a specific tab — Decisions / Vendors / Communication, depending on the first item. |
| 1.3 | Back out (top-left back button or browser back). | You return to Studio Home. |
| 1.4 | Look at the 4 Business Health cards: Contracted Value / Balance Due / Open Approvals / Pending Requests. | Each card has an "Open ↗" indicator and routes to the right surface when clicked. |
| 1.5 | Click "Balance Due". | You land on the first event with a balance due, on its **Budget** tab. |
| 1.6 | Back out. Click "Open Approvals" (if non-zero). | You land on the first event with approvals, on its **Decisions** tab. |
| 1.7 | Look at the "What needs attention" panel. Use the filter chips (All / Decisions / Approvals / Requests / Vendor issues). | Each chip filters the visible items immediately. Counts are honest. |
| 1.8 | Click the first attention item. | Routes to the right tab on the right event with the right item pre-selected. |
| 1.9 | Back out. Scroll down. Look at "Event Readiness — Next 60 Days". | Each event card shows axis status (overdue tasks / overdue payments / unconfirmed vendors / RSVP) as clickable chips. |
| 1.10 | Click a chip on one of the readiness cards. | Lands on the right tab inside that event. |

**Notes (write freely — confusions, surprises, hesitations):**

```
(coordinator writes here)
```

**Rating (1–5):** _____

---

## Section 2 — Open an event → Command Center (5 min)

| Step | Expected |
|---|---|
| 2.1 | From Studio Home, scroll to the events index and click **Todd & Sarah's Wedding**. | You land on the **Command** tab. The page should NOT look like a static dashboard — it should look like a triage screen. |
| 2.2 | Read the headline. | "X decisions pending · Y vendors need you · Z unanswered questions" type sentence. There's a "Focus on what needs me →" button on the right. |
| 2.3 | Look at the event meta strip below the name. | "Wedding · Sat, Sep 12, 2026 · Bluebell Venue · 8 guests · $15,085 of $18,900 budget" (or similar). The countdown reads **"X days from now"** — not "Xd away" or "X days away". |
| 2.4 | Look at Open Decisions section. | 3 cards: URGENT (red) / AWAITING / PENDING — each with a title, sub-line, and "Decide →" or "Open decision →" button on the right. |
| 2.5 | Click the URGENT decision card's "Decide →" button. | You jump to the **Decisions** tab with that decision pre-selected. |
| 2.6 | Back to Command (click "Command" in sidebar, or "← Command Center" if you see it). | Returns to Command. |
| 2.7 | Look at right rail "Planning Health". 5 rows: Timeline / Vendors / Guests / Budget / Documents. | Each row has a 3-state badge: **ON TRACK / ATTENTION / AT RISK**. Vocabulary should be consistent — NOT "Over Budget" / "Nearly Spent" / "Fully Committed" etc. |
| 2.8 | Look at "Next Up" panel. | Shows next 3-4 timeline items by date with date chips on the left ("TODAY 31 / JUN 2 / JUN 13"). |
| 2.9 | Look at "Vendors" panel. | Shows 5-6 vendors with status badges (CONFIRMED / NEEDS ACTION / AT RISK / AWAITING). |

**Notes:**

```
```

**Rating (1–5):** _____

---

## Section 3 — Sidebar navigation (3 min)

The left sidebar inside an event has 13 tabs grouped into 4 clusters.

| Step | Expected |
|---|---|
| 3.1 | Look at the sidebar. | You see "Command" at the top, then **PLANNING** group (Client Intake / Budget / Guests / Seating / Vendors), **WORK** group (Timeline / Checklist / Planning Tasks), **OPERATIONS** group (Decisions / Communication), **EXECUTION** group (Calendar / Run of Show). |
| 3.2 | Check that group labels (PLANNING / WORK / OPERATIONS / EXECUTION) are visible in uppercase. | Yes. |
| 3.3 | Check that tabs with state show badges. | Timeline (e.g. "42% ⚠"), Checklist ("14/30 ⚠"), Decisions ("3 ⚠"), Communication ("2 new"), Guests ("19"), Vendors ("5"). |
| 3.4 | Click the chevron at the top of the sidebar. | Sidebar collapses to icons-only (64px wide). Group labels become thin dividers. |
| 3.5 | Click chevron again. | Sidebar expands back to full width. |
| 3.6 | Compare the sidebar styling to the Studio Home sidebar (use the "← Studio" / back button). | Item styling matches: same padding, active-state accent border-strip, same icon size + opacity for inactive items. |

**Notes:**

```
```

**Rating (1–5):** _____

---

## Section 4 — Vendors workspace (5 min)

| Step | Expected |
|---|---|
| 4.1 | Click **Vendors** in the sidebar. | Vendor workspace loads: 5-vendor list on left, detail pane on right showing "Bluebell Venue" or whichever is first. |
| 4.2 | Click on **Petal & Stem** (Florals). | Detail pane updates. Status badge reads **PARTIAL** (amber). |
| 4.3 | Click through the detail tabs: Overview / Contract / Deliverables / Communication / Activity / Notes. | All 6 tabs render. Activity tab shows a list of log entries OR a "No activity logged yet" state with a composer at top. |
| 4.4 | Type a quick note in the Activity composer ("Confirmed Saturday walk-through") and click "Add Entry". | The entry appears at the top of the feed with today's date. |
| 4.5 | Refresh the browser (Cmd+R). | Wait for sign-in/hydrate. Open the same vendor → Activity. | The entry you added should still be there. |
| 4.6 | Open the **Catering** vendor (Fork & Flower Catering). | If a "HEADCOUNT MISMATCH" yellow band shows at the top of the Overview tab, click "Update to X" (where X is current confirmed guest count). | The band disappears. An entry is added to that vendor's Activity log: "Headcount updated to X confirmed guests." |
| 4.7 | Click "Edit →" in the vendor header. | A full VendorModal opens with all editable fields. Close it. |

**Notes:**

```
```

**Rating (1–5):** _____

---

## Section 5 — Decisions / Approvals (3 min)

| Step | Expected |
|---|---|
| 5.1 | Click **Decisions** in the sidebar. | Decision/Approval Center loads. You see the list of pending items + a detail pane on the right. |
| 5.2 | Click the first decision (URGENT). | Detail pane updates. There's a "Your Decision" panel with Resolve action. |
| 5.3 | Click "Mark Resolved" (or equivalent). | The item moves out of pending; counts update. |
| 5.4 | If there's an APPROVAL item, click it. | Detail pane shows the approval body + action buttons (Approve / Reject). |
| 5.5 | Click Approve. | Status updates to "approved" in the list. |

**Notes:**

```
```

**Rating (1–5):** _____

---

## Section 6 — Tasks: Timeline / Checklist / Planning Tasks (5 min)

These are three lenses on the same data. They're intentionally separate.

| Step | Expected |
|---|---|
| 6.1 | Click **Timeline** in sidebar. | Phase grid loads. You see columns "12 Months Out → Week Of" with tasks placed by phase. |
| 6.2 | Look at the top of the Timeline. | A "CURRENT PHASE" band shows the active phase (e.g. "4 Months Out · Focus: RSVP Push · Follow up with non-responders"). |
| 6.3 | Click any task in the phase grid. | Either a detail pane opens OR the task is highlighted. |
| 6.4 | Click **Checklist** in sidebar. | Category-grouped view loads (Planning / Vendor / Venue / Client / Event Day) with progress bars per category. |
| 6.5 | Check off a task by clicking its checkbox. | Progress bar advances. |
| 6.6 | Click **Planning Tasks** in sidebar. | List view with quick-add input at top. |
| 6.7 | Type a new task in the quick-add and press Enter. | New task appears in the list. |
| 6.8 | Go back to Checklist. | The new task you added in Planning Tasks should appear here too (same data). |
| 6.9 | Check the sidebar badges: Timeline / Checklist / Planning Tasks. | All three should reflect the same overall stats (e.g. 42% / 14/30 / 14/30 ⚠). |

**Notes (this is important — do all three views feel coherent, or do they feel like 3 different apps?):**

```
```

**Rating (1–5):** _____

---

## Section 7 — Guests + Seating (3 min)

| Step | Expected |
|---|---|
| 7.1 | Click **Guests** in sidebar. | Guest list table loads. Look for a "Meal breakdown" pill row at the bottom of the confirmed-guests section. |
| 7.2 | Look for "Vendor Impact Summaries" section. | F&B headcount, dietary needs, accessible counts all summarized. |
| 7.3 | Click **Seating**. | Seating chart loads with tables. |
| 7.4 | Drag an unseated guest to a table. | Guest assigns to that table. |

**Notes:**

```
```

**Rating (1–5):** _____

---

## Section 8 — Budget (3 min)

| Step | Expected |
|---|---|
| 8.1 | Click **Budget** in sidebar. | Top of the page shows the BUDGET stat tile with `$spent` large + `of $TOTAL · X%` sub. |
| 8.2 | Right of it: 3 supporting numbers — Committed / Balance Due / Uncontracted. | Yes. |
| 8.3 | Below: a 12px multi-segment progress bar. | Green = spent (solid). Striped = committed. Hover the bar — a tooltip should appear. |
| 8.4 | Read the status row. | Shows **AT RISK / ATTENTION / ON TRACK** — same 3-state vocab as Planning Health. NOT 7 different states. |
| 8.5 | Click an "Open ↗" indicator on a budget category. | Opens that category's detail / edit modal. |

**Notes:**

```
```

**Rating (1–5):** _____

---

## Section 9 — Communication (3 min)

| Step | Expected |
|---|---|
| 9.1 | Click **Communication** in sidebar. | Thread list on left, conversation pane on right. |
| 9.2 | Pick a thread. | Messages render in the conversation pane. |
| 9.3 | Type a message in the composer at the bottom. Press Cmd/Ctrl+Enter (or click Send). | Message appears in the conversation immediately. |
| 9.4 | Refresh the browser. Open the same thread. | Your message is still there. |

**Notes:**

```
```

**Rating (1–5):** _____

---

## Section 10 — Calendar + Run of Show (3 min)

| Step | Expected |
|---|---|
| 10.1 | Click **Calendar** in sidebar. | Month/week view with tasks + payments + events plotted by date. |
| 10.2 | Click on any date that has items. | The day's items show: event name, vendor payment, task etc. Each item is clickable. |
| 10.3 | Click a vendor payment item. | Routes to the **Vendors** tab with that vendor selected. |
| 10.4 | Click a task item. | Routes to **Planning Tasks** with that task highlighted. |
| 10.5 | Click **Run of Show** in sidebar. | Time-keyed day-of agenda loads. |

**Notes:**

```
```

**Rating (1–5):** _____

---

## Section 11 — Manage Event actions (3 min)

The labeled `··· Manage Event` button is in the top-right of the event header
(visible on every tab EXCEPT Command, which has its own header).

| Step | Expected |
|---|---|
| 11.1 | Click any tab besides Command. Find `··· Manage Event` top-right. | Button is labeled, not just a `···` icon. |
| 11.2 | Click it. | Dropdown opens with header "MANAGE EVENT" and these rows: Event Day Mode · Run Consult Script · Export XLSX · Duplicate · Archive · Theme · Delete Event. |
| 11.3 | Click **Run Consult Script**. | A modal opens with structured questions for this event type. Close it (✕ top-right or ← back). |
| 11.4 | Open Manage Event again. Click **Export XLSX**. | A `.xlsx` file downloads with the event data (Summary / Run of Show / Vendors / Guests / Budget sheets). |
| 11.5 | Open Manage Event again. Click **Duplicate**. | A new event is created with "(Copy)" suffix. You land on the duplicate. |

**Notes:**

```
```

**Rating (1–5):** _____

---

## Section 12 — Mobile pass (5 min)

Pull out your phone. Open the same URL.

| Step | Expected |
|---|---|
| 12.1 | Sign in (or use a session from your dev box if it carries over). | LoginScreen renders cleanly on mobile width. |
| 12.2 | Studio Home loads. | Header has hamburger + brand label + page title + avatar. Hero is readable. KPIs are 2×2 grid. Filter chips horizontal-scroll. |
| 12.3 | Tap an event card. | Lands on Command (no sidebar; vertical scroll). |
| 12.4 | Tap the hamburger / menu button. | Tab drawer slides in from left with the same PLANNING / WORK / OPERATIONS / EXECUTION groups. |
| 12.5 | Tap Vendors in the drawer. | Drawer closes; Vendor workspace loads. |
| 12.6 | Tap a vendor row. | Detail pane opens. On mobile, this might be a separate screen with a back button — that's fine. |

**Notes:**

```
```

**Rating (1–5):** _____

---

## Section 13 — Sync + offline (2 min)

| Step | Expected |
|---|---|
| 13.1 | In your event, edit something (e.g. change vendor status). | Top of screen shows "● Saving…" then "● Saved Xs ago". |
| 13.2 | Turn off your WiFi. Edit something else. | A yellow "Working offline — all changes are saved locally" strip appears at the top. The sync indicator shows "● Offline". |
| 13.3 | Turn WiFi back on. | The strip disappears within a few seconds. Sync state goes to "● Reconnecting…" then "● Saved". A toast confirms "N changes synced to cloud". |
| 13.4 | Refresh the browser. | All your edits — offline + online — are still there. |

**Notes:**

```
```

**Rating (1–5):** _____

---

## Section 14 — Clear sample data + start your real workspace (2 min)

If you've been working with sample data, this is the path you'd take after
trying the app.

| Step | Expected |
|---|---|
| 14.1 | Go back to Studio Home. Click "Clear sample data" in the DEMO banner. | Confirm dialog appears. Click Confirm. |
| 14.2 | The 4 sample events disappear. | Empty hero with "Welcome to NGW Event Boss" reappears, offering 3 paths: Explore with sample data / Add your first event / Add your first client. |
| 14.3 | Click "Add your first event". | New Event modal opens. Fill in name + type + date + click Create. |
| 14.4 | The event opens on Command. | Yes, fresh event with empty state guidance per tab. |

**Notes:**

```
```

**Rating (1–5):** _____

---

# Feedback summary template

Fill this out at the end.

**Time taken:** _____ minutes (target: 30-45)
**Device:** Desktop / Tablet / Mobile / Multiple
**Browser:** _____

## Overall ratings (sum from each section)

| Section | Rating |
|---|---|
| 1. Studio Home triage | |
| 2. Command Center | |
| 3. Sidebar navigation | |
| 4. Vendors workspace | |
| 5. Decisions / Approvals | |
| 6. Tasks (Timeline / Checklist / Planning Tasks) | |
| 7. Guests + Seating | |
| 8. Budget | |
| 9. Communication | |
| 10. Calendar + Run of Show | |
| 11. Manage Event actions | |
| 12. Mobile pass | |
| 13. Sync + offline | |
| 14. Clear sample data + real workspace | |
| **Total / 70** | |

## The 3 biggest friction points

(Write the 3 things that made you pause, swear, or want to give up.)

1.
2.
3.

## The 3 things that delighted you

(What worked better than you expected?)

1.
2.
3.

## Would you use this for a real event next week?

- [ ] Yes — and I'd pay for it
- [ ] Yes — for free, not paid
- [ ] Maybe — if [missing thing]
- [ ] No — because [blocker]

## What's missing?

(One paragraph. Be specific — "It needs file uploads" beats "It needs more.")

```
```

---

## Where to send your notes

- Best: paste the whole thing into a shared Notion/Google doc and send the link.
- OK: email the markdown / take screenshots of your hand-written notes.
- Worst (but acceptable): just call Todd and walk through it verbally.

**Thank you.** This is the highest-signal feedback we can get pre-launch.
