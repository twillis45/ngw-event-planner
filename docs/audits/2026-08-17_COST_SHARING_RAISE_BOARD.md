# Review Board — can cost sharing raise, and about what

Date: August 17, 2026 (11:1x)
Dimension: **Coverage** (7/10) — the gap that capped it.

---

## The gap, and a correction to how I stated it

`grep -c costSharing src/lib/surfaceRegistry.js` → **0**. Cost sharing has a
sheet, an engine and a section-directory row, and nothing that can raise.

I recorded that as "a host whose guests have not paid is told nothing." **That
was wrong, and wrong in the direction that matters.** Measured since:

- `costSharingSummary` returns `mode`, `reason`, `cadence`, `tiers[{label,
  amount, note}]`, and derived counts. **There is no headcount and no per-guest
  payment record anywhere in the model.** `costSharing.js:36` says so on purpose:
  *"with per-tier headcounts unknown, no pool total exists to add."*
- So a "your guests owe you $600" raise fails on **two** counts, not one. There
  is no deadline AND no ledger. It would have invented the debt, not just its
  timing.

**The chase raiser is unbuildable, and should stay unbuilt.** Not "blocked on a
threshold" — the fact it would assert does not exist in the data.

## What IS honestly raisable

The engine already distinguishes a host-owed, self-declared gap:

| state | the engine's own headline |
|---|---|
| pooled, no tiers | "Ongoing pool — contribution tiers not set yet." |
| pooled, tiers unpriced | "…amounts not set yet." |
| partially priced | `oneOfEachTotal` withheld — it "would silently understate" |

A host who declared a pool and never said what anyone contributes has an
unfinished setup. That claims nothing about any guest — it is the host's own
half-made decision, which is the honest thing to raise.

## But it still needs a WHEN, and the pool has no date

Same trap as before. What rescues it is that a **neighboring authored date
exists**: `vendor-payments` gates on `v.payDueDate` — host-entered, and it
refuses to interrupt on future dates. A pool funds real commitments. "You are
collecting dues and have not said what anyone owes — and Acme's balance is due
in 9 days" is grounded in an authored date and asserts nothing invented.

**No upcoming authored commitment → silence.** The raise cannot manufacture
urgency from the event date alone.

## Two live constraints found while measuring

1. **Cost sharing is DESTINATION-ONLY.** `HostShellV2.jsx:11007` — a local event
   renders "This is a local event — everyone covers their own costs." A raiser
   without `buildTravelPlan(event).relevant` would speak where the surface
   itself refuses to exist.
2. **`costshare` IS NOT A ROUTABLE KIND.** `routeResolver.js:27` lists the valid
   kinds and it is absent; `tab:'Travel'` resolves to **lodging**. A dues raise
   shipped today would land the host on "Where everyone stays." That is the
   exact silent mis-landing class the route audit fixed seven of.

---

## Design bench (first)

**Edward Tufte.** "You proposed to display a quantity you do not have. The
correction is not a smaller version of the same claim — it is a different claim
about a different subject. Say the setup is unfinished. That you can measure."

**Don Norman.** "The host declared a pool. That declaration created an
expectation the app then dropped. Reminding them of their own unfinished
sentence is service; telling them what their cousins owe is fiction."

**Karri Saarinen.** "And the route defect is the more dangerous of the two.
Landing on the wrong sheet costs more trust than saying nothing, because the
host concludes the app does not know where its own things are."

## Event bench (second — override authority)

**Bryan Rafanelli.** "If the deposit is due and the money is not gathered, that
is the whole problem. Tie it to the deposit. Do not tie it to nothing."

**Mindy Weiss — OVERRIDES on tone.** "Do not nag about money on a schedule of
the app's choosing. Once there is a real bill with a real date, tell me my pool
is not set up. Before that, leave it alone."

**"Grandmother."** "I would want to know before I have to ask anyone twice."

**The Trench Organizer.** "Half of what I chase is because I never told people
the number. Ask me for the number. Do not guess what they owe."

## Specialist seats

**The Engineering Realist — RULING SEAT.** "Three parts, in order, or it
mis-lands:

  a. **Make `costshare` routable** — `focusField:'costshare'` → `{kind:
     'costshare'}`, branching BEFORE the `tab:'Travel'` lodging catch, which
     otherwise swallows it.
  b. **Build the SETUP raise, not the chase raise.** Gate: not past · travel
     relevant · `pooled` · setup incomplete · an authored upcoming
     `payDueDate` exists. Any one missing → silence.
  c. **Red-proof all four refusals**, including the local-event one, which is
     the case most likely to regress."

**The Liability & Trust Reviewer.** "And the copy may never imply a guest is
late. The subject of the sentence is the host's setup."

---

## RULING

1. **The payment-chase raiser is REFUSED**, permanently and on the merits — the
   model has no payment ledger. Recorded so it is not re-proposed as a
   threshold problem.
2. **Build the setup-completeness raise**, gated on an authored upcoming vendor
   `payDueDate`. No commitment, no raise.
3. **Make `costshare` routable first.** Without it the raise mis-lands on
   lodging.
4. **Destination-only**, mirroring the surface's own guard.
5. **Copy names the host's setup, never a guest's debt.**

**Bar for done:** the raise fires on a destination event with a declared pool,
unpriced tiers and a real upcoming vendor balance; is SILENT on each of local /
self-pay / fully-priced / no-commitment; the route resolves to `costshare` and
not `lodging`; and every refusal is red-proofed.
