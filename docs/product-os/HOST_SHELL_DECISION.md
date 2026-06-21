# Host Shell Decision — should Event Boss be a separate host product?

> Canonical reference for the dual-persona architecture question. Status: **decided —
> Option 2 (host shell over shared core)**, executed incrementally. Last reviewed 2026-06-21.

Event Boss serves two personas from one React app: the **host** (planning their own
party — a consumer) and the **planner** (a pro coordinating events for clients — B2B).
Today they diverge via runtime gating (`hostNavActive(event)` / `audiencePersona(event)
=== 'host'`) sprinkled through `src/App.js` (~36k lines), `src/CommandCenter.jsx`, and
the specialist tabs. This doc records why we keep one product *now*, why we still must
change the *shape*, and the concrete extraction.

---

## The question is a spectrum, not a yes/no

The real decision is **at what layer host and planner diverge**:

1. **One app, runtime gating** — `{isHost ? … : …}` everywhere. *(today)*
2. **Two shells, one core** — the host gets its own render-tree assembled from a shared
   engine + host-native components. Diverge at the UI layer, converge at the data/engine
   layer. **← the decision.**
3. **Two products** — separate codebases, brands, pricing, funnels.

## Pros of separating (toward 2 or 3)

- **The leak class disappears.** Gating planner surfaces one ternary at a time *keeps
  leaking*: "Planner sign-in" greeted hosts; the Vendors header, Plan KPI grid, RSVP
  "Collection Link," the Overview readiness rail — each was missed until an audit caught
  it. Host-native-by-construction makes that entire bug category impossible.
- **Velocity per persona** — a host change can't break the planner cockpit; no shared
  36k-line `App.js` where every edit risks both.
- **Clean positioning + business model** — host = consumer/viral (the invite loop),
  freemium; planner = B2B, seat/retainer. One app blurs "is this for me or a business?"
- **Smaller, faster host app** — no AR / COI / fees / Stripe-for-clients / pipeline.
- **Focused funnels** — host *activation* vs planner *retention*, optimized separately.

## Cons of separating

- **Premature at pre-PMF / ≈0 real events.** We don't yet know which persona is the
  business. Forking spends the budget we need for **activation** — refactoring an empty
  house. (See `project_activation_is_the_bottleneck`.)
- **The persona is often the same person** — a planner IS a host (plans their own
  party); a host grows into a planner. A hard split breaks the **trojan-horse path**
  (recruit 1 planner → 20–50 real events → corpus) and the one-account elegance.
- **The shared machinery is the moat — splitting fragments it.** Playbooks, the
  real-event corpus, vendor memory, the do-it-for-me engine, the RSVP loop, analytics —
  these *compound across both personas* (a planner's real events make the host's
  intelligence smarter). **Biggest risk of a premature split.**
- **2× surface for a thin team** + real migration/regression cost at the worst time.

## Decision

**Do NOT fully split now (Option 3) — but Option 1 (status quo) has demonstrably hit
its limit.** Go to **Option 2: a host shell over a shared core.** Keep one repo, one
backend, one corpus; give the host its own entry/render-tree assembled from shared
primitives + host-native components. Captures ~80% of the separation upside (design
clarity, the leak fix, per-persona velocity) for ~20% of the cost, and is **reversible**
— the natural stepping-stone to a full split later, *on data*.

**The tell:** "Planner sign-in" was fixed *in the shared shell* — proof we don't need a
full split to cure the symptoms; we need a cleaner host shell. The full split is the
right *eventual* answer and the wrong *now* answer.

**One line:** separate the *experience* now (host shell), the *product* later
(post-activation, on data), and **never** the *engine/corpus* — that's the moat.

---

## Concrete extraction — "host shell over shared core" in THIS codebase

### Layer map (target)

```
SHARED CORE (already mostly libs — keep shared, never fork)
  data model: the event blob; src/lib/eventTaxonomy.js, eventIdentity.js
  engine:     src/lib/playbooks/*, doItForMe.js, disclosure.js, eventMemory.js,
              nextActionRenderer.js (audiencePersona/personaFor), rosOverlap.js,
              analyticsReader.js, analytics.js
  routing/persona: src/lib/presentationNav.js (hostNavActive/hostNav/hostTabLabel)
  primitives: theme/palette + useT, Icon, DraftSheet, AssembleReveal, StatCard,
              the public RSVP page (RSVPFormView), Toast, modals
  backend:    backend/* (FastAPI), Supabase, PostHog  — shared, untouched

HOST SHELL (consumer)                    PLANNER SHELL (B2B) — unchanged
  HostHome (App.js:19702)                  MainDashboard (App.js:20144)
  HostEventShell  ← NEW                     EventPlanner cockpit (App.js:34047)
    host bottom-nav (5 lanes, exist)        CommandCenter cockpit
    host Guests (spoken + faces)            full specialist tabs + spine + readiness
    HostSpendingPlan (App.js:23402)
    host checklist (ChecklistGenerator isHost)
    The Day host view (RunOfShow isHost)
    PostEventRecap + do-it-for-me cards
```

### The actual fork point

Today `App.js` forks personas at **L1** (`accountTypeOf === 'host' ? HostHome :
MainDashboard`, ~App.js:36381) — but at **L3 both personas pass through the SAME
`EventPlanner`** (App.js:34047), which is why we gate dozens of surfaces with `isHost`
ternaries. **The extraction gives the host its own L3 shell so it never enters
`EventPlanner` at all.**

### Migration order (incremental, each step ships independently, reversible)

1. **Harvest the host branches that already exist.** The host-native views are *already
   written* as `isHost` branches: spoken Guests (App.js:25218), `HostSpendingPlan`,
   host `ChecklistGenerator`, `RunOfShow` host view, `EventDetailsTab` host copy,
   `VendorPlanningWorkspace` host gating, `PostEventRecap`. Lift each host branch into a
   standalone host component (no behavior change yet).
2. **Build `HostEventShell`** — the host L3 surface: the host bottom-nav (the 5 lanes
   already defined at `bottomNavItems`, App.js:~34481) + the harvested host components,
   rendered directly. No `NextStepSpine`-everywhere, no `CommandCenter` cockpit, no
   readiness rail — host-native by construction.
3. **Fork L3 routing:** `hostNavActive(event) ? <HostEventShell …/> : <EventPlanner …/>`.
   This is the key change — hosts stop traversing `EventPlanner`'s gated tabs.
4. **Delete the `isHost` ternaries** from `EventPlanner` / `CommandCenter` / the
   specialist tabs. The planner code returns to planner-only and **byte-identical to
   pre-gating** — and the *leak class is structurally gone* (a planner surface can no
   longer render to a host).
5. **Keep shared primitives shared** (DraftSheet, theme, Icon, RSVP page, all engine
   libs). The backend, Supabase, PostHog, and the corpus are untouched — this is a
   **UI-shell refactor only**, no data-model/migration risk.
6. **(Later, post-PMF, on data)** if host-consumer vs planner-B2B proves to be the
   engine, lift `HostHome` + `HostEventShell` + the shared core into a separate
   build/app/brand. The boundary is already clean → Option 3 becomes a packaging change,
   not a rewrite.

### Cost / risk

- **Scope:** a focused multi-day refactor, sequenced so steps 1–3 ship behind the
  existing host gating before step 4 removes it.
- **Main new code:** `HostEventShell` + the L3 routing fork. Everything it renders
  already exists.
- **Risk:** host components share `setEvent`/state with `EventPlanner` today — thread
  those as props. Regression risk on the host journey, mitigated by the puppeteer
  screenshot harness (`review-artifacts/_*.mjs`; see `reference_puppeteer_harness_nav`).
- **Not in scope:** backend, data model, the corpus, the planner experience.

### When to revisit Option 3 (full split)

Trigger: **real-event volume + a clear answer on which persona is the business**
(host-consumer-viral vs planner-B2B). Until then, Option 2 is the ceiling. Splitting
before that data forks the corpus that is the entire moat.
