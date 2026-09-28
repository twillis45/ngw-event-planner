# The lodging rungs — what may fire a warning, and on whose evidence

**Board 2026-09-27. Seats confirmed by owner:** Monica Rogati; Don Norman; The
Next Maintainer (mandatory, build); "Grandmother" (mandatory, player); Bryan
Rafanelli (event-industry override); The Price-Index Methodologist (archetype,
no credential claimed); the Destination / Group-Money seat (from the roster's
existing wing, added 2026-07-26).

## The question changed before the board sat, because the premise was wrong

I proposed this board on the claim that **a destination host with no shortlist
budgets ZERO for lodging**, and recommended wiring rungs 1-3 into `_stayFloor`
on that basis.

Measured before convening - `totalEstimate.js:258`:

> "Reported here, applied nowhere - identical treatment to
> `requiredVendorFloor`, and for the identical reason: moving a host-facing
> dollar band is a product call with a basis this file lacks."

`lodgingFloor` **never enters the total**. It sets one boolean,
`belowLodgingFloor: highTotal < stayFloor`. The travel_led band is $200-600 a
head and already means to cover airfare, lodging and insurance.

So wiring the ladder moves NO money. It changes **when a warning fires**. The
seat added to catch exactly this - the Destination / Group-Money seat, whose
stated job was "whether lodging belongs in the host's budget at all" - is the
reason the premise was checked before seven seats ruled on it. Fifth
adjacent-mechanism error of the session.

## RULING — do NOT wire rung 3 into the budget flag. Give the ladder its reader on the LODGING surface.

Unanimous against firing `belowLodgingFloor` on rung 3. One dissent on what
replaces it, preserved below.

**The Destination / Group-Money seat, and this decided it:** in a great many
destination celebrations **the guests book and pay for their own rooms**. A
flag reading "the stay alone exceeds your whole budget" may be aimed at a
wallet that is not the host's. Rungs 1-2 are safe because the host shortlisted
or picked those rooms - that is an act of intent about money they expect to
spend. A regional asking band is not.

**The Price-Index Methodologist:** rung 3 is Inside Airbnb's **asking** band,
not a transaction price. Asking data systematically overstates realized prices
- vacancy, negotiated stays and discounts are invisible in it. Triggering a
hard warning from an overstating estimator is the wrong direction of error.
Same distinction that decided the ice question: an imputed or asked number may
be published, but not under a measured number's authority.

**Bryan Rafanelli (override):** group lodging is negotiated in blocks. A
regional whole-place asking band does not resemble what a destination party
actually pays, in either direction, and is a poor trigger for an alarm.

**"Grandmother":** she cannot tell a whole-place asking band from a federal
per-room reimbursement ceiling; both arrive as dollars. A warning that turns
out to be wrong does not just fail - it discredits every other number on the
screen.

**The Next Maintainer:** rung 4 is a cap PER ROOM and the flag compares against
a WHOLE-EVENT total. If it ever reaches that call site the comparison is
nonsense, and "we remembered not to" is not a guard. **It must be structurally
impossible, not merely avoided.**

**Monica Rogati:** if only rungs 1-2 feed the flag then the ladder still has no
reader, and the honest answer is that it was authored ahead of its consumer.
Its consumer is the LODGING SURFACE - where a host is already looking at rooms
and the units can be stated in context - not the budget flag.

### DISSENT, preserved

**Don Norman dissents on the consequence.** Silence is also a claim. A host
planning a destination party in a region their budget cannot cover gets no
signal at all under this ruling, and "we were not sure enough to say" is how a
system lets someone walk into a wall politely. He accepts the flag is the wrong
instrument; he does not accept that nothing replaces it, and would have the
lodging surface state the regional band plainly and early rather than only when
the host goes looking.

## Findings, ranked, tagged

| # | Finding | Tag | Check |
|---|---|---|---|
| 1 | Rung 4 (per-room cap) can reach a whole-event comparison; nothing prevents it | **(a) code** | a test that the budget call site cannot receive a per-room basis; red-proof by passing one |
| 2 | The ladder has no reader; its consumer is the lodging surface | **(a) code** | render rungs 3-4 with their units where the host reads rooms |
| 3 | Rung 3 is an asking band and must never say "measured" | **(a) code** | the rendered basis names Inside Airbnb asking data |
| 4 | Do guests pay their own rooms? Product model question | **(b) owner** | decides whether lodging belongs in a host total at all |
| 5 | Norman's dissent: what replaces the missing signal | **(b) owner** | early plain statement vs nothing |
| 6 | Would a host want a regional band before shortlisting? | **(c) players** | nobody at this table can award it |

**Not ruled:** deletion of the ladder. It survives this board because finding #2
gives it a reader — but if #2 is not built, Rogati's objection stands and the
module should go rather than sit as capability-shaped scenery.
