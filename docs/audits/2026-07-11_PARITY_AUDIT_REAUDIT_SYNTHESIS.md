# Parity Audit + Re-Audit Synthesis

> **Ported from published artifact** — this audit was authored as a Claude artifact and lives at
> https://claude.ai/code/artifact/fc607878-6604-402d-912c-f5e8f4e8c3c2. Ported into the repo 2026-07-14 so it is searchable, diffable, and versioned.
> The artifact remains the editable original; if you change one, change the other.

Date: 2026-07-11 · Source: artifact `fc607878`

---

**Event Boss · 2026-07-11**

Nine independent read-only auditors: four feature-parity sweeps (legacy App.js vs go-forward hostv2, under the host-only ruling — planner-only surfaces classified "deliberately out," not gaps) and five re-audits of prior audits (HQ-1, HQ-3, V2 Engine Gap, Agent DIFM, IS-2). Every claim below is evidence-cited to file:line in the agents' full reports.

**Status update (same day, 2026-07-11):** queue items 1–6 shipped and live-verified within hours of this synthesis; 9 and most of 10 shipped; 7 and 8 are in flight (vendor brief + sync shell wiring queued behind the splash boot port). Beyond the queue: the number-reconciliation audit that followed fixed five more same-fact-different-number engine bugs, hero copy landed on 13 sheets, and the large-type mobile scale + tokenized font system shipped with UX_01 updated. Remaining rulings unchanged: phone-frame vs desktop, pooled-dues caption, reminder-delivery rail.

## 1 · The master fix queue (deduped, ranked)

| # | Fix | Severity | Where | Why it ranks here |
|---|-----|----------|-------|-------------------|
| 1 | **V2 multi-event store + cloud-save created events** `shipped 07-11` | `data loss` | HostShellV2.jsx:151, :2319, :1872 | One custom-event slot — creating a second event silently overwrites the first; V2-created events never reach the cloud even signed-in, breaking the account promise in the app's own settings copy. |
| 2 | **InviteV2 cross-device event resolution** (add `fetchPublicInvite` fallback) `shipped 07-11` | `funnel dead-end` | InviteV2.jsx:56-77 | An RSVP link is by definition opened on someone else's phone; today it resolves only local samples/patches. Legacy has the exact pattern to copy (App.js:31690). One import + one effect. |
| 3 | **V2 vendor write paths**: status, arrival time, cost/agreed-to-pay, paid ✓ (+ optional COI expiry) `shipped 07-11` | `degrading data` | HostShellV2.jsx:6166-6236 | Six V2 read sites (day-of roster, reconfirm sweep, readiness, payment gates) consume fields nothing in V2 can write — events born in V2 silently degrade. |
| 4 | **Money-drift pass** — one PR, two one-line fixes: thread the regional price factor into CommandCenter budget-health and legacy recovery card `shipped 07-11` | `trust` | CommandCenter.jsx:405; App.js:27662 | Two live recurrences of HQ-1's original #1 drift class: same event shows different dollars on surfaces that exist to agree. |
| 5 | **Guest policy editor + guest brief**: host setters for plusOnePolicy / kidsPolicy / collectAddresses / giftWish; port `draftGuestBrief` `shipped 07-11` | `dead switches` | HostShellV2 guests sheet; doItForMe.js:181 | The public portal already enforces all four flags — hosts just can't set them. Adults-only or no-+1s is currently impossible to declare in V2. |
| 6 | **ROS cue time/owner editor** (minimal inline) `shipped 07-11 (+ fixed a dead moment-library write)` | `day-of` | HostShellV2.jsx:3487 | Happening-now, overlap detection, helper briefs, and the print sheet all run on cue times V2 can't set; custom events can never build a timed day. |
| 7 | **Vendor brief authoring + VB2 mint in V2** (public page stays on legacy as designed) `in flight 07-11` | `host-critical` | Port of App.js:8084/8109 | The live-verified flagship vendor-coordination feature can't be initiated from the go-forward app — whose copy already references it. |
| 8 | **Sync honesty rail**: offline write retry/flush + a "last synced / pending" row `engine in flight 07-11; shell wiring next` | `UX_08` | Port of App.js:115, :97-98 | V2 swallows failed cloud saves forever and merges silently — a host can't tell if an edit is on one device or all of them. |
| 9 | **Import-history reconciliation**: PII cleanup path + one storage contract `V2 side shipped 07-11` `contract divergence documented, legacy untouched by design` | `privacy` | importHistory keys, App.js:45635 | V2's per-event batches hold full roster snapshots (emails/phones) that survive every demo reset; legacy and V2 use incompatible keys for the same lib. |
| 10 | **Honesty small-fixes batch** `5 of 6 shipped 07-11`: destinationAdjusted disclosure ✓ · welcome-gate re-eval ✓ (inspection-verified; needs a signed-in fresh-device run) · InviteV2 deck-line via ctx ✓ · meal edit + caterer tally ✓ · PLATFORM_LABELS ✓ · tasks "Inferred" chip `still open — the last HQ-1 trust survivor` | `batchable` | various (cited in reports) | Each is small; together they close most surviving trust-tier findings. |

> Needs an explicit ruling (not a fix yet): V2 phone-frame-only shell — demo harness or product? · pooled-dues caption on the money sheet (doctrine says never total the pool; a one-line disclosure may still be owed) · batch RSVP-reminder delivery rail (commApi story for V2).

## 2 · Parity: where V2 stands vs legacy (host-only lens)

### Covered or better in V2 (no action)

Smart-parse creation, assemble reveal, taxonomy, RSVP ingestion/outbox, magic-link sign-in, seating, dietary handling, thank-you run, checklist/decisions/day-of/weather/rain/risks, reconfirm sweep, promises + cross-vendor conflicts, helpers engine, lessons loop (legacy's is confirmed dead — capture with zero reads), CSV export, notifications, accessibility density. Reverse gaps (V2-only): travel rails, cost-sharing, crab procurement, caterer-drift reconciliation, per-event import keys, rsvpDeadline, arrival assist.

### Deliberately out (planner sunset — not gaps)

CommunicationHub inbox, client portal, branded invoices, Stripe/DocuSign, studio team, tier estimators, XLSX exports, planner tabs. Confirm-back read-back was found dead in legacy too (exported, never imported) — wire once, in V2 only, when briefs port.

## 3 · Re-audit scorecards

| Audit | Verdict today | Highlights |
|-------|---------------|------------|
| **HQ-1** (25 findings) | `9 fixed` `6 partial` `8 open` 2 unreconstructable | Both Critical/Trust items fixed, no regressions in either app. Top survivor: tasks "Inferred" chip. NEW: CommandCenter money drift (queue #4), ROS AI draft writes without confirm dialog (labeled, but bypasses the gate pattern), one dead import. |
| **HQ-3** (platform) | `Seam closed & holding` | buildExperienceContext is the single classification path in both apps; new surfaces read raw host data, none re-derive identity. Planner-scale finding obsoleted by ruling. NEW: InviteV2 deck-line regex is the one real bypass (copy-level). |
| **V2 Engine Gap** | `All 3 defects fixed & holding` | Doctrine violations closed (one acknowledged deferral), rosDone + RSVP contracts hold, do-not-port modules deleted, taxonomy fix landed as prescribed. NEW: destinationAdjusted dropped in V2, import-history dual contract + PII, welcome-gate pre-hydration, cost-sharing/money-sheet seam, care-units awaiting planned UI. |
| **Agent DIFM** | `"Zero agentic tissue" still holds` | Drafts grew 17→20 (all UX_07 Level 5, human-sent). Rail correction: VB2 confirm-back shipped pre-audit — so P0-1 (inbound vendor-reply parser) re-scopes to parsing the structured confirm-back note first; weather sentinel rises to borderline P0 (deterministic 80% now exists end-to-end); learning loop rises to P1. None of the 5 surfacing bugs fixed in production; 3 of 5 addressed in V2. |
| **IS-2** (shell) | `Parked → delete` | resolvePersona/resolveShell still zero-caller; under host-only they're dead code to delete (carve out resolveEventIdentity — live via ctx). Legacy's persona fragmentation deepened (hostShellOn now default ON) but is contained to the sunset app. V2's one-rule resolution (host unless public token) is the doctrine ceiling to defend. |

## 4 · Recommended sequencing

- **Wave A (data safety):** queue #1 + #2 — the two ways a real host loses work today. Small surface area, highest stakes.
- **Wave B (born-in-V2 completeness):** #3 + #5 + #6 — the writes that stop V2-native events from degrading below legacy-migrated ones.
- **Wave C (trust + hygiene):** #4 money pass, #8 sync honesty, #9 import PII, #10 small-fixes batch, plus the IS-2 dead-code deletion slice.
- **Wave D (leverage):** #7 vendor brief port, then the DIFM P0-1 confirm-back triage slice and the weather sentinel — the first genuinely agentic builds, on rails that now exist.
- **Already sequenced separately:** elder/caregiver care-units UI + pacing template UI (engines shipped today, tests green) ride the next build round.

> Method: parity classified only runtime-reachable legacy features (render-site verified, not imports); re-audits reconstructed each prior finding from the surviving records and re-verified against today's tree, marking unreconstructable items honestly rather than guessing. Full per-finding tables with file:line evidence live in the nine agent reports from this session.
