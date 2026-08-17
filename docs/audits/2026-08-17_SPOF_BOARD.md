# Review Board — single points of failure: which class, and do we do all three?

Date: August 17, 2026 (13:0x)
Question put to the board: three candidate SPOF classes. Do all, or pick?

---

## The evidence, from today only

Every defect found in this session shared ONE shape: **a single unguarded hop
where an authored field silently becomes `undefined`.** None threw. None failed a
test. Each rendered as silence — which, in a product designed to stay quiet when
it has nothing to say, is indistinguishable from working correctly.

| defect | hop | what the host lost |
|---|---|---|
| raiseAll normalizer | explicit field list | 8 fields over 3 weeks; a decision scored 308.5 ranked as 0 |
| `because` vs `why` | 1 raiser of 19 | every money-deadline raise had no reason |
| no `dueInDays` | money-dates | a deadline 1 day out ranked like one 13 days out |
| `risk.ifDelayed` | 3 consecutive hops | 42 files of authored copy, zero reach |
| `costshare` unroutable | resolveRoute | a dues CTA would open "Where everyone stays" |

Five in one session, in one product area. That is not a run of bad luck; it is the
dominant failure mode of this architecture.

## The three candidate classes

- **A — silent field-drop seams.** Projections and normalizers between a producer
  and a renderer.
- **B — runtime/operational.** One localStorage key, one auth path, the sync
  queue, backend endpoints without fallback.
- **C — single-consumer chokepoints.** `eventPlan`, `raiseAll`, `actionReason`,
  `resolveRoute` — one function each, no second path.

---

## Design bench (first)

**Karri Saarinen.** "A and C are the same finding described at two zoom levels.
A chokepoint is only dangerous BECAUSE a field can die crossing it silently; if
the crossing were loud, the chokepoint would be a virtue — one place to fix, one
place to test. Do not run them as two projects."

**Edward Tufte.** "Five instances measured in one day. You do not need a survey
to know where to start; you need to stop counting and close the class."

**Don Norman.** "The reason this class is so expensive here is your own honesty
doctrine. A product that says nothing when it knows nothing cannot distinguish
'nothing to say' from 'the sentence fell on the floor'. Silence is your default
AND your failure mode, and that is a design consequence, not an accident."

**Julie Zhuo.** "Three censuses produce a document. One closed class produces a
product that stops losing sentences. You have shipped enough audits today."

## Event bench (second — override authority)

**Bryan Rafanelli.** "B is the only one that ruins a wedding. If the app loses my
event the morning of, nothing else on this list matters. But — has it ever?"
*(Measured: no data-loss defect was found today; the sync work landed and is
gated. B is a real class with no observed instance.)*
"Then it is insurance, not a fire. Put out the fire."

**Mindy Weiss — OVERRIDES on sequencing.** "Every example in that table is the
app failing to TELL me something it already knew. That is the product. A host
does not lose the app; a host loses trust when the screen is calm and the thing
was there all along. Fix the class that eats sentences. Do not do all three —
you will do three halves."

**"Grandmother."** "If it knew, it should have said."

**The Trench Organizer.** "The refund line is the one that would have cost me
money, and it was written and thrown away. That is the one."

## Specialist seats

**The Engineering Realist — RULING SEAT.** "Do NOT do all three, and the reason
is not effort — it is that a census is not a fix. Three surveys would produce a
ranked list you already have in the table above.

A and C are one class. Close it ONCE, structurally:
  a. **Census the seams** — every projection between a raise/action producer and
     a renderer. Cheap, mechanical, and it bounds the problem.
  b. **One gate that spans them**, in the shape that worked this morning: a
     synthetic field no consumer names. A gate that enumerates fields cannot
     catch the field nobody thought of — that is exactly how eight died at one
     site while each was individually pinned.
  c. **B is deferred, not dismissed**, and the distinction is on the record: it
     is the highest-severity class and the only one with ZERO observed instances
     today. Insurance after the fire."

**The Liability & Trust Reviewer.** "And whatever the census finds, do not fix
instances quietly one at a time. That is precisely the pattern that produced
'the fourth and last' comment above a site that went on to lose four more."

---

## RULING

1. **Do NOT do all three.** A and C are one class at two zoom levels; B is
   deferred with its reason recorded.
2. **Close the field-drop class structurally** — census the projections, then ONE
   gate spanning them, driven by a synthetic field no consumer names.
3. **No instance-by-instance fixes.** If the census finds live drops, they are
   evidence for the gate, and the gate is what ships.
4. **B is queued, not dropped.** It has the worst blast radius and no observed
   instance; revisit once the fire is out.

**Bar for done:** a projection that silently eats an authored field fails a test —
including a field invented after that test was written.
