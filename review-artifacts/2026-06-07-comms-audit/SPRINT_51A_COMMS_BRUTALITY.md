# Sprint 51A — Communications Workspace Brutality Review

Date: 2026-06-07 · Design-only (no production code changed) · Figma file `CYlmJqDCXEaacCuz9wW3bd`, page "NGW MOBILE 10+ LOCK" (898:2), section at y≈15,523.

## What was audited
Two surfaces carry "communication" today:
- **GlobalCompose** (`App.js:13387`) — the floating compose utility (FAB → modal). **This is the surface the brutality applies to.**
- **CommunicationHub** (`plan/CommunicationHub.jsx`, 1,404 lines) — the event-scoped Communication *tab*. Already much richer (triage "Needs reply" tab, honest 3-mode send, delivery states, context panel). It inherits event context correctly because `EventCommTab` passes `event={event}`.

The gap is GlobalCompose. It was built as "How do I contact someone?" — it should answer "What communication needs to happen next?"

---

## 1. Brutality audit — the 6 problems, confirmed against live UI
Screenshot of record: `globalcompose-1440.png`.

| # | Problem | Evidence in code/UI | Why it fails a tired planner |
|---|---------|--------------------|------------------------------|
| 1 | **Context loss** | `useState('')` then `useEffect` defaults `selectedEventId` to `activeEvents[0]` (soonest active event). Background shows "Todd & Sarah", modal opens on "Annual Strategic Planning Sess…". | The tool silently changes which event you're working on. Trust violation — the #1 sin. |
| 2 | **Recipient ambiguity** | `TO: Client` / `Vendor` / `Planner`. Identity exists in data (`cl.name`, `v.contactName`, email/phone) but is not shown. | "Client" is a role, not a person. Planner can't confirm they're messaging the right human. |
| 3 | **Channel overload** | Call · WhatsApp · Google Voice · Open-in-email-app surfaced up front, plus type chips (Message/Approval/Follow-up/Internal note). | 4+ channel choices before a single word is written = decision paralysis. |
| 4 | **Empty composer** | `body` defaults blank; placeholder "Write your message…". 7 opt-in templates exist but are not pre-applied. | At 11 PM the planner must invent the message from scratch. The system knows the context — it should draft. |
| 5 | **Send confidence** | Disabled send / "Log to thread" with no plain-language reason. "Email not configured — logged to thread only." | Planner can't tell *why* they can't send or whether it's safe to. Anxiety, not confidence. |
| 6 | **No operational link** | No Reason · Impact · linked item. Message is detached from event/decision/risk. | Communication floats free of the operation it serves. No "what happens if I don't send this." |

**Verdict:** GlobalCompose is a contact form bolted onto an operations product. It optimizes "compose a message" instead of "resolve the next communication."

---

## 2. Current vs improved flow

**Current (GlobalCompose):**
> Open FAB → *pick an event (wrong default)* → pick a channel (Client/Vendor/Team) → pick a type chip → face a blank box → write from scratch → hit a disabled/ambiguous send.
> Cognitive steps before progress: **6**. Decisions forced on the planner: event, channel, type, recipient inference, wording, send-method.

**Improved (Communications Workspace):**
> Open Communications (event already known) → see the queue "who needs attention" → top item is pre-selected → read Communicating-With · Reason · Impact → see ONE Recommended Action + why → editable pre-filled Draft → Send Email / Copy Draft / Create Internal Note.
> Cognitive steps before progress: **1** (read the focused card). Every decision is *recommended with a reason*, never *demanded blank*.

---

## 3. Desktop redesign (Figma: "Improved Communications — Desktop", 760×~830)
Layout: **Header (inherited event) → left triage rail (Needs Attention queue) → focused message card.**
Card sequence, verbatim to the target state:
1. **Header** — "COMMUNICATIONS · TODD & SARAH WEDDING" + "3 messages need to happen next" + date chip. Context is inherited, never re-picked.
2. **Communicating With** — avatar + "Petal & Stem · Floral Vendor" + contact line (Mia Reyes · email · last contacted 3 days ago). Identity, not role.
3. **Reason / Impact** — two boxes: "Centerpiece final confirmation still open" / "Blocks floral production timeline" (impact in risk-amber).
4. **Recommended Action** (green-bordered) — "Email follow-up to Mia Reyes" + **Why:** "no response for 3 days and you have her email on file. Secondary: Call · Text." One lead action, reasons, secondaries demoted.
5. **Draft · editable · never auto-sent** — pre-filled subject + body, fully editable.
6. **Send confidence** — "✓ Ready to send — subject and message complete." (When incomplete it states the missing piece, e.g. "Add subject and message.")
7. **Actions** — Send Email (primary) · Copy Draft · Create Internal Note.

## 4. Mobile redesign (Figma: "Improved Communications — Mobile (390)", 390×800)
Same sequence, stacked: header → horizontal triage pills (focused vendor active) → Communicating With → Reason/Impact card → Recommended Action card → Draft (subject + body) → send-confidence line → full-width **Send Email**, then **Copy Draft** / **Internal Note** side-by-side. Thumb-reachable; one screen to the decision.

## 5. Screenshots
- Current state: `globalcompose-1440.png` (annotated in Figma section A with 6 red callouts).
- Improved desktop + mobile: verified inline during build (final desktop render after FILL fix; mobile clean on first render).

---

## 6. Trust analysis
- **Context inheritance** removes the single worst trust break (silent event switch).
- **Named recipient + role** lets the planner verify the human before sending.
- **Reason + Impact + linked item** makes every message accountable to the operation — the planner sees the consequence of *not* sending.
- **"Never auto-sent" label + editable draft** preserves the No-Guesswork honesty rule: the system drafts, the human decides and sends. No fake automation.
- **Honest send confidence** ("Ready to send" / "Add subject and message" / "Email not configured — copy instead") tells the truth about delivery state instead of a mute disabled button.

## 7. Cognitive-load analysis
- Pre-action decisions cut from **6 → 1**.
- Channel choices reduced from **4 surfaced equally → 1 recommended + 2 demoted secondaries**.
- Blank-page authoring eliminated (pre-filled editable draft).
- Triage ("who needs attention") replaces "who do I happen to want to contact," so the planner is *led* to the highest-value message instead of choosing in a vacuum.
- Meets the success condition: **who / why / what channel / what message readable in under 5 seconds** from one focused card.

## 8. Recommendation
**Adopt the Communications Workspace model for GlobalCompose; do not build a new surface.** The event-scoped `CommunicationHub` already has ~70% of the primitives (triage tab, honest send, delivery states, context panel). The work is:

- **P0 — Context inheritance:** GlobalCompose must default `selectedEventId` to the event the planner is viewing (pass current event into the FAB/modal), not `activeEvents[0]`. *(1-line root cause; highest trust win.)*
- **P0 — Recipient identity:** render `name · role` + contact line instead of "Client/Vendor/Planner" (data already present).
- **P1 — Recommended Action:** collapse the channel row into one recommended action + reason + secondary actions (reuse vendor-accountability next-action logic).
- **P1 — Pre-filled draft:** auto-apply the relevant template as an editable draft tied to Purpose + linked item (templates already exist).
- **P1 — Send confidence:** replace disabled/mute send with a plain-language reason line.
- **P2 — Reason/Impact link:** surface the linked decision/promise/risk the message serves.

Keep it honest (copy/draft only, no auto-send), keep it one surface (extend, don't duplicate), and let the event-scoped Hub and the global compose converge on the same "what needs to happen next" card.

## Figma deliverables (file CYlmJqDCXEaacCuz9wW3bd, page 898:2)
- **A · Current State** — `globalcompose-1440.png` placed at y≈15,639 with 6 red dashed problem callouts.
- **B · Improved — Desktop** — node 1195:3.
- **B · Improved — Mobile** — node 1196:3.
