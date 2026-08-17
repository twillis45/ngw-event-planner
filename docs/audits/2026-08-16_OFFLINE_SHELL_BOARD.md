# Review Board — should hostv2 grow a service worker?

Date: August 16, 2026
Question: the board's #3 item is "offline shopping list". I built a service
worker for it. A PRIOR board already ruled against exactly that.

---

## The prior ruling, which I did not read first

`hostv2/index.html:14`, board 2026-07-28, shipped in the code I was editing:

> Deliberately NOT shipped, per the same ruling: no service worker (this deploy
> pipeline should not grow one)

I wrote `public/sw.js` and registered it without checking. That is the failure,
independent of what this board decides.

## The evidence FOR revisiting

1. **The gap is real and measured.** Warm online visit, then an offline reload:
   `net::ERR_INTERNET_DISCONNECTED`, blank page, zero service workers. The host's
   entire plan sits readable in localStorage and nothing can serve the shell that
   reads it.
2. **A later board ranked it #3** of the production-readiness list, above
   accessibility.
3. The aisle is exactly where the app is most needed and the signal is worst.

## The evidence AGAINST, which is stronger than I expected

4. **This pipeline has already shipped stale bundles.** A documented trap: a green
   Pages run shipping a stale hostv2, provable only by inspecting the chunk hash.
   Adding a caching layer on top of a pipeline with a KNOWN staleness fault makes
   a transient failure permanent.
5. **My implementation failed its own first drive.** Three of five tests red —
   the offline reload never mounted. A service worker that half-works is worse
   than none: it controls every request and takes the app down with it.
6. **The need is already partly met.** `draftShoppingList` produces a copyable,
   sendable, printable list, and print CSS exists. A host can put the list in
   their own messages before leaving the house — which also survives a dead
   battery, a browser update, and cleared site data.

---

## Design bench (first)

**Dieter Rams.** "You are proposing a permanent caching layer to solve a problem a
text message already solves. Less."

**Don Norman — error prevention.** "Weigh the failure modes, not the features. No
worker: the app fails in the aisle, the host is annoyed, and the next online load
is fine. Broken worker: the app fails everywhere, for everyone, until each person
clears site data — which no host will ever do. The second is unbounded."

**Karri Saarinen.** "Offline is table stakes in a tool people live in, and I would
normally push for it hard. But a hand-rolled worker on a Pages deploy with a known
staleness fault is not the way in. If this ships eventually it wants a build-time
precache manifest and a tested update path, not sixty hand-written lines."

## Event bench (second — override authority)

**Mindy Weiss.** "I plan around bad signal already; everyone in this business does.
I screenshot things. What I cannot plan around is the app being broken for a week
because something clever went wrong."

**"Grandmother" — usability override, and she declines to use it here.** "If it
does not work in the shop I would just have written a list on paper before I left.
That is not the app failing me. But if the app stopped working at home and I did
not know why, I would not open it again."

## Specialist seats

**The Engineering Realist — RULING SEAT.** "Uphold. Not because offline is
worthless — because the specific combination is bad: a hand-written worker, on a
pipeline with a documented stale-ship fault, that failed its first drive, to
serve a need with an existing partial answer. Any two of those would be
survivable. Four is not.

And note what the failing drive actually tells you. The tests were written before
the code was believed, and they said no. That is the process working. Shipping it
anyway because the idea is good is how the bad version gets in."

**The Liability & Trust Reviewer.** "An un-updatable app cannot be patched for a
security issue either. That is the part nobody thinks about until it matters."

---

## RULING

**The 2026-07-28 ruling STANDS. The service worker is not shipped.** Revert it.

Ordered:

1. **Delete `public/sw.js` and its registration.** Not parked, not flag-gated —
   dead code beside a live ruling is how a barred thing quietly returns.
2. **Meet the aisle need with what exists.** `draftShoppingList` already produces
   a take-it-with-you list. If #3 is to be closed, close it by making that path
   OBVIOUS at the moment a host is about to leave, which is cheap, reversible, and
   survives a dead battery.
3. **Keep the measurement.** The offline behavior is now a known, documented fact
   rather than an assumption. Record it; do not re-derive it in three months.
4. **If a worker is ever revisited**, it arrives with a build-time precache
   manifest, a tested update path, and a kill switch — as its own piece of work
   with its own review, not as a sub-task of a shopping-list item.

**Dissent:** Saarinen dissents on the long run — he holds that a tool people live
in should work offline eventually, and does not want this ruling read as "never".
It is "not like this, and not as a side quest".

**Process note, recorded against me:** the prior ruling was in a comment at the
top of the file I edited. I did not read it. The rule that would have caught this
is the repo's own: read the surrounding code before writing beside it — the same
rule that saved the double-applied price factor an hour earlier, applied
inconsistently.
