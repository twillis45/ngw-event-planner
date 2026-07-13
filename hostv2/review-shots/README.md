# Review shots — build-map + re-audit work

> **Note on format:** the browser screenshot tool returns images inline (not to
> disk) and the gif recorder downloads to a sandboxed location outside the repo,
> so this is a **click-through review guide** rather than saved PNGs. Every surface
> below is live on the dev server (`http://127.0.0.1:5200`) or the deployed site
> (`https://twillis45.github.io/ngw-event-planner/hostv2/`). Follow the steps and
> you'll see exactly what each screenshot in the session showed.

Each entry: **what to look for** · **how to reach it** · **commit**.

---

## Guest-facing (invite)

### 1. Invite — upcoming (whitespace fixed)
- **Look for:** the countdown ("22 DAYS TO GO") sits *with* the content block, not stranded in a cavernous gap; reply chips anchored at the bottom; **"EVENT BOSS ·"** maker's-mark with the steel brand period below the footer.
- **Reach it:** open `…/?rsvp=crab`.
- **Commits:** `b156930` (whitespace), `0dd257d` (brand moment), `57d2fcb` (Dress/Bring/Host + privacy note).

### 2. Invite — post-event recap
- **Look for:** eyebrow flips to "Thank you for coming", deck "A day worth remembering", **"Afterward · 47 of us were there"**, the host's italic keepsake note, a "See the photos" album link + "Share the memory" — no countdown, no RSVP form, no future-tense leaks.
- **Reach it:** in the console on `…/?rsvp=crab`, run:
  `let p=JSON.parse(localStorage['ngw-hostv2-patch-my-crab-feast']||'{}');Object.assign(p,{date:'2026-07-02',rosterUnknown:true,goingCount:47,recapNote:'What a day. Thank you all.',albumUrl:'https://photos.google.com/share/x'});localStorage['ngw-hostv2-patch-my-crab-feast']=JSON.stringify(p);location.reload();`
  (delete those keys afterward to restore the demo.)
- **Commits:** `5e68f7c`, `581f83e`, `d3fc889` (memory surface).

---

## Host shell

### 3. Command palette / quick-switcher
- **Look for:** the search icon in the header (or press **Cmd/Ctrl-K**); a search box with live results across events **and** destinations, EVENT/Go chips, "Enter opens the first match · Esc closes".
- **Reach it:** click the magnifier top-right, type "budget", "crab", or "risks".
- **Commit:** `67463ee`.

### 4. Ask the plan (Q&A)
- **Look for:** a deterministic answer with the **assumptions shown** — e.g. "will $20,000 cover it?" → "$20,000 covers what your plan commits so far — you're about $8,930 under" + "Your plan commits about $11,070 so far…". An off-topic question gets an honest "I can answer money/food/guests/weather/what's-next" fallback with no route.
- **Reach it:** Cmd-K → "Ask the plan" → type a question (or tap an example chip).
- **Commit:** `22dde5b`.

### 5. Risks — routing + grounded why + dismiss
- **Look for:** each risk row has a "Handled — stop showing this" dismiss and, when a fix surface resolves, a "Plan for this" that deep-links (weather → the "If it rains" sheet). Dismiss drops the count.
- **Reach it:** open the "What could go wrong" quiet-index row on an event with risks (e.g. the cookout).
- **Commit:** `8be98d5` (+ `167bdb6` dead-CTA fix).

### 6. Vendor confirm-back read-back
- **Look for:** a "Confirmed by vendor" chip on a vendor card, and when expanded: "They confirmed the brief · On-site: [name] · [phone] · [their note] · Answered [date] — from the brief link you shared." (Populated only against a live backend; the demo shows none, gracefully.)
- **Reach it:** open "People you're hiring" → a vendor card (needs backend data to populate).
- **Commit:** `e1e918f`.

### 7. Budget honesty + Ask-source
- **Look for:** the Command Center budget tile shows "(est.)" / "· $Y est." when spend includes estimates; the Budget sheet's range-honest readout.
- **Reach it:** the Budget tile on the Plan hero.
- **Commit:** `581f83e`, `167bdb6`.

### 8. Reveal — invite link handoff
- **Look for:** after creating an event, the reveal ends with **"Open your plan / Share the invite / Change an answer"** + "Your guests reply at that link".
- **Reach it:** Create tab → type "cookout for 20 Sept 12" → "Say it" → "Put my plan together" → wait for the reveal.
- **Commit:** `1cf8f77`.

---

## Systemic (harder to screenshot, verified structurally)

- **Spacing/radius token system** — `--sp-1..7`, `--r-sm..pill`, applied across CSS + 236 inline JSX values (`b156930`, `74d56d7`, `57d2fcb`).
- **≥44px touch targets** — every compact pill keeps its size but has a 44px hit area (`89f5c34`).
- **Affordance** — one systemic `button:disabled` rule + press feedback on `.mini` and the rows (`cdb0a8f`).
- **Accessibility** — `<header>`/`<main>`/`<nav>` landmarks, toast `role="status" aria-live`, sheet Tab focus-trap, labeled `×` (`02b18e0`).
- **Generic undo** — any host edit that toasts now offers Undo (`3ab99b9`); e.g. dismiss a risk → "Undo" restores it.
- **Synced resume pointer** — last-viewed event follows the host across devices when signed in (`8f8b173`).
