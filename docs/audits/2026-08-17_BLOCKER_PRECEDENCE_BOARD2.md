# Review Board — blocker precedence, second sitting (corrected facts)

Date: August 17, 2026 (09:5x)
Occasion: the first ruling (`b42ca0bd`) was unimplementable. Its central
instruction rested on a fact I supplied that turns out to be false. This sitting
starts from measured code.

---

## Everything the first board was told that was WRONG

1. **"Blocker precedence is positional."** No — it is a TIER.
   `_selectEventNextActionInner` selects it as Tier 0.6.
2. **"Source consequence from its declared `blocks: [...]`."** THE FIELD DOES NOT
   EXIST. `deriveDecisionBlockers` emits `{ type, urgency, daysToEvent,
   reasoning }` and nothing else. The instruction came from me quoting
   `CommandCenter.jsx:2685`, which asserts `blocks:['catering']` — a comment
   describing a field the code never sets. (Fourth such comment found in this
   codebase today.)

## What is actually true, measured

- **`topAction` is NOT authoritative.** On the e2e repast state, eventPlan's
  internal `topAction` is *"Set your budget."* while the correct head — what both
  `selectEventNextAction` and the shipping sort produce — is *"Resolve 'Who
  provides the food'."* **The sort CORRECTS the tier selection.** Any pin inverts
  that and breaks the Repast hero.
- **The blocker action carries zero consequence.** No `gateHolder`, no `unlocks`,
  no `priorityScore`. It leads only by being tier-selected and then not being
  outscored — and 52% of raises score 0, so nothing outscores it today.
- **The two changes are mutually exclusive as built:**

  | variant | engine | matrix |
  |---|---|---|
  | ladder stamp only | **4 red** (`criticalBlockerLeads` + 3) | green |
  | stamp + pin | green | **12 red** (repast) |

- **The lateness boost dominates.** Max boost 6 vs max consequence ~4 for a
  stamped domino. And decisions saturate to `overdue` (Coverage re-score: 9/9
  from T-120 on a wedding), so decision bundles carry the maximum boost
  permanently and crowd the top of the list.
- What the blocker DOES have is prose: `reasoning: 'Venue unlocks vendors,
  timeline, logistics'`. Three named dependents — in a sentence, not a field.

---

## Design bench (first)

**Edward Tufte.** "The sentence already lists three dependents. You are not
inventing a fact by writing it as data; you are stopping it from being trapped in
prose. But do not parse the sentence — author the field."

**Don Norman.** "The deeper defect is that a tier selection and a score are
fighting over one slot, and neither knows the other exists. Whatever you do,
after it there must be ONE answer to 'what leads', not two that usually agree."

**Karri Saarinen.** "The sort correcting the tier is not a bug you found — it is
the system's real behaviour, and it is more right than the tier. Ranking should
win. Then the blocker must EARN the top, not be handed it."

**Julie Zhuo.** "Every fix so far has been an attempt to make one number beat
another. Two reverts. Consider that the ranking is fine and the missing thing is
data — three producers declaring nothing is the whole problem."

## Event bench (second — override authority)

**Bryan Rafanelli.** "A venue blocks vendors, timeline, and logistics. That is
not a scoring opinion, it is how the work runs. Write it down."

**Mindy Weiss — OVERRIDES on scope.** "You have broken the top of my screen twice
tonight chasing this. If the choice is a clever ranking change or writing down
what a venue blocks, write down what a venue blocks. It is dull and it is right."

**"Grandmother."** "I would not notice any of this until the day the app told me
to plan a menu for a hall I had not booked."

## Specialist seats

**The Engineering Realist — RULING SEAT.** "Stop trying to reconcile two
mechanisms. Remove one.

The sort is the mechanism — it already produces the right head on every case we
have measured, including the one the tier gets wrong. So: **give the blocker real
consequence and let it compete.** Author `blocks: [...]` on the blocker where the
`reasoning` prose already names dependents, map it to `unlocks`, set
`gateHolder: true`, and change nothing else.

If it then wins on the fixtures `criticalBlockerLeads` covers, it wins for a
reason a reader can check, and no pin is needed. If it does NOT win, that is a
real finding about the lateness boost dominating, and it should be fixed there —
not papered over by a positional override."

**The Liability & Trust Reviewer.** "And fix the comment at CommandCenter:2685.
It has been asserting a field that does not exist, and it is what sent the first
board down the wrong path."

---

## RULING

1. **Author `blocks: [...]` on decision blockers**, where `reasoning` already
   names the dependents in prose. Data, not parsing. Venue → `['vendors',
   'timeline', 'logistics']`.
2. **Map it to consequence at the Tier 0.6 construction site**: `gateHolder:
   true`, `unlocks: blocks.length`. No new tier, no new band, no pin.
3. **NO PIN. Ever.** The sort correcting the tier is correct behaviour, proven on
   the Repast case. A pin inverts it and breaks the hero.
4. **Then the ladder stamp** — unchanged from the reverted attempt.
5. **If the blocker still loses**, do NOT tune constants. Report it: it would mean
   the lateness boost (max 6, and permanently saturated because decisions read
   overdue 9/9 from T-120) dominates every consequence signal, which is a
   Coverage defect surfacing in Ranking and wants fixing at the source.
6. **Correct `CommandCenter.jsx:2685`** in the same change.

**Bar for done:** `criticalBlockerLeads`, `hostEngineSelectionParity` AND
`decisionIdentity` (the matrix spec, mobile) all green, none modified. All three,
because each of the last two attempts passed one and broke another.
