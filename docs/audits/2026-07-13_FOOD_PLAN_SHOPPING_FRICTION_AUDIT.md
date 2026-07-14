# Food Plan & Shopping — Friction Audit

> **Ported from published artifact** — this audit was authored as a Claude artifact and lives at
> https://claude.ai/code/artifact/105c09a8-ec69-412c-9f50-805bf96f2d7b. Ported into the repo 2026-07-14 so it is searchable, diffable, and versioned.
> The artifact remains the editable original; if you change one, change the other.

Date: 2026-07-13 · Source: artifact `105c09a8`

---

**NGW Event Boss · V2 Prototype · Workflow Review**

# Food Plan & Shopping — Friction Audit

Where the plan-the-food and buy-the-food workflow taxes the host, benchmarked against best-in-class consumer list apps and a 10/10 polish bar. Two independent code-traced audits (per-item sheet interaction + end-to-end acquisition), synthesized — findings that both surfaced independently are the strongest signal.

`vs AnyList · Instacart · Out of Milk` · `HostShellV2.jsx · doItForMe.js` · `code-traced — live-verify flagged` · `2026-07-12`

---

## Resolved since this audit

**Shipped · 2026-07-12**

Since these two audits were traced, the food check-off and cost-truth work below shipped and is live-verified. Converged Blocker #1 and the top of the ranked queue are now resolved — see the **Fixed 2026-07-12** tags throughout.

- **Food check-off ungated** — a tap marks an item bought with no forced price. Accuracy is kept honestly via a firm-vs-estimated split (`event.foodReal`) instead of laundering the pre-filled midpoint into a "real price."
- **Estimate-as-real truth bug fixed** — Value / Premium / typed / bulk writes flag the line *firm*; going back to an estimate clears the flag; the spend readout now says "$X spent · ~$Y still estimated."
- **Two stale "a price is required" copy leaks removed** — the shopping-run line and the timeline shop-step gate contradicted the ungate; both reconciled with an honest firm-vs-estimate count.
- **Budget honesty** — supplies + capacity midpoint spend now counts as ESTIMATED (`spentEstimated`), not firm; the "still estimated" caveat is no longer understated, and the Command Center tile shows "(est.)" / "· $Y est."
- **Cost-share subtotal shipped** — "one of each group = $X per cadence" (doctrine-safe, never totals the pool).
- **Head-start pricing tightened** — Value / Premium keyed to the item's own chosen store; grocery tier relabeled to what it trades on; store-chip fabricated-price blur bug fixed; price-freshness tag added.

---

## ◆ Converged — flagged by both audits independently

The two audits ran blind to each other and landed on the same three structural taxes. Treat these as the spine of the fix queue.

### 1 · Check-off is gated behind entering a price

**Fixed 2026-07-12** · **Blocker**

For any estimated line, the first tap on the row does **not** check it off — it opens a price field and toasts "Set the real price first." A real store run becomes: tap → type a price → confirm → repeat ×18. There is no bulk / multi-select / "mark all" anywhere.

`toggleGot` HostShellV2.jsx:2063–2079 · shop-run admits it at :7018

**Leaders:** AnyList / Instacart / Out of Milk check an item in **one tap** (or a swipe), price entirely optional. This mid-aisle price-gate is the single largest workflow tax — **but it is deliberate cost-truth doctrine, not an oversight** (see the ruling needed, below).

**Resolved 2026-07-12:** check-off is ungated — a tap marks bought with no forced price. Cost-truth is now preserved through a firm-vs-estimated split (`event.foodReal`) rather than the price-gate, and the two stale "a price is required" copy leaks (shopping-run line + timeline shop-step) were removed. The ruling below was taken as option (a).

### 2 · Four of five key actions hidden behind one "tune" label

**Major**

The row face exposes only mark-bought, tap-price, and "tune." Change quantity, re-source to a cheaper store, swap an item, and skip all live *inside* the collapsed `tune` panel. "Tune" telegraphs fine-tuning — not "buy this at Costco instead." Store chips also only render when `it.where.length>1`, so the affordance silently vanishes on some rows.

row face HostShellV2.jsx:6718–6884 · store chips :6924 · swap chips :6946

**Leaders:** AnyList shows an inline quantity stepper and a labeled store/aisle control on the row; Instacart makes **Substitute** a first-class button with the alternative's price up front — not a generic disclosure.

### 3 · Global sourcing tier vs per-item store = double mental model

**Major**

A plan-wide tier (`event.sourcing`: butcher / Costco / grocery) *and* per-item store chips (`event.foodWhere`) coexist. "Costco bulk" tier vs a per-item "Costco" chip mean nearly the same thing to a host, and switching the tier silently "updates stores," which can override the reasoning behind a manual chip pick. No leader forces a host to reconcile a global strategy against per-line tags.

tier picker HostShellV2.jsx:6559–6603 · per-item chips :6924–6950

**Fix direction:** pick one primary axis; demote the other to an advanced/override. Medium effort, removes the conceptual collision.

---

## A · Per-item sheet — remaining friction

Feedback is genuinely strong here: every mutation passes a message that toasts, so there are no silent states. Friction is concentrated in discoverability and tap economy.

### Tag overload on dense rows

**Minor**

A single row can stack name + up to ~6 chips (skipped / owner / swapped / decision-open / essential / badge / day-of / diet-flags) over two sub-lines, plus a meta line and the basis line. An essential day-of item with a diet flag and an open decision is heavy.

HostShellV2.jsx:6735–6747 · *live-verify whether seed data actually co-occurs these*

### Ambiguous store-chip confirmation

**Polish**

For a store lacking sourced price data the toast still says "re-priced… when we have real numbers for it" — implying an action that didn't visibly happen. (Honest by design, but reads as ambiguous.)

HostShellV2.jsx:6939

---

## B · Acquisition workflow — remaining friction

The summary card and the copied list's *format* are well-built (store-grouped, quantities, day-of section, Maps + Instacart links, modeled total — rivals AnyList/Instacart). The friction is in delivery model and first-run.

### "Copy the shopping list" is one-way static text

**Major**

The list is dumped as copyable text. The host now maintains two lists — the app's live `foodGot` and the pasted Notes text — and checking off in Notes never syncs back. The draft also emits emojis (🛒 📍 ⭐), violating the standing no-emoji-in-product rule.

handler HostShellV2.jsx:6544–6553 · draft doItForMe.js:548–613 · emoji :566,579,594

**Leaders:** AnyList / Out of Milk keep one live, shareable, check-off-able list. At minimum, surface the Instacart / Maps order links as in-app tappable buttons rather than buried in copied text.

### First-run is thin before a real guest count

**Major**

When `hasRealCount` is false the whole hero count block is suppressed; the host sees only "Sized to a typical guess… set a real guest count and the dollars appear." Rows render but prices show "—." No "0 of N" motivator, no dollars — the screen reads as pending rather than "here's your starter list."

HostShellV2.jsx:6306–6309 · price fallback :6857

**Leaders:** Instacart / AnyList always show a usable list with sensible defaults immediately.

### No closure moment

**Minor**

Progress is honest and motivating ("0 of 18," per-group bars, done→green, timeline step auto-completes). But finishing the last item is only a color swap — no arrival beat.

HostShellV2.jsx:6289,6700 · auto-complete :2313–2320

---

## ↑ Ranked fix queue — impact ÷ effort

| # | Fix | Severity | Impact / Effort | Lands at |
| --- | --- | --- | --- | --- |
| 1 | ~~Ungate check-off — a tap marks bought, price optional / after-the-fact~~ **Fixed 2026-07-12** — shipped as option (a), firm-vs-estimated split preserves budget-truth | Done | shipped | 2069–2073 |
| 2 | "Mark all in this group / at this store" bulk action in shop-run mode | Blocker | huge / med | ~7014 |
| 3 | Promote qty / store / swap out of "tune" onto the row (or rename it) | Major | high / med | 6718–6884 |
| 4 | First-run: show "0 of N" + list with typical-guess quantities, clearly labeled | Major | high / low-med | 6306 |
| 5 | Make the copied list a live checklist — or surface order links as in-app buttons; drop emojis | Major | med / med | 6552 |
| 6 | Collapse global-tier vs per-item-store into one primary axis | Major | med / med | 6559 / 6924 |

---

## ✓ Already shipped this session

Committed and live-verified while auditing — recorded here as before→after so the queue above stays honest.

### Store-chip taps silently locked a fabricated price — fixed

**Fixed · f2a990e**

Tapping a store chip while the cost input was focused blurred it first, committing the pre-filled midpoint and locking a made-up price — so re-sourcing mid cost-entry silently set a fake "real" cost. This was the concrete failure behind the audit's "fragile focus model" flag. `onMouseDown` preventDefault on the per-item controls container keeps focus put; the store re-price now fires cleanly (verified: "your pick: Bakery," nothing locked).

### Sourcing-aware head-start pricing — added

**Fixed · 36d951e**

Value / Premium one-tap buttons lock a food line's cost off its own per-item sourcing pick; the manual field pre-fills the midpoint instead of a blank input — a store-aware head start, not a generic range.

### Portion goal + grocery relabel — added

**Fixed · 16a8ff3**

The basis line now scales the per-guest rate by headcount ("½ lb/guest × 17 guests"), and the size stepper shows "aim ~X" + a one-tap reset once a host drifts off the recommended baseline. The global grocery tier was relabeled "Grocery · one-stop" (naming its convenience trade in item-neutral terms) instead of the misleading "Pre-marinated (grocery)."

---

## ⚑ One ruling needed before fix #1

The check-off price-gate is the biggest friction *and* a deliberate cost-truth guarantee: you can't mark something bought without a real number, so the budget never drifts on fabricated "done" items.

**Which wins — frictionless store-run, or budget-truth?**

Options: (a) let a tap mark bought and prompt for the price *later* / optionally — keeps most truth, removes the aisle tax; (b) keep the gate only for budget-critical essentials, ungate the rest; (c) keep as-is. I recommend (a): a bought item with a pending price is a more honest state than a host who abandons the list mid-aisle.

**Resolved 2026-07-12 — option (a) shipped.** A tap marks bought and the price stays optional / after-the-fact; a firm-vs-estimated split (`event.foodReal`) tracks which lines carry a real number, so budget-truth is preserved without the mid-aisle tax and the spend readout reads "$X spent · ~$Y still estimated."

---

**Scope & honesty.** Both audits traced code, not a live run. Items marked *live-verify* (tag co-occurrence, shop-run store filter, auto-complete toast) rest on data/interaction behavior worth confirming in-browser before acting. Severity and impact/effort are the auditors' estimates, not measured. Line numbers are current as of commit 16a8ff3.
