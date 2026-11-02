// The release stamp (build/RELEASE_SHA.txt) must name what the deployed
// profile can actually do. Until 2026-11-02 it knew two cases — demo, and
// everything else — so a `services` release (backend proxy on, NO sign-in)
// was stamped "live-authenticated-backend-connected", which is false; the live
// site carried that claim. This runs the workflow's REAL step under each
// profile and reads what it writes. Red-proofed against the two-case version.
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';

const WF = yaml.load(fs.readFileSync(
  path.join(__dirname, '..', '..', '.github', 'workflows', 'pages-from-source.yml'), 'utf8'));
const step = WF.jobs.build.steps.find((s) => s.name === 'Record the deployed commit');

const stamp = (profile) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-'));
  fs.mkdirSync(path.join(dir, 'build'));
  try {
    execFileSync('bash', ['-e', '-c', step.run], {
      cwd: dir, env: { ...process.env, RELEASE_SHA: 'abc123', RELEASE_PROFILE: profile }, stdio: 'pipe',
    });
    return { code: 0, out: fs.readFileSync(path.join(dir, 'build', 'RELEASE_SHA.txt'), 'utf8') };
  } catch (e) {
    return { code: e.status, out: String(e.stderr || '') };
  }
};

test('premise: the step exists', () => { expect(step && step.run).toBeTruthy(); });

test('demo is stamped open-demo, localStorage-only', () => {
  const r = stamp('demo');
  expect(r.code).toBe(0);
  expect(r.out).toMatch(/^capability=open-demo-localstorage-only/m);
});

test('services is stamped backend-on, NO sign-in — never "authenticated"', () => {
  const r = stamp('services');
  expect(r.code).toBe(0);
  expect(r.out).toMatch(/^capability=services-backend-connected-no-sign-in/m);
  expect(r.out).not.toMatch(/authenticated/);
});

test('live is the only profile stamped authenticated', () => {
  const r = stamp('live');
  expect(r.code).toBe(0);
  expect(r.out).toMatch(/^capability=live-authenticated-backend-connected/m);
});

test('an unknown profile fails the build instead of borrowing a claim', () => {
  const r = stamp('staging');
  expect(r.code).not.toBe(0);
});
