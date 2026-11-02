// The browser specs guarding the money path run ONLY in checks.yml. Until
// 2026-11-02 the Pages deploy started on the same push, in parallel, so a red
// GOLD-09 could not stop a release (board, stage 6). The deploy now starts when
// Checks completes on main, publishes only on success, and builds and stamps
// the SHA Checks tested. Red-proofed by restoring `push: branches: [main]`,
// by dropping the conclusion guard, and by stamping GITHUB_SHA again.
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const ROOT = path.join(__dirname, '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, '.github', 'workflows', f), 'utf8');
const DEPLOY_SRC = read('pages-from-source.yml');
const DEPLOY = yaml.load(DEPLOY_SRC);
const CHECKS = yaml.load(read('checks.yml'));
const on = (wf) => wf.on || wf[true];

test('the workflow it waits for is the one that runs the e2e matrix', () => {
  expect(on(DEPLOY).workflow_run.workflows).toEqual([CHECKS.name]);
  expect(Object.keys(CHECKS.jobs)).toEqual(expect.arrayContaining(['e2e', 'e2e-shard']));
});

test('a merge to main reaches the deploy only through Checks', () => {
  expect(on(DEPLOY).push).toBeUndefined();
  expect(on(DEPLOY).workflow_run).toEqual({ workflows: ['Checks'], types: ['completed'], branches: ['main'] });
});

test('only a green Checks run from a push publishes', () => {
  const guard = DEPLOY.jobs.build.if.replace(/\s+/g, ' ');
  expect(guard).toMatch(/github\.event\.workflow_run\.conclusion == 'success'/);
  expect(guard).toMatch(/github\.event\.workflow_run\.event == 'push'/);
  expect(DEPLOY.jobs.deploy.needs).toBe('build');
});

test('it builds and stamps the commit Checks tested', () => {
  const checkout = DEPLOY.jobs.build.steps.find((s) => String(s.uses).startsWith('actions/checkout'));
  expect(checkout.with.ref).toMatch(/github\.event\.workflow_run\.head_sha/);
  expect(DEPLOY.jobs.build.env.RELEASE_SHA).toMatch(/github\.event\.workflow_run\.head_sha/);
  expect(DEPLOY_SRC).not.toMatch(/\$\{GITHUB_SHA\}/);
});
