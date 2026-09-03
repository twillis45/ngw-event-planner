// ─── A GUARD NOTHING RUNS IS NOT A GUARD ───────────────────────────────────
//
// vitest is the only runner that EXECUTES the hostv2 tree. jest cannot:
// react-scripts pins its roots to demo/src, which is why 35 suites reach the
// shell by reading it as text, and why a syntax error in hostv2/src once
// passed a fully green 5,451-test run (see customEventStore.js).
//
// Red-proofed 2026-09-03: with HostShellV2.jsx made unparseable, vitest failed
// while heroComposition and sendLedger — which both READ that exact file —
// stayed green across 73 assertions.
//
// All of which is worth nothing if the CI step is deleted. The seam was wired
// into checks.yml's e2e job the same day; this asserts it is still there.
//
// A SOURCE-TEXT GATE IS THE RIGHT INSTRUMENT HERE, and that is not in tension
// with the census (docs/audits/2026-09-03_SOURCE_TEXT_SUITE_CENSUS.md) warning
// about text gates. The distinction the census draws is the whole point: a text
// gate is wrong when the claim is about BEHAVIOR and the text is a proxy for
// it. Here the claim IS about file content — does this workflow declare this
// step — so reading the file is direct evidence, not a stand-in.
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..');
const WF = path.join(ROOT, '.github', 'workflows', 'checks.yml');

describe('the hostv2 seam is wired into CI', () => {
  const yml = fs.readFileSync(WF, 'utf8');

  test('the workflow is readable and is the one we think it is', () => {
    // Guards against a false green from a renamed or emptied file.
    expect(yml.length).toBeGreaterThan(500);
    expect(yml).toMatch(/^name:\s*Checks$/m);
  });

  test('CI runs the vitest seam', () => {
    expect(yml).toMatch(/run:\s*npm run test:unit/);
  });

  test('and hostv2 still defines that script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'hostv2', 'package.json'), 'utf8'));
    expect(pkg.scripts['test:unit']).toMatch(/vitest/);
  });

  test('the seam runs BEFORE playwright install, not after', () => {
    // Ordering is the point, not decoration: the seam takes ~3s and the matrix
    // takes ~14 minutes, so a tree that will not compile should cost seconds.
    // Losing the order silently gives up that whole benefit.
    //
    // Compare the RUN STEPS, not raw offsets. The first cut used
    // yml.indexOf('playwright install') and failed — because the comment
    // explaining WHY the seam goes first says the words "playwright install",
    // and sits above the step. Same false positive heroComposition.test.js
    // strips comments to avoid; the census praises it for exactly that and I
    // walked into it an hour later.
    const steps = yml.split('\n')
      .map((l) => l.match(/^\s*-?\s*run:\s*(.+)$/))
      .filter(Boolean).map((m) => m[1]);
    const seam = steps.findIndex((c) => c.includes('npm run test:unit'));
    const pw = steps.findIndex((c) => c.includes('playwright install'));
    expect(seam).toBeGreaterThan(-1);
    expect(pw).toBeGreaterThan(-1);
    expect(seam).toBeLessThan(pw);
  });

  test('vitest is in the hostv2 LOCKFILE, so `npm ci` can resolve it', () => {
    // CI uses `npm ci`, which installs from the lock and ignores package.json.
    // A devDependency added with `npm install` but never committed to the lock
    // is green locally and red on the runner.
    const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'hostv2', 'package-lock.json'), 'utf8'));
    expect(Object.keys(lock.packages || {})).toContain('node_modules/vitest');
  });
});
