// ─── HERO COMPOSITION — board rulings A and B (2026-07-30) ───────────────────
//
// Both rulings were issued, both were left unbuilt, and the board re-sat and scored
// the composition 4/10 *because* they were unbuilt. These are source gates on the two
// specific expressions, so "ruled but not shipped" cannot happen to them a second time.
//
// RULING A — collapse to ONE disclosure, and stop lying about navigation.
//   The hero carried TWO grey disclosures a few px apart, both reading "3":
//     :1562  "See 3 other ways ›"  → other ANSWERS to this decision (setDecDiscloseId)
//     :5982  "See all 3 ›"         → other DECISIONS in the bundle    (setBundleOpen)
//   They are disjoint offers; both reading "3" was coincidence, and :5982's count
//   included the on-screen one so it offered 3 where 2 were new. The Grandmother seat
//   ruled she could not tell them apart and would shut the laptop.
//   SHIPPED HERE: :1562 loses its count and its glyph and becomes "Other ways ▸" —
//   the closed twin of the "Other ways ▾" the SAME control already wore when open.
//   The `›` was false navigation: the handler toggles decDiscloseId IN PLACE.
//   NOT SHIPPED: deleting :5982 / :5944. Its stated premise ("those rows already live
//   under the .efold handle") was driven and is FALSE — see the note on that test.
//
// RULING B — keep the chip, cut the duplicated scold.
//   The guide said "a few decisions are past their easy window" while the line directly
//   below said "Was due 5 days ago." — the same scold twice, once vague, once with a
//   number. Rams' dissent sustained: keep the instance, cut the generalisation.
const fs = require('fs');
const path = require('path');
// Vocabulary consolidation 2026-07-31: the chip's labels now come from here.
const { timeStatusLabel, PAST_WINDOW } = require('../timeStatusLabel');
const { useFrozenClock, daysFromNow } = require('../../testUtils/frozenClock');

const SHELL = path.join(__dirname, '..', '..', '..', 'hostv2', 'src', 'HostShellV2.jsx');

describe('ruling A — one disclosure, and no glyph on a handler that does not route', () => {
  const raw = fs.readFileSync(SHELL, 'utf8');
  // Code only: the comments deliberately quote the OLD strings ("See 3 other ways ›")
  // as the record of what was wrong, so the gate must read past them.
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  // Every <button className="decopt-disc" …>…</button> as written, so the assertions
  // below are scoped to the control itself rather than to the whole 15k-line file.
  const discButtons = src.match(/<button className="decopt-disc"[\s\S]*?<\/button>/g) || [];

  it('finds the disclosure control it is meant to police', () => {
    // Two: the closed (open-it) state and the open (fold-it) state.
    expect(discButtons.length).toBe(2);
  });

  it('the in-place "other ways" control renders ▸ closed and ▾ open — one control', () => {
    const closed = discButtons.find(b => b.includes('setDecDiscloseId(nd.id)'));
    const open = discButtons.find(b => b.includes('setDecDiscloseId(null)'));
    expect(closed).toMatch(/>Other ways\s+▸</);
    expect(open).toMatch(/>Other ways\s+▾</);
  });

  it('it carries NO count and NO navigation glyph', () => {
    const closed = discButtons.find(b => b.includes('setDecDiscloseId(nd.id)'));
    // `alts.length` in the label is the count; `›` is the false navigation (this
    // handler toggles in place and routes nowhere). Neither may return.
    expect(closed).not.toMatch(/alts\.length/);
    expect(closed).not.toContain('›');
    // The old expression, in any form, anywhere.
    expect(src).not.toMatch(/'See '\s*\+\s*alts\.length/);
  });

  it('the decopt disclosure is the ONLY control feeding setDecDiscloseId a value', () => {
    // Guards against a second entry point growing back with its own label/glyph.
    const opens = (src.match(/setDecDiscloseId\((?!null)/g) || []).length;
    expect(opens).toBe(1);
  });

  // ── THE HALF OF A THAT IS DELIBERATELY NOT SHIPPED ────────────────────────────
  // A also ordered the sibling-decisions disclosure (:5982 decision hero, :5944
  // conflict hero) DELETED, on the stated premise that "those rows already live under
  // the existing .efold 'The rest of your plan' handle". The handoff itself said
  // "verify that before deleting, or you strip access."
  //
  // DRIVEN 2026-07-30 on Game Night (T-2d, pristine, 3 open decisions bundled). The
  // premise is FALSE:
  //   • the .efold handle is only a scrollBy button — it renders no rows itself
  //   • the "Then, in order" block maps queue.slice(1); the bundle IS queue[0], so its
  //     KIDS are structurally excluded from it
  //   • inside the day-before window that block stands down entirely (nearDayPlan) —
  //     .ef-sect and .ef-list rendered EMPTY
  //   • the section chips offer Date & time / Venue / Guests / Food / Shopping / Rain
  //     plan / Budget — there is NO decisions door
  //   • expanding "the rest of your list · 6 more" did not surface them either
  // So on that screen "See all 3 ›" was the ONLY path to 2 of 3 open decisions, and
  // deleting it would strip access.
  //
  // RESOLVED AT THE RE-SIT: it was not deleted and not left alone — it was REPOINTED at
  // the Calls-to-make sheet (see the "repointed door" describe below). What this test
  // still pins is the CONFLICT hero's expander, which has no such door yet and must not
  // be deleted on the same stale premise.
  it('the conflict hero keeps its in-place expander until it too has a door', () => {
    const laterRows = src.match(/setBundleOpen\(m => \(\{ \.\.\.m, \[key\]: !open \}\)\)/g) || [];
    expect(laterRows.length).toBeGreaterThanOrEqual(2); // decision hero + conflict hero
    expect(src).toMatch(/Fold them away/);
  });
});

describe('ruling B — the overdue scold is said once, not twice', () => {
  const raw = fs.readFileSync(SHELL, 'utf8');
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  it('the vague decisions clause is suppressed when the hero IS that overdue decision', () => {
    expect(src).toMatch(/heroSpeaksThisOverdue\s*=\s*!!\(heroDecisionRow && heroDecisionRow\.status === 'overdue'\)/);
    // The guard has since gained a second suppressor (`!solemn`, 2026-07-30 — a repast
    // is never "past its easy window"). Assert both conditions rather than the exact
    // expression, so a THIRD legitimate suppressor doesn't read as a regression.
    expect(src).toMatch(/if \(od && !heroSpeaksThisOverdue[^)]*\) slips\.push\(/);
    expect(src).toMatch(/if \(od && !heroSpeaksThisOverdue && !solemn\) slips\.push\(/);
  });

  // GATE RE-POINTED (PR #70, 2026-07-31) — and, like the widening below, not a
  // convenience edit. These two pinned the SHAPE ruling B shipped: a
  // `heroDecisionRow` IIFE, and an ask ladder that read it. That shape was itself
  // only two-thirds of the invariant — the hero read heroDecisionRow while the
  // PANEL still dispatched its own decision, which is how a completed food-provider
  // pick came to render under a snack-quantity item on Game Night with the h2
  // saying "Decide the menu.". Both now read ONE canonical payload (heroSelection,
  // from lib/selectedAction), and heroDecisionRow is derived from it rather than
  // being a second derivation. The property B guards is unchanged and now stronger:
  // the suppression rides a RESOLVED decision, never title prose, and the ask cannot
  // be about a different decision than the panel.
  it('the guard is STRUCTURAL — a resolved selection, never a title regex', () => {
    expect(src).toMatch(/const heroSelection = \(\(\) => \{/);
    // heroDecisionRow is DERIVED from the canonical selection — not looked up again.
    expect(src).toMatch(/const heroDecisionRow = \(heroSelection && heroSelection\.decisionId\) \? heroSelection\.row : null/);
    // The selection denies decision identity whenever an earlier ask rung owns the
    // hero, so the guard can never claim a hero that is talking about something else.
    const block = src.slice(src.indexOf('const heroSelection'), src.indexOf('const heroAskText'));
    for (const rung of ['days === 0', 'blocker:', 'conflict', 'coi']) {
      expect(block).toContain(rung);
    }
  });

  it('ONE derivation — the ask ladder reads the same selection, not its own copy', () => {
    // Ruling C's lesson applied forward: if the ask ladder re-derived the decision
    // separately, B could suppress against a row the H1 is not actually speaking.
    expect(src).toMatch(/return heroSelection \? heroSelection\.ask : null/);
    const askBlock = src.slice(src.indexOf('const heroAskText'), src.indexOf('heroSelection ? heroSelection.ask'));
    expect(askBlock).not.toMatch(/decisionBoard\.open \|\| \[\]\)\.find/);
    // …and the PANEL reads the very same object, which is the half that was missing.
    expect(src).toMatch(/const heroDecisionND = \(heroSelection && heroSelection\.decision\)/);
  });

  it('only the DECISIONS clause is suppressed — time and spending slips survive', () => {
    expect(src).toMatch(/slips\.push\('time got tight'\)/);
    expect(src).toMatch(/slips\.push\('spending is past your number'\)/);
  });

  it('a specific instance is KEPT in the hero — B cut the generalisation, not the slot', () => {
    // B cuts the vague clause ABOVE the specificity line, never the line itself. The
    // STRING in that slot changed at the board re-sit: it is now `assurance`, not
    // `because`. What B guarantees is that the slot still SPEAKS.
    //
    // GATE WIDENED 2026-07-30, and why it is not a convenience edit. This used to pin
    // one literal — `dec.assurance && <p …>` — which asserted the assurance was spoken
    // FROM THAT SLOT. The follow-up fix ("one sentence, one author") kept the hero
    // speaking the assurance but moved it INTO the slip sentence above, because two
    // stacked sentences from two files read as a contradiction ("Time got tight." over
    // "Nothing's stalled…"). The old literal would have failed a change that honours
    // its own stated intent, so the gate now guards the INVARIANT instead: the hero
    // speaks the assurance, and speaks it exactly ONCE. Both halves are required —
    // delete either and this goes red, which is the property the literal was proxying.
    expect(src).toMatch(/heroAssuranceSpoken = true/);                        // the join happens
    expect(src).toMatch(/', but ' \+ String\(heroDecisionRow\.assurance\)/);  // …into the slip sentence
    expect(src).toMatch(                                                      // …and the slot defers to it
      /dec\.assurance && !heroAssuranceSpoken && <p className="because">\{dec\.assurance\}<\/p>/
    );
  });
});

// ─── BOARD RE-SIT (2026-07-30) — the disclosures and the overdue line ────────
//
// Both panels re-sat on the two halves left open. They converged on the diagnosis and
// split on the remedy for the disclosures; the event pros overrode on lived grounds
// (roster: they go second and may override where practice beats theory) and the host
// took the override. Recorded here so the reasoning survives the next reader.
describe('re-sit — one glyph rule, applied everywhere', () => {
  const raw = fs.readFileSync(SHELL, 'utf8');
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  // Ruling A enforced "render › ONLY when the handler routes" on ONE control
  // (decopt-disc) and shipped three violations of the same rule on the same screen.
  // The original gate was scoped to decopt-disc, so it could not catch them. This is
  // the widened version: EVERY hero disclosure whose handler only sets state.
  const IN_PLACE = [
    { name: 'conflict-hero bundle expander', handler: 'setBundleOpen' },
    { name: '"+ N more — show the rest"', handler: 'setQueueOpen(true)' },
  ];

  it.each(IN_PLACE)('$name toggles in place, so it wears ▸ and never ›', ({ handler }) => {
    // Find each button that owns this handler and assert on its rendered label.
    const buttons = src.match(/<button[\s\S]*?<\/button>/g) || [];
    const owning = buttons.filter(b => b.includes(handler) && /later-row|decopt-disc/.test(b));
    expect(owning.length).toBeGreaterThan(0);
    for (const b of owning) {
      expect(b).not.toContain('›');
    }
  });

  it('the ONE control that routes keeps its › — the glyph means something again', () => {
    // The repointed door opens the Calls-to-make sheet, so the chevron is earned.
    const buttons = src.match(/<button[\s\S]*?<\/button>/g) || [];
    const door = buttons.filter(b => b.includes("setSheet({ kind: 'decisions' })") && b.includes('Calls to make ('));
    expect(door.length).toBe(1);
    expect(door[0]).toContain('›');
  });
});

describe('re-sit — the repointed door (ruling A, resolved by override)', () => {
  const raw = fs.readFileSync(SHELL, 'utf8');
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  it('the decision hero routes to the sheet instead of expanding in place', () => {
    // A ordered this deleted; deleting strips the only first-screen path to the other
    // overdue calls (.efold renders no rows; "Then, in order" maps queue.slice(1) and
    // this bundle IS queue[0]). It changed KIND instead: expander -> door.
    expect(src).toMatch(/const others = \(a\.count != null \? a\.count : kids\.length\) - 1;/);
    expect(src).toMatch(/if \(others < 1\) return null;/);
  });

  it('it wears the SHEET\'S OWN NAME — one place, one vocabulary', () => {
    expect(src).toMatch(/'Calls to make \(' \+ others \+ '/);
    expect(src).not.toMatch(/'See all ' \+ \(a\.count != null \? a\.count : kids\.length\)/);
  });

  it('the count EXCLUDES the on-screen call — N new, not N total', () => {
    // "See all 3" offered 3 where only 2 were new. That inflated count is what made it
    // indistinguishable from the "Other ways" control beside it.
    expect(src).toMatch(/kids\.length\) - 1/);
  });
});

// ─── THE OVERDUE LINE — what the hero says vs what the sheet files ───────────
//
// "Was due 54 days ago." on an event SIX DAYS away. The arithmetic was correct
// (od = lead - daysToEvent) and the string was still wrong, twice over:
//   1. IT COLLIDED WITH THE COUNTDOWN. od exceeds the eyebrow whenever
//      lead > 2x daysToEvent. At T-6d every authored lead >= 14 collides --
//      ~71% of overdue-capable decisions. The majority case, not an edge.
//   2. IT WAS INACCURATE. Nothing stalled: choicePickFor() returns
//      `picks[id] || dec.default`, and the doctrine comment above it says those
//      helpers "fall back to the playbook's authored default so quantities/
//      visibility render sensibly before any pick is made".
// So the hero speaks forward (`assurance`) and the sheet keeps the status
// (`because`) -- a filing view legitimately carries one.
const { playbookDecisionBoard } = require('../playbooks');
const { daysUntil } = require('../dates');

describe('re-sit — the hero says what is true forward', () => {
  useFrozenClock();
  // LAZY (2026-07-31): these were module-collection-time constants, which run
  // BEFORE beforeEach installs the frozen clock — so they would still have read
  // the real wall clock. Built per test instead.
  const EVENTS = () => [
    { id: 'as-re6', name: 'Family Reunion', type: 'family reunion', date: daysFromNow(6), guestMode: 'count', guestCount: 45, venueKind: 'venue', venue: 'Fort Smallwood Park', guests: [], vendors: [], timeline: [] },
    { id: 'as-gn2', name: 'Game Night', type: 'game night', date: daysFromNow(2), guestMode: 'count', guestCount: 12, venueKind: 'home', venueCity: 'Atlanta', venueState: 'GA', guests: [], vendors: [], timeline: [] },
    { id: 'as-ck5', name: 'Cookout', type: 'juneteenth cookout', date: daysFromNow(5), guestMode: 'count', guestCount: 30, venueKind: 'venue', venue: 'VFW Post 3150', guests: [], vendors: [], timeline: [] },
  ];
  const overdueRows = () => EVENTS().flatMap(ev =>
    (playbookDecisionBoard(ev).open || []).filter(r => r && r.status === 'overdue').map(r => ({ ev: ev.name, r })));

  it('really has overdue decisions to police (never a vacuous pass)', () => {
    // Precondition: all three fixtures are future-dated at the leads they claim.
    expect(EVENTS().map(e => daysUntil(e.date))).toEqual([6, 2, 5]);
    expect(overdueRows().length).toBeGreaterThan(3);
  });

  it('the assurance NEVER carries a day-count — the eyebrow is the one clock', () => {
    for (const { ev, r } of overdueRows()) {
      if (!r.assurance) continue;
      expect(`${ev}: ${r.assurance}`).not.toMatch(/\d+\s*(day|days|month|months|week|weeks)/i);
    }
  });

  it('the assurance never scolds — no "due", no deadline the host never set', () => {
    for (const { ev, r } of overdueRows()) {
      if (!r.assurance) continue;
      expect(`${ev}: ${r.assurance}`.toLowerCase()).not.toContain('due');
      expect(`${ev}: ${r.assurance}`.toLowerCase()).not.toContain('overdue');
      expect(`${ev}: ${r.assurance}`.toLowerCase()).not.toContain('late');
    }
  });

  it('it is NULL without a default — no invented reassurance', () => {
    // The claim "the plan's been running on our pick" is only true when there IS a
    // pick to have been running on. A genuine either/or prints nothing instead.
    for (const { r } of overdueRows()) {
      if (r.assurance) continue;
      expect(r.assurance).toBeNull();
    }
    // And where it IS set, it must be the grounded claim, not a generic softener.
    const set = overdueRows().filter(x => x.r.assurance);
    expect(set.length).toBeGreaterThan(0);
    for (const { r } of set) expect(r.assurance).toMatch(/running on my pick/);
  });

  it('`because` still EXISTS on the row — the fact is kept, not deleted', () => {
    // The arithmetic remains available to any surface that legitimately files status.
    // What changed is who renders it: see the one-theory gate below.
    expect(overdueRows().some(x => /Was due|easy window closed/.test(x.r.because))).toBe(true);
  });
});

// ─── ONE THEORY OF THE DELAY, AT BOTH ALTITUDES ──────────────────────────────
//
// This describe REPLACES an earlier assertion of mine that read "the SHEET keeps the
// status line". That test was wrong, and the event pros caught it in the sharpest terms
// available: *"a gate that protects the defect is further from blessing than the defect
// alone."* It pinned the very split the Grandmother said blocks blessing — hero forward,
// rows filing-voice — and turned an oversight into an enforced contract.
//
// The rule now: the ROW reads the SAME `assurance` predicate the sheet's SUMMARY reads.
//   assurance present -> a default has been driving the plan. Nothing is stalled, so no
//     --danger alarm and no backwards day-count; the window passing stays visible as a
//     fact ("past its window") because a filing view still has to rank.
//   assurance absent  -> nothing has been holding it. It genuinely IS waiting on the
//     host, "overdue" is honest, and the hero prints no assurance either — so the two
//     surfaces still agree.
describe('re-sit — the sheet rows use the hero’s theory', () => {
  const raw = fs.readFileSync(SHELL, 'utf8');
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  it('one predicate drives both the chip and the line', () => {
    expect(src).toMatch(/const runningOnOurPick = !!r\.assurance;/);
    expect(src).toMatch(/const lateLine = \(r\.status === 'overdue' && r\.assurance\) \? r\.assurance : r\.because;/);
  });

  it('no row hard-codes the danger chip any more — all four sites read lateChip', () => {
    // Three render branches (settle / editor / routed) each stamped their own
    // --danger "overdue". A per-site literal is how the theory diverged in the first place.
    // 2026-08-18: a FOURTH site joined — the accordion's collapsed decision row
    // (one call expanded at a time) — and it reads the same lateChip/lateLine
    // pair, which is precisely the contract this test exists to hold.
    const hardCoded = (src.match(/background: 'var\(--danger-tint\)' \}\}>overdue<\/span>/g) || []).length;
    expect(hardCoded).toBe(1); // the single definition inside lateChip, nowhere else
    expect((src.match(/\{lateChip\}/g) || []).length).toBe(4);
    expect((src.match(/\{lateLine && <span className="v-meta">/g) || []).length).toBe(4);
  });

  it('danger is reserved for a call nothing is holding', () => {
    const block = src.slice(src.indexOf('const lateChip'), src.indexOf('const lateLine'));
    // The PAIRING is the ruling: warn tint carries "past its window" (something is
    // holding it), danger carries "overdue" (nothing is). Unchanged. After the
    // 2026-07-31 vocabulary consolidation the warn branch renders the shared
    // PAST_WINDOW constant instead of its own copy of the literal, so the match
    // is on the token — and the constant's VALUE is pinned just below.
    expect(block).toMatch(/runningOnOurPick[\s\S]*--warn-tint[\s\S]*\{PAST_WINDOW\}/);
    expect(block).toMatch(/--danger-tint[\s\S]*overdue/);
    expect(PAST_WINDOW).toBe('past its window');
  });

  it('the anonymous heart banner stays deleted — keep the instance, cut the generalisation', () => {
    // Ruling B, one surface over. The instance lives on the heart ROW via
    // rankReasonForV2; a banner above the list could only re-say it worse, and it
    // scolded the host for the default the same screen said was holding fine.
    expect(src).not.toMatch(/One of these is the moment your guests will remember/);
    expect(src).not.toMatch(/don’t let it settle on a default/);
    expect(raw).toMatch(/This is the moment your guests will remember — worth deciding yourself\./);
  });
});

describe('re-sit — the guide stops re-reassuring, but keeps its one fact', () => {
  const raw = fs.readFileSync(SHELL, 'utf8');
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  it('drops the frame and the vague CTA when the hero carries its own assurance', () => {
    // "Mostly on course" restates "Nothing's stalled"; "Worth a look today." is the
    // Review-status/Check-details vagueness 04 bans. Both go — but only on the frame
    // where the hero already reassures.
    expect(src).toMatch(/statusNode = heroSpeaksThisOverdue \? \(/);
    expect(src).toMatch(/slipText\.charAt\(0\)\.toUpperCase\(\) \+ slipText\.slice\(1\)/);
  });

  it('KEEPS the slip fact — suppressing it would delete information, not duplication', () => {
    // compression.headline renders in full ONLY in the non-elegant block, and elegant is
    // the default, so this fragment is an elegant host's only telling that time got tight.
    expect(src).toMatch(/slips\.push\('time got tight'\)/);
    expect(src).toMatch(/const slipText = slips\.slice\(0, 2\)\.join\(', and '\)/);
  });

  it('the full frame SURVIVES where the hero is not the overdue decision', () => {
    // Driven: Wanda still reads "Mostly on course — spending is past your number.
    // Worth a look today." Its hero is not a board decision, so heroDecisionRow is null.
    expect(src).toMatch(/Mostly on course — \{slipText\}\. Worth a look today\./);
  });
});

// ─── THE THREE LEFT OPEN AT THE RE-SIT, CLOSED BY DRIVING THEM ───────────────
describe('re-sit follow-ups — verified live, then fixed', () => {
  const raw = fs.readFileSync(SHELL, 'utf8');
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  it('"+ N more" no longer renders in the elegant ask loop — it was PROVEN inert', () => {
    // Driven on Reunion T-6d: clicking it left the DOM byte-identical (same card count,
    // same six "Then, in order" rows, same sections) and the button still offered "+2
    // more". It sets queueOpen, but elegant returns null for every non-critical position
    // past the hero regardless, and its guard renders it only when the block it would
    // reveal is ALREADY on screen. thenItems = queue.slice(1) already lists everything.
    expect(src).toMatch(/hiddenCount > 0 && !\(nearDayPlan && !queueOpen\) && !\(elegantMode && askMode\)/);
  });

  it('the accept is BRIGHTER than the bookmark beside it', () => {
    // Measured live, not judged off a JPG: .mini paints --steel-soft rgb(138,163,176)
    // and this button overrode to --steel rgb(78,104,119) -- DARKER than its own
    // secondary. Now --ink rgb(238,240,244), verified brighter in computed styles.
    const buttons = src.match(/<button[\s\S]*?<\/button>/g) || [];
    const accept = buttons.find(b => b.includes('Sounds good'));
    expect(accept).toBeTruthy();
    expect(accept).toMatch(/color: 'var\(--ink\)'/);
    expect(accept).not.toMatch(/color: 'var\(--steel\)'/);
  });

  it('the conflict hero\'s inline time picker wears ▸, not ›', () => {
    // setConflictTime opens a picker IN PLACE. Fourth survivor of the glyph rule,
    // found while driving the wedding conflict hero.
    const buttons = src.match(/<button className="confrow"[\s\S]*?<\/button>/g) || [];
    const custom = buttons.find(b => b.includes('setConflictTime'));
    expect(custom).toBeTruthy();
    expect(custom).not.toContain('›');
    expect(custom).toContain('▸');
  });

  it('the conflict hero KEEPS its expander — its kids settle in place, a sheet would be a downgrade', () => {
    // Unlike the decisions bundle (whose sheet is richer), the 12 conflict kids carry
    // one-tap inline settles ("Confirm early access", "Signed — attach the file").
    // Driven on the wedding. Repointing it would trade action for navigation.
    expect(src).toMatch(/Fold them away/);
  });
});

// ─── THE PINNED BAR'S GATE MUST FOLLOW THE NODE, NOT A DEP LIST ──────────────
//
// Board re-sit 2026-07-30. A host arriving via the WELCOME GATE got a pinned "NEXT"
// bar sitting over their content, permanently — the first-run path.
//
// The old shape: useEffect(..., [stage, event.id]) containing
//   if (!el) { setHeroInView(false); return; }
// On the welcome gate `.hzone` does not exist, so that branch LATCHED false.
// Dismissing the gate flips the separate `welcome` state — it does NOT touch
// `stage` or `event.id` — so the effect never re-ran and nothing set it back.
//
// Proven live on production, same tab / same event / same scrollTop 0, entry path
// the only variable:   via welcome gate -> bar present (wrong)
//                      direct load      -> bar absent  (right)
// After the fix, driven on both paths plus a scroll:
//   welcome gate, scrollTop 0    -> hero top 276, bar ABSENT
//   scrolled, scrollTop 1000     -> hero bottom -684, bar PRESENT
describe('re-sit — the heroInView subscription rides the node', () => {
  const raw = fs.readFileSync(SHELL, 'utf8');
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  it('the observer attaches via a callback ref, not a dep-list effect', () => {
    expect(src).toMatch(/const attachHeroZone = useCallback\(\(el\) => \{/);
    expect(src).toMatch(/<div ref=\{attachHeroZone\} className="hzone">/);
  });

  it('NO dep-list effect may own the hero observer again', () => {
    // The regression class: any [stage, event.id]-style list will fall behind the
    // reasons a hero can mount late. If this returns, the first-run bug returns.
    expect(src).not.toMatch(/setHeroInView\(false\); return; \}[\s\S]{0,400}\}, \[stage, event\.id\]\)/);
  });

  it('a MISSING hero never reads as "hero scrolled away"', () => {
    // The bar is an echo of a hero that LEFT the viewport. With no hero there is
    // nothing to echo, so absence must mean "don't show it" — matching useState(true).
    expect(src).toMatch(/useState\(true\)/);
    const cb = src.slice(src.indexOf('const attachHeroZone'), src.indexOf('heroIoRef.current = io;'));
    expect(cb).toMatch(/if \(!el \|\| typeof IntersectionObserver === 'undefined'\) \{ setHeroInView\(true\); return; \}/);
    expect(cb).not.toMatch(/setHeroInView\(false\)/);
  });

  it('the observer is disconnected on detach and on unmount', () => {
    expect(src).toMatch(/if \(heroIoRef\.current\) \{ heroIoRef\.current\.disconnect\(\); heroIoRef\.current = null; \}/);
  });
});

// ─── A SOLEMN DAY IS NOT LATE ────────────────────────────────────────────────
//
// Found by the Spine Stress recruitment, 2026-07-30, and reproduced end-to-end before
// any fix. A repast four days out rendered, verbatim, to a family that had just buried
// someone:
//
//   "Settle: Who provides the food."
//   "2 decisions are past their easy window — this one first.
//    The spread and shopping list size from them."
//
// Both halves false. repast.js — same repo, verificationStatus:'researched' — records
// why in its own culturalContext: "the family does NOT cook — a church, repast
// committee, or neighbors carry the meal." So the app scolded the bereaved for being
// slow to accept food already on its way, and told them to go shopping.
//
// THE ARCHITECTURAL POINT, and the reason this test lives here rather than in a copy
// suite: the repast author could not have prevented it. There is no `when`, `weight`,
// or `emotionalWeight` that reaches a global copy string in planHeroCopy. Per-playbook
// authoring cannot express "this event type has no overdue state". That is evidence in
// the per-playbook vs per-capability ruling, produced by the codebase itself.
const { planHeroCopy } = require('../planHeroCopy');
const { isSolemnEvent } = require('../solemn');

describe('a solemn day is not late', () => {
  useFrozenClock();
  const repast = () => ({
    id: 'rp-gate', name: 'Repast for Deacon Willie Hayes', type: 'repast',
    date: daysFromNow(4), createdAt: daysFromNow(-2), guestMode: 'count', guestCount: 50,
    venueKind: 'venue', venue: 'Mount Zion Baptist Church — Fellowship Hall',
    guests: [], vendors: [], timeline: [],
  });

  it('really produces overdue rows — the scenario is not vacuous', () => {
    const { playbookDecisionBoard } = require('../playbooks');
    // Preconditions FIRST: a solemn event, genuinely future-dated at 4 days.
    // Without these the "not late" assertions below could pass vacuously on a
    // fixture that had quietly drifted into the past.
    expect(isSolemnEvent(repast())).toBe(true);
    expect(daysUntil(repast().date)).toBe(4);
    const overdue = (playbookDecisionBoard(repast()).open || []).filter(r => r.status === 'overdue');
    expect(overdue.length).toBeGreaterThan(0);
  });

  it('never says the bereaved are past a window, and never sends them shopping', () => {
    const c = planHeroCopy(repast());
    const blob = `${c.title} ${c.line} ${c.cta}`.toLowerCase();
    for (const banned of ['easy window', 'past their', 'past its', 'overdue', 'shopping list', 'the spread']) {
      expect(blob).not.toContain(banned);
    }
    expect(c.title).not.toMatch(/^Settle:/); // no imperative on a grief clock
  });

  it('anchors FORWARD to the runway, never backward to an overshoot', () => {
    const c = planHeroCopy(repast());
    expect(c.line).toMatch(/days to go|day to go|the day is here/);
  });

  it('the classifier is SHARED — one derivation, shell and copy engine', () => {
    expect(isSolemnEvent({ type: 'repast' })).toBe(true);
    expect(isSolemnEvent({ type: 'birthday', name: 'Memorial for Dad' })).toBe(true);
    expect(isSolemnEvent({ type: 'juneteenth cookout' })).toBe(false);
    const shell = fs.readFileSync(SHELL, 'utf8');
    expect(shell).toMatch(/import \{ isSolemnEvent \} from '@app\/lib\/solemn'/);
    expect(shell).not.toMatch(/const SOLEMN_RE = /); // the local copy is gone
  });

  it('a NON-solemn event keeps its original voice — this was surgical', () => {
    const cookout = { id: 'ck-gate', name: 'Cookout', type: 'juneteenth cookout', date: daysFromNow(5), guestMode: 'count', guestCount: 30, venueKind: 'venue', venue: 'VFW Post 3150', guests: [], vendors: [], timeline: [] };
    const c = planHeroCopy(cookout);
    expect(c.title).toMatch(/^Settle:/);
    expect(c.line).toMatch(/easy window/);
  });

  it('a label already ending in ? does not gain a period', () => {
    const cookout = { id: 'ck-p', name: 'Cookout', type: 'juneteenth cookout', date: daysFromNow(5), guestMode: 'count', guestCount: 30, venueKind: 'venue', venue: 'VFW', guests: [], vendors: [], timeline: [] };
    expect(planHeroCopy(cookout).title).not.toMatch(/[?!]\./);
  });
});

describe('a solemn day is not late — the hostv2 hero too', () => {
  const raw2 = fs.readFileSync(SHELL, 'utf8');
  const src2 = raw2.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  it('the overdue-count clause is suppressed on a solemn event', () => {
    // The planHeroCopy fix reached the CRA Plan tab only — hostv2 does NOT consume
    // planHeroCopy (a grep matched a comment, not a call). This is the same defect on
    // the other surface, and it needed its own guard.
    expect(src2).toMatch(/if \(od && !heroSpeaksThisOverdue && !solemn\) slips\.push\(/);
  });

  it('solemn is derived from the SHARED classifier, not a local regex', () => {
    expect(src2).toMatch(/const solemn = useMemo\(\(\) => isSolemnEvent\(event\)/);
    expect(src2).not.toMatch(/const SOLEMN_RE = /);
  });

  // Caught by DRIVING the built shell, not by reading source (2026-07-31): the slips
  // clause above was guarded, but two *other* surfaces still printed backward blame
  // over a repast hero — the hero's due chip ("past its window") and the decision
  // row's late chip ("past its window" / "overdue"). Source-only review missed both
  // because each is a separate expression. These pin all three altitudes.
  it('the hero due chip drops the OVERSHOOT on a solemn event, keeping forward states', () => {
    expect(src2).toMatch(/if \(solemn && a\.dueInDays < 0\) return null;/);
    // forward states must survive — only the negative branch is suppressed
    // The inline ternary moved to the shared timeStatusLabel helper; the guarantee
    // is unchanged, now asserted on real output rather than source shape.
    expect(src2).toMatch(/timeStatusLabel\(a\.dueInDays\)/);
    expect(timeStatusLabel(0)).toBe('due today');
  });

  it('the decision row late chip is suppressed on a solemn event', () => {
    expect(src2).toMatch(/const lateChip = \(r\.status !== 'overdue' \|\| solemn\) \? null/);
  });
});
