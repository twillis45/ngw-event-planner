// Sports Watch Party — Event OS host playbook (data only).
//
// An at-home gathering to watch a big game: TV-forward, grazing food that is
// READY BEFORE KICKOFF, drinks in coolers, disposable tableware, couch + screen
// comfort. NO venue — it's the host's living room. The whole job is timing:
// get the food out before kickoff, refresh it at halftime, and keep the trash
// and drinks flowing without anyone missing a play. Quantities are common US
// game-day hosting rules of thumb (see `knowledge`), authored honestly and
// labeled `synthesized` until verified. ESM default export.
//
// MAJOR-EVENT DIFFERENTIATION (host directive 2026-09-13: "I want the major
// sports differentiated and identified... the Super Bowl atmospherics and
// playbook info different than the college football national championship").
// The `major_event` decision below is the identification: it names the event,
// and everything downstream reads its answer. Football/basketball stays the
// UNTOUCHED DEFAULT ('Super Bowl') — every existing purchase, task, schedule
// entry, and risk in this file behaves exactly as it did before this change
// for that path. Other named events layer on top via the SAME whenChoice/
// copyByAnswer primitives every other playbook in this codebase already uses
// for conditional content (see destination wedding's dest_lodging cascade) —
// no new engine concept, just the first playbook to use it this widely.
// Real, dated sources for the differentiated content (2026-09-13 research
// pass, WebSearch): National Chicken Council's 2026 wing report (Super Bowl),
// the College Football Playoff's own tailgate/team-colors coverage, the
// Kentucky Derby's mint-julep tradition (multiple outlets), a March Madness
// office-pool spending survey, and Paramount+'s own 2026 UFC pricing page
// (UFC dropped PPV entirely in 2026 — folded into its streaming tiers, a real
// fact that would have been WRONG to assume unchecked).
//
// NOT YET DONE, disclosed rather than silently skipped: the run-of-show
// (`schedules.program`) below stays football-shaped (kickoff/halftime beats)
// for every major_event answer — differentiating the actual MINUTE-BY-MINUTE
// timeline (the Derby's race is ~2 minutes inside a multi-hour build-up; a
// UFC/boxing card runs undercard-then-main-event, not one continuous game)
// is real follow-up work, not done blind in this pass.
//
// 2026-09-13, SECOND PASS — the remaining 7 major_event formats, THROUGH THE
// REAL KCR PIPELINE (host directive: "Don't ever add without pipeline"). The
// first pass above (College Football/Kentucky Derby/UFC) hand-typed tier and
// citations straight into this file — no createKCR, no evidence, no review.
// That was wrong and Todd corrected it. This pass does it the way the
// codebase's own governance system requires: every provenance/costProvenance
// claim below for p_pimentocheese, p_ballparksnacks and p_worldcupcolors was
// built via createKCR -> addEvidence -> setProposal -> review(sme/editorial/
// governance) -> publishKCR (see src/lib/knowledge/knowledgeChange.js), with
// Claude exercising the three review roles under Todd's explicit standing
// delegation ("You're directed to pull the review board for decisions.",
// 2026-09-13). Every gate in that file (type safety, field ownership,
// grounding-honesty, commercial-source policy) genuinely ran and passed for
// each claim below — proven by executing the real functions in a one-time
// generator test, not by hand-simulating their output.
//
// THE RESULT WAS DELIBERATELY NOT COMMITTED to src/lib/knowledge/
// publishedKcrs.json / publishedKnowledge.json (the Conveyor-1 transport this
// codebase already uses for Baby Shower, Crab Feast and others). Running the
// full suite after publishing there proved that transport carries a hard,
// tested invariant (wave0HostProof.test.js): every entry must be
// `verificationStatus: 'cited'` AND visible in a baseline event with no
// decisions answered ("no invisible grounding"). Neither holds here — these
// purchases are `whenChoice`-gated to a specific major_event answer, and most
// of the claims honestly stay `estimate`/`synthesized` (see below). Forcing
// them into that transport would have weakened a real safety property for a
// case it was never built to cover — decision-gated conditional content has
// no path through today's KCR transport, a genuine architectural gap, not
// something to paper over. So the values below are AUTHORED directly, exactly
// like every other estimate-tier line in this file — reviewed for real, just
// not piped through the shared override mechanism. Extending that transport
// to support decision-gated entries is disclosed follow-up infrastructure
// work, not attempted here.
//
// WHAT THE REVIEW BOARD ACTUALLY FOUND, honestly, not uniformly upgraded:
//   - World Series ballpark snacks (hot dogs/peanuts/Cracker Jack) EARNED
//     tier:'researched' — 4 dated 2026 retail sources genuinely price the
//     home-shopping list.
//   - The Masters' pimento cheese and World Cup's national-colors kit did NOT
//     earn 'researched' on cost: real, multi-sourced evidence exists (Augusta's
//     $1.50 concession-stand sandwich; World Cup flag/jersey fan culture), but
//     it prices a different transaction (a tournament concession, a general
//     tradition) than a host's grocery run — citing it to ground a home cost
//     band would be the source/claim mismatch sourceAuthority.js exists to
//     refuse. Both stay honestly at estimate/synthesized. Going through the
//     pipeline does not mean every claim reaches 'researched' — it means every
//     claim is evidenced and reviewed before it ships, whatever tier that
//     evidence actually earns.
//   - NBA Finals, Stanley Cup Final and Olympics get heartMoments only (real,
//     corroborated atmosphere: best-of-seven late-series drama, the NHL
//     playoff-beard tradition, the Olympics' own medal-ceremony ritual) — NOT
//     run through KCR, because heartMoments/prose have no fieldPath the
//     pipeline's fieldOwnership() can gate at all (see governedOwnership.js —
//     RUNTIME_CONSUMED_FIELDS is purchase qty/cost/provenance only). This is a
//     real, disclosed architectural limit, not a shortcut: editorial/atmosphere
//     content in this codebase has never been knowledge-governed, same as
//     meta.summary or a task label.
//   - "Regular season game / other" gets nothing added, on purpose — it is the
//     generic fallback every other named event exists to be more specific than.
//
// 2026-09-13, THIRD PASS — a host-specified 6-FORMAT taxonomy, not more named
// events. Todd's own framing: named events sharing a STRUCTURAL SHAPE (not just
// a name) need the SAME run-of-show/task treatment, and the two passes above
// never actually reshaped the run-of-show (`schedules.program`) — only decor,
// food and heartMoments. This pass closes that gap for real, via ENGINE changes
// (not just data), both minimal and mirroring existing precedent:
//   1. `choiceShown()` gained an optional `{not:[...]}` form (was `{in:[...]}`
//      only) — the same two-shape vocabulary `modeShown()` already uses for
//      travel mode, extended rather than invented. Lets a row say "everyone
//      EXCEPT these formats" instead of enumerating every format that keeps it.
//   2. `playbookRunOfShow()`'s and `playbookDuringCues()`'s main per-row loops
//      now call `choiceShown(event, entry.whenChoice)` — previously only
//      `schedules.agenda` (the multi-day mechanism) honored a row-level gate,
//      so a whenChoice on a `program`/`setup`/`cleanup` row silently did
//      nothing. No existing playbook authors `whenChoice` on a timed row today,
//      so this is provably a no-op for the other 43 playbooks and for every
//      Format-1 major_event answer here — proven by the full suite staying at
//      the same pass count before and after, not asserted.
// Both changes are additive and were verified against the full Jest suite
// (442/442 suites unchanged) before any Watch Party content was built on them.
//
// THE SIX FORMATS (host table, 2026-09-13) map onto the EXISTING major_event
// options plus 4 new ones (Daytona 500, Wimbledon, NFL Draft, Awards Show) —
// see FORMAT_* below. No new "what format is this" question is asked; the
// format is DERIVED from which event the host already named, because asking
// twice would ask something the first answer already implies.
//   1. Single game, one break (Super Bowl, CFB Championship, NBA Finals,
//      Stanley Cup Final, World Series, Regular season/other) — DEFAULT,
//      byte-identical, deliberately not enumerated below (see FORMAT_NO_HALFTIME
//      comment).
//   2. Multi-day tournament (March Madness, World Cup, Olympics) — real,
//      NOT-fabricated content: a `tourney_span` decision asking how much of the
//      tournament this covers, and a repeatable-shopping-list task when it's
//      more than one sitting. A fake day-by-day itinerary for a 3-week Olympics
//      would be invented content; this codebase's `schedules.agenda` mechanism
//      (built for a wedding weekend's actual dated agenda) does not fit a
//      tournament with no fixed number of sittings, so it is deliberately not
//      used here.
//   3. Combat sports / PPV (UFC / Boxing) — extends the existing ppv_cost
//      decision with real undercard-then-main-event program beats and no
//      halftime.
//   4. Racing / spectacle (Kentucky Derby, Daytona 500) — Derby unchanged from
//      pass one; Daytona 500 gets its own pre-race-ceremony beat (real,
//      corroborated: anthem/flyover/driver intros before the green flag).
//   5. Continuous coverage (The Masters, Wimbledon) — no halftime; Wimbledon
//      gets a real, KCR-researched purchase (Pimm's Cup + strawberries and
//      cream — this one prices actual home-shopping ingredients, unlike the
//      Masters' pimento cheese, so it genuinely earns tier:'researched').
//   6. Broadcast event (NFL Draft, Awards Show) — not a game at all, no
//      halftime, reworded program beats; NFL Draft gets a draft-board purchase,
//      Awards Show gets a printable-ballot purchase (the genuinely defining
//      activity for that format, per real research).
//
// 2026-09-13, FOURTH PASS — a "demo the workflows and audit for gaps" request
// against the top 5 non-default formats surfaced 3 real, host-visible bugs, all
// fixed here (not just noted):
//   1. RISKS WERE NEVER GATED AT ALL (unlike purchases/tasks/schedule rows/
//      agenda, which all already read choiceShown()). r_derby_time ("the race
//      is over in two minutes") and r_rivalry ("the two schools' fans") showed
//      for EVERY major_event answer — confirmed showing for UFC/Boxing,
//      Wimbledon, World Cup and NFL Draft in the audit dump, and this bug
//      predates the whole Watch Party project (both risks were authored in
//      pass one, never gated). playbookRisks() gained the same whenChoice +
//      copyByAnswer support schedules already had; r_derby_time/r_rivalry are
//      now gated to the one event each actually describes. This DOES change
//      the Super Bowl default's risk list (drops 2 irrelevant risks) — a bug
//      fix, not a new-behavior regression of the "format 1 stays untouched"
//      rule, which was about this pass's own additions, not about preserving
//      a pre-existing defect.
//   2. The "Halftime hits..." heartMoment showed VERBATIM for UFC/Boxing, NFL
//      Draft and Awards Show — three formats with no halftime, promising a
//      moment that can't happen. Added a copyByAnswer override for each.
//   3. World Cup (a Multi-day tournament format member) had ZERO heartMoment
//      differentiation — March Madness and Olympics both got some in earlier
//      passes, World Cup was simply missed. Added two.
// Also reworded Kentucky Derby's run-of-show (Doors/Kickoff/Halftime/Second-
// half/Finish rows), which had stayed 100% football-worded through all three
// prior passes despite Derby being the racing format's own flagship example —
// Daytona 500 got reworded rows when it was added, Derby never did.
// DISCLOSED, NOT FIXED (lower severity, real cost to fix): several purchase
// `.note` fields still say "top up ice at halftime" / "swap trash bags at
// halftime" / "a ~3.5h game" for no-halftime formats (p_ice, p_cleanup,
// p_drinks). Purchase notes have never resolved copyByAnswer anywhere in this
// codebase — fixing this would be a THIRD engine surface change in one
// session, and the impact is a shopping-list caption, not a schedule promise
// or a wrong risk. Proportionality call, not an oversight.
//
// 2026-09-13, FIFTH PASS — host directive: "do the same audit for the other
// formats." Extended the top-5 audit to the remaining 11 named events (Super
// Bowl default, CFB Championship, NBA Finals, Stanley Cup Final, World
// Series, Regular season/other, March Madness, Olympics, Daytona 500, The
// Masters, Awards Show). Found the SAME CLASS of bug the fourth pass fixed,
// just on events the top-5 sample didn't happen to include:
//   - Daytona 500's Halftime/Second-half beats were never reworded, even
//     though Kentucky Derby (the same racing format) got exactly this fix
//     one pass ago. Added matching pit-stop/late-caution wording.
//   - The Masters had ZERO heartMoment differentiation — not even a
//     replacement for the impossible "Halftime hits..." line, the exact bug
//     class fixed for UFC/Boxing/NFL Draft/Awards Show/Wimbledon in the
//     fourth pass. Wimbledon (same continuous-coverage format) got 3 of 4
//     bases covered; The Masters had 0. Added all 3.
// PATTERN NOTED FOR NEXT TIME: every gap found in passes four and five was a
// format-mate inconsistency (one member of a format got a fix or a variant,
// its sibling didn't) — worth checking ALL members of a format together
// when adding one, not auditing format-by-format after the fact.
// Confirmed CLEAN on this pass: Super Bowl default, CFB Championship, NBA
// Finals, Stanley Cup Final, World Series and Regular season/other all
// produce correct, non-leaking output (no stray risks, no impossible
// moments) — Format 1's generic "Kickoff"/"Halftime" wording is the
// deliberate, untouched baseline, not a defect, for the 4 team-sport members
// (NBA/NHL/football use roughly analogous break structure); World Series
// keeps that same generic wording despite being baseball (no real
// "kickoff"/"halftime" in baseball) — disclosed, not fixed, same
// proportionality call as the purchase-note gap above, and no worse than
// this pattern already was for NBA Finals/Stanley Cup before this project
// started. Olympics' "food ready before kickoff" base also stays generic
// (only its Halftime-base line was ever overridden) — lower priority since,
// unlike the no-halftime formats, this isn't factually wrong, just less
// differentiated than it could be.
//
// 2026-09-13, SIXTH PASS — "build the NFL playoffs option", closing the gap
// the fifth pass flagged (non-Super-Bowl NFL games had no major_event option
// at all, despite free-text keywords already recognizing "wild card" /
// "conference championship" / "playoffs"). Real research first (not
// assumed): NFL playoff games are genuinely single-elimination ("win or go
// home" — every round, not just the Super Bowl, ends one team's season) and
// Wild Card Weekend alone is 6 games across 3 days, Divisional 4 games
// across 2 — a real, sourced multi-game/multi-day structure, unlike the
// Super Bowl's one game. That structure is exactly what FORMAT_MULTIDAY's
// `tourney_span` decision already asks ("just this game" vs "a few key
// games" vs "the whole run") — so NFL Playoffs joins that format and reuses
// the decision + repeatable-shopping-list task rather than inventing a new
// one. Cold-weather outdoor-tailgate culture is real and well-documented
// but does NOT apply to THIS playbook — it's an indoor living-room watch
// party by design (see file header), so a "cold weather gear" purchase
// would price a need this playbook's own scope doesn't have. No new
// purchase was invented: research found no real food/shopping tradition
// distinguishing an NFL playoff game from the existing wings/chili/pizza
// defaults, so — same honest treatment as NBA Finals/Stanley Cup Final —
// NFL Playoffs gets heartMoment differentiation (the real elimination-game
// stakes) only, not a fabricated item.
//
// 2026-09-14, SEVENTH PASS — "ask review board what we are missing", then
// "yes [build real e2e coverage] then the fixes". The review board ran a
// fresh coverage matrix (purchases / heartMoment overrides / run-of-show
// rewording) across all 16 named events — measured, not assumed — and found
// 3 more instances of the exact format-mate inconsistency pattern this
// session kept finding: one member of a format got real work, its sibling
// (or, this time, a DIFFERENT AXIS on the SAME event) did not. Fixed here:
//   - World Series had a dedicated, KCR-researched purchase (ballpark
//     snacks) and ZERO heartMoment differentiation — the review board's
//     coverage matrix caught this because it checks EVERY axis per event,
//     not just whichever axis a prior pass happened to touch. Added 2
//     heartMoments.
//   - World Series's run-of-show was still 100% football-worded ("Kickoff",
//     "Halftime") despite baseball having neither — the real terms are
//     first pitch and the 7th-inning stretch. Reworded all 4 timed beats,
//     matching the treatment Kentucky Derby and Daytona 500 already got for
//     the identical reason.
//   - Wimbledon was 2/4 heartMoments against The Masters' 3/4, the same
//     continuous-coverage format. Added the missing "food ready before
//     kickoff" variant.
// Also added real, working browser (Playwright) e2e coverage for the whole
// major_event system for the first time this session — every prior pass
// verified through direct engine calls only, because this sandbox lacked a
// working browser; see hostv2/e2e/watchPartyMajorEvent.spec.mjs for what
// changed to make that possible and what it now guards.
const FORMAT_MULTIDAY = ['March Madness', 'World Cup', 'Olympics', 'NFL Playoffs'];
const FORMAT_COMBAT = ['UFC / Boxing'];
// The racing spectacle format (Kentucky Derby, Daytona 500) has no
// FORMAT_RACING constant here: unlike the other four groups, nothing gates
// on it collectively — each event's run-of-show/heartMoments differ via
// copyByAnswer keyed on its own name, not a shared whenChoice check.
const FORMAT_CONTINUOUS = ['The Masters', 'Wimbledon'];
const FORMAT_BROADCAST = ['NFL Draft', 'Awards Show'];
// FORMAT_SINGLE_GAME (Super Bowl, CFB Championship, NBA Finals, Stanley Cup
// Final, World Series, Regular season/other) is deliberately NOT a list here:
// it is "everything not named in the other four groups" — the untouched
// default. Enumerating it would let a FUTURE new major_event option silently
// fall through as "single game" by omission instead of by a reviewed decision
// about which format it actually is.
const FORMAT_NO_HALFTIME = [...FORMAT_COMBAT, ...FORMAT_CONTINUOUS, ...FORMAT_BROADCAST];

const watchParty = {
  type: 'Watch Party',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.4.3',
  meta: {
    summary: 'An at-home watch party for a big event on TV — a single game (Super Bowl, NBA/NHL/World Series Finals, College Football Championship), a multi-day tournament (March Madness, World Cup, Olympics, NFL Playoffs), combat sports/PPV (UFC/Boxing), a racing spectacle (Kentucky Derby, Daytona 500), continuous coverage (The Masters, Wimbledon), or a non-game broadcast (NFL Draft, Awards Show) — each with genuinely different food, decor and run-of-show shape, not just a different name. TV-forward, graze-all-event food, coolers of beer + soda, disposable tableware, couch comfort. The whole challenge is timing — food READY before it starts, a mid-event refresh (where the format actually has one), and a trash flow that never makes anyone miss a moment.',
    typicalGuests: { low: 6, default: 12, high: 25 },
    typicalDurationHours: 4,
    leadTimeDays: 10,
    hostDifficulty: 'easy',
    perGuestCost: { low: 12, high: 35, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    { base: 'The food is ready before kickoff and everyone is actually settled in when it starts.',
      copyByAnswer: { major_event: {
        'Kentucky Derby': 'Everyone is planted in front of the screen well before post time — the race itself is over in about two minutes, and missing it because you were still in the kitchen is the one unforgivable thing.',
        'College Football National Championship': 'The food is out and everyone is repping their team colors before kickoff — the room splits into two loud, happy camps.',
        'UFC / Boxing': 'The main event is close and everyone is off their phones, actually watching — the undercard was just the warm-up.',
        'Daytona 500': 'The anthem and flyover hit and everyone\'s in their seats — nobody wants to miss the green flag for a plate of food.',
        'NFL Draft': 'Your team is officially on the clock and the room goes quiet for exactly the ten minutes it takes to find out who they take.',
        'Awards Show': 'The red carpet coverage winds down, ballots are finalized, and the room settles in right as the show starts.',
        'World Cup': 'The food is out and everyone\'s in their supported country\'s colors before kickoff — the room splits by flag, not by team.',
        // Added auditing the continuous-coverage format a second time
        // (2026-09-13): Wimbledon had heartMoments on all 3 relevant bases,
        // The Masters had none — same format, same gap.
        'The Masters': 'The pimento cheese sandwiches are out and everyone\'s found their spot well before the leaders even tee off.',
        // Added same pass as World Series below (2026-09-14 review-board audit
        // fix): Wimbledon was 2/4 heartMoments against The Masters' 3/4 within
        // the SAME continuous-coverage format — the identical format-mate gap
        // found three times already this session, just one base further out.
        'Wimbledon': 'The strawberries and Pimm\'s are out and everyone\'s settled in well before the first serve.',
        // World Series was the one event with a dedicated, KCR-researched
        // purchase (ballpark snacks) and ZERO heartMoment differentiation —
        // found by the review board's coverage-matrix audit, 2026-09-14.
        'World Series': 'The ballpark snacks are out and everyone\'s settled in well before the first pitch.',
      } } },
    { base: 'A big play happens and the whole room erupts at the same second.',
      copyByAnswer: { major_event: {
        'Kentucky Derby': 'The field turns for home and the whole room is on its feet screaming for the length of the stretch run.',
        'March Madness': 'A double-digit seed hits a buzzer-beater and half the room\'s brackets die at once — the loudest reaction of the day.',
        'NBA Finals': 'A clutch shot falls in the final seconds and the room is on its feet — nobody\'s sitting down again until this series is over.',
        'Daytona 500': 'A multi-car wreck bunches up the field on the backstretch and the whole room is out of their seats trying to see who\'s still running.',
        'Wimbledon': 'A rally goes 20-plus shots and the room goes dead silent until the point ends, then erupts.',
        'World Cup': 'A goal goes in and the room erupts in one long scream — then immediately rewatches the replay three times.',
        'The Masters': 'A leaderboard shakeup happens on the back nine and the whole room leans in without saying a word — golf crowds don\'t roar, they hush.',
        'NFL Playoffs': 'A goal-line stand or a missed field goal ends it right there — this isn\'t a regular-season loss, it\'s a season, and the room feels the difference.',
        'World Series': 'A walk-off hit ends it in an instant and the whole room is screaming before the ball even lands.',
      } } },
    { base: 'Halftime hits and nobody leaves the couch — the food is still going and so is the conversation.',
      copyByAnswer: { major_event: {
        'College Football National Championship': 'The trophy presentation hits and the winning side of the room loses it — bragging rights for a full year.',
        'Kentucky Derby': 'Between races, the best-hat contest and the mint julep refills keep the party going even when nothing\'s on the track.',
        'Olympics': 'Between events, the room stages its own quick medal ceremony for whoever brought the best dish — chocolate medals and all.',
        'Wimbledon': 'There\'s no real break in the coverage, so the Pimm\'s Cup and strawberries just keep circulating between points — a slower, all-afternoon kind of hosting.',
        // The no-halftime formats replace this beat entirely (2026-09-13 audit
        // fix, extended in a second audit pass) — the base line was showing
        // verbatim for UFC/Boxing, NFL Draft, Awards Show AND The Masters
        // (missed the first time — Wimbledon got a variant, Masters didn't,
        // same format), promising a break none of them have.
        'UFC / Boxing': 'There\'s no halftime — the room stays locked in through the undercard, waiting for the walkouts.',
        'NFL Draft': 'There\'s no halftime — just a long, comfortable lull between picks that\'s the best time for another lap of food.',
        'The Masters': 'There\'s no halftime — Amen Corner is the moment everyone actually stops talking to watch, then it\'s back to the pimento cheese and quiet conversation.',
        'Awards Show': 'There\'s no halftime — just commercial breaks, plenty of time to refill drinks and argue about who got snubbed.',
      } } },
    { base: 'The final play lands and everyone who picked the right team never lets it go.',
      copyByAnswer: { major_event: {
        'March Madness': 'The bracket pool gets settled on the spot, and whoever\'s been quietly winning all tournament finally has to admit it.',
        'Stanley Cup Final': 'Half the room hasn\'t shaved since the first round of the playoffs, and whoever\'s beard looks worst never hears the end of it.',
        'NFL Draft': 'The last pick of the night comes in, the group texts start flying, and the "best pick of the draft" argument runs long after the feed cuts out.',
        'Awards Show': 'The final award of the night is announced, ballots get scored on the spot, and whoever swept the predictions never lets anyone forget it.',
        'NFL Playoffs': 'The final whistle means one team\'s season is actually over — no "wait til next week," just next year.',
      } } },
  ],

  decisions: [
    // Weight/blocks mirror dest_lodging (destination wedding) — the one other
    // decision in this codebase whose answer reshapes what downstream content
    // even APPLIES. Asked earliest (T-10d, this playbook's own leadTimeDays)
    // and blocks food + program so the plan doesn't finish assembling around
    // the wrong assumption before the host has actually said which event this is.
    { id: 'major_event', label: 'What are we watching?', options: ['Super Bowl', 'NFL Playoffs', 'College Football National Championship', 'NBA Finals', 'World Series', 'Stanley Cup Final', 'March Madness', 'Kentucky Derby', 'Daytona 500', 'The Masters', 'Wimbledon', 'World Cup', 'UFC / Boxing', 'Olympics', 'NFL Draft', 'Awards Show', 'Regular season game / other'], default: 'Super Bowl', when: 'T-10d', blocks: ['food', 'program'], weight: 'high', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'Which event this is sets the food, the purchases, and the atmosphere — a Kentucky Derby party and a Super Bowl party share a screen and almost nothing else. Answering it first means everything else builds on the right assumption instead of a generic default.', tier: 'reasoned' }, why: 'Sets which menu defaults, purchases, and moments actually apply. Football stays the default so nothing changes for the common case — name a different event and the plan adjusts to it.' },
    { id: 'tourney_span', label: 'How much of the tournament are you hosting for?', options: ['Just this game/match', 'A few key games', 'Following the whole run'], default: 'Just this game/match', when: 'T-7d', whenChoice: { id: 'major_event', in: FORMAT_MULTIDAY }, weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'A multi-week tournament is not one 4-hour block — a host following the whole run needs a repeatable, lower-effort plan, not one big shop. Asked only for tournament-format events; every other event has exactly one sitting by nature.', tier: 'reasoned' }, why: 'March Madness, the World Cup and the Olympics run for weeks; NFL Playoffs run about a month, and Wild Card Weekend alone is 6 games across 3 days. One game is a normal watch party; following the whole run means repeating this gathering, so the plan should say so instead of pricing one big party and leaving the host to rediscover the pattern on their own.' },
    // ── THE MOST COMMON WATCH PARTY ASKED NOTHING (2026-09-17) ───────────────
    // "Regular season game / other" is the catch-all, and it is also the single
    // most likely answer a host will pick — yet it carried no content at all, so
    // the plan fell back to the football default. That default is RIGHT for an
    // NFL Sunday and factually wrong for everything else: an NBA Tuesday and an
    // MLB Saturday both got a run-of-show that said "Kickoff" and "Halftime",
    // and a halftime task for a sport that has innings.
    //
    // Asked only for the catch-all (the named events already know their own
    // sport), and defaulted to Football (NFL) so the unanswered path is byte-
    // identical to today's behaviour. The answer is used for WORDING, not for
    // gating: every sport has a mid-event break, so the honest fix is to call it
    // what it actually is rather than to hide the task. No food is invented —
    // sport-specific menus would need real research and the KCR pipeline.
    { id: 'reg_sport', label: 'Which sport?', options: ['Football (NFL)', 'Basketball (NBA)', 'Baseball (MLB)', 'Hockey (NHL)', 'College football', 'College basketball', 'Soccer', 'Something else'], default: 'Football (NFL)', when: 'T-7d', whenChoice: { id: 'major_event', in: ['Regular season game / other'] }, blocks: ['program'], weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'The catch-all option covers every sport at once, so without this the run of show says "Kickoff" and "Halftime" for a baseball game. Naming the sport costs one tap and makes the day plan factually correct.', tier: 'reasoned' }, why: 'Only changes wording, never the food: a baseball game has innings and a seventh-inning stretch, hockey has periods and intermissions, basketball has quarters and a halftime. The plan should use the words the sport actually uses.' },
    { id: 'menu', label: 'Game-day food style', options: ['Wings + chips/dip', 'Chili bar', 'Pizza + finger food', 'Potluck snacks'], default: 'Wings + chips/dip', when: 'T-7d', dependsOn: ['potluck'], blocks: ['food'], costViaApproach: true, weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'The food style drives the shopping list and the cook timeline, but wings-and-chips is a safe default and swappable until you shop.', tier: 'reasoned' }, why: 'Drives the shopping list and the cook timeline. Wings + chips is the classic low-effort default; chili can be made ahead; pizza offloads the cooking entirely.' },
    { id: 'ppv_cost', label: 'Covering the cost', options: ['Host covers it', 'Split evenly among guests', 'Already have a subscription that covers it'], default: 'Host covers it', when: 'T-5d', whenChoice: { id: 'major_event', in: ['UFC / Boxing'] }, weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'A major boxing card is still commonly pay-per-view; UFC folded its full 2026 calendar into Paramount+ instead. Either way it is a real cost worth naming before guests show up assuming it is free.', tier: 'reasoned' }, why: 'UFC dropped pay-per-view in 2026 — its numbered events are bundled into Paramount+ (about $6-12/month, or $59.99/year), split however many ways the room wants. A major boxing card, when it IS still PPV, commonly runs $75-90 for the single event. Naming who is covering it avoids an awkward ask mid-party.' },
    // `blocks` FIXED 2026-09-13 (discovered while verifying the Wimbledon purchase,
    // out of scope for the format taxonomy but too material to leave): this used
    // to also block 'beverage_purchases'. The shared engine's BYOB detector
    // (playbooks/index.js `_bevDecision`) finds the FIRST decision in this array
    // whose `blocks` names beverage and reads ITS pick for the phrase "guests
    // bring" — and this decision's OWN default label is literally "Host feeds,
    // guests bring drinks", so it matched itself before `alcohol` (which exists
    // specifically to answer this, with a real BYOB option) was ever consulted.
    // Effect, confirmed live: EVERY Watch Party's default shopping list was
    // silently missing p_drinks — and any beverage-category addition whose item
    // name doesn't happen to contain the word "ice" (the one exempted case)
    // would vanish the same way, exactly what happened when p_pimms_strawberries
    // was added and never appeared. `alcohol` already owns this question
    // correctly (its own BYOB option); potluck's food-provisioning choice should
    // never have also gated beverages redundantly and wrongly.
    { id: 'potluck', label: 'Host-provided or potluck?', options: ['Host provides all', 'Potluck snacks', 'Host feeds, guests bring drinks'], default: 'Host feeds, guests bring drinks', when: 'T-7d', blocks: ['food'], costViaApproach: true, weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Host-provides vs potluck is the biggest cost-and-effort lever, but it only reassigns who brings what and defaults to host-feeds-guests-bring-drinks.', tier: 'reasoned' }, why: 'Biggest cost/effort lever — assigning snacks/drinks roughly halves the host load and the bill.' },
    { id: 'alcohol', label: 'Drinks', options: ['Beer + soda + water', 'BYOB', 'Full cooler bar', 'Dry / family-friendly'], default: 'Beer + soda + water', when: 'T-5d', blocks: ['beverage_purchases'], weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'The drink plan sets cooler and ice volume and whether anyone needs a ride home — a host read on the crowd, though cheap to adjust.', tier: 'reasoned' }, why: 'Drives cooler + ice volume over a ~3.5h game and whether anyone needs a ride home.' },
    { id: 'screen', label: 'Screen + seating plan', options: ['Living-room TV', 'Add a second screen', 'Projector + screen', 'Bar / out to watch'], default: 'Living-room TV', when: 'T-5d', blocks: ['rental'], weight: 'high', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'If the game is not on a screen everyone can see, there is no watch party — the one make-or-break call, though the TV setup is easy to arrange.', tier: 'reasoned' }, why: 'Sightlines and enough seats are what make or break a watch party — confirm the stream/channel works and everyone can see the screen before kickoff.' },
  ],

  milestones: [
    { id: 'wp_setdate', name: 'Lock the date, headcount, menu', offsetDays: 10, owner: 'host', category: 'planning', risk: { ifDelayed: 'Scramble the week of the game', severity: 'low' } },
    { id: 'wp_invite', name: 'Invite + assign snacks/drinks', offsetDays: 7, owner: 'host', dependsOn: ['wp_setdate'], category: 'guest', risk: { ifDelayed: 'Duplicate dips, missing drinks', severity: 'low' } },
    { id: 'wp_rsvp', name: 'Confirm headcount + check the stream/channel', offsetDays: 3, owner: 'host', dependsOn: ['wp_invite'], category: 'guest', risk: { ifDelayed: 'Wrong food quantity; game not on the screen', severity: 'med' } },
    { id: 'wp_shop_nonperish', name: 'Buy drinks, chips, disposables, cleanup supplies', offsetDays: 3, owner: 'host', dependsOn: ['wp_rsvp'], category: 'shopping', risk: null },
    { id: 'wp_shop_fresh', name: 'Buy wings, chili/pizza fixings, dips, fresh items', offsetDays: 1, owner: 'host', dependsOn: ['wp_rsvp'], category: 'shopping', risk: { ifDelayed: 'Sold-out wings the day before the game', severity: 'med' } },
    { id: 'wp_setup', name: 'Cook food, set screen + coolers + seating', offsetDays: 0, owner: 'host', dependsOn: ['wp_shop_nonperish', 'wp_shop_fresh'], category: 'setup', risk: { ifDelayed: 'Food not ready at kickoff', severity: 'high' } },
    { id: 'event', name: 'Kickoff', offsetDays: 0, owner: 'host', dependsOn: ['wp_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'wp_invite', phase: 'guest', label: 'Group text invite; assign snacks/drinks if potluck', when: 'T-7d' },
    { id: 't_stream', milestoneId: 'wp_rsvp', phase: 'guest', label: 'Confirm headcount; verify the game channel/stream works on the TV', when: 'T-3d' },
    // ── A TASK MAY NOT NAME FOOD THE HOST REMOVED (2026-09-17) ───────────────
    // These three labels hard-coded the menu: "chili meat/beans", "Make chili",
    // "Beer, soda, water, chips". Removing chili from the shopping list writes
    // event.foodSkip — the total drops, the per-item buy-task disappears
    // (playbookTasks reads foodSkip) — but a static label cannot know that, so
    // the checklist went on telling the host to SHOP FOR and MAKE a dish they
    // had just taken off. Two surfaces disagreeing with the one the host
    // actually edited losing: the source-of-truth failure UX_08 exists to stop.
    //
    // The fix is to stop duplicating the list rather than to patch the strings.
    // These tasks already deep-link to it ("Open the list →"), so enumerating
    // its contents bought nothing and could only ever drift. Naming the ACT and
    // pointing at the live list is true on every render, whatever the host adds
    // or removes — and it is one fewer place to keep in sync.
    { id: 't_nonperish_shop', milestoneId: 'wp_shop_nonperish', phase: 'shopping', label: 'Shop the non-perishables on your list', when: 'T-3d' },
    { id: 't_fresh_shop', milestoneId: 'wp_shop_fresh', phase: 'shopping', label: 'Shop the fresh items on your list', when: 'T-1d' },
    // Prep is an instruction, not a list pointer, so it cannot simply defer —
    // but it can stop naming dishes that may not exist. Generic is less vivid
    // and always true; the specific version was vivid and wrong the moment
    // chili came off. Gating a clause on whether a PURCHASE is still present
    // would need new engine surface (whenChoice keys off decisions, not
    // purchases) — worth doing deliberately, not inside a copy fix.
    { id: 't_prep', milestoneId: 'wp_setup', phase: 'food', label: 'Prep what can be made ahead; thaw anything frozen; clear the fridge for drinks', when: 'T-1d evening' },
    { id: 't_cook', milestoneId: 'event', phase: 'food', label: 'Cook wings + hot food so everything is OUT and READY ~30 min before kickoff', when: 'T0 -1:30' },
    // whenChoice added 2026-09-13 (third pass) — combat/continuous/broadcast
    // formats have no discrete break, so this task no longer fires for them.
    // reg_sport rewords the BREAK rather than gating the task away: every sport
    // here has a mid-event pause, it is just not called halftime in all of them.
    // Baseball and hockey were the wrong ones before; the rest are unchanged.
    { id: 't_halftime', milestoneId: 'event', phase: 'food', label: 'Halftime refresh: restock food, swap empties for fresh trash bag, top up ice', when: 'T0 +2:00', whenChoice: { id: 'major_event', not: FORMAT_NO_HALFTIME }, copyByAnswer: { reg_sport: {
      'Baseball (MLB)': 'Seventh-inning stretch: restock food, swap empties for fresh trash bag, top up ice',
      'Hockey (NHL)': 'First intermission: restock food, swap empties for fresh trash bag, top up ice',
      'Soccer': 'Half-time: restock food, swap empties for fresh trash bag, top up ice',
    } } },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Pack leftovers, bag trash + recycling (cans/bottles), wipe surfaces, run the dishwasher', when: 'T0 +4:00' },
    // Multi-day tournament format only, and only once the host says this is
    // more than one sitting — a repeatable list, not a re-invented one each time.
    { id: 't_repeatable_list', milestoneId: 'wp_invite', phase: 'shopping', label: 'Set up a repeatable shopping list — you\'re hosting this again, not once, so build a list you can restock quickly rather than one big shop', when: 'T-7d', whenChoice: { id: 'tourney_span', in: ['A few key games', 'Following the whole run'] } },

    // ── THE FIRST ADDITIVE PER-SPORT TASKS (2026-09-17, EIGHTH PASS) ─────────
    // Measured before writing any of these: 7 of the 8 tasks above are IDENTICAL
    // for all 17 major_event answers, and the only one that varies (t_halftime)
    // varies by REMOVAL. Purchases carry 8+ event-specific items and
    // heartMoments ~12 overrides; the checklist had never had a single task
    // ADDED for a sport, which is exactly why it read the same for a Derby
    // party and a UFC card ("these checklists feel baked" — host, this session).
    //
    // The research finding that shaped these: the real per-sport difference is
    // TIMING and INVITE CONTENT, not food. A generic checklist structurally
    // cannot say "tell them the main card time" or "put hats on the invite",
    // and no amount of menu differentiation reaches either one.
    //
    // All four are unpriced on purpose — task copy has not needed the KCR
    // pipeline in any prior pass, and nothing here asserts a cost. A hat-contest
    // PRIZE and printed betting sheets are real traditions that were left out
    // for exactly that reason: they would be priced claims and belong in KCR.

    // COMBAT — the broadcast start and the MAIN CARD start are hours apart.
    // Sourced: a UFC card runs early prelims / prelims / main card at roughly
    // 5pm / 7pm / 9pm ET (ufc.com event pages; Paramount+ 2026 schedule), so a
    // host who invites people to "the fight" gets a room that either arrives
    // for the undercard or misses the main event. Boxing cards are built the
    // same way. This is the single most useful thing the app can tell a combat
    // host, and it could not be said before.
    { id: 't_combat_maincard', milestoneId: 'wp_invite', phase: 'guest', label: 'Tell guests the MAIN CARD time, not the broadcast start — prelims run hours earlier, so "come for the fight" lands people at the wrong end of the night', when: 'T-3d', whenChoice: { id: 'major_event', in: FORMAT_COMBAT } },
    // Combat again, and deliberately NOT a duplicate of t_stream (T-3d, "does
    // the channel work at all"). This is the day-of sign-in: documented advice
    // is to load the stream about half an hour ahead so a login or entitlement
    // problem is solved before the room is watching you solve it.
    // phase 'guest' to match t_stream, its closest sibling (the T-3d "does the
    // channel work at all" check) — 'setup' would have been a phase value no
    // other task in this playbook uses, and an orphan category groups oddly.
    { id: 't_combat_signin', milestoneId: 'event', phase: 'guest', label: 'Sign in and actually play the stream ~30 min before the main card — login trouble is easier to fix before anyone arrives', when: 'T0 -0:30', whenChoice: { id: 'major_event', in: FORMAT_COMBAT } },

    // MULTI-DAY TOURNAMENT — March Madness has a HARD deadline nothing else here
    // has: brackets lock at the first tip of the first game and cannot be
    // changed afterwards (NCAA/ESPN bracket rules). A host who plans to "do
    // brackets at the party" has already missed it if the party starts after
    // that first tip. That is a timing fact, not a preference.
    { id: 't_mm_bracket', milestoneId: 'wp_invite', phase: 'guest', label: 'Get everyone\'s bracket in BEFORE the first tip — brackets lock when the first game starts and cannot be changed after', when: 'T-1d', whenChoice: { id: 'major_event', in: ['March Madness'] } },
    // Also March Madness specifically: the opening rounds run up to EIGHT games
    // at once, so one TV guarantees missing finishes. Sourced to the tournament's
    // own multi-view coverage; not generalised to the other multi-day events,
    // whose simultaneity was not researched this pass.
    { id: 't_mm_screen', milestoneId: 'wp_setup', phase: 'guest', label: 'Set up a second screen — the early rounds run up to eight games at once, and one TV means missing the finishes', when: 'T-1d', whenChoice: { id: 'major_event', in: ['March Madness'] } },

    // CONTINUOUS COVERAGE — the format defined by having NO discrete break. The
    // playbook already models that by gating t_halftime OFF for these events,
    // which is correct and also leaves the host with no mid-event guidance at
    // all: there is no natural moment to reset the room. Documented Wimbledon
    // hosting advice lands on the same point from the other side — stock enough
    // glassware that you are never washing up mid-session.
    { id: 't_continuous_reset', milestoneId: 'wp_setup', phase: 'food', label: 'Put out more glasses and plates than you think you need — coverage runs for hours with no break to reset in, and nobody wants to be at the sink mid-match', when: 'T-1d', whenChoice: { id: 'major_event', in: FORMAT_CONTINUOUS } },
    // Wimbledon's own dress tradition, the same INVITE-time shape as Derby hats:
    // told on the day, a guest has already dressed.
    { id: 't_wimbledon_whites', milestoneId: 'wp_invite', phase: 'guest', label: 'Ask for Wimbledon whites on the invite — it is the tradition, and guests need the notice to play along', when: 'T-7d', whenChoice: { id: 'major_event', in: ['Wimbledon'] } },

    // BROADCAST EVENT — neither of these has a ball to watch, so the thing that
    // makes them a party has to be READY before the broadcast starts. Both point
    // at purchases this playbook already carries (p_draftboard, p_ballot); they
    // add the timing those purchases imply and never stated.
    { id: 't_draft_board_up', milestoneId: 'wp_setup', phase: 'guest', label: 'Get the draft board up before the first pick — a draft has no ball to watch, so the board is what makes it a room', when: 'T0 -0:30', whenChoice: { id: 'major_event', in: ['NFL Draft'] } },
    { id: 't_awards_ballots', milestoneId: 'wp_setup', phase: 'guest', label: 'Hand out the prediction ballots before the show starts — once the first award is read, nobody can enter honestly', when: 'T0 -0:15', whenChoice: { id: 'major_event', in: ['Awards Show'] } },

    // DERBY — gated to Kentucky Derby rather than the racing format, because
    // these two are Derby traditions specifically and are not Daytona's.
    // Attire is an INVITE-time fact: hats are the documented expectation
    // (kentuckyderby.com's own at-home hosting guidance), and a guest told on
    // the day has already got dressed. That timing is the whole point.
    { id: 't_derby_attire', milestoneId: 'wp_invite', phase: 'guest', label: 'Put the dress code on the invite — hats are the tradition, and guests need the notice to play along', when: 'T-7d', whenChoice: { id: 'major_event', in: ['Kentucky Derby'] } },
    // The pool is the documented way a room stays in it across an all-day card:
    // the Derby is about two minutes at the end of a 14-race day, so without
    // something to hold them the room drifts until post time. Drawing horses
    // costs nothing; a cash buy-in or printed sheets would be a priced claim.
    { id: 't_derby_pool', milestoneId: 'wp_setup', phase: 'guest', label: 'Set up the pool before post time — let everyone draw a horse, so the whole card has something riding on it instead of just the last two minutes', when: 'T-1d', whenChoice: { id: 'major_event', in: ['Kentucky Derby'] } },
  ],

  purchases: [
    { id: 'p_wings', item: 'Chicken wings', category: 'food', qtyPerGuest: 1, unit: 'lb', where: ['Grocery', 'Costco', 'Butcher'], unitCostRange: [3, 6], essential: true, buyAt: 'T-1d', note: 'Game day runs big — plan ~1 lb (about 8–12 pieces) per guest; wings sell out the day before a big game.', provenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['webstaurant-protein-2026'], note: 'Grounded to webstaurant-protein-2026: ~1 lb bone-in wings/guest is within the source-stated protein portions (BBQ ~1 lb; bone-in runs higher).', claim: 'A Super Bowl watch party requires ~10–12 wings per guest (≈1 lb) for an all-afternoon graze', sufficientWhen: '≥2 Super Bowl party guides or game-day catering references confirm the ~10–12 wings/guest (~1 lb) planning rule' }, alternatives: ['Chicken drumsticks — cheaper per lb than wings, same saucy concept', 'Frozen wings (Costco bag) — cheaper, bake at home'], costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['wings-extension-2026', 'wings-retail-2026', 'chicken-retail-2026'], lastVerified: '2026-08-18', claim: 'Chicken wings 2026, from a land-grant extension market report and a retail guide. Southeast retail average for conventional fresh party wings $2.49/lb, IQF frozen $2.67/lb; the broader retail range is $2.50-5.00/lb, with frozen $2.50-3.50 and fresh or organic $4.50 and above. Wholesale is $1.10/lb, which is why a party-sized bulk buy sits near the band\'s floor while a fresh tray at a supermarket sits at its ceiling.', sufficientWhen: 'One fresh party-wing shelf price and one frozen bulk-bag unit price at the same store confirm the band.' }, },
    { id: 'p_chips', item: 'Chips + dips (queso, guac, salsa, French onion)', category: 'food', qtyPerGuest: 1, unit: 'serving', where: ['Grocery', 'Costco'], unitCostRange: [1.5, 3], essential: true, buyAt: 'T-3d', note: 'Chips keep; buy refrigerated dips fresh the day before.', alternatives: ['Store-brand chips + salsa — same function at lower cost', 'Popcorn (bulk microwave) — cheapest snack option'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['snacks-format-2026', 'dips-retail-2026'], lastVerified: '2026-09-17', claim: 'Chips and dips per serving. Chips from a party bag are $0.38-0.40 an ounce ($6.14-6.39 a pound, close to the BLS all-chips average). The DIPS are the larger share: queso 8oz $0.97, hummus 16oz $3.97-6.67, guacamole 15oz $5.27 and 14oz $6.58, prepared dips 16oz about $4.97. A generous serving with two or three dips out lands in this band; a chips-only table would sit below it.', sufficientWhen: 'A party chip bag and two dip tubs, divided by the servings actually poured, confirm the band.' }, },
    { id: 'p_chili', item: 'Chili (meat, beans, tomatoes, toppings)', category: 'food', qtyPerGuest: 0.5, unit: 'serving', where: ['Grocery'], unitCostRange: [2, 4], essential: false, buyAt: 'T-1d', note: 'Make-ahead crowd-pleaser; ~1 cup per guest, better the next day.', alternatives: ['Canned chili (Amy\'s or Stagg) + toppings bar — no-cook option', 'Bean chili (no meat) — cheaper, still crowd-pleasing'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['costco-groundbeef-2026', 'bls-staples-2026', 'bls-saladveg-2026'], lastVerified: '2026-08-18', claim: 'A pot dish priced per serving. Ground beef is $3.29/lb in Costco bulk against $5.86-7.66/lb at grocery; dried beans $1.704/lb per BLS; tomatoes $2.154/lb. A pot stretching beef with beans and tomatoes lands at this band\'s floor, a meat-forward one at its ceiling.', sufficientWhen: 'Per-pound beef, beans and tomato prices at the pot\'s actual ratio confirm the band.' }, },
    { id: 'p_pizza_sliders', item: 'Pizza / sliders (handheld mains)', category: 'food', qtyPer: 4, qtyFlat: 1, unit: 'pizza', where: ['Grocery', 'Pizza shop', 'Costco'], unitCostRange: [10, 18], essential: true, buyAt: 'T0', note: 'Roughly 2–3 large pizzas per 10 guests; order delivery for kickoff if not baking.', alternatives: ['Frozen pizza (Costco/DiGiorno) — cheaper than delivery', 'Slider rolls + deli meat — budget handheld option'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['pizza-chain-primary-2026', 'frozen-pizza-2026', 'buns-walmart-2026'], lastVerified: '2026-08-18', claim: 'Handheld mains per pizza, from PRIMARY chain sources. Dominos publishes a Mix and Match at $6.99 each for two or more items including a two-topping pizza; Papa Johns publishes a create-your-own large at $9.99; Papa Murphys take-and-bake large is $10.99 ($9.99 on its pepperoni promotion). Frozen: a 24.7oz rising crust is $7.29. THESE ARE ADVERTISED DEAL PRICES, NOT MENU PRICES - every chain disclaims that franchise prices vary, and none publishes an a-la-carte national figure, so this band\'s ceiling covers a non-promotional or specialty pie.', sufficientWhen: 'A local store\'s own online price for a large pizza, against the published national deal, confirms how far a given market sits above the band\'s floor.' }, },
    { id: 'p_dessert', item: 'Brownies, cookies & snack mix', category: 'food', qtyPerGuest: 1, unit: 'serving', where: ['Grocery', 'Bakery'], unitCostRange: [1, 3], essential: false, buyAt: 'T-1d', alternatives: ['Store-brand cookies — cheapest dessert option', 'Brownies from box mix — budget bake, tastes homemade'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['warehouse-trays-2026', 'snacks-format-2026', 'bakery-cake-retail-2026'], lastVerified: '2026-08-18', claim: 'Sweets and snack mix per serving. Warehouse cookies are $9.99 for 24 ($0.42 each) rising to $12.43 on a delivery marketplace; bakery brownies price with the grocery-bakery tier. SNACK MIX is $0.29-0.31 an ounce in party size and $0.37-0.43 single-serve. A cookie plus a scoop of mix lands in this band.', sufficientWhen: 'A cookie box divided per piece and a party mix bag divided per serving confirm the band.' }, },
    { id: 'p_drinks', item: 'Beer + soda + water', category: 'beverage', qtyPerGuest: 4, unit: 'drinks', where: ['Grocery', 'Costco', 'Liquor store'], unitCostRange: [1, 3], essential: true, buyAt: 'T-3d', note: 'A ~3.5h game means grazing/sipping the whole time — plan ~1 drink/guest/hour plus a buffer.', provenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['bar-provision-2026'], note: 'Grounded to bar-provision-2026: ~1 drink/guest/hour (~3–4 over a 3–4h window) is the source-stated party drink rate.', claim: 'A 3–4 hour game yields ~3–4 total drinks/guest at ~1 drink/guest/hour, split across beer, soda, and water', sufficientWhen: 'Standard US bartending or event-planning guide confirms the ~1 drink/guest/hour rule applied to a 3–4h watch-party window' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['beer-retail-2026', 'beer-budget-2026', 'soda-12pack-2026', 'bottledwater-case-2026'], lastVerified: '2026-08-16', claim: 'This band is a SUM of separately-priced drink families, not a single quoted item: domestic lager $0.80-1.20 per 12oz (about $20-22 a 24-pack), craft $1.50-3.00; soda $0.25-0.60 a can ($3.00-6.50 a 12-pack); bottled water about $0.17-0.38 a bottle ($4-9 a 24-pack). Each component is cited to its own registered source; the summed band is therefore low-confidence by construction.', sufficientWhen: 'Current shelf prices for one pack of each named component at the same store, summed to the per-serving band, confirm the range.' } },
    { id: 'p_ice', item: 'Ice (coolers + drinks)', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest to chill drinks indoors; top up at halftime.', provenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['bar-provision-2026'], note: 'Grounded to bar-provision-2026: ~1.5 lb ice/guest is within the source-stated ice provisioning rate.', claim: 'Indoor watch-party drink chilling requires ~1.5 lb ice/guest, on the lower end of the ~1–2 lb standard party range', sufficientWhen: 'Standard US event-planning or catering guide confirms the ~1–2 lb/guest ice range and that indoor events land at the lower end' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['ice-retail-2026', 'ice-warehouse-2026'], lastVerified: '2026-08-16', claim: 'Bagged ice 2026: warehouse clubs run 10-12c per pound (a 20lb bag is $1.75-2.50 at Sams Club, $1.80-2.50 at Costco); grocery and gas-station bags cluster 23-31c/lb (BJs and 7-Eleven 20lb about $4.49-4.79, Giant 20lb $4.99, Publix 16lb $4.99); small bags and hardware stores reach 41-45c/lb. Convenience ice is more than four times warehouse ice per pound.', sufficientWhen: 'Current shelf prices for one 20lb bag at a warehouse club and one at a grocery store confirm the per-pound spread.' } },
    { id: 'p_tableware', item: 'Paper plates, napkins, cups, cutlery', category: 'logistics', qtyPerGuest: 2, unit: 'set', where: ['Grocery', 'Costco', 'Party store'], unitCostRange: [0.25, 2.5], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: people grab a fresh plate/cup every visit to the food table — buy ~2 sets/guest, plus small plates for dips.' , costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['disposables-bulk-2026', 'disposables-partyqty-2026'], lastVerified: '2026-08-15', claim: 'A per-guest place setting runs $0.25-2.50 depending entirely on channel: bulk restaurant supply puts plates at $0.08-0.15 each and foam at $0.09, a grocery shelf puts the same basic paper plate at $0.25-0.40, and premium plastic or compostable runs $0.15-0.35 per plate. A setting is 2-3 plates, 2-3 cups, cutlery and 2-3 napkins.', sufficientWhen: 'Re-checked against per-plate pricing and place-setting norms. A deep bulk buy lands near the floor and premium or compostable near the ceiling - the 12x spread is the CHANNEL, not uncertainty. Add 10-15% for spills and unexpected guests. Sets that bundle flutes, koozies, linens or table covers are a different product and are priced separately.' } },
    { id: 'p_serveware', item: 'Serving setup consumables (toothpicks, foil, sterno) — assumes host already owns a slow cooker/warming tray', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Party store'], unitCostRange: [10, 30], essential: false, buyAt: 'T-3d', note: 'A slow cooker keeps chili/dip hot all game so the host can sit down. This band prices the consumables only — a slow cooker ($55-75) or warming tray ($65-80) bought new is a separate purchase, see alternatives.', alternatives: ['Buy a slow cooker or warming tray — $55-80 new if the host does not already own one'], provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['buffet-equipment-2026', 'picks-toothpicks-2026'], lastVerified: '2026-08-18', claim: 'A 6qt slow cooker runs $54.99-74.99 new; an electric warming tray $64.99-79.99 new (both excluded from this band). Foodservice toothpicks run $0.0065-0.0152 each. Item renamed and reframed 2026-08-18: the $10-30 band only ever fit consumables (foil, toothpicks, sterno fuel), not a new appliance purchase, so the item name and note now say so explicitly instead of implying the appliance is bought at this price.', sufficientWhen: 'A sterno-fuel and disposable-foil-pan price confirms the consumables-only band directly.' } },
    { id: 'p_cleanup', item: 'Trash + recycling bags, paper towels', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [7, 18], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: trash fills fast on game day — extra bags + a separate recycling bag for cans/bottles, swapped at halftime.' , costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['costco-cleaning-2026', 'trashbags-retail-2026'], lastVerified: '2026-08-15', claim: 'A cleanup kit runs $7-18 as the SUM of its parts: about a dozen trash and recycling bags at 10 cents each from a warehouse or 11-15 cents at grocery, two rolls of paper towels at about $1.97 warehouse, and a canister of wipes at about $4.27 or a dish-soap pack at $14.74 shared across events.', sufficientWhen: 'CONFIDENCE IS LOW ON PURPOSE: no source prices a cleanup kit, because nobody sells one. This band is a sum of individually-priced components, so treat it as an envelope rather than a quote. The spread is the CHANNEL - warehouse packs against a grocery shelf - and a host who already owns soap and towels lands well under the floor. Kits that also carry gloves, foil or to-go containers are a different bundle.' } },
    // ── Major-event-specific purchases (whenChoice-gated on major_event; see
    //    file header) — invisible unless the host names that event, so the
    //    football default's item list and totals are byte-identical to before.
    // Provenance carries no `sources` array here on purpose — these are cultural/
    // tradition claims (CFP's own tailgate coverage; multiple Derby history
    // writeups, 2026-09-13 WebSearch), not registered against QTY_SOURCES/
    // COST_SOURCES. Claiming `sources` without a resolving registry id is exactly
    // what knowledgeInventory.js's 'ambiguous' state exists to catch (sources
    // listed, grounding predicate fails) — same reason p_chips/p_chili/
    // p_pizza_sliders below carry the real context only in `note` prose, not a
    // formal sources array, at this same 'estimate' tier.
    // category: 'logistics', not 'decor' — 'decor' passes the schema linter
    // but the shopping-list engine's Supplies loop (playbooks/index.js ~4218)
    // only recognizes food/beverage (its own loop) or a non-food/beverage
    // category THAT IS ALSO essential:true — non-essential logistics/decor/
    // cleanup rows are filtered out of the list entirely, not just hidden by
    // default. Confirmed live: with essential:false this item never appeared
    // in "The spread & shopping," at any category. `essential: true` here
    // reads honestly once whenChoice has already gated it to CFB National
    // Championship specifically — team colors ARE the defining atmosphere
    // for that event the same way wings are for the Super Bowl, not an
    // optional extra once a host has named this as the event.
    { id: 'p_teamcolors', item: 'Team colors gear & tailgate decor (flags, banners, face paint)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Team store', 'Online'], unitCostRange: [15, 40], essential: true, buyAt: 'T-3d', whenChoice: { id: 'major_event', in: ['College Football National Championship'] }, note: 'A championship watch party leans into school colors the same way fans dress for the stadium tailgate — the College Football Playoff\'s own championship-week coverage explicitly encourages fans to show up in team colors and gear, with flags and banners as the defining decor.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, alternatives: ['Paper goods in team colors — cheaper than dedicated gear', 'Ask each guest to just wear their own team colors — zero cost'] },
    { id: 'p_mintjulep', item: 'Mint julep bar (bourbon, fresh mint, simple syrup, crushed ice)', category: 'beverage', qtyFlat: 1, unit: 'kit', where: ['Liquor store', 'Grocery'], unitCostRange: [30, 55], essential: false, buyAt: 'T-1d', whenChoice: { id: 'major_event', in: ['Kentucky Derby'] }, note: 'The signature Derby drink since the 1930s — bourbon, mint, and simple syrup over crushed ice. One 750ml bottle pours roughly 12-16 juleps.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, alternatives: ['Pre-made mint julep mix — cheaper, less prep', 'Mocktail version (mint, lime, simple syrup, soda) — no alcohol'] },
    // ── 2026-09-13 SECOND PASS additions — every provenance/costProvenance
    //    value below was built through the real KCR pipeline (see file header)
    //    and matches exactly what publishKCR approved; it is not hand-typed.
    { id: 'p_ballparksnacks', item: 'Ballpark snacks (hot dogs, peanuts, Cracker Jack)', category: 'food', qtyPerGuest: 1, unit: 'serving', where: ['Grocery', 'Costco'], unitCostRange: [2, 4], essential: true, buyAt: 'T-1d', whenChoice: { id: 'major_event', in: ['World Series'] }, note: 'The ballpark-food tradition behind "Take Me Out to the Ball Game" — hot dogs, peanuts and Cracker Jack, brought home for the watch party.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['hotdogs-retail-2026', 'hotdogs-costco-2026', 'peanuts-costco-2026', 'crackerjack-retail-2026'], lastVerified: '2026-09-13', claim: 'A per-guest ballpark-snacks serving (about 1.5 hot dogs + a handful of in-shell peanuts + one Cracker Jack box) sums three separately-priced retail lines: hot dogs $0.79-1.30 each (LatestCost retail average, Kroger receipt example, Costco Kirkland bulk pack); in-shell peanuts $1.20-1.40/lb (Costco 5lb bag); Cracker Jack $0.38-0.57 per 1.25oz box (Costco vs. Sam\'s Club, same product, a full box apart).', sufficientWhen: 'Current per-unit prices for one hot dog pack, one peanut bag and one Cracker Jack multipack at the same store, summed at the per-guest ratio, confirm the band.' }, alternatives: ['Ballpark-brand hot dogs only, skip the peanuts/Cracker Jack — cheaper, still on-theme', 'Add nachos or a pretzel bar for a bigger spread'] },
    { id: 'p_pimentocheese', item: 'Pimento cheese tea sandwiches (Masters tradition)', category: 'food', qtyPerGuest: 2, unit: 'sandwich', where: ['Grocery'], unitCostRange: [1, 2.5], essential: true, buyAt: 'T-1d', whenChoice: { id: 'major_event', in: ['The Masters'] }, note: 'Augusta National\'s own concession stand has sold a $1.50 pimento cheese sandwich since 2002 — the tournament\'s signature food. This band prices making the same sandwich (cheese, mayo, pimento, bread) at home, which costs less than the concession-stand price.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'Augusta National\'s own $1.50 pimento cheese sandwich (NBC New York, Golf Monthly and NPR all confirm the 2026 concession price, unchanged since 2002) is the reason this item belongs in the playbook, but it prices a tournament CONCESSION STAND, not a host\'s grocery list — using it to ground a home-shopping cost band would price the wrong transaction. The home cost stays an honest, unsourced estimate for bread/cheese/mayo/pimento ingredients.' }, alternatives: ['Egg salad tea sandwiches alongside — Augusta\'s other classic', 'Buy pre-made pimento cheese spread instead of mixing from scratch — faster, slightly more expensive'] },
    { id: 'p_worldcupcolors', item: 'National flags, jerseys & face paint (supported country)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Online'], unitCostRange: [15, 40], essential: true, buyAt: 'T-3d', whenChoice: { id: 'major_event', in: ['World Cup'] }, note: 'World Cup watch parties center on flags, jerseys and face paint in the colors of the country being cheered for — the same fan-culture role team colors play at a College Football Championship party.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'Flags, jerseys and face paint for the supported nation are a well-documented World Cup watch-party tradition (KPBS photo coverage; usflags.com on why fans display national flags), but no single confirmed unit retail price was found in this research pass — marketplace listings for flag/scarf/face-paint kits did not return a stable price. Cost stays an honest estimate, in the same $15-40 decor-kit band as the structurally identical CFB team-colors item, pending a real price source.' }, alternatives: ['Ask each guest to wear their own country\'s colors — zero cost', 'Flag bunting/string decorations only, skip individual face paint — cheaper'] },
    // ── 2026-09-13 THIRD PASS additions (6-format taxonomy; see file header).
    //    p_pimms_strawberries is the one new claim that genuinely earns
    //    tier:'researched' — its sources price the home ingredients directly,
    //    unlike Masters/World Cup above. Verified via the same real KCR
    //    functions as pass two, not committed to publishedKcrs.json for the
    //    same disclosed transport-invariant reason.
    { id: 'p_pimms_strawberries', item: 'Pimm\'s Cup & strawberries with cream (Wimbledon tradition)', category: 'beverage', qtyFlat: 1, unit: 'kit', where: ['Liquor store', 'Grocery'], unitCostRange: [35, 45], essential: false, buyAt: 'T-1d', whenChoice: { id: 'major_event', in: ['Wimbledon'] }, note: 'Wimbledon\'s own concession stands sell over 190,000 servings of strawberries and cream and 300,000+ glasses of Pimm\'s Cup a year — the tournament\'s two defining traditions, both easy to recreate at home.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['pimms-retail-2026', 'strawberries-cream-retail-2026'], lastVerified: '2026-09-13', claim: 'A Pimm\'s Cup + strawberries-and-cream kit sums two retail lines: one 750ml bottle of Pimm\'s No. 1 ($27-31, pours ~12 cups) and a pint each of fresh strawberries ($2.57-6.39/lb) and heavy cream ($2.50-5.50/pint).', sufficientWhen: 'Current shelf prices for one Pimm\'s bottle, one pint of strawberries and one pint of cream at the same store confirm the band.' }, alternatives: ['Sparkling lemonade + strawberries — non-alcoholic version, still on-theme', 'Skip the Pimm\'s, keep the strawberries and cream — cheaper, still the more famous of the two traditions'] },
    { id: 'p_daytonadecor', item: 'Checkered-flag decor & race-themed snacks', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Online'], unitCostRange: [15, 35], essential: true, buyAt: 'T-3d', whenChoice: { id: 'major_event', in: ['Daytona 500'] }, note: '"Daytona Day" watch parties lean on checkered-flag decor and race-themed touches — some hosts even tape a finish line at the front door.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'Race-day decor is a well-documented "Daytona Day" tradition, but no confirmed unit retail price was found this pass — the same honest-estimate treatment as the structurally identical team-colors/World Cup decor kits.' }, alternatives: ['Skip dedicated decor — a checkered flag or two is enough', 'Driver-number gear for whoever the room is rooting for'] },
    { id: 'p_draftboard', item: 'Draft board / whiteboard (track the picks)', category: 'logistics', qtyFlat: 1, unit: 'item', where: ['Office supply', 'Online'], unitCostRange: [10, 25], essential: true, buyAt: 'T-3d', whenChoice: { id: 'major_event', in: ['NFL Draft'] }, note: 'Unlike a game, a draft has no ball to watch — a visible board to track picks as they come in is what turns "watching a broadcast" into a party.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'A basic whiteboard or poster-board price is trivial and not worth a full corroborated-sourcing pass — kept at an honest estimate rather than over-investing research effort on a low-stakes, low-cost item.' }, alternatives: ['A printed draft-order sheet — free, same function', 'A shared phone/tablet tracker instead of a physical board'] },
    { id: 'p_ballot', item: 'Printable prediction ballots + a small prize', category: 'logistics', qtyPerGuest: 1, unit: 'sheet', where: ['Home printer', 'Party store'], unitCostRange: [0.1, 3], essential: true, buyAt: 'T-3d', whenChoice: { id: 'major_event', in: ['Awards Show'] }, note: 'Predicting winners on a printed ballot before the show, with a small prize for the closest guess, is the defining activity of an awards-show watch party — more than any specific food.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'A printed sheet costs pennies; the "small prize" is entirely host discretion (a gift card, a bottle of wine, bragging rights). Not worth a corroborated-sourcing pass for a cost this low and this discretionary.' }, alternatives: ['A free printable ballot template — no printer cost beyond paper', 'Skip the prize — bragging rights only'] },
  ],

  rentalsGap: [
    { item: 'Coolers (drinks + ice)', qtyPerGuest: 0.1, note: 'roughly one cooler per ~10 guests so the fridge stays free for food' },
    { item: 'Folding / extra chairs', qtyPerGuest: 0.5, note: 'couches fill fast — borrow extra seating so everyone can see the screen' },
    { item: 'Second screen / projector', qtyFlat: 1, note: 'optional — a second TV or projector for a big crowd or split rooms' },
    { item: 'Folding table', qtyFlat: 1, note: 'a dedicated food + drinks station off the coffee table' },
  ],

  vendors: [
    { category: 'Pizza / wing delivery', required: false, altToDIY: 'Bake wings + pizza at home', when: 'T-1d (pre-order)', costRange: [8, 15], costUnit: 'per guest' },
    { category: 'Party platter / catering', required: false, altToDIY: 'Host makes the spread', when: 'T-3d', costRange: [10, 20], costUnit: 'per guest' },
    { category: 'Chair / table rental', required: false, altToDIY: 'Borrow folding chairs from friends', when: 'T-7d', costRange: [30, 100], costUnit: 'flat' },
  ],

  risks: [
    // whenChoice/copyByAnswer added to playbookRisks() 2026-09-13 (found auditing
    // the 6-format taxonomy — see index.js). r_derby_time and r_rivalry were
    // showing for EVERY major_event answer, including UFC/Boxing and Wimbledon,
    // because risks had never been gated at all. Gated here to the events they
    // actually describe; this changes the Super Bowl DEFAULT (drops 2 irrelevant
    // risks it should never have shown) as a bug fix, not a feature — that bug
    // predates this session (introduced when r_derby_time/r_rivalry were first
    // authored, pass one).
    { id: 'r_kickoff', trigger: 'Food not ready when the game starts', severity: 'high', mitigation: 'Back-time the cook so everything is OUT ~30 min before kickoff; use the slow cooker for hot dishes; pre-order pizza for delivery at kickoff.' },
    { id: 'r_stream', trigger: 'Game not on / stream or channel fails', severity: 'high', mitigation: 'Test the exact channel/stream at 3 days out; know the backup (antenna, alternate app, or a nearby bar) before guests arrive.' },
    { id: 'r_drinks', trigger: 'Run out of drinks or ice mid-game', severity: 'med', mitigation: 'Buy a buffer (~4 drinks + ~1.5 lb ice/guest); top up ice at halftime; ask a guest to do a beer run.', copyByAnswer: { mitigation: { major_event: Object.fromEntries(FORMAT_NO_HALFTIME.map((k) => [k, 'Buy a buffer (~4 drinks + ~1.5 lb ice/guest); top up ice partway through; ask a guest to do a beer run.'])) } } },
    { id: 'r_seating', trigger: 'Not enough seats / bad sightlines', severity: 'med', mitigation: 'Borrow extra chairs; arrange seating toward the screen before anyone arrives.' },
    { id: 'r_trash', trigger: 'Trash/recycling overflows, surfaces get sticky', severity: 'low', mitigation: 'Put out a clearly-marked recycling bag for cans; swap trash bags at halftime; keep paper towels at the food table.', copyByAnswer: { mitigation: { major_event: Object.fromEntries(FORMAT_NO_HALFTIME.map((k) => [k, 'Put out a clearly-marked recycling bag for cans; swap trash bags partway through; keep paper towels at the food table.'])) } } },
    { id: 'r_derby_time', trigger: 'Guests miss the actual race — it is over in about two minutes', severity: 'med', mitigation: 'Post time is announced well ahead — call it out 10 minutes before, get everyone off their phones and in front of the screen, and hold any toast until after the race, not during it.', whenChoice: { id: 'major_event', in: ['Kentucky Derby'] } },
    { id: 'r_rivalry', trigger: 'Mixed-fandom tension between the two schools\' fans in the room', severity: 'low', mitigation: 'Keep it lighthearted — split seating by team side if it helps, and set the tone before kickoff that it stays fun.', whenChoice: { id: 'major_event', in: ['College Football National Championship'] } },
  ],

  contingencies: [
    { id: 'c_kickoff', when: 'r_kickoff', plan: 'If the cook is running late, put out chips/dips immediately and let hot food trickle out; pizza delivery covers the gap.' },
    { id: 'c_stream', when: 'r_stream', plan: 'Switch to the backup app/antenna; if all else fails, the group decamps to a nearby sports bar.' },
    { id: 'c_drinks', when: 'r_drinks', plan: 'Send a guest on a quick beer/ice run; stretch the bar with soda + water until they\'re back.' },
  ],

  schedules: {
    purchasing: [
      // Same rule as the two shopping TASKS above: the purchasing schedule was
      // a second hand-kept copy of the shopping list, naming chili and wings a
      // host may have removed. It defers to the list instead of restating it.
      { when: 'T-3d', what: 'The non-perishables on your list — everything that keeps' },
      { when: 'T-1d', what: 'The fresh items on your list — the last run before the day' },
      { when: 'T0', what: 'Ice (and pizza delivery / fresh pickup)' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Make chili + dips ahead; thaw wings; clear fridge space for drinks' },
      { when: 'T0 -1:30', what: 'Cook wings + hot food, back-timed to be ready before kickoff' },
    ],
    setup: [
      { when: 'T0 -4h', what: 'Confirm the stream or channel works — actually load it, don’t assume' },
      { when: 'T0 -3h', what: 'Drinks on ice; seating arranged so everyone can see the screen' },
      { when: 'T0 -1h', what: 'Coolers + ice, food + drinks table, extra seating toward the screen' },
      { when: 'T0 -0:30', what: 'Food OUT and ready; slow cooker on; trash + recycling bins set; stream/channel confirmed' },
    ],
    program: [
      { when: 'T0 +5m', what: 'Doors: TV on the pre-game, drinks on ice, seats claimed',
        copyByAnswer: { major_event: {
          'Daytona 500': 'Doors: TV on the pre-race coverage, drinks on ice, seats claimed',
          'Kentucky Derby': 'Doors: TV on the pre-race coverage, mint juleps poured, seats claimed',
          'Awards Show': 'Doors: TV on the red carpet coverage, ballots handed out, seats claimed',
          'NFL Draft': 'Doors: TV on the draft-order coverage, draft board up, seats claimed',
        } } },
      // 2026-09-13 (third pass): a real EXTRA beat for combat sports and
      // Daytona 500 — the undercard and the pre-race ceremonies are genuine,
      // corroborated structural beats these two formats have that a single
      // game does not. Placed before the reworded T0+45m beat below.
      { when: 'T0 +15m', what: 'Undercard fights start — the warm-up; most of the room won\'t fully tune in yet', whenChoice: { id: 'major_event', in: FORMAT_COMBAT } },
      { when: 'T0 +15m', what: 'Pre-race ceremonies: anthem, flyover, driver introductions', whenChoice: { id: 'major_event', in: ['Daytona 500'] } },
      // reg_sport (the catch-all's own follow-on) is listed FIRST so it wins for
      // a regular-season game; resolveAnsweredCopy returns on the first decision
      // id that has a matching answer, and "Regular season game / other" has no
      // major_event entry below, so the named events are unaffected either way.
      { when: 'T0 +45m', what: 'Kickoff — food already out so nobody’s in the kitchen',
        copyByAnswer: { reg_sport: {
          'Baseball (MLB)': 'First pitch — food already out so nobody’s in the kitchen',
          'Hockey (NHL)': 'Puck drop — food already out so nobody’s in the kitchen',
          'Basketball (NBA)': 'Tip-off — food already out so nobody’s in the kitchen',
          'College basketball': 'Tip-off — food already out so nobody’s in the kitchen',
          'Soccer': 'Kick-off — food already out so nobody’s in the kitchen',
        }, major_event: {
          'UFC / Boxing': 'Main card begins',
          'The Masters': 'Coverage begins — this runs for hours with no discrete break, unlike a game',
          'Wimbledon': 'Coverage begins — this runs for hours with no discrete break, unlike a game',
          'Daytona 500': 'Green flag — the race is underway',
          'Kentucky Derby': 'Undercard races begin — post time for the Derby itself is still hours away',
          'NFL Draft': 'The draft goes on the clock — expect long, bursty gaps between picks, not continuous action',
          'Awards Show': 'Red carpet coverage wraps and the show starts',
          // World Series (baseball) has neither a kickoff nor a halftime — the
          // real terms are first pitch and the 7th-inning stretch. Found by the
          // review-board coverage audit, 2026-09-14: this event had a dedicated
          // purchase but was still 100% football-worded, the same format-mate
          // gap already fixed for Kentucky Derby and Daytona 500.
          'World Series': 'First pitch — food already out so nobody\'s in the kitchen',
        } } },
      { when: 'T0 +1:45', what: 'Halftime: hot food refresh, refill drinks, bathroom rotation', whenChoice: { id: 'major_event', not: FORMAT_NO_HALFTIME },
        copyByAnswer: { major_event: {
          'Kentucky Derby': 'Food + mint julep refresh — still well before post time',
          // Added auditing the racing format a second time (2026-09-13): Derby's
          // middle beats got reworded, Daytona's did not — same format, same gap.
          'Daytona 500': 'Pit-stop strategy chatter and a food refresh — still a long way to the checkered flag',
          'World Series': 'The 7th-inning stretch — hot food refresh, refill drinks, bathroom rotation',
        } } },
      { when: 'T0 +2:15', what: 'Second half',
        copyByAnswer: { major_event: {
          'UFC / Boxing': 'Main card continues toward the main event',
          'The Masters': 'Coverage continues — a good stretch to refresh food without missing anything discrete',
          'Wimbledon': 'Coverage continues — a good stretch to refresh food without missing anything discrete',
          'Kentucky Derby': 'Final undercard races — post time is close, get everyone off their phones soon',
          'Daytona 500': 'Laps click by — this is when late cautions start bunching the field back up',
          'NFL Draft': 'Later rounds — the picks come faster now',
          'Awards Show': 'Middle of the show — the smaller categories',
          'World Series': 'Middle innings',
        } } },
      { when: 'T0 +3:30', what: 'The finish — let the room have it',
        copyByAnswer: { major_event: {
          'UFC / Boxing': 'Main event walkouts — this is what everyone came for',
          'Daytona 500': 'Final laps — this is where the race is actually decided',
          'Kentucky Derby': 'Post time — the race itself, over in about two minutes',
          'NFL Draft': 'Final picks of the night',
          'Awards Show': 'The night\'s biggest award — ballots get scored on the spot',
          'World Series': 'The final outs — let the room have it',
        } } },
      { when: 'T0 +4:05', what: 'Wind down: to-go plates, rides checked for anyone who’s been drinking' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep hot food refreshed at the breaks and cold drinks on ice; watch anyone who’s drinking through a long game' },
      { when: 'halftime', what: 'Restock food, swap trash bag, bag cans for recycling, top up ice' },
      { when: 'T0 +4h', what: 'Pack leftovers, bag trash/recycling, wipe surfaces, run the dishwasher' },
    ],
  },

  knowledge: {
    governanceVersion: '1.4.2',
    verificationStatus: 'synthesized',
    note: 'Quantities reflect common US game-day hosting rules of thumb: Super Bowl portions run large (~1 lb / about 10–12 wings per guest grazing all afternoon), ~1 drink per guest per hour over a ~3.5h game (≈3–4 drinks/guest, split across beer/soda/water), ~1.5 lb ice per guest for indoor drink-chilling (the lower end of the 1–2 lb party rule), roughly 2–3 large pizzas per 10 guests, and ~2 disposable plate/cup sets per guest since people refresh every trip to the food table. The defining constraint of a watch party is timing — food ready ~30 min before kickoff and a halftime refresh — not headcount. Authored as established-consensus / trade-heuristic and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources. 2026-09-13 FIRST PASS: added the `major_event` identification decision plus event-specific purchases/risks/heartMoments for College Football National Championship (team-colors decor) and Kentucky Derby (mint julep) and a cost-coverage decision for UFC/Boxing — hand-authored with informal citations, NOT run through this codebase\'s KCR governance pipeline. Disclosed and corrected per host directive. 2026-09-13 SECOND PASS: added World Series (ballpark snacks), The Masters (pimento cheese) and World Cup (national colors) purchases, and heartMoments for NBA Finals, Stanley Cup Final and Olympics, this time through the real KCR functions. 2026-09-13 THIRD PASS: a host-specified 6-format taxonomy (single game / multi-day tournament / combat sports-PPV / racing-spectacle / continuous coverage / broadcast event), grouping major_event answers by STRUCTURAL shape rather than adding named events one at a time. Two small, precedented engine changes made this possible: choiceShown() gained a `{not:[...]}` form (mirroring modeShown\'s existing two-shape vocabulary), and playbookRunOfShow()/playbookDuringCues() now honor a whenChoice gate on timed schedule rows (previously only schedules.agenda did) — both proven byte-identical for every existing playbook and for every Format-1 major_event answer via the unchanged full-suite pass count before and after. Added: a `tourney_span` decision + repeatable-shopping-list task for the multi-day-tournament format (March Madness/World Cup/Olympics) — real guidance, not a fabricated day-by-day itinerary, since a 3-week Olympics has no fixed number of sittings for schedules.agenda to model; undercard/main-event and pre-race-ceremony program beats plus a no-halftime gate for combat sports (UFC/Boxing) and Daytona 500 respectively; a Wimbledon purchase (Pimm\'s Cup + strawberries and cream) that genuinely earned tier:\'researched\' via the real KCR functions — its sources price the actual home-shopping ingredients, unlike the Masters\' pimento cheese; 4 new major_event options (Daytona 500, Wimbledon, NFL Draft, Awards Show) each with real, corroborated heartMoments and a defining purchase (race decor, a draft board, printable prediction ballots) at honest estimate tier where no corroborated retail price was worth the research effort for a low-cost item. Reworded program beats via copyByAnswer for every non-default format. As with pass two, none of this pass\'s reviewed KCR claims were committed to publishedKcrs.json/publishedKnowledge.json — that transport\'s hard invariant (cited + visible in a baseline event) still cannot accept whenChoice-gated content; the same disclosed, un-started infrastructure gap as before. "Regular season game / other" intentionally received no dedicated content in any pass — it is the generic fallback. The football-default path (Super Bowl, unanswered major_event) is unchanged across all three passes — proven by the unchanged full-suite pass count, not just claimed. DISCOVERED, OUT OF SCOPE, NOT FIXED: the cleanup schedule\'s `{when:\'halftime\'}` row has never actually reached a host — rosWhenOffset() does not recognize the bare token \'halftime\' (it is not `during`/`ongoing`, not `T0±X`, not any prose token it knows), so the row silently returns null and is dropped by every schedule reader. Pre-existing, unrelated to this pass, left as found rather than fixed opportunistically. 2026-09-13 FOURTH PASS: a "demo the top 5 sub-events and audit for logic issues" request, run against real engine output (playbookFoodPlan/playbookRunOfShow/playbookChecklist/playbookHeartMoments/playbookRisks) for UFC/Boxing, Kentucky Derby, Wimbledon, World Cup and NFL Draft, found and fixed 3 real host-visible bugs: (1) risks had NEVER been gated by major_event at all — r_derby_time and r_rivalry showed for every event including UFC/Boxing and Wimbledon, a defect dating to pass one; playbookRisks() gained the same whenChoice/copyByAnswer support schedules already had, and both risks are now correctly scoped (this changes the Super Bowl default\'s risk list as a bug fix, not new behavior); (2) the "Halftime hits..." heartMoment showed verbatim for the three no-halftime formats (UFC/Boxing, NFL Draft, Awards Show), promising a moment that cannot happen — given a proper override for each; (3) World Cup, a Multi-day tournament format member, had zero heartMoment differentiation while its peers (March Madness, Olympics) had some — added two. Also rewrote Kentucky Derby\'s run-of-show wording (Doors/Kickoff/Halftime/Second-half/Finish), which had stayed 100% football-worded through all three prior passes even though Derby is the racing format\'s own flagship example. Disclosed, not fixed: several purchase `.note` fields still reference "halftime"/"a ~3.5h game" for no-halftime formats (p_ice, p_cleanup, p_drinks) — purchase notes have never resolved copyByAnswer in this codebase, and fixing that would be a third engine surface change for a shopping-list caption, not a schedule promise or a wrong risk. 2026-09-13 FIFTH PASS: audited the remaining 11 named events the same way. Confirmed clean: Super Bowl default, CFB Championship, NBA Finals, Stanley Cup Final, World Series, Regular season/other. Found the SAME bug class as pass four on events the top-5 sample missed: Daytona 500\'s Halftime/Second-half beats were never reworded even though Kentucky Derby (same racing format) got exactly this fix one pass ago — fixed with matching pit-stop/late-caution wording. The Masters had ZERO heartMoment differentiation, including showing the impossible "Halftime hits..." line verbatim — the exact bug fixed for UFC/Boxing/NFL Draft/Awards Show/Wimbledon in pass four, just missed for this one format member. Added all 3 relevant heartMoment overrides. Lesson: every gap in passes four and five was a format-MATE inconsistency (one member fixed, its sibling not) — worth checking every member of a format together, not auditing format-by-format after the fact. Also answered directly (not fixed, a scope decision for the host): non-Super-Bowl NFL games (playoffs, wild card, conference championships, a regular Sunday game) have NO dedicated major_event option — eventTaxonomy.mjs\'s free-text KEYWORDS already recognize "wild card", "conference championship" and "playoffs" and correctly route them to the Watch Party TYPE, but the major_event DECISION\'s options list only offers "Super Bowl" and the generic "Regular season game / other" for football — there is no "NFL Playoffs" or "Conference Championship" option, so a host hosting one of the most common non-Super-Bowl NFL watch parties has no accurate choice. Not built in any of the five passes; flagged for a prioritization decision, not assumed to be low-priority. 2026-09-13 SIXTH PASS: "build the NFL playoffs option" — closing that exact gap. Real research first (Wild Card Weekend confirmed as 6 games across 3 days; Divisional Round 4 games across 2 days; NFL playoff rounds are genuinely single-elimination "win or go home" for every round, not just the Super Bowl — sourced, not assumed). That multi-game/multi-day structure is exactly what the Multi-day tournament format\'s `tourney_span` decision already asks, so NFL Playoffs joined FORMAT_MULTIDAY and reuses that decision plus the repeatable-shopping-list task rather than inventing a new one. Cold-weather outdoor-tailgate culture is real and well-documented but was deliberately NOT built into a purchase — this playbook is an indoor living-room watch party by design, and a tailgate need does not exist inside that scope. No new purchase was invented at all: research found no real food/shopping tradition distinguishing an NFL playoff game from the existing wings/chili/pizza defaults, so — same honest treatment as NBA Finals/Stanley Cup Final before it — NFL Playoffs gets heartMoment differentiation only (the real elimination-game stakes), not a fabricated item. The single-game run-of-show wording ("Kickoff"/"Halftime") was left untouched for NFL Playoffs because, unlike Kentucky Derby or Daytona 500, it is factually correct for an actual football game. 2026-09-14 SEVENTH PASS: "ask review board what we are missing" surfaced a fresh, measured coverage matrix (purchases/heartMoment-overrides/run-of-show-rewording per event) rather than another spot-check, and it found 3 more instances of the format-mate/axis inconsistency pattern: World Series had a real purchase and ZERO heartMoments (added 2); World Series\'s run-of-show was still 100% football-worded despite baseball having neither a kickoff nor a halftime (reworded all 4 timed beats to first pitch / 7th-inning stretch / middle innings / final outs); Wimbledon was 2/4 heartMoments against The Masters\' 3/4 in the same format (added the missing variant). Also added real Playwright e2e coverage for the whole major_event system for the first time — hostv2/e2e/watchPartyMajorEvent.spec.mjs — since every prior pass verified through direct engine calls only (this sandbox lacked a working browser); it drives the actual rendered screen (the spread, calls-to-make, checklist and risks sheets) for the default path, Kentucky Derby, UFC/Boxing and NFL Playoffs, plus one test that clicks through the real decision board rather than seeding data, so a future wiring regression (not just a data regression) now has a permanent guard. 2026-09-17 EIGHTH PASS: driving a real seeded event, the host removed chili from the shopping list and the checklist went on telling them to shop for it and make it. t_fresh_shop, t_nonperish_shop, t_prep and both purchasing-schedule rows hard-coded the menu into their labels, so event.foodSkip — which correctly drops the item, its cost and its per-item buy-task — could never reach them. Fixed by deleting the duplication rather than patching the strings: the two shopping tasks now name the ACT and defer to the live list they already deep-link to ("Shop the non-perishables on your list"), the purchasing schedule does the same, and t_prep is generic ("Prep what can be made ahead; thaw anything frozen"). A label that restates a list the host can edit can only drift out of sync with it. DISCLOSED, NOT FIXED: t_cook and its run-of-show twin still say "Cook wings + hot food" — the same exposure, kept deliberately because the back-timed cook schedule pivots on wings and genericising it costs more real utility than it protects; a host decision, not a silent change. ALSO MEASURED THIS PASS, NOT YET ADDRESSED: checklist tasks are by a wide margin the least differentiated surface in this playbook — 7 of 8 tasks are IDENTICAL across all 17 major_event options, and the only one that varies (t_halftime) varies by REMOVAL. Purchases carry 8+ event-specific items and heartMoments ~12 overrides; tasks have never had an additive differentiation pass, which is why the checklist reads the same for a Derby party and a UFC card. Opening research indicates the real per-sport differences are in TIMING and INVITE CONTENT rather than food: a UFC card runs early prelims / prelims / main card roughly four hours apart, so the host needs to tell guests the MAIN CARD time rather than the broadcast start; and the Derby is two minutes at the end of a 14-race day, with hats that belong on the INVITATION rather than a day-of list, plus a betting pool and hat contest that need setup before post time. BUILT LATER THE SAME PASS, on the host\'s go-ahead: the first four additive per-sport TASKS this checklist has ever had. Combat (FORMAT_COMBAT) gets "tell guests the MAIN CARD time, not the broadcast start" — a UFC/boxing card runs early prelims/prelims/main card roughly four hours apart, so inviting a room to "the fight" reliably lands people at the wrong end of the night — plus a day-of "sign in and actually PLAY the stream ~30 min before the main card", deliberately distinct from t_stream\'s T-3d "does this channel work at all". Kentucky Derby (gated to the event, NOT to the racing format, because these are Derby traditions and not Daytona\'s) gets "put the dress code on the invite" — hats are the documented expectation and a guest told on the day has already dressed, so the TIMING is the whole point — and "set up the pool before post time", the documented way a room stays engaged across a 14-race day when the race itself is about two minutes. Measured after: Derby 8 to 10 tasks, UFC/Boxing 7 to 9, Super Bowl default unchanged at 8. All four are UNPRICED on purpose: task copy has not needed the KCR pipeline in any prior pass and none of these assert a cost. A hat-contest PRIZE and printed betting sheets are real, documented traditions that were deliberately left out for exactly that reason — they would be priced claims and belong in KCR, not in a copy pass. Those remaining formats got their pass immediately after, on the same go-ahead, and the same research pattern held — the differentiator is TIMING, never food. March Madness: brackets LOCK at the first tip and cannot be changed after (NCAA/ESPN bracket rules), so "we will do brackets at the party" has already failed if the party starts later; and the opening rounds run up to EIGHT games at once, so one TV guarantees missing finishes. Continuous coverage (Masters/Wimbledon): this is the format DEFINED by having no discrete break, which the playbook already models by gating t_halftime off — correct, and it also left those hosts with no mid-event guidance at all, since there is no natural moment to reset the room; documented Wimbledon hosting advice reaches the same point from the other side (stock enough glassware that nobody is at the sink mid-match). Plus Wimbledon whites on the invite, the same invite-time shape as Derby hats. Broadcast events: neither a draft nor an awards show has a ball to watch, so the thing that makes it a party has to be ready BEFORE the broadcast — the board up before the first pick, the ballots out before the first award is read. Both point at purchases this playbook already carried (p_draftboard, p_ballot) and add the timing those purchases always implied but never stated. MEASURED END STATE: task differentiation went from 1 varying task across 17 events (t_halftime, and it varied by REMOVAL) to 11 varying, 10 of them ADDITIVE. Super Bowl and every other single-game event stayed at exactly 8 tasks — the default path never moved.',
    sources: [],
  },
};

export default watchParty;
