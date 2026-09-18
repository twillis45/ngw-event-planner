// ─── THE COMBINED TOTAL, FROM THE MERGED REPORT ──────────────────────────────
//
// The sharded e2e job merges two blobs into one report. The first version piped
// `merge-reports --reporter=list` straight to the log and that DID NOT WORK —
// found on the first real run (658) and reproduced locally:
//
//   --reporter=list  ->  output truncated at test 611 of 1216, no summary line
//                        (locally: THREE lines and no summary at all)
//   --reporter=json  ->  {"expected":N,"skipped":N,"unexpected":N,"flaky":N}
//
// `list` streams for a terminal; piped into a log it loses most of its output
// when the process exits. So the merge job was printing neither the per-test
// list nor the total — half of what it exists for. JSON is deterministic, and
// the per-test detail still ships as the uploaded blob artifacts, which render
// a full HTML report for anyone who downloads them.
//
// THIS IS A SECOND, INDEPENDENT VERDICT. The job already fails on
// `needs.e2e-shard.result`, which is the primary one. This adds a check the
// shard results cannot give: that the MERGED report — the thing whose number
// gets quoted — actually carries zero failures. If those two ever disagree,
// something is wrong with the sharding itself and the louder failure is right.
import fs from 'fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: node scripts/e2eTotal.mjs <merged.json>');
  process.exit(2);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch (e) {
  // A merge that produced nothing parseable must be loud. Silence here would
  // read as "no failures" — the exact shape of defect this repo keeps finding.
  console.error(`could not read the merged report at ${path}: ${e.message}`);
  process.exit(1);
}

const s = report.stats || {};
const n = (k) => (Number.isFinite(s[k]) ? s[k] : -1);
const line = `e2e MERGED TOTAL — ${n('expected')} passed · ${n('skipped')} skipped · `
  + `${n('unexpected')} failed · ${n('flaky')} flaky`;
console.log(line);

if (process.env.GITHUB_STEP_SUMMARY) {
  try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ${line}\n`); } catch { /* not fatal */ }
}

// A report with nothing in it is not a pass. Two shards that both ran cannot
// produce zero expected tests, so this catches an empty or half-merged blob set
// — which would otherwise sail through as "0 failures".
if (n('expected') <= 0) {
  console.error('the merged report contains no passing tests — the blobs are empty or did not merge');
  process.exit(1);
}
if (n('unexpected') > 0) {
  console.error(`the merged report carries ${n('unexpected')} failure(s)`);
  process.exit(1);
}
