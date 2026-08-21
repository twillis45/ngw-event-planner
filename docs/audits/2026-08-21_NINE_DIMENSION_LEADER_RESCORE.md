# Nine-dimension re-score vs category leaders — 2026-08-21

Dimensions set by the host: workflow, design, modern UI/UX, micro motion,
animation, attention systems, ease of use, less friction, DIFM. Scored by a
dispatched auditor against the recorded competitive reads (Mobbin 07-29,
Blink 08-01, leaders baseline 07-13, spacing 08-07, CTA 08-04, landing
08-18) plus tonight's HEAD; two of its claims were then FALSIFIED by direct
code check and corrected below (marked ✎). Prior scored baseline: 07-13
audit closed at 63.8%.

## Score table (corrected)

| Dimension | Bar-setter | Us /10 | Top gap |
|---|---|---:|---|
| Workflow | Wanderlog (Partiful on creation) | 7 | Per-day programme schema (the keystone) |
| Design | Paperless Post / Vercel craft | 8 | Roster right-panel + toolbar + tighter rows (spacing read items 1–3) |
| Modern UI/UX | Linear | 7 | On-demand detail panel in the desktop dead third |
| Micro motion | Linear / Family | 7 ✎ | Distribute press/settle feedback further; substrate is leader-grade |
| Animation | Family / Partiful | 7 | Point existing illumination (spotlamp/glow-settle/rvsheen) at progress + settling rows; skeleton/shimmer still absent |
| Attention systems | Blink | 8 | Three-kinds-of-not-done state model (host owes / they owe / system broke) |
| Ease of use | Evite / Apple HIG | 8 | Run the stranger-proof onboarding test — the score is asserted, not observed |
| Less friction | Partiful | 7 | The comms outlet: 26 draft generators, zero sends |
| DIFM | Joy (breadth) — the set's bar is ours | 8 | Sending ✎ (adaptivity wire is BUILT — see corrections) |

**Overall: 67/90 (74%)** — up from 63.8% (07-13). Driven by: unified
decision surface, tonight's zero-P0/P1 Nielsen pass with same-day P2
fixes, decision engine 42/50, the escape-hatch architecture.

## ✎ Corrections to the auditor's report (checked at HEAD)

1. **"`@media (hover:hover)` guards still 0" is FALSE.** styles.css:3491
   carries a dedicated STICKY HOVER section — `@media (hover:none)` resets
   every decorative hover rule (the reset idiom, not the guard idiom; the
   auditor grepped only for the guard). Micro motion 6→7; its remaining
   dock is distribution of press/settle feedback, not a defect.
2. **"hostExperience/hostCapacity wired in the engine, dead in the shell"
   is STALE.** The settings sheet ("How you plan", HostShellV2.jsx:14685+)
   collects both into the profile, engine reads profile fallbacks
   (playbooks/index.js:3086-87, :3121-22). Neither inferred; unanswered
   stays neutral. DIFM's top gap moves to sending.
   Lesson (again): a scored claim sourced from a prior audit doc must be
   re-grepped at HEAD before it ranks a build queue — both "near-zero-cost
   fixes" the auditor ranked were already shipped.

## The build queue this re-score actually justifies

1. **Per-day programme schema** — the recorded keystone ("converts existing
   intelligence from working once to working across a span"); ceiling on
   Workflow, Animation-of-work, and the reunion market. Long-standing
   "heads the queue" item; still true.
2. **The comms outlet** — send with Blink's three not-dones designed in
   (`Not Sent` / `Pending` / `Send Failed`). The single largest write-off
   of built capability: we draft everything and send nothing. Unblocks
   Less friction, Attention, and DIFM together. (Comms freeze is an Event
   Boss redesign/audit-scoped decision — reopening comms for BUILD is a
   board question first.)
3. **The desktop detail panel** — the dead third at 1920, permitted by the
   standing ruling; also answers the spacing read's right-panel pattern
   (5/5 leaders).
4. **Stranger-proof onboarding test** — not a build, the observation that
   grounds Ease-of-use's 8 (also stage-9 precondition 3).

## Where we genuinely lead (the moat, per the recorded reads)

Blink — the closest positional competitor, funded, using our exact
"command center" phrase — "counts inventory, not readiness … it cannot
tell a host whether the event is ready. That is the moat." Stacked with
the three capabilities the 922-flow Mobbin sweep found nowhere else: the
26-generator draft engine ("we write the thing"), group arrival/transport
modeling, and defer-as-a-primitive at Linear's level. The category's
presentation leaders have no guidance; its guidance leader (Wanderlog)
has no readiness. Event Boss is the only product in the recorded evidence
that computes whether the event is ready, says why, proposes the fix, and
drafts the message — it just can't yet send the message or run twice
across a span. Those two absences are exactly build-queue items 1 and 2.
