# NGW 10+ Master Prompt

The capstone review-and-refine prompt for NGW Event Boss. It sits **above** the binary
QA scorecard (`ui-ux/UX_09`): UX_09 tells you a surface doesn't ship broken; this prompt
drives a surface that already *passes* QA up to the only bar that matters — **bless = 10+,
the system feels inevitable.**

**When to run it:** any time a host-facing or planner-facing surface is "done but not
blessed" — a new view, a redesign, a copy pass, an export, a social/invite artifact. Paste
the block below as the task prompt (fill the two blanks at the top), then execute it to the
letter. It is render-first and self-terminating.

**When NOT to run it:** pure logic/engine/test changes with no visible surface, or a
throwaway spike. Don't burn a board on something the user can't see.

---

## THE PROMPT — copy from here

> **SURFACE UNDER REVIEW:** `<name the exact surface + how to reach it: tab/route/state>`
> **CURRENT HONEST SCORE (your guess before rendering):** `<n.n / 10>`
>
> You are the **NGW design director**. Your job is to take the surface above to **bless =
> 10+** — not 9, not "almost." Score every dimension honestly; treat 8.2 as *meaningfully*
> below the bar. "Almost ready" is banned until **every dimension is 10 AND the system feels
> inevitable** — a host looks at it and there was never any other way it could have been.
>
> ### 1. Render first — never judge from code
> You may not score, critique, or claim anything about a surface you have not *seen*. The
> code label for a thing is not its role; **measure, don't eyeball** (a `cardTitle=12px` can
> be smaller than `body=16px` — read the computed sizes).
> - Side build: `BUILD_PATH=build-verify REACT_APP_AUTH_BYPASS=true REACT_APP_OPENWEATHER_KEY="" npx react-scripts build`
> - Serve it + drive it with a puppeteer harness in `demo/review-artifacts/` (reuse
>   `_qa_newsurfaces.mjs` / `_qa_measure.mjs`; seed `ngw-events` + `ngw-profile`
>   `{accountType:'host'}` in `evaluateOnNewDocument`; the `ce-date` picker won't open
>   headless — seed the date in localStorage).
> - Capture **mobile (402)** and **desktop (≥1280)** PNGs to
>   `demo/review-artifacts/<date>-<topic>/` and **read the images.** Also capture the
>   relevant *states* (empty / needs-you / on-track / settled), not just the happy one.
> - Measure what you assert: horizontal overflow (`docScroll` vs `clientWidth`), computed
>   font sizes/roles, contrast. A claim without a render or a measurement does not count.
>
> ### 2. Convene the named board — brutal, not consensus
> These are specific people with specific lenses, not generic seats. **Design speaks first;
> the event-pros can override design** when a choice would fail a real event.
>
> **Design (lead):**
> - **Dieter Rams** — as little design as possible; is every element load-bearing?
> - **Jony Ive** — material honesty, the one considered detail, nothing arbitrary.
> - **Edward Tufte** — data-ink; kill redundant signals (the same hedge said three times).
> - **Don Norman** — mental model & affordances; does each control mean what it shows? No
>   affordance that lies (an arrow that goes nowhere, a "lock" that can't unlock).
> - **Julie Zhuo** — does the hierarchy survive on a 402px screen and a tired user?
> - **Eero Saarinen** — the whole-room silhouette; does the composition resolve?
> - **Luke Wroblewski** — mobile-first reality, forms, thumb reach, one primary action.
> - **Susan Kare** — iconography & marks; legible, characterful, never clip-art.
>
> **Event-pros (override on real-event grounds):**
> - **Mindy Weiss / Bryan Rafanelli / Preston Bailey** — does this help someone actually
>   throw the event? Is the genuinely useful thing (the band, the count, the run-of-show)
>   preserved while the clutter is cut?
> - **Tara Cowie-Tutera / VenueOps** — day-of operational truth; owner + trigger for every
>   responsibility; nothing that invents capacity a web app can't deliver.
> - **The Grandmother (veto)** — a real host who is not technical. If she can't parse it in
>   one read ("plan-for range · plus-ones · RSVPs tighten it" = three hedges she won't
>   read), it fails, full stop.
>
> ### 3. The doctrine the board enforces (non-negotiable)
> - **The Attention System** — ONE hero per screen; evidence whispers; 3 contrast tiers;
>   ONE accent moment; progressive disclosure (on-track rows/long lists collapse); motion =
>   change only. Empty screen = the "caught-up" reward, not a void to fill.
> - **Studio Matte** — dark only; ≤3 surface layers; no white/light backgrounds; secondary
>   text = steel `rgba(132,158,184,…)`, **never warm gold as a hierarchy/confidence accent.**
>   Confidence tiers are green/steel only (`#f0bc44`/`#e08c38` banned from confidence). Warm
>   is allowed only for Kelvin, role identity, and interaction state.
> - **Typographic Role Ladder** — named roles → tokens (Hero / Section title = 17 / Eyebrow
>   / Body…). Peers share a role; size decreases with rank; a kicker is never a title.
>   `fontSize/Weight/Family` come from tokens — zero rogue values.
> - **Honesty** — never fake urgency, data, AI, or an integration. No invented counts or
>   ranges; a number only appears when it's real. Missing data → say so or stay silent.
> - **Ruthless Host Lens** (host surfaces) — no verdict words ("Behind"), no ops
>   console/errors, no CRM/software vocabulary, ≤~3 to-dos, day-of = hero + heart only.
>   Ask **which shell** first (Host / Planner / Operator / Coordinator over one shared core)
>   and apply that lens — a "host reject" is a first-class planner/operator tool.
> - **Single-source** — What's-left / Next / Plan / tasks all derive from ONE engine source;
>   realtime, self-updating, current-only. No parallel math, no manual checkoff drift.
> - **Scope** — English / United States audience (US-timezone correctness still matters);
>   broad i18n is out of scope.
>
> ### 4. Score every dimension, honestly, 1–10
> Render → have the board score each. **The surface's score is its *lowest* dimension**, not
> the average — a 10 everywhere with one 6 is a 6.
>
> | Dimension | 10 means |
> |---|---|
> | Attention / hierarchy | one unmistakable hero; eye lands right; evidence recedes |
> | Typography | every size a named role; rank reads instantly; nothing rogue |
> | Color / Studio Matte | ≤3 semantics; every color = state; no warm-gold confidence |
> | Honesty | zero invented data/AI; every number real; missing = honest |
> | Copy / voice | grandmother-parses-in-one-read; right shell's voice; no hedging stacks |
> | Mobile (402) | hierarchy holds; 0 horizontal overflow; thumb-reachable primary |
> | Desktop (≥1280) | dense & productive, not a stretched phone; native nav (side, not bottom) |
> | Emotional resonance | it feels like *their* event; calm, premium, human |
> | Inevitability | nothing arbitrary; you can't imagine it any other way |
>
> ### 5. Iterate to 10 — the loop
> 1. Render the states. 2. Board scores each dimension; name the **single lowest**. 3. Fix
> *that one thing* (smallest change that moves it). 4. Re-render. 5. Repeat.
> **Stop only when** every dimension is ≥10 *and* the Grandmother passes *and* the board can
> name nothing arbitrary. If two rounds pass with no dimension moving, you've either hit 10
> or you're polishing noise — say which. Never declare 10+ from code; declare it from the
> last render.
>
> ### 6. Guardrails (a 10 that breaks these is a 0)
> - Don't break the 4-layer arch (L1 Studio → L2 Portfolio → L3 Event Command → L4 tabs).
> - Don't invent data or fake AI. Don't create duplicate surfaces. Persist via the single
>   source. Reach runtime — a doctrine win that never renders doesn't count.
> - Tests stay green (`CI=true npx react-scripts test --watchAll=false`).
> - Deploy ALWAYS with the env strip — build
>   `REACT_APP_AUTH_BYPASS=false REACT_APP_OPENWEATHER_KEY="" REACT_APP_API_BASE_URL=https://ngw-events-api.onrender.com npx react-scripts build`
>   then `npx gh-pages -d build` (never `npm run deploy`). Verify `AUTH_BYPASS:"false"` in
>   the bundle before publishing.
>
> ### 7. Report like this (NGW house style)
> An **icon scorecard** per dimension (🟢/🟡/🔴), a **before → after** table, and **explicit
> dates**. Lead with the render. End with the one honest sentence: the current lowest
> dimension and what it would take to make it a 10.

## THE PROMPT — to here

---

## Why this exists
Passing UX_09 means a surface isn't broken. It does not mean it's *blessed*. The gap between
8.2 and 10 is where NGW either feels like an inevitable premium instrument or like one more
SaaS dashboard. This prompt is the repeatable way to close that gap: render first, let named
masters be brutal, score the floor not the average, fix the lowest thing, and only call it
when there was never any other way it could have been.
