# Review Board — what does a required, unbooked vendor block?

Date: August 17, 2026 (21:5x)
Dimension: **Prioritization** (7/10), capped by consequence coverage.
Sitting because the host asked for the open questions to be resolved, not parked.

---

## The measurement

827 raises across all 39 playbooks. Of four producing surfaces, **one** declares
consequence:

| surface | raises | declares |
|---|---|---|
| decisions | 250 | 58 unlocks, 54 gateHolder |
| risks | 432 | none — CORRECT, a standing worry gates nothing |
| vendor-coi | 78 | none |
| vendor-unbooked | 67 | none |

A wedding whose caterer is unbooked 280 days past its authored window raises, and
ranks like a napkin order, because it says nothing about what it holds up.

## What is authored, exactly

- Decisions declare `blocks: [...]` — nine in wedding.js alone. Targets are
  DECISION IDS: `venue`, `guestcount`, `catering_style`, `vendor_team`,
  `run_of_show`, `bar`, `rain_plan`, `setup`.
- Vendor categories declare `category`, `required`, `altToDIY`, `when`,
  `costRange`, `costUnit`. **No `blocks`, and no link to any decision id.**
- `grep vendorCategory|vendorFor|categoryFor|linkedVendor` across the corpus and
  the engine: **zero hits.** There is no authored mapping from `Caterer` to
  `catering_style`.

So "derive vendor consequence from the decision graph" requires inventing the
mapping. That is the move that produced the `blocks:['catering']` phantom this
morning and sent a board down a wrong path.

**The one fact that reframes it:** `vendor_team` is a blocks TARGET. The corpus
says decisions block VENDORS. It has never said vendors block anything.

---

## Design bench (first)

**Edward Tufte.** "You have looked for a number that is not there twice now. The
absence is the finding: nobody authored what a vendor blocks because in this
corpus vendors are the DOWNSTREAM. Decisions gate them."

**Karri Saarinen.** "Then the modelling error is trying to make a vendor a
gate-holder. `unlocks` answers 'settle this and N things open up'. A missing
caterer does not open anything — it removes the ability to hold the event as
planned. Those are different failures and the ranker has a shape for the second
one already."

**Don Norman.** "Ask what the host does. With no caterer at T-20 they are not
sequencing; they are scrambling. That is not a gate at the top of a list, it is a
stop."

**Julie Zhuo.** "And be careful that 'it is a blocker' does not become a licence
to promote every unbooked vendor. Optional ones are a choice, not a stop."

## Event bench (second — override authority)

**Bryan Rafanelli.** "A required vendor you have not booked past the window is
not one more late task. Photographer, caterer, venue — miss those and you are
having a different event. But 'required' has to mean the playbook said required,
not that the app decided."

**Mindy Weiss — OVERRIDES on scope.** "Do not invent a dependency map for
thirty-nine playbooks so a number can go up. The playbook already says which
vendors are required and by when — that is the whole fact you need. Use it and
stop."

**"Grandmother."** "If nobody is cooking, tell me that before you tell me
anything about napkins."

## Specialist seats

**The Engineering Realist — RULING SEAT.** "Everything needed is already
authored, and none of it is a dependency graph.

`vendor-unbooked` already gates on `required: true` and the category's own
`when: 'T-300d'`. It raises for the right reason at the right time. What it lacks
is a CLASSIFICATION: it emits `severity: 'attention'` like everything else.

So do not give it `unlocks`, which would be a lie — a caterer unlocks nothing.
Give it what it actually is: a required, authored commitment that has passed its
authored window and is not met. Declare `gateHolder: true` on that case and leave
`unlocks: 0`. `gateHolder` says 'the plan cannot proceed as written'; `unlocks`
counts downstream items. We have evidence for the first and none for the second,
so we assert exactly the first.

Bounded hard: `required: true` only, past the authored window only, and only when
the category is genuinely unmatched. An optional videographer never qualifies."

**The Liability & Trust Reviewer.** "And it must not outrank a genuine safety
raise or an overdue payment. Adding a gateHolder without unlocks slots it above
undeclared items and below scored ones — check that, do not assume it."

---

## RULING

1. **No dependency map is authored.** Do not invent one, and do not derive
   `Caterer -> catering_style`.
2. **A required vendor unbooked past its authored window declares
   `gateHolder: true`, `unlocks: 0`.** The plan cannot proceed as written; the
   count of what it frees is unknown and is not asserted.
3. **Bounded to `required: true`, past `when`, genuinely unmatched.** Optional
   categories never qualify.
4. **Verify the ordering rather than assume it** — safety and overdue payments
   still lead.
5. **Prioritization's ceiling above this is authoring**, and stays boarded.

**Bar for done:** an unbooked required caterer past T-300d carries
`gateHolder: true`; an optional videographer does not; a booked caterer does not;
and no existing ranking gate turns red.
