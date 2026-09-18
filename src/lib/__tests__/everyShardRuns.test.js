// ─── A THIRD OF THE MATRIX COULD GO MISSING AND CI WOULD STAY GREEN ──────────
//
// The e2e job shards across runners (2026-09-18) to cut 27 minutes to ~14. The
// shard count now lives in TWO places that must agree:
//
//     matrix: { shard: [1, 2] }          ← how many jobs run
//     --shard=${{ matrix.shard }}/2      ← how many pieces the suite is cut into
//
// Add a third entry to the matrix and forget the denominator, and shard 3 runs
// `--shard=3/2`, which Playwright rejects — noisy, fine. Do it the OTHER way —
// bump the denominator to 3 and leave the matrix at [1, 2] — and a third of the
// suite is never executed by anybody, every job is green, and the summary says
// so. That is the exact failure this repo keeps re-learning: a silent skip is
// indistinguishable from a pass in a summary line.
//
// This is a source-text gate and that is the right instrument, on the same
// reasoning `seamRunsInCi.test.js` sets out: the claim IS about what the
// workflow file declares, so reading the file is direct evidence rather than a
// proxy for behaviour.
//
// IT READS ONLY THE WORKFLOW. The reporter switch that pairs with this — blob
// under CI, list everywhere else — is asserted by EXECUTING the Playwright
// config, over in `test/shardReporter.test.mjs` under the vitest seam. It was a
// regex here first and `textGateRatchet` refused it, correctly: jest cannot run
// that tree, so a text gate there proves a file contains a ternary, not that the
// ternary evaluates.
//
// MEASURED while wiring this up, and the reason the failure step exists:
//
//     playwright test          on a failing spec  -> exit 1
//     playwright merge-reports on that same blob  -> exit 0
//
// The merge cannot be the verdict. It paints a red matrix green.
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const ROOT = path.join(__dirname, '..', '..', '..');
const WF = path.join(ROOT, '.github', 'workflows', 'checks.yml');

describe('every shard of the e2e matrix actually runs', () => {
  const text = fs.readFileSync(WF, 'utf8');
  const wf = yaml.load(text);

  test('(premise) the workflow parses and still has both e2e jobs', () => {
    // Without this, every assertion below passes over an undefined.
    expect(Object.keys(wf.jobs)).toEqual(expect.arrayContaining(['e2e-shard', 'e2e']));
  });

  test('THE GUARD: the shard list and the denominator agree', () => {
    const shards = wf.jobs['e2e-shard'].strategy.matrix.shard;
    const step = (wf.jobs['e2e-shard'].steps || [])
      .map((s) => s.run || '').find((r) => r.includes('--shard='));
    expect(step).toBeTruthy();
    const m = /--shard=\$\{\{\s*matrix\.shard\s*\}\}\/(\d+)/.exec(step);
    expect(m).toBeTruthy();
    expect(`denominator ${m[1]} vs ${shards.length} shards`).toBe(`denominator ${shards.length} vs ${shards.length} shards`);
    // And the list is 1..N with no gaps or repeats — `[1, 3]` over /2 would
    // silently drop the middle third just as effectively.
    expect(shards).toEqual(Array.from({ length: shards.length }, (_, i) => i + 1));
  });

  test('a failed shard cannot be merged into a green verdict', () => {
    const merge = wf.jobs.e2e;
    expect(merge.needs).toBe('e2e-shard');
    // `if: always()` — otherwise the job is SKIPPED when a shard fails, and a
    // skipped required check reports neutral rather than red.
    expect(String(merge.if)).toMatch(/always\(\)/);
    // The verdict comes from the shard result, never from merge-reports, which
    // exits 0 on a blob full of failures (measured — see this file's header).
    const guard = (merge.steps || []).map((s) => s.if || '').join(' ');
    expect(guard).toMatch(/needs\.e2e-shard\.result\s*!=\s*'success'/);
  });

  test('a failing shard does not cancel its sibling', () => {
    // fail-fast would kill the other half, so one red shard would cost a second
    // full run to learn what the first run already knew.
    expect(wf.jobs['e2e-shard'].strategy['fail-fast']).toBe(false);
  });

  test('the shards emit blobs, and the merge job collects them', () => {
    // blob is the only format merge-reports can recombine; `list` would leave
    // two half-counts and nothing to merge.
    const runStep = (wf.jobs['e2e-shard'].steps || []).find((s) => (s.run || '').includes('--shard='));
    expect(runStep.env && runStep.env.PW_BLOB).toBeTruthy();
    const upload = (wf.jobs['e2e-shard'].steps || []).find((s) => String(s.uses || '').includes('upload-artifact'));
    // `if: always()` on the upload — a FAILED shard's blob is the one worth having.
    expect(String(upload.if)).toMatch(/always\(\)/);
    // And an empty upload must be an error, not a silent no-op that merges to zero.
    expect(upload.with['if-no-files-found']).toBe('error');
    const download = (wf.jobs.e2e.steps || []).find((s) => String(s.uses || '').includes('download-artifact'));
    expect(download.with.pattern).toBe('blob-*');
    expect(download.with['merge-multiple']).toBe(true);
  });

  test('the merge reports a TOTAL, and json is why', () => {
    // MEASURED on run 658, the first sharded run, and reproduced locally:
    // `merge-reports --reporter=list` piped into a log truncated at test 611 of
    // 1216 and printed no summary at all, so the job reported neither the
    // per-test detail nor the combined total — half of what it exists for.
    // `list` streams for a terminal and loses most of its output on exit.
    // json is deterministic; the per-test detail still ships as the blobs.
    const steps = (wf.jobs.e2e.steps || []).map((x) => x.run || '');
    const merge = steps.find((r) => r.includes('merge-reports'));
    expect(merge).toMatch(/--reporter=json/);
    expect(merge).not.toMatch(/--reporter=list/);
    // And something must actually READ that json — a merge written to a file
    // nobody opens is the silent half of this defect all over again.
    expect(steps.some((r) => r.includes('e2eTotal.mjs'))).toBe(true);
  });

  test('NEGATIVE CONTROL: the timeout still exceeds the measured shard time', () => {
    // The job this replaced ran 27.0 min against `timeout-minutes: 30` — a 10%
    // margin on a repo that auto-deploys from main, where a slow runner turns a
    // green build into a false red. A shard is ~14 min, so 30 is now ~2x. If a
    // future change pushes shard time back up, this is where to notice.
    expect(wf.jobs['e2e-shard']['timeout-minutes']).toBeGreaterThanOrEqual(25);
  });
});
