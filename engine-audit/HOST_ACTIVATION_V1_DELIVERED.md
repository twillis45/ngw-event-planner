# Host Activation v1 — Delivered (Phases 1, 3, 4, 5) · Phase 2 scoped

**Date:** 2026-06-18 · **Branch:** `main` · commits `1272a2f` · `0ea7f7d` · `9b5be74` · `2789017`
**Success metric:** *a first-time host can create an event and reach meaningful planning
progress without feeling like they entered a planner CRM.* Met at the **event (L4)** level;
the **L1 front door (Host Home)** is the one remaining piece.

## Shipped & verified

### Phase 1 — Host experience default ON (persona-driven) — `1272a2f`
The 10 presentation flags (nav, voice, labels, attention, identity, moments, because,
confidence, value, decisions) now **default ON**, gated downstream by persona — so a
host-audience event automatically gets the host product; a planner-audience event stays
identity. `memory` stays OFF (no real data). Per-flag QA off-switch added
(`?pi-off=<name>` / `localStorage 'ngw-pi-<name>'='0'` / `REACT_APP_PI_<NAME>='false'`).
Persona rule (sprint): **unset audience ⇒ host** (already true in `audiencePersona`), and
flipping `voice` on auto-reveals the audience selector at creation.
**Verified (no flags):** a host event shows the 6-tab host nav (Overview/Plan/Vendors/
Guests/Money/Paperwork/The Day/Details) — **no Decisions/Crew/Client Intake/Seating/
Calendar** — host voice, Positive Attention, Decisions, Confidence composing; 0 console errors.

### Phase 3 — Mobile-first host lanes — `9b5be74`
Host mobile bottom nav is now **Overview · Plan · The Day · Guests · Money** — *The Day*
(the #1 day-of surface) is a **primary lane**, no longer buried in "More"; Messages/Vendors/
Seating reveal in More. Planner mobile unchanged. **Verified (390px):** lanes render with
The Day present; 0 errors.

### Phase 4 — Start Here (no dead cold-start) — `2789017`
A brand-new event (no timeline/vendors/guests/budget) now gets an attention-level **"Start
here — add who's coming"** hero → Guests (the first domino), instead of "Nothing urgent
right now." Only fires for genuinely-empty events; persona seam host-ifies the voice.

### Phase 5 — Instrument the moat-gating signals — `0ea7f7d`
Added + fired `DECISION_CAPTURED`, `ROS_ITEM_ADDED` (manual + moment), `OUTCOME_CAPTURED`
(overall/must-have/vendor), `EVENT_COMPLETED`. With the existing `SIGNED_UP`/`EVENT_CREATED`/
`VENDOR_ADDED`/`INTAKE_COMMITTED`/`FIRST_VALUE`, the PostHog funnel now spans
**account → event → vendor → decision → schedule → completion → outcome** — the data the
60C→61B arc found uninstrumented.

**All phases:** suite **239/239**; build compiles; flag-default-on bundle within a few hundred
bytes of prior. Tests updated to the new default-ON contract (OFF/identity paths assert via
the `'0'` off-switch).

## Remaining

### Phase 2 — Host Home (the L1 front door) — NOT built
This is the only significant new surface and the last piece of the success metric. Today the
L1 home is a planner CRM (Pipeline · Client Events · Clients · Vendor Bank · "Name your
studio") for everyone — the PP-3 violation. Target: a host **checklist home** (My Event ·
Next Step · What Matters · What's Handled · Event Day), no CRM concepts.

**Open design decision (needs a call before building):** how to detect a "host studio" at
L1. There is **no account-type field** today, and the per-event `audiencePersona` doesn't
apply at the studio level. Options:
1. **Derive** — host studio = real events all `recordKind:'event'` (self-host) AND no real
   clients. Zero new schema; works for self-serve signups.
2. **Add a `profile.accountType`** ('host' | 'planner' | 'operator'), set at signup; explicit
   and durable. Recommended for correctness, needs a one-field migration + signup wiring.
3. **Host-first by default** at L1 (planner opts into the CRM) — boldest; matches the
   sprint's "risk of planner-UI-to-host > host-UI-to-planner," but reshapes the planner home.

**Recommendation:** Option 2 (`profile.accountType`, default 'host' for self-serve) — it's
the clean, durable version of the sprint's account-type rule and unblocks a correct Host Home.

### Figma program — NOT started
8 Phase-1 wireframes (Host Home, Event Dashboard, Mobile Nav, Event Overview, Vendors, The
Day, Event Completion, Empty States) per `UX_ALPHA_HOST_EXPERIENCE_PROGRAM.md`. Heavy MCP
operation; recommend a focused pass into file `CYlmJqDCXEaacCuz9wW3bd`.

## Net
The host product is **exposed** at the event + mobile level (the 80% the arc identified), the
cold-start is fixed, and the data loop is instrumented. The front door (Host Home) is the
final, deliberate build — held for the one persona-at-L1 decision above.
