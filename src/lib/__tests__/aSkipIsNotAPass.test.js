// verify:all's summary line must never call a step that did not run a pass
// (board condition C4-4, 2026-11-02). Red-proofed by restoring the old
// "all N passed" branch for the skip case — the first test goes red.
const { summarize } = require('../../../scripts/verify-summary.js');

const pass = (label) => ({ label, code: 0 });
const skip = (label) => ({ label, code: null });
const fail = (label, code = 1) => ({ label, code });

test('a skip is reported as a skip, never as "all passed"', () => {
  const { line, code } = summarize([pass('jest'), skip('backend pytest'), pass('build')]);
  expect(line).not.toMatch(/all \d+ passed/);
  expect(line).toMatch(/2 of 3 passed/);
  expect(line).toMatch(/1 NOT RUN \(backend pytest\)/);
  expect(line).toMatch(/not a full pass/);
  expect(code).toBe(0);
});

test('everything ran and passed — and only then — reads "all passed"', () => {
  expect(summarize([pass('a'), pass('b')])).toEqual({ line: '✓ all 2 passed', code: 0 });
});

test('a failure exits 1 and still names what never ran', () => {
  const { line, code } = summarize([fail('jest'), skip('backend pytest')]);
  expect(code).toBe(1);
  expect(line).toMatch(/1 of 2 failed/);
  expect(line).toMatch(/NOT RUN \(backend pytest\)/);
});
