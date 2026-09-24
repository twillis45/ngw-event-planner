// ─── NINE COPIES OF authHeaders, AND WHY THEY ARE NOT FOLDED YET ────────────
//
// `authHeaders()` builds the headers that decide whether a request is
// authenticated. It is declared in NINE files. `src/lib/apiAuth.js` exists to
// own it and three modules import it; the other six roll their own.
//
// ── WHAT THE NINE ACTUALLY DIFFER ON, MEASURED 2026-09-24 ───────────────────
//
// Fingerprinting each definition gives FIVE distinct bodies, but two of those
// pairs differ only by a COMMENT (`/* fall through to token */` versus
// `/* fall through */`). Functionally there are THREE behaviours:
//
//   A  rsvp · vendorBrief · commApi · adminApi
//        Authorization + X-Planner-Token. No Content-Type in the helper —
//        and that is NOT a missing header: all four set it at the call site
//        (vendorBrief:44, adminApi:34, commApi:64, rsvp:66). Checked, because
//        "a POST with a JSON body and no Content-Type" would have been a real
//        defect hiding inside the duplication. It is not there.
//   B  kas · kcr · research
//        Content-Type in the helper, plus Authorization + X-Planner-Token.
//   C  apiAuth · orchestratorClient
//        Content-Type + Authorization, and NO planner token.
//
// ── THE DIFFERENCE THAT IS A DECISION, NOT DRIFT ────────────────────────────
//
// Group C deliberately omits the planner-token fallback, and says so in its own
// catch: apiAuth writes `/* unauthenticated — backend will 401 */` where the
// others write `/* fall through to token */`. Opposite intents, both authored.
//
// So "move the six onto apiAuth" — the obvious fix, and the one the audit
// implied — WOULD REMOVE THE TRANSITION FALLBACK FROM SEVEN FILES. In a
// production build that is a no-op, because `REACT_APP_PLANNER_TOKEN` is kept
// out by `scripts/validate-production-config.mjs` and the deploy workflow. In
// local dev and on the transition path it is a behaviour change.
//
// ── WHY THIS FILE IS A GUARD AND NOT A REFACTOR ─────────────────────────────
//
// Doing it properly means giving apiAuth a parameter so it can serve all three
// shapes, then changing eight files — every API client in the app, which is the
// widest blast radius available here — to fix a maintenance cost rather than a
// live defect. Nothing is broken today: every variant works, Content-Type is
// always set somewhere, and the credential is gated at the build boundary.
//
// So the cost is capped instead of paid: this guard fails if a TENTH copy
// appears. It does not bless the nine, and the list below is a debt register.
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..');

// LINE-ANCHORED, NOT STRIPPED. The first draft of this guard used a hand-rolled
// comment stripper and it was wrong: measured across the tree it removed more
// than 60% of 83 of 447 files, because `adminApi.js` carries a `//` comment
// containing the characters `/*` (an `/api/admin/*` route) and the block pass
// paired it with a `*/` a thousand characters later. THIS GUARD CAUGHT THAT — it
// reported 7 declarers where the raw files hold 9, and adminApi and research
// were the two it had eaten.
//
// A declaration begins a line; a mention in a comment has `//` or prose before
// it. An anchor needs no parser and cannot delete anything.
const DECLARES = /^\s*(?:export\s+)?(?:async\s+)?function\s+authHeaders\s*\(/m;

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/node_modules|__tests__|build|dist/.test(p)) walk(p, out); }
    else if (/\.(js|jsx|mjs)$/.test(e.name) && !/\.test\.|\.spec\./.test(e.name)) out.push(p);
  }
  return out;
};

// The nine, as measured. Sorted, so a diff on this list reads cleanly.
const KNOWN = [
  'src/lib/adminApi.js',
  'src/lib/api/kas.js',
  'src/lib/api/kcr.js',
  'src/lib/api/research.js',
  'src/lib/api/rsvp.js',
  'src/lib/api/vendorBrief.js',
  'src/lib/apiAuth.js',
  'src/lib/commApi.js',
  'src/lib/orchestratorClient.js',
];

const declarers = walk(path.join(ROOT, 'src'))
  .concat(walk(path.join(ROOT, 'hostv2', 'src')))
  .filter((f) => DECLARES.test(fs.readFileSync(f, 'utf8')))
  .map((f) => f.replace(ROOT + path.sep, '').split(path.sep).join('/'))
  .sort();

describe('authHeaders does not grow a tenth copy', () => {
  test('(premise) the designated owner still exports one', () => {
    // If apiAuth ever stops exporting it, the debt below has no landing place
    // and this whole guard is measuring the wrong thing.
    const src = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'apiAuth.js'), 'utf8');
    expect(src).toMatch(/^\s*export\s+async\s+function\s+authHeaders\s*\(/m);
  });

  test('THE GUARD: exactly these nine, and no more', () => {
    // A tenth entry is the failure. A file LEAVING the list is the fix landing,
    // and that is a deliberate edit to this list, not a surprise.
    expect(declarers).toEqual(KNOWN);
  });

  test('the token decision is still made in seven files, and prevented in one', () => {
    // The real consolidation target, stated as a number so it cannot rot. When
    // this drops, the refactor happened; when it rises, the debt grew.
    const readers = walk(path.join(ROOT, 'src'))
      .filter((f) => /^\s*const\s+\w+\s*=\s*process\.env\.REACT_APP_PLANNER_TOKEN/m.test(fs.readFileSync(f, 'utf8')))
      .map((f) => f.replace(ROOT + path.sep, '').split(path.sep).join('/'));
    expect(readers.length).toBe(7);
    // And exactly one place keeps it out of a browser build. That asymmetry is
    // the finding: seven deciders, one preventer.
    const gate = fs.readFileSync(path.join(ROOT, 'scripts', 'validate-production-config.mjs'), 'utf8');
    expect(gate).toMatch(/REACT_APP_PLANNER_TOKEN/);
  });

  test('NEGATIVE CONTROL: the matcher recognises a fresh copy', () => {
    // A guard that cannot fail is not a guard. Proves the pattern matches the
    // shape it rejects without editing a real file to find out.
    expect('async function authHeaders() { return {}; }').toMatch(DECLARES);
    expect('  async function authHeaders() {').toMatch(DECLARES);   // indented counts
    // …and a mention inside a comment does NOT. This is the case the stripper
    // existed to handle, now handled by the anchor instead.
    expect('// see authHeaders() in apiAuth.js').not.toMatch(DECLARES);
    expect(' * calls authHeaders() before every fetch').not.toMatch(DECLARES);
  });
});
