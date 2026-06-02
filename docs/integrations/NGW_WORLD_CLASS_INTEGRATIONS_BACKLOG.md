# NGW Event Planner — World-Class Integrations Backlog

> Canonical roadmap. Single source of truth for what we'll build, in what
> order, and why. Designed to be pasted into Notion or used as a project
> source. Last updated 2026-06-02 by Sprint 58P.3 — Invitation Platform
> Integrations Roadmap Patch.

---

## Purpose

Capture every integration that could plausibly belong in NGW Event Planner,
rank them by **workflow loop closed** (not by tool popularity), and produce
a sequence we can ship without bloating the product or violating
CTA-truthfulness rules.

This is a strategy document. It does not modify runtime code. It does not
install packages. It does not approve any integration for build — only
sequences candidates by the value they would create if they shipped.

---

## Integration Philosophy

We do not "connect to apps." We close **workflow loops** that planners
otherwise leave half-finished. Every integration in this document is tied
to one of nine loops:

| Loop | Definition | Cleared when |
|---|---|---|
| **Follow-up** | Alert → draft → send → delivery/reply | Reply received or status updated |
| **Document** | Upload → extract → review → task/risk/payment | Task created, risk closed, or payment scheduled |
| **Calendar** | Timeline → calendar export/sync → reminders → update reflected | Calendar matches Timeline + Run of Show |
| **Client** | Need approval → client portal → decision recorded → tasks update | Decision verdict captured + downstream tasks recompute |
| **Guest** | RSVP → meal count → seating → catering budget → mismatch alert | Catering count matches confirmed RSVPs |
| **Payment** | Invoice/payment due → pay/collect → webhook → budget/task clears | Budget row reconciled or task closed |
| **Day-of** | Run-of-show → vendor arrival → delay alert → message vendor/team | Status returns to on-track |
| **Intake** | Client fills form → event created → missing details flagged → follow-up drafted | Required fields complete OR follow-up sent |
| **Studio-learning** | Completed event → lessons captured → future template/vendor/risk guidance improves | Studio templates updated |

If an integration doesn't close a loop, it is "nice to have," not "high
priority."

---

## CTA Truthfulness Taxonomy

Every integration must be classified before it ships. We do not lie about
delivery, signature, payment, or notification.

| Tag | Meaning | Allowed CTA verbs |
|---|---|---|
| **DONE** | Executes inside NGW with confirmation | Send, Sign, Pay, Sync |
| **DEEP HANDOFF** | Opens external app with prefilled context | Open email draft, Text vendor, Open Venmo |
| **LIGHT HANDOFF** | Opens external app with minimal context | Open in Maps, Open in Calendar app |
| **RECORD-ONLY** | Logs that a planner-action happened | Log message, Mark sent, Record decision |
| **DRAFT-ONLY** | Creates draft but does not send | Save draft, Log to thread |
| **STUB** | Visible but no execution | (Should not ship to alpha) |
| **PLANNED** | Referenced but not built | (Roadmap only) |

Hard rules:
- Don't say **Send** if it only appends local state. Use *Log to thread*.
- Don't say **Notify** if no notification is sent. Use *Record decision*.
- Don't say **Sync** if it only displays an in-app calendar. Use *Export* or
  *Open in Google Calendar*.
- Don't say **Pay** if it only opens Venmo. Use *Open Venmo* / *Open
  payment app*.
- Don't say **Sign** without an e-sign integration. Use *Send for
  signature* / *Mark signed*.
- Don't imply document intelligence without real extraction. Use *Attach
  document* until extraction is wired.
- Don't imply AI grounding unless the AI is using real app data/documents.

---

## Source-of-Truth Map

These canonical owners must not be splintered as integrations land.

| Canonical owner | Owns | May be mirrored in |
|---|---|---|
| Communication Hub / backend | Message threads | Vendor Detail (recent), Decisions (linked message), Command (follow-up needed) |
| Timeline | Phase + task order, urgency | Run of Show (Day-of view), Calendar export |
| Run of Show | Day-of segment order + vendor arrivals | Calendar export, ROS PDF |
| Guests | Guest count, RSVP, meal | Catering vendor count, Budget catering rows, Seating |
| Budget | Budget rows, totals, committed | Payment tasks, Cash flow card |
| Vendor record | Vendor profile, cost, contract status | Budget row (via budgetCategory), Documents, ROS arrival |
| Documents | Document metadata + storage URL | Vendor detail, Event detail, Decision detail |
| Profile | Planner identity + studio defaults | Letterhead, brief signature, estimator factor defaults |

Rule: integrations may **read** any of these. They may **write** only to
the canonical owner.

---

## The Huge-Leverage List (12 Categories)

Every category below preserved per the brief. Items marked **★** are the
high-priority slice that drives the next 6–8 sprints.

### 1. Communication + Notification Layer

**Why it matters:** Most planner work is "did the message get there?" If
communication is honest and delivered, half the app's value lights up.

**Workflow loops closed:** Follow-up, Day-of, Client, Payment.

**Candidate technologies:**
- ★ FastAPI comms backend (`commApi.createMessage`) — partially wired
- ★ Email sending via **Resend** (preferred) / Postmark / SendGrid
- ★ SMS via **Twilio** (preferred) or MessageBird
- WhatsApp via Twilio / WhatsApp Business API
- Push notifications via web-push / OneSignal
- Email inbound parsing (Postmark inbound, Mailgun routes)
- Reply tracking + delivery status webhooks

**Current status:**
- Sprint 58 — composer CTA now honest ("Log to thread" / "Send via app")
- `commApi.createMessage` wired with local fallback
- Vendor cockpit Email/Text already DEEP HANDOFF (mailto/sms/whatsapp)
- Outbound delivery status (`sent-via-app` / `local-only`) stamped on
  every message

**Priority:** **CRITICAL** — every other loop depends on this being trusted.

**Complexity:** Backend medium (FastAPI exists). Frontend small. Provider
integration medium (Resend trial easy, Twilio medium, WhatsApp heavy).

**Buyer/user value:** Highest. "Did the vendor see this?" is the question
planners ask most.

**Risks:** Carrier compliance (10DLC for SMS in US). Email
deliverability/SPF/DKIM/DMARC setup. Reply parsing edge cases.

**Recommended first sprint:** Already shipped Sprint 58. Follow-up sprint
58.2 wires Resend for outbound email after CTA truthfulness landed.

**Later roadmap:** SMS, WhatsApp, inbound reply parsing, push, two-way
threads, AI reply suggestions.

---

### 2. Calendar + Schedule Layer

**Why it matters:** Planners live in calendars. If we don't push reliable
calendar entries, our timeline data lives in a box no one opens.

**Workflow loops closed:** Calendar, Day-of, Payment, Follow-up.

**Candidate technologies:**
- ★ `.ics` export (already shipped Sprint 57c for events)
- Google Calendar API
- Microsoft Outlook / Graph Calendar
- One-way calendar push (planner → vendor calendar)
- Two-way calendar sync (later)
- Availability lookup (free/busy)
- Calendly + booking links
- Zoom / Google Meet / Teams meeting creation

**Current status:**
- `.ics` event export shipped Sprint 57c
- No per-task / per-payment / per-vendor-arrival exports yet
- No Google/Outlook OAuth wired

**Priority:** **HIGH**. Quick wins available; OAuth is real work.

**Complexity:** ICS = low. Google API = medium (OAuth + scopes). Outlook =
medium-high (Graph permissions). Two-way sync = high.

**Buyer/user value:** High. "I want this in my calendar" is universal.

**Risks:** OAuth token refresh + scope creep. Calendar sync conflicts.
Vendor-side calendar push requires vendor consent.

**Recommended first sprint:** Sprint 59 — ICS exports for Run of Show
segments + vendor arrival times + payment due dates.

**Later roadmap:** Google Calendar push, Outlook push, two-way sync,
Calendly intake pairing, Zoom auto-meeting creation for client calls.

---

### 3. Document + File Layer

**Why it matters:** Contracts, COIs, invoices, menus, floor plans. Without
real file storage, document intelligence is impossible.

**Workflow loops closed:** Document, Client, Payment.

**Candidate technologies:**
- ★ **Supabase Storage** (already used elsewhere — cheapest path)
- Google Drive Picker
- Dropbox Chooser
- ★ DocuSign / Dropbox Sign / HelloSign (signing)
- PDF generation (pdf-lib, jsPDF — Sprint 49 brief generation already uses
  this pattern)
- PDF/document preview (pdf.js)
- OCR/document extraction (AWS Textract, Google Document AI, Anthropic
  Claude vision)

**Current status:**
- Document metadata already on `event.documents[]` (Sprint 49)
- No actual binary storage — `fileName` is metadata only
- No upload UI, no preview, no signing

**Priority:** **HIGH**. Blocking document intelligence and client portal
file review.

**Complexity:** Supabase Storage = low. Drive/Dropbox pickers = medium.
DocuSign = medium-high (sandbox + production envelopes). OCR = medium.

**Buyer/user value:** High. "Where did I put the venue contract?" is a
daily pain.

**Risks:** Storage cost at scale. PII in documents. Vendor contract
ownership clarity (planner-owned vs. client-owned).

**Recommended first sprint:** Sprint 60 — Supabase Storage uploads for
contracts/invoices/COI/menus, attached to Vendor / Event / Decision.
Inline preview for PDF + image. No DocuSign yet.

**Later roadmap:** Drive/Dropbox attach, DocuSign signature flow,
document AI extraction (Sprint 62+).

---

### 4. AI + Document Intelligence Layer

**Why it matters:** Once documents land, AI turns them into structured
tasks/risks/payments. Without grounding it's fake intelligence (Skill 06).

**Workflow loops closed:** Document, Studio-learning, Day-of, Follow-up.

**Candidate technologies:**
- Anthropic BYOK (current Sprint 54 Vendor Copilot)
- ★ Backend AI proxy (server-side Claude route) — prevents key leakage
  + lets us add a paid tier later
- Rule-based fallback (already shipped)
- Document AI extraction (Textract / Document AI / Claude vision)
- RAG / vector search (Pinecone, pgvector, Supabase Vector)
- "Ask This Event" over docs+messages+tasks
- Event memory layer (long-term studio knowledge)
- Speech-to-text (Whisper, AssemblyAI)
- Voice notes capture
- Image/PDF understanding
- Day-of briefing AI
- Timeline risk AI
- Client update generator
- Studio pattern learning (across events)

**Current status:**
- BYOK Vendor Copilot live (Sprint 54)
- No backend proxy
- No document extraction
- No RAG

**Priority:** **MEDIUM-HIGH** — but gated by Documents (cat. 3). Don't
build extraction before storage.

**Complexity:** Backend proxy = medium. Extraction = medium. RAG = high.

**Buyer/user value:** Massive once documents exist. Useless before.

**Risks:** Token cost. Hallucination on event/vendor specifics. Skill 06:
**no fake intelligence** — label clearly when AI is rule-based vs. real
extraction.

**Recommended first sprint:** Sprint 61 — backend AI proxy with secure
server-side Claude route. Adds OBSERVABILITY + cost control.

**Later roadmap:** Contract/invoice extraction, vendor contract risk
scoring, day-of briefing AI, "Ask this event" RAG, studio pattern
learning across completed events.

---

### 5. Payment + Money Movement Layer

**Why it matters:** Money is the highest-stakes loop. Get this wrong and
trust evaporates.

**Workflow loops closed:** Payment, Document, Client.

**Candidate technologies:**
- ★ Current Venmo / PayPal / Cash App / Zelle handoffs (Sprint 56d)
- Stripe Checkout
- Stripe Payment Links
- Stripe invoices
- Stripe Connect (planner-as-marketplace) **later**
- Payment confirmation webhooks
- Invoice generation (PDF + email)
- QuickBooks Online API
- Wave API
- Xero API
- Plaid (bank verification) — much later

**Current status:**
- Sprint 56d shipped Venmo/PayPal/Cash App/Zelle deep links + payment
  method recording
- No Stripe
- No accounting sync

**Priority:** **MEDIUM**. Current handoffs serve alpha planners. Stripe
adds real value but is heavy (KYC, fees, dispute handling).

**Complexity:** Stripe Checkout = medium. Stripe Connect = high (KYC +
1099 + dispute UX). Accounting sync = high (mapping categories per
studio).

**Buyer/user value:** High for studios collecting client payments.
Low-medium for one-time event hosts.

**Risks:** PCI compliance scope (Stripe Checkout sidesteps most of it).
Refund/dispute UX. Sales tax. International cards.

**Recommended first sprint:** Sprint 64 — Stripe Checkout for client
deposit + balance. Webhook clears the budget row. No Connect yet.

**Later roadmap:** Stripe invoices, recurring billing, Connect for
multi-vendor settlements (much later), QuickBooks/Wave export.

---

### 6. Maps / Venue / Travel / Logistics Layer

**Why it matters:** Outdoor events are weather-dependent. Vendor arrival
times are travel-dependent. Without this, the app misses real risk.

**Workflow loops closed:** Day-of, Document (venue logistics docs).

**Candidate technologies:**
- Google Maps / Places API (venue lookup, autocomplete)
- ★ Address validation (Google or Smarty)
- Distance Matrix API (vendor travel fee estimates)
- Arrival planning (travel time buffer)
- ★ Weather API (OpenWeather, Tomorrow.io, NOAA)
- Rain plan alerts (outdoor event risk N days before)
- Uber/Lyft deep links (guest transport)
- Hotel block support (room block contracts)
- Parking / transit info

**Current status:** None wired.

**Priority:** **MEDIUM**. Weather + address validation are cheap, high
value. Hotel blocks are heavy.

**Complexity:** Weather = low. Maps autocomplete = low. Distance Matrix =
low. Hotel block = high (contract complexity).

**Buyer/user value:** High for outdoor weddings, garden showers, picnic
events. Lower for indoor corporate.

**Risks:** API quota costs. Weather forecast accuracy (set expectations
honestly).

**Recommended first sprint:** Sprint 63 — Weather risk alert for events
< 14 days out at outdoor venues. Address autocomplete on event/venue
fields.

**Later roadmap:** Distance Matrix for vendor travel fees, Uber/Lyft deep
links, hotel block contract templates.

---

### 7. Guest / RSVP / Seating Layer

**Why it matters:** Guest count drives catering, seating, budget. A wrong
count is the most expensive mistake in event planning.

**Workflow loops closed:** Guest, Payment, Day-of.

**Candidate technologies:**
- ★ QR RSVP links (Sprint 51 already uses uid-based rsvpCode)
- ★ Email / SMS RSVP reminders (depends on Comms layer)
- Google Contacts import
- Apple Contacts / CSV import
- Meal-choice collection
- Guest messaging (group SMS for "weather update" etc.)
- Table assignment export (PDF + CSV)
- Check-in mode (day-of arrival scanning)
- ★ Catering count mismatch alerts (Sprint 51 caterer drift already
  ships)
- Seating/catering/budget cross-sync

**Current status:**
- RSVP code + RSVP page partial
- Caterer drift detection live
- No reminder messaging
- No check-in mode

**Priority:** **HIGH** — directly tied to revenue (catering bill).

**Complexity:** Reminders = low (once Comms layer is live). CSV import =
low. Check-in = medium. Apple Contacts import = medium (privacy
permissions).

**Buyer/user value:** High for weddings/showers/galas. Lower for
small events.

**Risks:** RSVP code privacy (don't leak guest list). Group SMS
opt-in/opt-out compliance.

**Recommended first sprint:** Sprint 60.1 — RSVP reminder messaging
piggybacked on Comms layer Sprint 58. Catering count mismatch alert is
already live.

**Later roadmap:** Check-in mode, Contacts import, table assignment PDF,
invitation platform import (see Category 7.5 below).

---

### 7.5. Invitation Platform Integrations

**Why it matters:** This category was missing from the original roadmap.
It matters because **first-time planners and small-event hosts don't
start in NGW.** They start in Paperless Post, Evite, or Partiful.
By the time they consider a planning tool, they may already have a
guest list and RSVP status living in an invitation platform.

These integrations close the **Guest loop** — the same loop as Category
7 — but from a different direction: not "NGW creates the invite" but
"NGW imports and tracks what happened in the invite tool."

The workflow loop is:

```
Invitation sent (in Evite/Paperless Post)
→ RSVP received in invitation platform
→ Planner imports RSVP export into NGW
→ Guest count updates
→ Meal count updates
→ Seating + catering + budget mismatch clears
```

**Critical distinction:** NGW remains the planning source. Invitation
platforms are the invite-delivery and RSVP-collection source. They
feed NGW; they do not replace it.

**Workflow loops closed:** Guest, Payment (catering count → invoice
accuracy), Client (RSVP deadline tracking).

**Who this serves:** First-time planners, birthday/shower/anniversary
hosts, family event planners, small-event hosts who already use these
platforms. This is the category that makes NGW feel accessible to
non-professional users — a stated product goal.

**Candidate integrations and priorities:**

| Integration | Priority | Phase | First Useful Version |
|---|---|---|---|
| **Paperless Post** | P2 | Phase 3 | Store invitation link on event; import RSVP export CSV; track guest source |
| **Evite** | P2 | Phase 3 | Store invitation link; import RSVP export; guest list import; RSVP deadline reminder |
| **Partiful** | P2/P3 | Phase 3 | Store invitation link; import RSVP export; guest list import |
| **Greenvelope** | P2/P3 | Phase 3 | Store invitation link; import RSVP export; useful for weddings + corporate formal events |
| **Zola / The Knot RSVP import** | P3 | Phase 3/4 | Wedding-specific RSVP import after guest model stabilizes; CSV import first |
| **Native NGW invitations** | P2 (long-term moat) | Phase 3 | Event-native invitation and RSVP inside NGW after guest model stabilizes |

**CTA truthfulness — what each first version may say:**

| Action | Truthfulness Tag | Allowed CTA |
|---|---|---|
| Store invitation link on event | DONE | "Add invitation link" |
| Import guest list from CSV export | DONE | "Import guest list" |
| Import RSVP status from CSV export | DONE | "Import RSVP export" |
| Open Paperless Post / Evite | DEEP HANDOFF | "Open Paperless Post" / "Open Evite" |
| Track RSVP deadline | DONE (computed from event date) | "Set RSVP deadline" |

**What is NOT the first version (defer these):**

- Full API sync with Paperless Post / Evite / Partiful (none have
  public APIs that support real-time RSVP sync at the time of writing)
- Auto-update guest RSVPs from invitation platform
- Sending invitations through NGW via these platforms
- Two-way guest messaging between NGW and invitation platform

If Paperless Post, Evite, or Partiful ship developer APIs later, we
evaluate. Until then: link, import, and import-deadline-reminder are
the honest first versions.

**Source-of-truth rules for invitation platform data:**

NGW owns: guest count, meal count, seating, catering budget
implications, RSVP deadline alerts, event readiness status.

Invitation platforms are the source for: guest names (imported),
RSVP status (imported or manually updated), invitation link, platform
used, invitation sent date.

Do not let the invitation platform become the only place that knows
whether RSVPs are complete. NGW must hold the planning consequence.

**Current status:**
- Invitation link field: not yet on event record
- RSVP export import: partial (The Knot/Zola CSV parser exists in
  csvParsers.js; Paperless Post format not yet mapped)
- No platform-specific RSVP deadline tracking
- No guest "source platform" field

**Priority:** **P2** for link + import. Do not build before Phase 3.
Depends on stable guest model and Comms layer.

**Complexity:** Link storage = trivial. CSV import = low (pattern
exists). API sync = high / deferred.

**Buyer/user value:** HIGH for first-time hosts, birthdays, showers,
anniversaries, family events. Moderate for professional coordinators
(who usually manage their own guest list in NGW directly).

**Risks:** Invitation platform export formats change without notice.
CSV schemas vary. Do not hardcode column names — use the flexible
parser pattern already established in csvParsers.js.

**Recommended first sprint:** Phase 3 (Sprint 67.2 or later) —
Add invitation link field to event record + Paperless Post / Evite
CSV import mapping in csvParsers.js. RSVP deadline reminder
piggybacked on existing deadline alert system.

**Later roadmap:** Native NGW invitations (Phase 3 moat, Sprint 70+),
Partiful / Greenvelope import, Zola/The Knot deep sync (if API ships),
invitation delivery tracking.

---

### 8. Vendor Intelligence / Marketplace Layer

**Why it matters:** Studios have preferred vendors and lessons learned.
That intelligence should compound.

**Workflow loops closed:** Studio-learning, Follow-up, Day-of.

**Candidate technologies:**
- Preferred vendor directory (studio-private)
- Vendor performance history (response time, on-time rate)
- Vendor response time tracking
- Vendor issue history
- Vendor pricing/defaults per studio
- Google Places vendor search
- Yelp / review data (later)
- Vendor portal (vendor logs into NGW)
- Availability request links
- Vendor self-update forms

**Current status:**
- Sprint 53/54 vendor intelligence partially shipped: vendor scoring,
  next-action, copilot
- No vendor portal
- No marketplace search

**Priority:** **MEDIUM**. Studio-private preferred vendor list = high
value, low risk. Public marketplace = late-stage moat.

**Complexity:** Preferred directory = low. Vendor portal = medium.
Marketplace = high (two-sided liquidity problem).

**Buyer/user value:** High for repeat studios. Low for one-time event
hosts.

**Risks:** **Do not build marketplace too early.** It's a different
business model. Vendor portal needs vendor adoption story.

**Recommended first sprint:** Sprint 65 — Preferred vendor directory
+ vendor performance summary per vendor. No portal yet.

**Later roadmap:** Vendor availability request links, vendor portal,
vendor self-update form, public marketplace search.

---

### 9. Client Portal Layer

**Why it matters:** Decision turnaround is the single longest delay in
event planning. Client portal cuts it dramatically.

**Workflow loops closed:** Client, Follow-up, Payment, Document.

**Candidate technologies:**
- ★ Client magic-link portal (no password — Supabase magic links)
- ★ Client approvals (verdict captured + signed timestamp)
- Client approval notifications (depends on Comms layer)
- Read-only event status page
- File review (depends on Documents layer)
- Signature / payment portal (later)
- Guest list / family list upload
- Client-safe event summary
- Client action list ("3 things waiting on you")

**Current status:**
- Approval requests exist as `commClient` messages (Sprint 49)
- No standalone client portal
- No magic link

**Priority:** **HIGH**. Closes the longest loop in the planning cycle.

**Complexity:** Magic link auth = low (Supabase). Portal UI = medium.
Permissions/scoping (client sees only their event) = medium.

**Buyer/user value:** Very high for professional planners. Medium for
DIY hosts.

**Risks:** Scoping leaks (don't show other clients' data). Email
deliverability for magic links. Mobile portal must be excellent — clients
read on phones.

**Recommended first sprint:** Sprint 66 — Client magic-link portal with
read-only event status + approval action list. Depends on Sprint 58
Comms.

**Later roadmap:** Client file review, client signature, client guest
upload, client payment, white-label per-studio branding.

---

### 10. Forms + Intake Layer

**Why it matters:** First impression. If intake is friction, planners lose
leads. If intake is automated, the funnel feeds itself.

**Workflow loops closed:** Intake, Studio-learning.

**Candidate technologies:**
- ★ Native NGW intake form
- ★ Website embed form (iframe or script)
- Typeform import (existing forms)
- Tally / Jotform import
- Zapier / Make webhook intake (lead from anywhere)
- Calendly + intake pairing (lead → booked call)
- Lead capture
- Event auto-creation from intake
- Missing-info follow-up drafts

**Current status:** None — manual event entry only.

**Priority:** **HIGH** for studios with sales funnels. Lower for DIY
planners.

**Complexity:** Native form = low. Embed = medium (security, CORS).
Calendly pairing = medium.

**Buyer/user value:** High for studios. Critical for marketing efficiency.

**Risks:** Spam / lead quality. Field overload (don't ask for 30 things on
intake).

**Recommended first sprint:** Sprint 67 — Native intake form + shareable
link + auto event creation. Embed code in Sprint 67.1.

**Later roadmap:** Typeform/Tally import, Calendly pairing, Zapier
webhook intake, AI lead qualifier.

---

### 11. Automation / Connector Layer

**Why it matters:** Lets power users glue NGW into their existing stack
without us building every integration.

**Workflow loops closed:** All (depending on recipe).

**Candidate technologies:**
- Zapier app (NGW as trigger + action)
- Make.com app
- Webhooks (inbound + outbound)
- Public REST API (later)
- Airtable sync
- Notion export/sync
- Slack notifications
- Microsoft Teams notifications
- Google Drive auto-folder creation per event
- Automation recipes (templated combos)

**Current status:** None wired. Public API surface partial in `commApi`.

**Priority:** **MEDIUM-LOW**. Build after the core surfaces stabilize.

**Complexity:** Webhooks = low. Zapier app = medium-high (review
process). Public API = high (versioning + auth + rate limits).

**Buyer/user value:** Medium. Helps power users; doesn't move first-time
planners.

**Risks:** Public API permanent contract. Once shipped, breaking changes
are painful.

**Recommended first sprint:** Sprint 68 — Outbound webhooks for
event.created, vendor.payment_due, message.received. Zapier app comes
later.

**Later roadmap:** Public REST API, Zapier/Make apps, Notion sync, Slack
team alerts.

---

### 12. Production Observability + Analytics Layer

**Why it matters:** We can't fix what we don't measure. Beta without
observability = flying blind.

**Workflow loops closed:** Studio-learning (for us, not for the planner).

**Candidate technologies:**
- ★ Sentry (errors + perf)
- ★ PostHog (product analytics + session replay + feature flags)
- Mixpanel (alternative analytics)
- LogRocket / FullStory (session replay)
- Feature flags (PostHog or LaunchDarkly)
- A/B testing
- Performance monitoring (web vitals)
- Alpha/beta product learning

**Current status:** `lib/sentry.js` exists but not wired into App.

**Priority:** **HIGH** before broader beta. Critical before paid tier.

**Complexity:** Sentry = low. PostHog = low. Privacy mask config =
medium (PII protection).

**Buyer/user value:** Indirect. Our value, not the planner's.

**Risks:** Privacy (mask all PII in session replay). Cookie consent.
GDPR scope if EU users.

**Recommended first sprint:** Sprint 69 — Sentry + PostHog wired with PII
masking + cookie consent. Before any paid signup.

**Later roadmap:** Feature flags, A/B test framework, performance budgets.

---

## Huge-Leverage Priority Table

Ranked by *workflow-loop closure value × current readiness*. Build order
follows phases below.

| Rank | Integration | Why It Could Be Huge | Workflow Loop | Priority | Complexity | Build Timing |
|---|---|---|---|---|---|---|
| 1 | **Email + SMS + WhatsApp sending + reply tracking** | Closes the follow-up loop everything else depends on | Follow-up, Day-of, Client | CRITICAL | Medium | Phase 1 |
| 2 | **Supabase Storage + document storage/preview** | Unlocks doc intelligence + client portal + signature | Document, Client | HIGH | Medium | Phase 1 |
| 3 | **Google/Outlook Calendar + ICS exports** | Planners live in calendars; we have to push | Calendar, Day-of, Payment | HIGH | Low–Medium | Phase 1→2 |
| 4 | **Client portal + approvals + magic link** | Cuts the longest loop in event planning | Client, Follow-up | HIGH | Medium | Phase 3 |
| 5 | **Native intake forms + website embed** | Studio funnel; auto event creation | Intake | HIGH | Low–Medium | Phase 2 |
| 6 | **Backend AI proxy (server-side Claude)** | Cost control + paid tier + observability | Studio-learning, Document | MEDIUM-HIGH | Medium | Phase 2 |
| 7 | **Weather + maps/address validation** | Outdoor risk + venue logistics | Day-of | MEDIUM | Low | Phase 3 |
| 8 | **RSVP + guest reminder messaging** | Cuts catering count errors | Guest, Payment | HIGH | Low (after #1) | Phase 2 |
| 8.5 | **Invitation platform import (Paperless Post, Evite, Partiful, Greenvelope, Zola/Knot)** | First-time hosts arrive with guest lists already in invitation tools — import closes the Guest loop before it breaks | Guest, Client | P2 (link+import), P3 (API sync) | Low (import), High (API) | Phase 3 |
| 9 | **Stripe invoices/payments + webhooks** | Real money in the app | Payment | MEDIUM | High | Phase 3 |
| 10 | **Notion + Zapier + Make + webhooks** | Power users glue NGW into their stack | All | MEDIUM-LOW | Medium | Phase 3 |
| 11 | **Sentry + product analytics + session replay** | Beta visibility; required before paid | (operational) | HIGH | Low | Phase 1 |
| 12 | **Drive / Dropbox / DocuSign** | Document attach + signature | Document, Client | MEDIUM | Medium–High | Phase 2 |
| 13 | **QuickBooks / Wave / Xero export** | Studio finance loop | Payment | LOW-MEDIUM | High | Phase 4 |
| 14 | **Slack / Teams alerts** | Studio team awareness | Day-of, Follow-up | MEDIUM | Low | Phase 3 |
| 15 | **Vendor portal** | Vendor self-serve, response-time improvement | Day-of, Follow-up | MEDIUM | Medium–High | Phase 4 |
| 16 | **Document AI extraction (contracts/invoices)** | Turn PDFs into structured tasks/risks | Document | HIGH (after #2) | Medium–High | Phase 2 |
| 17 | **"Ask this event" RAG over docs/messages/tasks** | Real grounded AI value | Studio-learning, Document | HIGH (after #2+#6) | High | Phase 4 |
| 18 | **Studio pattern learning across events** | Long-term moat | Studio-learning | MEDIUM | High | Phase 4 |
| 19 | **Stripe Connect (planner-as-marketplace)** | Vendor settlements | Payment | LOW (premature) | High | Phase 4+ |
| 20 | **Public REST API** | Power user + partner integrations | All | LOW | High | Phase 4 |

---

## High-Priority Backlog Table

These are the items that drive the next 6–8 sprints. Each row is sized to
fit in 1–2 sprints.

| Priority | Integration | First Sprint | Required Before | What It Unlocks | Risk If Delayed |
|---|---|---|---|---|---|
| P0 | **Communication CTA Closure** | Sprint 58 (shipped) | — | Honest CTAs; trust foundation for all comms | App lies to planners; trust collapses |
| P0 | **Real email sending (Resend)** | Sprint 58.2 | Sprint 58 | Vendor follow-ups, client approvals, RSVPs actually send | Comms layer remains symbolic |
| P0 | **ICS exports for ROS / vendor arrivals / payments** | Sprint 59 | None | Calendar loop closure | Planners ignore in-app schedule |
| P0 | **Supabase Storage file uploads** | Sprint 60 | None | Document loop, client portal file review | "Where's the contract?" remains forever |
| P0 | **Sentry enablement (already in lib/)** | Sprint 60.5 | None | Production error visibility | Beta failures invisible |
| P1 | **RSVP reminder messaging** | Sprint 60.1 | Sprint 58.2 | Catering count accuracy | Catering overbills, planner trust drops |
| P1 | **Meal count / catering mismatch alerts** | Already live (Sprint 51) | — | Caterer drift cleared | (already cleared) |
| P1 | **Backend AI proxy (server-side Claude)** | Sprint 61 | None | Cost control, paid tier, observability | BYOK leakage risk; can't ship paid AI |
| P1 | **Document AI extraction** | Sprint 62 | Sprint 60 | Contract terms, invoice line items, COI dates → tasks | Documents stay opaque |
| P1 | **Weather risk for outdoor events** | Sprint 63 | None | Rain-plan alerts, day-of risk | Avoidable day-of disasters |
| P1 | **Google Maps / address validation** | Sprint 63.1 | None | Venue logistics, vendor travel | Bad addresses cascade to vendors |
| P2 | **Native client intake form** | Sprint 67 | None | Lead funnel automation | Manual entry wastes planner time |
| P2 | **Website embed (intake)** | Sprint 67.1 | Sprint 67 | Studio funnel | Studios stay manual |
| P2 | **Client approvals portal** | Sprint 66 | Sprint 58.2 | Client loop closure | Approvals stall in email |
| P2 | **Stripe Checkout for deposits** | Sprint 64 | None | Real payment loop | Payments stay symbolic / off-platform |
| P2 | **Calendar push to Google/Outlook** | Sprint 70 | Sprint 59 | Two-way calendar | Planners maintain two systems |
| P2 | **File/document preview (PDF/image)** | Sprint 60.2 | Sprint 60 | In-app document review | Open-in-new-tab friction |
| P2 | **Product analytics + session replay (PostHog)** | Sprint 69 | Sprint 60.5 (Sentry) | Beta insights, feature decisions | Build blind |
| P2 | **Session/sync trust (Supabase reconnect UX)** | Sprint 59.5 | None | Buyer trust foundation | Silent failures lose users |
| P2 | **Invitation link field + Paperless Post / Evite CSV import** | Sprint 67.2 | Stable guest model | Guest loop import; first-time host onboarding | First-time hosts' guest list stays trapped in invitation app |
| P2 | **Partiful + Greenvelope CSV import** | Sprint 67.3 | Sprint 67.2 | Wider platform coverage for informal and formal events | Guest data requires manual re-entry per event |
| P3 | **Zola / The Knot RSVP import** | Sprint 67.4 | Sprint 67.2 | Wedding-specific guest import | Wedding planners manage dual systems |
| P2 | **Native NGW invitations (long-term moat)** | Sprint 70.5 | Stable guest + comms model | NGW owns full invite→RSVP→plan loop; reduces dependency on external tools | Permanently cedes invitation engagement to third-party platforms |

---

## Recommended Build Sequence

Four phases. Each phase is **2–6 sprints**. Phase boundaries are sequenced;
inside a phase, work can parallel.

---

### Phase 1 — Make Execution Real (sprints 58–60.5)

**Why this phase matters:** Until communication, calendar, files, and
observability are real, every other integration sits on a lie. Phase 1
buys CTA truthfulness across the app.

**User pain closed:**
- "Did this message actually send?"
- "Where's the venue contract?"
- "Why isn't this in my calendar?"
- "Did the app just silently fail?"

**Sprints:**
1. **Sprint 58 — Communication CTA Closure** ✅ shipped
2. **Sprint 58.2 — Real email sending via Resend**
3. **Sprint 59 — ICS exports (ROS, vendor arrivals, payments)**
4. **Sprint 59.5 — Session/sync trust + Supabase reconnect**
5. **Sprint 60 — Supabase Storage file uploads + preview**
6. **Sprint 60.5 — Sentry enablement (PII-masked)**

**What NOT to build yet:**
- Stripe (no Phase 1 user is waiting for it)
- Document AI extraction (need storage first)
- Client portal (need comms first)
- Public API (premature)

**Success criteria:**
- Every Communication CTA is honest per the truthfulness taxonomy
- Real outbound emails reach planners' inboxes
- ICS exports land in iCal/Outlook reliably
- File uploads attach to vendor/event/decision and survive reload
- Sentry catches and groups errors with planner email redacted

---

### Phase 2 — Turn Stored Data Into Intelligence (sprints 61–63.1)

**Why this phase matters:** Phase 1 produces data. Phase 2 makes it
useful. AI without documents is fake; documents without AI is filing.

**User pain closed:**
- "I have the contract but no idea what's in it"
- "Did the catering RSVP go out?"
- "What's the weather risk?"
- "When does the vendor actually need to arrive?"

**Sprints:**
7. **Sprint 60.1 — RSVP reminder messaging (depends on 58.2)**
8. **Sprint 60.2 — File/document inline preview**
9. **Sprint 61 — Backend AI proxy (server-side Claude)**
10. **Sprint 62 — Document AI extraction (contracts/invoices/COI)**
11. **Sprint 63 — Weather risk + outdoor event alerts**
12. **Sprint 63.1 — Google Maps address validation + autocomplete**
13. **Sprint 70 — Google Calendar push (two-way deferred)**

**What NOT to build yet:**
- Client portal (Phase 3)
- Stripe (Phase 3)
- Public API (Phase 4)
- Studio pattern learning (Phase 4)

**Success criteria:**
- RSVP reminders actually go out and bring catering count in line
- PDFs preview in-app; planners stop downloading
- AI calls go through server proxy with cost telemetry
- Contract upload produces 3–5 structured tasks (signing date, final
  payment date, deliverable list, vendor contacts, cancellation policy)
- Outdoor events 14 days out show weather-aware risk
- Address autocomplete + validation reduces vendor "I went to the wrong
  place" tickets to zero

---

### Phase 3 — Paid SaaS Leverage (sprints 64–69)

**Why this phase matters:** Phases 1+2 prove the product. Phase 3 monetizes
it without building the whole stack.

**User pain closed:**
- "I want my clients to approve things faster"
- "I want to collect deposits without chasing"
- "My studio team needs visibility"
- "I want to see what's actually happening in the product"

**Sprints:**
14. **Sprint 64 — Stripe Checkout for deposits/balances**
15. **Sprint 65 — Preferred vendor directory + performance**
16. **Sprint 66 — Client portal (magic link, approvals, status)**
17. **Sprint 67 — Native intake form + shareable link**
18. **Sprint 67.1 — Website embed for intake**
19. **Sprint 67.2 — Invitation platform import: link field + Paperless Post / Evite CSV import**
20. **Sprint 67.3 — Partiful + Greenvelope CSV import (if 67.2 validates demand)**
21. **Sprint 68 — Outbound webhooks (event.created, payment_due, etc.)**
22. **Sprint 69 — PostHog analytics + session replay (PII-masked)**

**What NOT to build yet:**
- Marketplace search (Phase 4)
- Vendor portal (Phase 4)
- Stripe Connect (Phase 4+)
- Accounting sync (Phase 4)
- Public REST API (Phase 4)

**Success criteria:**
- First paid plan signups land via website embed → intake → event
- Studios collect first Stripe deposit through NGW
- Client portal verdicts close decisions in < 24h average (vs. 4–7d via
  email)
- PostHog dashboard shows the 5 most-used surfaces + drop-off points

---

### Phase 4 — Advanced Moat (sprints 70+)

**Why this phase matters:** Phase 4 is the moat. Don't build it before
the first three are battle-tested.

**User pain closed:**
- "My studio should learn from every event"
- "I want to ask 'what did I do last time?' and get a real answer"
- "I want vendor data to compound"

**Sprints:**
21. **Sprint 70+ — Vendor portal (vendor self-update, availability
    requests)**
22. **Sprint 71+ — Weather/maps deep logistics (distance matrix, hotel
    blocks)**
23. **Sprint 72+ — Studio pattern learning (cross-event templates)**
24. **Sprint 73+ — "Ask this event" RAG (docs + messages + tasks)**
25. **Sprint 74+ — Accounting sync (QuickBooks/Wave)**
26. **Sprint 75+ — Public REST API + Zapier app**
27. **Sprint 76+ — Stripe Connect (planner-as-marketplace)**

**Success criteria:**
- Vendors update their own status > 50% of cycles (vs. planner chasing)
- "Ask this event" answers 70% of planner questions correctly with
  citation back to the source document/message
- Studio-pattern learning surfaces a relevant template at intake for
  the planner's previous event types
- Accounting sync cuts month-end studio bookkeeping by > 4h

---

## Decisions

### 1. Workflow loops, not tool chasing

**Decision:** Prioritize integrations by the **workflow loop** they close,
not by tool popularity or revenue potential.

**Why:** Every loop NGW closes is a moment the planner stops thinking. That
compounds. Tool-by-tool prioritization optimizes for press releases,
not retention.

---

### 2. Phase 1 is non-negotiable before anything else

**Decision:** Ship Communication, Calendar, Documents, and Observability
before any other integration category.

**Why:** All four are upstream of trust. Stripe before honest comms is a
liability. AI before documents is fake intelligence. Calendar before
exports is busywork.

---

### 3. No Stripe Connect, no marketplace, no public API until Phase 4

**Decision:** Defer revenue-share, marketplace, and public API integrations
until the core product proves demand.

**Why:** Each carries permanent compliance/contract burden. Easy to add
later; impossible to walk back.

---

### 4. AI requires the backend proxy first

**Decision:** No production AI features (beyond current BYOK Copilot)
until the server-side Claude proxy is live.

**Why:** Skill 06 (no fake intelligence) + cost control + paid tier
foundation + key leakage prevention.

---

### 5. Every integration declares its CTA truthfulness tag before merge

**Decision:** Every integration sprint must include the CTA truthfulness
taxonomy classification in its acceptance criteria.

**Why:** Sprint 58 proved CTAs drift toward overpromising. Hard-coding the
taxonomy into definition-of-done prevents regression.

---

### 6. Invitation Platforms Added To Support First-Time Hosts And Smaller Events

**Decision (Sprint 58P.3, 2026-06-02):** Add invitation platform
integrations (Paperless Post, Evite, Partiful, Greenvelope,
Zola/The Knot RSVP, Native NGW invitations) to the roadmap as
Category 7.5.

**Why:** The original backlog was built from the perspective of professional
event coordinators who manage their own guest lists natively in NGW.
But **first-time planners and small-event hosts** — birthdays, showers,
anniversaries, family events — often start planning in Paperless Post
or Evite before they reach a dedicated planning tool. By Phase 3, those
hosts are our onboarding opportunity. If NGW requires them to re-enter
guest lists manually, they will not complete onboarding.

**How:** Invitation platform integrations follow the "first useful version"
rule:

1. Store invitation link on the event record (trivial)
2. Import RSVP export CSV from invitation platform (low — existing
   parser infrastructure in csvParsers.js)
3. RSVP deadline reminder piggybacked on existing deadline system
4. API sync — only if platforms ship developer APIs (deferred / TBD)

**What stays out:** NGW remains the planning source. Invitation platforms
are not alternatives to NGW's guest model — they are the import source.
NGW owns guest count, meal count, seating, catering budget consequences,
and RSVP deadline alerts. Invitation platforms own invitation delivery,
platform-native RSVP status before import, and invitation link.

**Native NGW invitations** are designated as a long-term moat. Phase 3+.
If NGW eventually owns invitation delivery natively, the dependency on
external platforms disappears. This is the highest-value but highest-risk
end state.

**Sequence:** Sprint 67.2 (link field + Paperless Post / Evite CSV import)
→ Sprint 67.3 (Partiful + Greenvelope, demand-validated) → Sprint 67.4
(Zola/Knot) → Sprint 70.5+ (native NGW invitations, moat phase).

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Email deliverability problems (SPF/DKIM/DMARC) | High | Use Resend + custom domain warmup before any volume |
| Stripe shipped too early creates support burden | Medium | Hold until Phase 3, after client portal funnel exists |
| Document storage costs balloon | Medium | 400px image downscale, 5MB PDF cap, archival policy after event closeout |
| Client magic-link leaks scope | Medium | Token + event_id binding; RLS on Supabase; security review before Phase 3 |
| AI hallucinations on event-specific facts | High | Always cite source document/message; rule-based fallback labeled |
| Calendar sync conflicts when planner edits both sides | Medium | One-way push first; only add two-way after sync conflict UX is designed |
| Vendor portal adoption fails (vendors don't log in) | High | Don't build until preferred-vendor directory shows demand signal |
| SMS 10DLC compliance delays SMS launch | Medium | Start Resend (email) before Twilio (SMS); plan 10DLC registration in parallel |
| Public API contract becomes permanent burden | High | Defer to Phase 4; version from day 1; document deprecation policy upfront |
| PII in Sentry / PostHog session replay | High | Mask all input fields by default; opt-in to unmask per surface |
| Invitation platform CSV export formats change without notice | High | Use flexible column-detection parser (not hardcoded column names); validate with sample files from each platform before Sprint 67.2 |
| Invitation platforms never ship developer APIs (no real-time sync) | High | Scope Phase 3 to link + import only; mark API sync as Phase 4 / TBD; do not promise two-way sync on roadmap without evidence |
| Guest list PII in invitation imports (names, emails, phone numbers) | High | Treat imported guest records as PII; apply same RLS + Supabase Row Security as all other event data |
| Duplicate guest entries on re-import (user imports CSV twice) | Medium | Deduplicate by email + name on import; surface "X guests already in list, Y new added" confirmation |
| Native NGW invitations scope-creeps into email delivery product | High | Scope native invitations to internal-use-only until comms layer is production-stable; never promise delivery SLAs without Resend parity |
| Zola / The Knot CSV schema is undocumented and may change | Medium | Build parser defensively; test on real exports; treat as best-effort import with planner confirmation step |

---

## Next Actions

1. **Confirm Phase 1 sprint sequence** with planner/founder.
2. **Pick email provider** — recommend Resend; alternative Postmark.
3. **Create Sprint 58.2 brief** (Resend wiring) using the templates in
   the existing /docs/audits/ folder.
4. **Stand up Supabase Storage bucket** with planner-scoped RLS for
   Sprint 60.
5. **Wire Sentry from existing `lib/sentry.js`** with PII masking
   config before any beta expansion.
6. **Park this document in Notion** using the paste package below so the
   roadmap has a canonical home outside the repo.

---

# Notion Paste Package

> Everything below is intended for copy/paste into Notion. The structure
> mirrors a Notion workspace: one master page, one database table, one
> decision log entry, and one next-sprint recommendation card.

---

## A. Master Page — paste at top of a new Notion page

```markdown
# NGW Event Planner — World-Class Integrations Roadmap

## Purpose
Canonical roadmap for every integration NGW could ship, prioritized by
the workflow loop closed (not by tool popularity).

## Integration Philosophy
We close workflow loops, not "connect to apps." Every candidate
integration is tied to one of nine loops: Follow-up, Document,
Calendar, Client, Guest, Payment, Day-of, Intake, Studio-learning.

## Huge Leverage List (13 categories)
1. Communication + Notification
2. Calendar + Schedule
3. Document + File
4. AI + Document Intelligence
5. Payment + Money Movement
6. Maps / Venue / Travel / Logistics
7. Guest / RSVP / Seating
7.5. Invitation Platform Integrations (Paperless Post, Evite, Partiful, Greenvelope, Zola/Knot, Native NGW)
8. Vendor Intelligence / Marketplace
9. Client Portal
10. Forms + Intake
11. Automation / Connector
12. Production Observability + Analytics

## High-Priority Backlog
See the Integration Backlog database below. P0/P1 items drive the
next 6–8 sprints.

## Recommended Build Sequence
- **Phase 1 — Make Execution Real** (Sprints 58–60.5): Comms,
  Calendar, Documents, Observability
- **Phase 2 — Turn Stored Data Into Intelligence** (Sprints 61–63.1):
  RSVP reminders, AI proxy, Document AI, Weather, Maps
- **Phase 3 — Paid SaaS Leverage** (Sprints 64–69): Stripe, Client
  Portal, Intake forms, Invitation platform import, Analytics
- **Phase 4 — Advanced Moat** (Sprints 70+): Vendor portal, Studio
  pattern learning, RAG, Accounting, Public API

## Decisions
1. Prioritize workflow loops, not tool chasing
2. Phase 1 is non-negotiable before anything else
3. No Stripe Connect, marketplace, or public API until Phase 4
4. AI requires backend proxy first
5. Every integration declares its CTA truthfulness tag before merge
6. Invitation Platforms Added To Support First-Time Hosts And Smaller Events (Sprint 58P.3, 2026-06-02)

## Risks
See risk table in repo doc. Top three: email deliverability, document
storage cost, client magic-link scope leaks. Plus: invitation platform
CSV schema changes without notice, no public APIs for real-time RSVP
sync, guest PII in invitation imports.

## Next Actions
1. Confirm Phase 1 sprint sequence
2. Pick email provider (recommend Resend)
3. Create Sprint 58.2 brief (Resend wiring)
4. Stand up Supabase Storage bucket with RLS
5. Wire Sentry from existing lib/sentry.js
6. Park this roadmap in Notion as canonical
```

---

## B. Integration Backlog Database — create as Notion database

Columns (in this order): **Name · Category · Priority · Phase · Workflow
Loop · Status · Complexity · First Sprint · Dependencies · Source of
Truth · CTA Truthfulness Risk · Notes**

| Name | Category | Priority | Phase | Workflow Loop | Status | Complexity | First Sprint | Dependencies | Source of Truth | CTA Truthfulness Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Communication CTA Closure | Communication | P0 | 1 | Follow-up | Shipped | Medium | 58 | — | Communication Hub | Resolved (Sprint 58) | "Send" → "Log to thread" / "Send via app" |
| Real email sending (Resend) | Communication | P0 | 1 | Follow-up | Planned | Medium | 58.2 | Sprint 58 | Communication Hub | "Sent" only after Resend ack | Custom domain + SPF/DKIM/DMARC |
| SMS sending (Twilio) | Communication | P1 | 2 | Follow-up | Planned | Medium-High | 65+ | 10DLC registration | Communication Hub | Honest fallback if undelivered | US 10DLC compliance |
| WhatsApp via Twilio | Communication | P2 | 3 | Follow-up | Planned | High | Phase 3 | SMS shipped | Communication Hub | Provider delivery proof required | Business API approval lead time |
| Inbound email reply parsing | Communication | P1 | 2 | Follow-up | Planned | Medium-High | Phase 2 | Resend live | Communication Hub | Tag thread on reply | Postmark inbound or Resend webhooks |
| ICS event export | Calendar | P0 | 1 | Calendar | Shipped | Low | 57c | — | Timeline + ROS | "Open in calendar" honest | Already done |
| ICS exports for ROS / vendor arrivals / payments | Calendar | P0 | 1 | Calendar | Planned | Low | 59 | — | Timeline + ROS + Vendors + Budget | Export only — not sync | One file per concept; planner chooses what to subscribe |
| Google Calendar push | Calendar | P1 | 2 | Calendar | Planned | Medium | 70 | OAuth | Timeline | "Push to Google" only when ack received | OAuth + scopes |
| Outlook Calendar push | Calendar | P2 | 3 | Calendar | Planned | Medium-High | Phase 3 | Graph permissions | Timeline | Same | Microsoft Graph |
| Two-way calendar sync | Calendar | P2 | 4 | Calendar | Planned | High | Phase 4 | One-way live | Timeline | Conflict UX required | Sync conflict design needed |
| Supabase Storage file uploads | Document | P0 | 1 | Document | Planned | Medium | 60 | — | event.documents[] | "Attach" honest | Per-event scoped bucket |
| In-app PDF/image preview | Document | P2 | 2 | Document | Planned | Low-Medium | 60.2 | Storage live | event.documents[] | Preview != open external | pdf.js |
| DocuSign / Dropbox Sign | Document | P2 | 3 | Document, Client | Planned | Medium-High | Phase 3 | Storage live | event.documents[] | "Sent for signature" only after envelope created | Sandbox/prod envelopes |
| Document AI extraction (contracts) | AI | P1 | 2 | Document | Planned | Medium-High | 62 | Storage + AI proxy | event.documents[] + auto-tasks | Cite extracted source | Anthropic vision or Textract |
| Backend AI proxy (server-side Claude) | AI | P1 | 2 | Studio-learning | Planned | Medium | 61 | — | (backend) | "AI" only when proxy responds | Cost telemetry required |
| RAG "Ask this event" | AI | P2 | 4 | Studio-learning | Planned | High | Phase 4 | Storage + extraction + proxy | (search index) | Always cite source | pgvector or Supabase Vector |
| Studio pattern learning | AI | P2 | 4 | Studio-learning | Planned | High | Phase 4 | RAG live | (templates) | "Suggested" not "Required" | Cross-event aggregation |
| Stripe Checkout (deposits/balances) | Payment | P2 | 3 | Payment | Planned | Medium-High | 64 | — | Budget rows | "Pay" honest after webhook | PCI scope sidestepped by Checkout |
| Stripe invoices | Payment | P2 | 3 | Payment | Planned | Medium-High | 64.1 | Stripe Checkout | Budget rows | Send only after invoice.sent | Email delivery via Stripe |
| Stripe Connect | Payment | P3 | 4+ | Payment | Planned | High | Phase 4+ | Stripe core live | Budget rows | KYC + 1099 + disputes honest | Defer until evidence demands |
| Weather risk for outdoor events | Maps/Weather | P1 | 2 | Day-of | Planned | Low | 63 | — | (alert) | "Forecast" not "Guarantee" | OpenWeather / Tomorrow.io |
| Google Maps address validation | Maps | P1 | 2 | Day-of | Planned | Low | 63.1 | — | Event venue + vendor address | "Validated" only on API ok | Autocomplete + verify |
| Distance Matrix (vendor travel fee) | Maps | P2 | 3 | Day-of, Payment | Planned | Low-Medium | Phase 3 | Maps API key | Vendor record | "Estimated travel" honest | Quota cost |
| Hotel block / room support | Travel | P3 | 4 | Day-of | Planned | High | Phase 4 | — | (contracts) | Contract complexity owned externally | Defer |
| RSVP reminder messaging | Guest | P1 | 2 | Guest | Planned | Low (after Resend) | 60.1 | Sprint 58.2 | Guests | Sent only after Resend ack | Opt-out compliance |
| Catering count mismatch alerts | Guest | P0 | 1 | Guest | Shipped | Low | 51 | — | Guests + Catering vendor | Resolved | Caterer drift |
| Meal-choice collection (RSVP page) | Guest | P2 | 3 | Guest | Planned | Medium | Phase 3 | RSVP page enhancement | Guests | Per-meal totals | Per-event scoped |
| Check-in mode (day-of) | Guest | P2 | 3 | Day-of, Guest | Planned | Medium | Phase 3 | — | Guests | Real-time arrival | Mobile-first |
| Preferred vendor directory | Vendor Intel | P2 | 3 | Studio-learning | Planned | Low-Medium | 65 | — | Studio-scoped vendor list | "Preferred" only when planner tags | Studio-private |
| Vendor portal (self-update) | Vendor Intel | P3 | 4 | Day-of, Follow-up | Planned | Medium-High | Phase 4 | Vendor auth | Vendor record | "Vendor confirmed" only after vendor action | Vendor adoption story |
| Public vendor marketplace | Vendor Intel | P4 | 4+ | (new business) | Planned | High | Defer | — | (separate) | Marketplace honesty bar | Different business model |
| Client magic-link portal | Client Portal | P2 | 3 | Client | Planned | Medium | 66 | Sprint 58.2 (email) | Event + Decisions | Scope leak risk | Supabase magic links + RLS |
| Client approvals (verdict capture) | Client Portal | P2 | 3 | Client | Planned | Medium | 66.1 | Portal live | Decisions | "Approved" timestamp + signed audit log | Client-bound token |
| Client file review | Client Portal | P2 | 3 | Client, Document | Planned | Medium | Phase 3 | Storage + Portal | event.documents[] | Read-only client view | RLS strict |
| Client signature (eSign) | Client Portal | P3 | 4 | Client, Document | Planned | High | Phase 4 | DocuSign or eSign provider | event.documents[] | "Signed" only after provider proof | Provider choice |
| Native intake form | Intake | P1 | 3 | Intake | Planned | Low-Medium | 67 | — | (new event) | Honest "saved" status | Shareable link |
| Website embed (intake) | Intake | P2 | 3 | Intake | Planned | Medium | 67.1 | Native form | (new event) | CORS + script vs. iframe | Studio funnel |
| Typeform / Tally / Jotform import | Intake | P3 | 4 | Intake | Planned | Medium | Phase 4 | Webhook ingest | (new event) | "Imported" only after webhook | Source app neutrality |
| Calendly pairing | Intake | P3 | 4 | Intake | Planned | Medium | Phase 4 | — | Calendar + Intake | "Booked" only after Calendly webhook | Funnel pairing |
| Zapier app (NGW as trigger/action) | Automation | P3 | 4 | All | Planned | Medium-High | Phase 4 | Public API or webhooks | (varies) | "Synced" honest per recipe | Zapier review process |
| Make.com app | Automation | P3 | 4 | All | Planned | Medium-High | Phase 4 | Public API or webhooks | (varies) | Same | Same |
| Outbound webhooks | Automation | P2 | 3 | All | Planned | Low-Medium | 68 | — | (event triggers) | "Fired" status surface | Retry + signing |
| Public REST API | Automation | P3 | 4 | All | Planned | High | Phase 4 | Sentry live | (varies) | Permanent contract | Versioning required |
| Notion sync (planner notes) | Automation | P3 | 4 | (operational) | Planned | Medium | Phase 4 | — | — | One-way export first | Studio-scoped |
| Slack alerts (studio team) | Automation | P2 | 3 | Day-of, Follow-up | Planned | Low | Phase 3 | Webhook out | (channel post) | "Posted to Slack" only after API ack | Studio-scoped |
| Microsoft Teams alerts | Automation | P3 | 4 | Day-of, Follow-up | Planned | Medium | Phase 4 | Webhook or Graph | (channel post) | Same | Studio-scoped |
| Drive folder auto-creation | Document | P3 | 4 | Document | Planned | Medium | Phase 4 | Google OAuth | (Drive scope) | "Folder created" honest | Per-event folder |
| Sentry (errors + perf) | Observability | P0 | 1 | (operational) | Planned | Low | 60.5 | — | (Sentry) | PII masking required | Already in lib/sentry.js |
| PostHog (analytics + session replay) | Observability | P2 | 3 | (operational) | Planned | Low-Medium | 69 | Sentry live | (PostHog) | Mask PII | Cookie consent for EU |
| Feature flags | Observability | P3 | 4 | (operational) | Planned | Low | Phase 4 | PostHog live | (PostHog flags) | "Beta" labels honest | Risky rollout gating |
| Performance monitoring (web vitals) | Observability | P2 | 3 | (operational) | Planned | Low | Phase 3 | — | (Sentry perf) | Real numbers only | Already supported |
| QuickBooks Online sync | Accounting | P3 | 4 | Payment | Planned | High | Phase 4 | Stripe live | Budget rows | "Exported" only on success | Per-studio chart of accounts mapping |
| Wave / Xero | Accounting | P3 | 4 | Payment | Planned | High | Phase 4 | Stripe live | Budget rows | Same | Lower volume |
| Paperless Post — invitation link + CSV import | Invitation Platform | P2 | 3 | Guest, Client | Planned | Low | 67.2 | Stable guest model | event.guests[] (NGW source) | "Import" honest; "synced" only after CSV confirmed | Guest PII import — apply RLS; deduplicate on email+name |
| Evite — invitation link + CSV import | Invitation Platform | P2 | 3 | Guest, Client | Planned | Low | 67.2 | Sprint 67.2 infrastructure | event.guests[] (NGW source) | Same | Flexible column-detection parser; no hardcoded headers |
| Partiful — invitation link + CSV import | Invitation Platform | P2/P3 | 3 | Guest, Client | Planned | Low | 67.3 | Sprint 67.2 shipped + demand validated | event.guests[] (NGW source) | Same | Informal events / birthday / social; younger audience |
| Greenvelope — invitation link + CSV import | Invitation Platform | P2/P3 | 3 | Guest, Client | Planned | Low | 67.3 | Sprint 67.2 shipped | event.guests[] (NGW source) | Same | Weddings + corporate formal events; similar to Paperless Post |
| Zola / The Knot RSVP import | Invitation Platform | P3 | 3/4 | Guest, Client | Planned | Low-Medium | 67.4 | Sprint 67.2 shipped; wedding guest model stable | event.guests[] (NGW source) | Best-effort import; planner confirms mapping | Wedding-specific; undocumented CSV schema — build defensively |
| Native NGW invitations (long-term moat) | Invitation Platform | P2 (moat) | 3+ | Guest, Client, Follow-up | Planned | High | 70.5+ | Stable guest model + comms layer | NGW owns full invite→RSVP→plan loop | "Sent" only after Resend delivery ack | Highest-value end state; do not scope before Phase 3 success |

---

## C. Decision Log Entry — paste as a Notion page

```markdown
# Decision — Integration Roadmap Prioritizes Workflow Loops Over Tool Chasing

**Date:** 2026-06-01
**Sprint:** 58P
**Status:** Approved (canonical for backlog ordering)

## Decision
NGW's integration backlog will be sequenced by the workflow loop each
integration closes, not by the popularity, revenue potential, or
technical novelty of the underlying tool.

## Why
Every workflow loop NGW closes is a moment the planner stops thinking
about something. Compounded across a planning cycle, that's the
product's actual value. Optimizing for tool-by-tool integration
metrics (e.g., "we support Slack") optimizes for press releases, not
planner retention.

The Sprint 58 audit showed that even "shipped" integrations can fail
silently when CTAs overpromise. The workflow-loop frame forces every
integration to declare:
1. Which loop does this close?
2. What honest status proves the loop closed?
3. Which surface owns the data (source of truth)?

Without those three answers, the integration sits in P3+ until they're
provided.

## What we will build first
Phase 1 (Sprints 58–60.5): Communication, Calendar, Documents,
Observability. Every other integration depends on at least one of
these being trusted.

## What we will defer
- Stripe Connect / marketplace / public API → Phase 4+
- Vendor portal → Phase 4 (needs vendor adoption story)
- "Ask this event" RAG → Phase 4 (needs Phase 1+2 corpus)
- Accounting sync → Phase 4 (after Stripe ships)
- Hotel block contracts → Phase 4 (contract complexity)

## Risks
- Phase 4 items create FOMO from sales/marketing; ignore.
- Email deliverability can derail Phase 1; mitigate with Resend +
  custom domain warmup.
- Document storage cost; mitigate with downscale + archival policy.
- Client magic-link scope leak; mitigate with token+event_id binding
  and Supabase RLS.

## Review trigger
Re-evaluate the phase sequence if any of these signals fires:
- 20% of beta planners cite a deferred Phase 3/4 integration as the
  reason they didn't adopt.
- A Phase 1 integration ships but doesn't close its loop within 30
  days of release.
- A regulatory change (e.g., 10DLC, GDPR enforcement) materially
  changes the cost/risk of a Phase 2 or 3 item.
```

---

## D. Next Sprint Recommendation — paste as Notion page

```markdown
# Next Sprint — Sprint 58.2 — Real Email Sending (Resend)

**Why it's next:** Sprint 58 closed the CTA truthfulness gap. The
composer now says "Log to thread" when nothing external happens. To
graduate to "Send via app," NGW needs a real email provider behind
`commApi.createMessage`.

**Skills to use:**
- 00 (Master skill)
- 01 (Architecture guardrails)
- 03 (Planner language UX)
- 06 (No fake AI/intelligence — applies to send-status honesty)
- 07 (Runtime QA / responsive QA)
- 09 (Execution discipline)
- 10 (Production-readiness priorities)

**Model recommendation:** Opus 4.1 for the auth + delivery design pass.
Sonnet 4 for the implementation.

**Acceptance criteria summary:**
1. Outbound planner email via Resend with verified sender domain
   (SPF + DKIM + DMARC configured).
2. `commApi.createMessage` returns provider message ID + delivery
   status webhooks update `event.commClient[].deliveryStatus`.
3. Composer "Sent via app" caption only renders after Resend ack.
4. On Resend failure, fall back to `deliveryStatus: 'local-only'`
   with no false success state.
5. Inbound reply webhook routes back to the same thread.
6. PII redacted in Sentry breadcrumbs (no email body in logs).
7. Mobile composer remains thumb-friendly (Sprint 58 baseline
   preserved).
8. Build clean. No console errors beyond pre-existing PhaseGrid.

**Dependencies:** Sprint 58 shipped (yes). FastAPI commApi backend
deployed (yes — `REACT_APP_API_BASE_URL` set in `.env.local`). Resend
account + verified domain (TODO).

**Not in scope for Sprint 58.2:**
- SMS (Twilio) — Sprint 65+
- WhatsApp — Sprint 65+
- Email scheduling / digest sends — defer
- Marketing email / drip campaigns — different product
```

---

*End of NGW World-Class Integrations Backlog.*
