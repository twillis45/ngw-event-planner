# UAT-1 session log: Tester [A / B]

> Copy this file to `docs/alpha/UAT_<YYYY-MM-DD>_TESTER_<A|B>.md` and fill it
> in. Write what happened, not what should have happened. Quotes are word for
> word. A blank cell means "not observed," so never fill one with a guess.

| | |
|---|---|
| Date and time | |
| Tester | A (first-time host) / B (coordinator or planner) |
| Qualifies? | Never seen the app: Y/N. Not founder, family, or business partner: Y/N |
| Consent / recording | yes / no · yes / no |
| Phone and browser | e.g. iPhone 13, Safari |
| URL used | `https://twillis45.github.io/ngw-event-planner/hostv2/` (not `?demo=1`) |
| Live build | from `RELEASE_SHA.txt` on the day |
| Facilitator | |
| Script | `UAT_KIT.md` §4 / `COORDINATOR_TEST_SCRIPT.md` verbatim |

## Tasks

"Completed unaided" is **N** if there was any assist, or if they stopped.

| # | Task | Completed unaided Y/N | Assists (verbatim) | Time | Where they hesitated | Quote |
|---|---|---|---|---|---|---|
| 1 | Start planning your event | | | | | |
| 2 | Date, place, head count, budget | | | | | |
| 3 | What is the top of the screen telling you to do? | | | | | *(their words)* |
| 4 | Add two guests, get the invite ready | | | | | |
| 5 | Reply yes as a guest; how many are coming? | | | | | *(the number they said, and the true number)* |
| 6 | Add someone you're hiring; send them what they need | | | | | |
| 7 | How does your money look? | | | | | *(what they said, and what the screen showed)* |
| 8 | Find a decision; mark a list item done | | | | | |
| 9 | Show the day hour by hour | | | | | |
| 10 | Reopen the link; find your work | | | | | |
| 11 | Where would you go for help? | | | | | |
| 12 | What would you pay for, and what does it get you? | | | | | |

## Debrief (verbatim)

1. What is this app for?
2. Most confusing moment:
3. What they use today instead:
4. Would use it for their real event? Why?
5. Anything else:

## Problems found

| ID | Task # | What happened (observed) | Severity | Why that severity |
|---|---|---|---|---|
| UAT-A-1 | | | | |

### Severity triage

These follow the repo's scale (`UX_09_UI_QA_SCORECARD.md`; P3 as the
recertification matrix uses it), with two UAT rules from §17 on top.

| Level | Use when | Examples from a session |
|---|---|---|
| **P0**: blocks shipping | Data dishonesty, a button that doesn't do what it says, the primary action invisible or unreachable, lost work, or no way forward without the facilitator | Their event is gone after task 10; "Send" sends nothing; can't sign in at all |
| **P1**: fix before next deploy | **Any misread of money or RSVP state** (§17 step 5, always P1 or higher). A core task needs an assist. They can't say what the screen wants them to do next. Layout broken on their phone | Says "$500 left" when the screen means $500 owed; counts a "Maybe" as coming |
| **P2**: next sprint | Finished unaided but hesitated over 30 seconds, took a wrong turn and recovered, or wording made them stop and reread | Tapped two wrong places before finding the guest list |
| **P3**: minor | Cosmetic or one-off, with no effect on the task | A label clipped; a spacing complaint |

Rules:
- Grade what you **saw**, not what they said they'd prefer. Opinions ("looks
  nice," "could be useful") go in the debrief, not here.
- If both testers fail the same way, raise it one level (P2 becomes P1).
- An assist on a core task (1, 2, 4, 5, 6, 7) is never lower than P1.

## Summary for the stage 9 board

> Fill this last. It must make sense to someone who reads nothing else.

| | |
|---|---|
| Tester | A / B · host or planner · phone |
| Core tasks (1, 2, 4, 5, 6, 7) completed unaided | __ of 6 |
| All tasks completed unaided | __ of 12 |
| Total assists | __ |
| Misread money or RSVP state | none / [describe] |
| New P0 / P1 / P2 / P3 | __ / __ / __ / __ |
| What they said the app is for (verbatim) | |
| What they said the top of the screen wanted (verbatim) | |
| Pass bar met for this tester? | **yes / no** |

**Pass bar (§17 step 5):** every core task done without an assist, **and** no
misread money or RSVP state. `UAT-1` passes only when **both** testers meet it.
One tester alone is not a pass.

**Rows to re-run (§17 step 6):** list the recertification §4 rows this session
touched.
