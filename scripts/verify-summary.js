// The last line verify:all prints, kept apart so a test can hold it to the
// rule (board condition C4-4, 2026-11-02): a step that never ran is NOT a
// pass. Before this, a SKIP counted as not-failed and the line still read
// "all N passed" — the exact blur between "the check passed" and "the check
// never ran" the runner's own comments warn about.
//
// Exit code is unchanged on purpose: a checkout without backend/ is a
// legitimate frontend-only run, so a skip does not fail it — but it can no
// longer be reported as a full pass.
function summarize(results) {
  const failed = results.filter((r) => r.code !== null && r.code !== 0);
  const skipped = results.filter((r) => r.code === null);
  const passed = results.length - failed.length - skipped.length;
  const notRun = skipped.length ? ` · ${skipped.length} NOT RUN (${skipped.map((s) => s.label).join(', ')})` : '';
  let line;
  if (failed.length) line = `✗ ${failed.length} of ${results.length} failed${notRun}`;
  else if (skipped.length) line = `⚠ ${passed} of ${results.length} passed${notRun} — not a full pass`;
  else line = `✓ all ${results.length} passed`;
  return { line, code: failed.length ? 1 : 0 };
}

module.exports = { summarize };
