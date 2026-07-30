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
    expect(src).toMatch(/if \(od && !heroSpeaksThisOverdue\) slips\.push\(/);
  });

  it('the guard is STRUCTURAL — heroDecisionRow, never a title regex', () => {
    // The whole class of bug ruling C closed was classification by title prose. B must
    // not reintroduce it: the suppression rides the resolved decision row.
    expect(src).toMatch(/const heroDecisionRow = \(\(\) => \{/);
    // heroDecisionRow yields null whenever an earlier ask rung owns the hero, so the
    // guard can never claim a hero that is talking about something else.
    const block = src.slice(src.indexOf('const heroDecisionRow'), src.indexOf('const heroAskText'));
    for (const rung of ['days === 0', 'blocker:', 'conflict', 'coi']) {
      expect(block).toContain(rung);
    }
  });

  it('ONE derivation — the ask ladder reads the same heroDecisionRow, not its own copy', () => {
    // Ruling C's lesson applied forward: if the ask ladder re-derived the decision row
    // separately, B could suppress against a row the H1 is not actually speaking.
    expect(src).toMatch(/if \(elegantMode && heroDecisionRow\) \{/);
    const askBlock = src.slice(src.indexOf('const heroAskText'), src.indexOf('heroAskFor(q0, event)'));
    expect(askBlock).not.toMatch(/decisionBoard\.open \|\| \[\]\)\.find/);
  });

  it('only the DECISIONS clause is suppressed — time and spending slips survive', () => {
    expect(src).toMatch(/slips\.push\('time got tight'\)/);
    expect(src).toMatch(/slips\.push\('spending is past your number'\)/);
  });

  it('a specific instance is KEPT in the hero — B cut the generalisation, not the slot', () => {
    // B cuts the vague clause ABOVE the specificity line, never the line itself. The
    // STRING in that slot changed at the board re-sit (see the next describe): it is
    // now `assurance`, not `because`. What B guarantees is that the slot still speaks.
    expect(src).toMatch(/dec\.assurance && <p className="because">\{dec\.assurance\}<\/p>/);
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

describe('re-sit — the hero says what is true forward', () => {
  const iso = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
  const EVENTS = [
    { id: 'as-re6', name: 'Family Reunion', type: 'family reunion', date: iso(6), guestMode: 'count', guestCount: 45, venueKind: 'venue', venue: 'Fort Smallwood Park', guests: [], vendors: [], timeline: [] },
    { id: 'as-gn2', name: 'Game Night', type: 'game night', date: iso(2), guestMode: 'count', guestCount: 12, venueKind: 'home', venueCity: 'Atlanta', venueState: 'GA', guests: [], vendors: [], timeline: [] },
    { id: 'as-ck5', name: 'Cookout', type: 'juneteenth cookout', date: iso(5), guestMode: 'count', guestCount: 30, venueKind: 'venue', venue: 'VFW Post 3150', guests: [], vendors: [], timeline: [] },
  ];
  const overdueRows = EVENTS.flatMap(ev =>
    (playbookDecisionBoard(ev).open || []).filter(r => r && r.status === 'overdue').map(r => ({ ev: ev.name, r })));

  it('really has overdue decisions to police (never a vacuous pass)', () => {
    expect(overdueRows.length).toBeGreaterThan(3);
  });

  it('the assurance NEVER carries a day-count — the eyebrow is the one clock', () => {
    for (const { ev, r } of overdueRows) {
      if (!r.assurance) continue;
      expect(`${ev}: ${r.assurance}`).not.toMatch(/\d+\s*(day|days|month|months|week|weeks)/i);
    }
  });

  it('the assurance never scolds — no "due", no deadline the host never set', () => {
    for (const { ev, r } of overdueRows) {
      if (!r.assurance) continue;
      expect(`${ev}: ${r.assurance}`.toLowerCase()).not.toContain('due');
      expect(`${ev}: ${r.assurance}`.toLowerCase()).not.toContain('overdue');
      expect(`${ev}: ${r.assurance}`.toLowerCase()).not.toContain('late');
    }
  });

  it('it is NULL without a default — no invented reassurance', () => {
    // The claim "the plan's been running on our pick" is only true when there IS a
    // pick to have been running on. A genuine either/or prints nothing instead.
    for (const { r } of overdueRows) {
      if (r.assurance) continue;
      expect(r.assurance).toBeNull();
    }
    // And where it IS set, it must be the grounded claim, not a generic softener.
    const set = overdueRows.filter(x => x.r.assurance);
    expect(set.length).toBeGreaterThan(0);
    for (const { r } of set) expect(r.assurance).toMatch(/running on our pick/);
  });

  it('the SHEET keeps the status line — because is untouched', () => {
    // The filing view legitimately carries "Was due N days ago."; only the hero moved.
    expect(overdueRows.some(x => /Was due|easy window closed/.test(x.r.because))).toBe(true);
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
