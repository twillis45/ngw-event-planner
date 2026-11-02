// The dependency audit runs on a written cadence (board, stage 8, 2026-11-02):
// "0 vulnerabilities" on 2026-08-21 was false by 2026-11-02 and nothing re-ran
// it. Pins the schedule, the strict hostv2 gate, and that the CRA tree is
// report-only BY DECISION (named, not silently skipped). Red-proofed by
// deleting the schedule and by loosening hostv2's audit level.
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const WF = yaml.load(fs.readFileSync(
  path.join(__dirname, '..', '..', '.github', 'workflows', 'dependency-audit.yml'), 'utf8'));
const on = WF.on || WF[true];
const runs = (job) => WF.jobs[job].steps.map((s) => s.run || '').join('\n');

test('it runs on a schedule, not only when someone remembers', () => {
  expect(on.schedule).toEqual([{ cron: expect.stringMatching(/^\S+ \S+ \S+ \S+ \S+$/) }]);
  expect(on.pull_request.paths).toEqual(expect.arrayContaining(['package-lock.json', 'hostv2/package-lock.json']));
});

test('the app the public uses fails on any high advisory', () => {
  expect(WF.jobs.hostv2.continueOnError || WF.jobs.hostv2['continue-on-error']).toBeFalsy();
  expect(WF.jobs.hostv2.steps.some((s) => s['working-directory'] === 'hostv2')).toBe(true);
  expect(runs('hostv2')).toMatch(/npm audit --package-lock-only --omit=dev --audit-level=high/);
});

test('the CRA tree is audited too, and report-only is explicit', () => {
  expect(WF.jobs['root-cra']['continue-on-error']).toBe(true);
  expect(runs('root-cra')).toMatch(/npm audit --package-lock-only --omit=dev/);
  expect(runs('root-cra')).toMatch(/xlsx/);
});
