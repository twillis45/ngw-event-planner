# Board packet — where does cost data come from?

Date: September 24, 2026
Status: **OPEN. Owner decision required. The board can rank the options; it cannot pick one.**
Convened wing: **Engineering & Delivery** (`docs/claude-skills/REVIEW_BOARD_ROSTER.md`,
added this day), plus the standing **Next Maintainer** player seat.
Question as the owner put it: *"the machine is unblocked, and it's still hungry.
The next step isn't a config change — it's deciding where cost data comes from.
That's a decision, not a task."*
Relates to: priority #2 in `docs/artifact/the-unfed-engine.html`.

---

## Method note: this wing runs MEASURE-first, and the first measurement was wrong

The roster's visual wings open with screenshots. This wing opens with a
measurement taken by an instrument the reviewer did not write — and the first
pass here proves why the rule exists.

The census below was first run against `d.costProvenance || d.provenance` and
reported **51 of 51 decisions carrying no provenance at all**. That is a
dramatic, quotable, completely false finding. The field is `costFactorProvenance`.
The instrument was wrong; the corpus was fine. Corrected numbers follow, and the
error is recorded rather than deleted because the next person will reach for the
same two key names.

---

## What is actually there

### Decision-level `costFactors` — the multipliers under discussion

| measure | count |
|---|---|
| decisions carrying `costFactors` | **51** |
| individual multiplier values | **118** |
| carry a `costFactorProvenance` record | 50 |
| — `tier: 'researched'` | **16** |
| — `tier: 'synthesized'` | **34** |
| carry no provenance record at all | **1** — `PTA / Booster Fundraiser/concessions` |
| carry a `claim` (what the number asserts) | **50** |
| carry a `sufficientWhen` (what would promote it) | **50** |
| carry `sources[]` | **16** |
| carry `lastVerified` | **1** |

**The finding that should drive the decision: 50 of 51 already state both what
they claim and what evidence would settle it.** The corpus is not silent about
its own sourcing gap — it wrote down the acceptance test for every row before
anyone asked. This is not a research problem starting from zero; it is a
50-item worklist that already carries its own definition of done.

### The other money surface, for contrast — purchase-row `costProvenance`

| measure | count |
|---|---|
| purchase rows | **623** |
| `verificationStatus: 'cited'` **and** a `sufficientWhen` | **533** |
| `lastVerified` earlier than 2026-08-01 | **0** |
| no `costProvenance` at all | **83** |

The same repository, the same kind of number, at a completely different standard:
533 cited rows, every one dated, none stale past August. The decision multipliers
sit beside them at 16 sourced and **one** dated.

### And 10 of the 118 multipliers cannot move money at all

`src/lib/playbooks/_costAudit.test.js` (pre-existing, not written for this packet):

```
factors=118  works=106  NO-OP=12  WRONG-DIR=0
```

Zero point in the wrong direction — the authored signs are right. Of the twelve
no-ops, two are honest: `Crab Feast/where_buy` and `PTA/concessions` are ×1.0 and
are *supposed* to change nothing. The other **ten are authored and dead**:

| decision | values | why |
|---|---|---|
| `Get-Together/food_style`, `Get-Together/menu` | 4 | `affects` ids `p_protein`, `p_sides` unreachable — `foodApproach` collapsed them into `fa-*` |
| `Vow Renewal/food_style` | 1 | `affects` unreachable |
| `Repast/food_source` | 1 | `affects` unreachable |
| `Fish Fry/starch` | 2 | no-ops with reachable affects |
| `Low Country Boil/seasoning` | 2 | no-ops with reachable affects |

---

## The wing's positions

Each seat is tied to a number above. Brutal, not consensus.

**Monica Rogati** — *the AI hierarchy of needs.* The engine is not under-built,
it is under-fed, and that framing is right. But the hierarchy also says: do not
source a layer nothing consumes. **Ten of these multipliers cannot change a
total no matter what evidence you attach to them.** Researching those is paying
for data the machine will throw away. Fix reachability or retire them before any
sourcing budget is spent. *Position: the dead ten come first, and they are not a
research task at all.*

**James Bach / Michael Bolton** — *checking vs testing.* `sufficientWhen` on 50
of 51 rows is the strongest asset in this packet and it is being overlooked. Each
one is an acceptance criterion the corpus wrote for itself: "US catering data from
≥2 sources confirms…", "a second independent spirit price would complete
corroboration." **That is a test oracle, already authored, 50 times.** Any
sourcing programme that does not run against those sentences is inventing a new
bar instead of meeting the one the data already set. *Position: `sufficientWhen`
is the specification; nothing else needs writing.*

**Nicole Forsgren** — *batch size and lead time.* 50 rows is one batch, and this
repo's own record says a big batch goes stale before it lands. Note the asymmetry
that matters operationally: the purchase rows have **zero** entries older than
August, and the decision multipliers have **one dated entry in fifty-one**. The
purchase surface has a freshness *process*; the decision surface has none. A
sourcing push without a `lastVerified` discipline produces 50 rows that are all
stale together in six months. *Position: ship the freshness field before the
research, or repeat this conversation in Q2.*

**Tanya Janca** — *appsec.* The live-pricing option is the one with a security
surface, and it is the one being discussed as a config change. `REACT_APP_*` is a
browser build: any key that reaches cost data through the client bundle is a
published key. If cost data is to be fetched rather than authored, it is fetched
server-side and cached, and the client sees numbers, never a provider. *Position:
no objection to fetching; a standing veto on fetching from the browser.*

**Dave Farley** — *the deployment pipeline.* Whatever the source, the number must
arrive through the same path as the rest of the corpus and be gated by the same
checks. The repo already has `moneyProvenanceShape`, `researchPolicyCompliance`
and `backedByATableThatSaysOtherwise` reading these fields. A second intake route
that bypasses them is a second source of truth. *Position: one intake, existing
gates, no side door.*

**Martin Fowler** — *make the change easy, then make the easy change.* The
purchase surface (533 cited, all dated) is the worked example of exactly this
job, done once already in this codebase. Do not design a new sourcing programme;
copy the one that shipped. *Position: the precedent is in-repo — use it.*

**Michael Feathers** — *seams.* The 34 synthesized rows are not a defect, they are
characterized behaviour: each states a claim, so each is falsifiable. That is
better than an unlabelled number and better than no number. The question is not
"are they wrong" but "does the surface tell the host which kind it is reading."
*Position: check what the UI says about a synthesized multiplier before spending
anything on promoting it.*

**The Next Maintainer** (player seat) — Two key names for one idea:
`costProvenance` on purchases, `costFactorProvenance` on decisions. That cost this
packet its first measurement and will cost the next reader theirs. And with
`lastVerified` on 1 of 51, there is no way to answer "is this number old?" for
any decision multiplier in the corpus. *Position: the naming and the missing date
field are the two things a cold reader trips on first.*

**Standing caution applied** (roster, this wing): no seat above recommends a
refactor of the multiplier mechanism. The mechanism works — 106 of 118 move money
in the authored direction, none backwards.

---

## The decision the owner has to make

The board converges on sequence but splits on destination. Four options, ranked
by the wing as A > D > C > B — *but A, D and C are not exclusive, and B is a
different kind of commitment.*

| | option | what it costs | what it buys |
|---|---|---|---|
| **A** | **Run the 50 `sufficientWhen` sentences as a worklist.** Promote synthesized → researched by finding the evidence each row already names. | research time, 50 rows, no code | the corpus's own bar, met on its own terms |
| **D** | **Retire or repair the 10 dead multipliers first.** Six are an `affects`-reachability bug; four are not yet diagnosed. | small, code-side | stops spending research on numbers that cannot move a total |
| **C** | **Source nothing; say what they are.** Keep the synthesized multipliers, and make the surface state the tier. | UI work | honesty without a research programme |
| **B** | **Fetch cost data rather than author it** (the research pipeline behind `REACT_APP_API_BASE_URL`). | build + server-side key handling + a cache | freshness by construction — and a new failure mode when it is down |

**The board's recommended sequence: D, then A, with C as the honest interim while
A is in flight.** B is a strategy commitment, not a next step, and it does not
remove the need for A — a fetched price still needs a claim and a date, or it is
an unlabelled number with better latency.

**What the board cannot decide:** whether NGW is in the business of maintaining a
priced corpus (A) or of consuming a pricing feed (B). That is a product and cost
commitment, and it belongs to the owner.

---

## Reproducing every number in this packet

- Decision census: a temporary test over `ALL_PLAYBOOKS`, reading
  `d.costFactors` and `d.costFactorProvenance`. Not kept — if it is to be
  re-measured, it should be as a pinned guard, not a throwaway.
- Effectiveness: `npm run test:one -- "_costAudit"` (pre-existing report).
- Purchase contrast: the same temporary test over `pb.purchases[].costProvenance`.

**Open item this packet creates:** there is no standing guard on the decision-level
provenance census, so the 16/34/1 split can drift silently. The purchase surface
has `moneyProvenanceShape.test.js`; the decision surface has nothing equivalent.
