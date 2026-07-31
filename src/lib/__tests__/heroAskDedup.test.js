// ─── THE HERO NEVER SPEAKS ITS ASK TWICE ─────────────────────────────────────
//
// Board ruling C, 2026-07-30. Driven live and reported by the host: the same hero
// component rendered the ask ONCE on some events and TWICE on others.
//
//   Reunion (30d)   H1 "Indoor or outdoor?"      no card title      → once
//   Game Night (2d) H1 "Who provides the food?"  title "Who provides the food" → TWICE
//
// ROOT CAUSE (verified in code, not inferred): the card-title dedup did not compare
// against the H1 that was actually rendered. The H1 ran a ladder ending in a decision
// branch (`decRow.label + '?'`); the dedup independently called heroAskFor(), which has
// NO decision branch and returned "Decide the menu." for the same action. Token set
// {decide,the,menu} vs record `who provides the food` → adds === true → the title
// rendered → the host read one question twice. Reunion's record happened to overlap its
// heroAskFor output → suppressed. Same component, opposite result, decided by nothing but
// a coincidence of vocabulary.
//
// THE RULE THIS GATE ENFORCES: the card title is deduped against THE ASK THAT IS ACTUALLY
// ON SCREEN. Two halves, both required — either alone can pass while the bug is live:
//
//   (1) BEHAVIOURAL — heroRecord's contract. Given the rendered ask, the record it returns
//       never re-speaks a >2-char word of it. Proven over real playbook decisions.
//   (2) STRUCTURAL — there is only ONE derivation of the ask in the shell. A source gate,
//       because (1) is worthless if the dedup is handed a different string than the H1.
//
// A DOM assertion on `.hero-card h3` vs `.ask` was the originally-specified gate. It is
// strictly weaker than this pair and only covers seeded events: (1)+(2) together make the
// double-ask unreachable for EVERY event, seeded or host-authored.
const fs = require('fs');
const path = require('path');
const { heroAskFor, heroRecord } = require('../heroAsk');
const { playbookDecisionBoard } = require('../playbooks');

const ROOT = path.join(__dirname, '..', '..', '..');
const SHELL = path.join(ROOT, 'hostv2', 'src', 'HostShellV2.jsx');

const iso = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

// The two events that DISAGREED, plus a spread of others so the gate is not a two-case
// snapshot. Shapes mirror hostv2/src/eventPool.js's test seeds.
const EVENTS = [
  { id: 'hd-gn', name: 'Game Night', type: 'game night', date: iso(2), guestMode: 'count', guestCount: 12, venueKind: 'home', venueCity: 'Atlanta', venueState: 'GA', guests: [], vendors: [], timeline: [] },
  { id: 'hd-re', name: 'Family Reunion', type: 'family reunion', date: iso(30), guestMode: 'count', guestCount: 45, venueKind: 'venue', venue: 'Fort Smallwood Park — Pasadena, MD', guests: [], vendors: [], timeline: [] },
  { id: 'hd-ck', name: 'Cookout', type: 'juneteenth cookout', date: iso(5), guestMode: 'count', guestCount: 30, venueKind: 'venue', venue: 'VFW Post 3150 — Alexandria, VA', guests: [], vendors: [], timeline: [] },
  { id: 'hd-rt', name: 'Retirement Party', type: 'retirement party', date: iso(30), guestMode: 'count', guestCount: 60, venueKind: 'venue', venue: 'The Ironwood Room at Maplewood Country Club', guests: [], vendors: [], timeline: [] },
  { id: 'hd-wd', name: 'Wedding', type: 'wedding', date: iso(72), guestMode: 'count', guestCount: 120, venueKind: 'venue', venue: 'Oxon Hill Manor — Oxon Hill, MD', guests: [], vendors: [], timeline: [] },
];

// EXACTLY the transform HostShellV2's heroAskText applies to a decision row to build the
// rendered H1 (parenthetical meta + quotes stripped, trailing periods dropped, '?' added).
// Kept in lockstep by the structural half below, which pins the shell's own expression.
const askFromLabel = (label) => String(label || '')
  .replace(/\s*\(.*?\)\s*/g, ' ').replace(/["“”"]/g, '').replace(/\.+$/, '').trim() + '?';

// A decision-board "call" reaches the hero card titled `Resolve "<label>"` — the shape
// heroRecord's verb+quote stripping was written for.
const callTitleFor = (label) => 'Resolve "' + String(label) + '"';

const bigTokens = (s) => String(s || '').toLowerCase()
  .replace(/[^a-z\s’']/g, '').split(/\s+/).filter(w => w.length > 2);

const overlap = (a, b) => {
  const B = new Set(bigTokens(b));
  return bigTokens(a).filter(w => B.has(w));
};

describe('ruling C — the ask is spoken once (behavioural: heroRecord vs the rendered ask)', () => {
  // Scenario integrity first. If the engines stop producing open decisions the assertions
  // below become vacuous — the exact trap that let revealOneHeadcount pass while broken.
  const rows = [];
  for (const ev of EVENTS) {
    for (const r of (playbookDecisionBoard(ev).open || [])) rows.push({ ev: ev.name, label: r.label, id: r.id });
  }

  it('really has decisions to police (never a vacuous pass)', () => {
    expect(rows.length).toBeGreaterThan(8);
    // The two rows the host actually reported, by id — if a playbook rename drops them the
    // gate must go red rather than quietly stop covering the reported defect.
    expect(rows.some(r => r.ev === 'Game Night' && /food/i.test(r.id))).toBe(true);
    expect(rows.some(r => r.ev === 'Family Reunion' && /venue-setting/i.test(r.id))).toBe(true);
  });

  it('no card title re-speaks a word of the ask actually rendered above it', () => {
    const offenders = [];
    for (const r of rows) {
      const ask = askFromLabel(r.label);
      const rec = heroRecord({ title: callTitleFor(r.label) }, ask);
      if (rec) {
        const dup = overlap(rec, ask);
        if (dup.length) offenders.push(`${r.ev} · ${r.id}: ask=${JSON.stringify(ask)} title=${JSON.stringify(rec)} shares ${JSON.stringify(dup)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the two events that disagreed now behave IDENTICALLY', () => {
    // This disagreement disappearing is the proof the board asked for.
    const gn = rows.find(r => r.ev === 'Game Night' && /food/i.test(r.id));
    const re = rows.find(r => r.ev === 'Family Reunion' && /venue-setting/i.test(r.id));
    for (const r of [gn, re]) {
      const ask = askFromLabel(r.label);
      expect(heroRecord({ title: callTitleFor(r.label) }, ask)).toBeNull();
    }
  });

  it('FAILS when the bug is reintroduced — deduping against a second derivation', () => {
    // Proving the gate has teeth (discipline: a new gate must fail when you put the bug
    // back). heroAskFor is that second derivation: it has no decision branch, so on a food
    // decision it says "Decide the menu." while the screen says "Who provides the food?".
    const gn = rows.find(r => r.ev === 'Game Night' && /food/i.test(r.id));
    const rendered = askFromLabel(gn.label);
    const secondDerivation = heroAskFor({ title: gn.label, domain: 'food' }, {});

    // The premise of the whole bug: the two strings genuinely disagree.
    expect(secondDerivation).not.toBe(rendered);

    // Dedup against the RENDERED ask → suppressed (correct, what ships now).
    expect(heroRecord({ title: callTitleFor(gn.label) }, rendered)).toBeNull();
    // Dedup against the second derivation → the title comes back and re-speaks the ask.
    const bugged = heroRecord({ title: callTitleFor(gn.label) }, secondDerivation);
    expect(bugged).not.toBeNull();
    expect(overlap(bugged, rendered).length).toBeGreaterThan(0);
  });

  it('normalizes both sides — a punctuated record cannot smuggle a duplicate through', () => {
    // The ask was punctuation-stripped and the record was not, so "outdoor?" could never
    // match the clean "outdoor" it duplicates. Same ask-twice defect, one layer down.
    expect(heroRecord({ title: 'Resolve "Indoor or outdoor?"' }, 'Indoor or outdoor?')).toBeNull();
    expect(heroRecord({ title: 'Decide the red foods + "red drink"' }, 'The red foods + red drink?')).toBeNull();
  });

  it('still names the record when it genuinely ADDS information', () => {
    // The dedup must not become "always suppress" — that would silently strip the panel's
    // noun and pass every assertion above.
    expect(heroRecord({ title: 'Confirm Semper Catering Co' }, 'Confirm your caterer.')).toMatch(/Semper/);
    expect(heroRecord({ title: 'Send payment to Hearthstone Catering Co' }, 'Your next step.')).toMatch(/Hearthstone/);
  });
});

describe('ruling C — the ask has ONE derivation (structural: the shell itself)', () => {
  const raw = fs.readFileSync(SHELL, 'utf8');
  // Scan CODE only. HostShellV2's comments quote the broken call (`heroAskFor(a, event)`)
  // as the record of what went wrong — that prose is why the trap stays understood, so the
  // gate reads past it rather than forcing the explanation to be deleted.
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  it('heroAskFor is called exactly once — inside the one hoisted ladder', () => {
    const calls = (src.match(/heroAskFor\s*\(/g) || []).length;
    // 1 = the tail of heroAskText. Any second call is a second derivation of the ask, which
    // is the defect itself: fold it into heroAskText instead of calling this again.
    expect(calls).toBe(1);
  });

  it('the rendered <h2 className="ask"> IS heroAskText, not an inline IIFE', () => {
    expect(src).toMatch(/<h2\s+className="ask"[^>]*>\{heroAskText\}<\/h2>/);
  });

  it('the card-title dedup is fed heroAskText', () => {
    expect(src).toMatch(/heroRecord\(\s*a\s*,\s*heroAskText\s*\)/);
    // No caller may pass anything else — one ask string, one dedup input.
    for (const m of src.match(/heroRecord\([^)]*\)/g) || []) {
      expect(m).toMatch(/heroAskText/);
    }
  });

  it('the browser tab speaks the same string the screen does', () => {
    // The tab was a third, silently-diverging derivation: it called heroAskFor(queue[0])
    // directly, so it read "Decide the menu." while the H1 read "Who provides the food?".
    expect(src).toMatch(/document\.title\s*=\s*heroAskText/);
  });

  it('the heroDecisionAsk title-prose regex stays deleted', () => {
    // Classification rides the ACTION, never the title. This regex
    // (/serving|decide the menu|the menu\b|the spread/) suppressed the record by sniffing
    // prose and was the same failure mode already documented for COI. The record is
    // deduped structurally now; decHeroActions is the honest "rows carry the meaning" signal.
    expect(src).not.toMatch(/heroDecisionAsk/);
  });
});

// ─── AN AUTHORED ASK BEATS PROSE CLASSIFICATION ──────────────────────────────
//
// Host-reported 2026-07-30, driven: the hero read "Add who's coming." above
// "2 confirmed guests still need seats / 0 of 2 confirmed guests are seated",
// and offered a headcount stepper. The guests were already added and confirmed —
// the stepper could not act on the thing being raised.
//
// ROOT CAUSE, same family as ruling C: heroAskFor classifies by domain and title
// PROSE, and surfaceRegistry's `seating` surface declares domain 'guests' because
// seating is guest work. Its title contains "guests", so the guests branch matched
// and named the wrong job. A surface's domain is not always its job.
//
// THE RULE: a surface that knows its own job may author `ask`, and that always wins.
describe('an authored ask wins over domain/title classification', () => {
  it('the seating raise names seating, not adding guests', () => {
    const seatingRaise = {
      title: '2 confirmed guests still need seats',
      domain: 'guests',              // the exact collision — domain is not the job
      ask: 'Seat your guests.',
    };
    expect(heroAskFor(seatingRaise, {})).toBe('Seat your guests.');
  });

  it('WITHOUT the authored ask it still misfires — proving the ask is what fixes it', () => {
    const { ask, ...noAsk } = {
      title: '2 confirmed guests still need seats',
      domain: 'guests',
      ask: 'Seat your guests.',
    };
    // This is the bug as the host saw it. Kept as a live demonstration so nobody
    // "simplifies" the authored-ask branch away believing the ladder handles it.
    expect(heroAskFor(noAsk, {})).toBe('Add who’s coming.');
  });

  it('classification still runs for every raise that authors nothing', () => {
    expect(heroAskFor({ title: 'Set the budget', domain: 'budget' }, {})).toBe('Set your budget.');
    expect(heroAskFor({ title: 'Pick the day', domain: 'date' }, {})).toBe('Pick the day.');
  });

  it('the seating surface actually carries the ask', () => {
    const reg = fs.readFileSync(path.join(__dirname, '..', 'surfaceRegistry.js'), 'utf8');
    const block = reg.slice(reg.indexOf("id: 'seating'"), reg.indexOf("id: 'seating'") + 2200);
    expect(block).toMatch(/ask: 'Seat your guests\.'/);
  });
});
