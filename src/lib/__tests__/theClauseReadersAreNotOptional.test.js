// ─── CORRECTNESS MAY NOT DEPEND ON REMEMBERING A SECOND ARGUMENT ────────────
//
// SPRINT 0.5 DECISION 2.
//
// Sprint 0 fixed the false-alarm defect — a clause the app USED being reported
// to the host as dropped — by teaching `unusedClauses` about the creation
// seam's three readers, passed in as `opts.alsoDerives`. That fixed the
// behaviour and left an architectural trap, which Sprint 0 wrote down and did
// not close:
//
//   A CALLER WHO FORGETS alsoDerives SILENTLY GETS THE FALSE ALARMS BACK.
//
// Silently, and looking like data: the host is told her sentence was not
// understood, which is the one thing the disclosure list exists NOT to get
// wrong. `heardClauses.js` documented the requirement in a doc comment.
// Documentation is not enforcement — the whole lesson of Sprint 0's P0-2, where
// a provenance field was written at every site and read by almost nothing.
//
// ── THE FIX: THERE IS NO SECOND ARGUMENT TO FORGET ─────────────────────────
//
// `unusedClauses` stays exactly what it is — the differential mechanism, and a
// good one. What changes is that it stops being the PUBLIC entry point.
// `heardClauses.js` becomes the composition root: it imports the seam readers
// itself and supplies them, so the only callable surface is one that cannot be
// called wrongly.
//
// WHY THAT ROOT CAN LIVE THERE, measured rather than assumed. The guest invite
// path (`InviteV2.jsx`, `inviteShared.js`) imports neither `heardClauses` nor
// the parser, so composing the readers here adds nothing to the chunk a guest
// downloads — the boundary `guestPayloadGate.spec.mjs` exists to protect. And
// the parser is NOT made to import the planning engine, which the brief
// forbids: the dependency points the other way, from the root down.
//
// No registry, deliberately. A register-on-import registry would make
// correctness depend on module LOAD ORDER instead of on an argument — the same
// bug wearing a different hat, and harder to see.
import fs from 'fs';
import path from 'path';
import { clausesNotUsed, heardNotUsedFor } from '../heardClauses';

const ROOT = path.resolve(__dirname, '../../..');

// The three clauses Sprint 0 measured as consumed-but-reported. Each is read by
// a different seam consumer, so all three must be suppressed by the canonical
// entry point with no help from the caller.
const CONSUMED = [
  ['she uses a walker', "Mom's 80th in Santa Fe, sit-down lunch, she uses a walker"],
  ['a house with a hot tub', 'family reunion in Deep Creek Lake, a house with a hot tub, 20 people'],
  ['resort spa', '80th birthday in Santa Fe NM, resort spa, 40 guests'],
];

describe('the canonical entry point cannot be called wrongly', () => {
  test('a caller who passes NOTHING but the text gets no false alarms', () => {
    // The whole point: this is the naive call, and it is correct.
    const leaked = CONSUMED.filter(([clause, text]) => clausesNotUsed(text).includes(clause));
    expect(leaked.map(([c]) => c)).toEqual([]);
  });

  test('and still reports a clause nothing consumed', () => {
    // The mechanism must not have been turned off to achieve the above.
    expect(clausesNotUsed("Mom's 80th in Santa Fe, sit-down lunch, she uses a walker"))
      .toContain('sit-down lunch');
  });

  test('heardNotUsedFor needs no options either', () => {
    const ev = {
      id: 'ev-root', type: 'Birthday', date: '2027-06-17',
      createdFromText: "Mom's 80th in Santa Fe, sit-down lunch, she uses a walker",
    };
    expect(heardNotUsedFor(ev)).toContain('sit-down lunch');
    expect(heardNotUsedFor(ev)).not.toContain('she uses a walker');
  });

  test('empty and absent input stay silent rather than throwing', () => {
    expect(clausesNotUsed('')).toEqual([]);
    expect(clausesNotUsed(null)).toEqual([]);
    expect(heardNotUsedFor(null)).toEqual([]);
  });
});

describe('the raw mechanism is not reachable from outside the root', () => {
  // The repo's CALLED_FROM_OUTSIDE idiom. `unusedClauses` is still exported —
  // its own tests drive it directly to reproduce the defect, which is how the
  // premise tests in iHeardThisTooAndThenWhat prove the false alarms were real.
  // What must not happen is a PRODUCT surface calling it and inheriting the
  // trap.
  const ALLOWED = new Set([
    'src/lib/smartParseEvent.js',   // defines it
    'src/lib/heardClauses.js',      // the composition root — the one legitimate caller
  ]);

  // Block comments first, then line comments. The shell discusses this
  // mechanism in two JSX `{/* … */}` comments whose CONTINUATION lines carry no
  // marker, so a line-only strip reported the shell as a caller after it had
  // already been migrated. Same strip order textGateRatchet uses, for the same
  // reason.
  const stripComments = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((l) => (/^\s*(?:\/\/)/.test(l) ? '' : l.replace(/\/\/.*$/, '')))
    .join('\n');

  const SKIP = /node_modules|build|dist|__tests__|\.test\.|\.spec\./;
  const scan = (dir, out = []) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (SKIP.test(p)) continue;
      if (e.isDirectory()) { scan(p, out); continue; }
      if (!/\.(js|jsx|mjs)$/.test(e.name)) continue;
      // A CALL or an import of it — naming it in prose is not using it.
      if (/\bunusedClauses\s*\(|\bunusedClauses\b\s*[,}]/.test(stripComments(fs.readFileSync(p, 'utf8')))) {
        out.push(path.relative(ROOT, p));
      }
    }
    return out;
  };

  test('no product surface calls unusedClauses directly', () => {
    const callers = [
      ...scan(path.join(ROOT, 'src/lib')),
      ...scan(path.join(ROOT, 'hostv2/src')),
    ].filter((f) => !ALLOWED.has(f));
    // If this fails: call `clausesNotUsed(text)` or `heardNotUsedFor(event)`
    // from `lib/heardClauses.js` instead. They supply the seam readers for you,
    // which is the only way to get the answer right.
    expect(callers).toEqual([]);
  });

  test('THE GATE BITES — the scan finds the two legitimate files', () => {
    const all = [...scan(path.join(ROOT, 'src/lib')), ...scan(path.join(ROOT, 'hostv2/src'))];
    expect(all).toContain('src/lib/smartParseEvent.js');
    expect(all).toContain('src/lib/heardClauses.js');
  });
});
