// ─── RELEASES ARE NAMED, AND THEIR SOURCE MAPS NEVER SHIP (owner, 11/22/2026) ─
//
// pages-from-source.yml now:
//   1. names the release BEFORE the build (scripts/calver.mjs → RELEASE_VERSION),
//      so hostv2 bakes "Version 2026.11.22.3 (abc1234)";
//   2. uploads hostv2's hidden source maps to Sentry ONLY when a
//      SENTRY_AUTH_TOKEN secret exists, and no-ops without it;
//   3. deletes every hostv2 .map before the Pages artifact, token or not;
//   4. pushes the vYYYY.MM.DD.N tag in its own job, after the site is live,
//      only for a merge to main (workflow_run) and only for a new name.
// Steps 2 and 3 are run for real here, the way theDeployChecksTheBuildStamp
// runs the stamp check, so their exit codes are what is pinned.
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';

const WF = yaml.load(fs.readFileSync(
  path.join(__dirname, '..', '..', '.github', 'workflows', 'pages-from-source.yml'), 'utf8'));
const steps = WF.jobs.build.steps;
const at = (pred) => steps.findIndex(pred);
const iName = at((s) => s.id === 'calver');
const iBuild = at((s) => s.name === 'Build release artifact');
const iUpload = at((s) => s.run && s.run.includes('sourcemaps upload'));
const iStrip = at((s) => s.run && s.run.includes("-name '*.map'"));
const iPages = at((s) => s.uses && s.uses.startsWith('actions/upload-pages-artifact'));

const runStep = (step, files, env = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ngw-maps-'));
  for (const f of files) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), 'x'); }
  const clean = { PATH: process.env.PATH, HOME: process.env.HOME, RELEASE_SHA: 'abc1234', ...env };
  let status = 0; let out = '';
  try { out = execFileSync('bash', ['-c', step.run], { cwd: dir, env: clean, stdio: 'pipe' }).toString(); } catch (e) { status = e.status; out = String(e.stdout || '') + String(e.stderr || ''); }
  const left = (d) => fs.existsSync(d) ? fs.readdirSync(d, { recursive: true }).map(String) : [];
  const res = { status, out, hostv2: left(path.join(dir, 'build', 'hostv2')), cra: left(path.join(dir, 'build', 'static')) };
  fs.rmSync(dir, { recursive: true, force: true });
  return res;
};

test('premise: name → build → upload → strip → publish, in that order', () => {
  expect(iName).toBeGreaterThanOrEqual(0);
  expect(iName).toBeLessThan(iBuild);
  expect(iUpload).toBeGreaterThan(iBuild);
  expect(iStrip).toBeGreaterThan(iUpload);
  expect(iStrip).toBeLessThan(iPages);
  expect(steps[iStrip].if).toBeUndefined(); // every profile, token or not
});

test('the version reaches the build, and maps are asked for only when a token exists', () => {
  expect(steps[iName].run).toMatch(/scripts\/calver\.mjs version --github-output/);
  expect(steps[iName].run).toMatch(/RELEASE_VERSION=/);
  expect(WF.jobs.build.env.SENTRY_SOURCEMAPS).toMatch(/secrets\.SENTRY_AUTH_TOKEN/);
  // The token itself lives on the upload step alone, never job-wide.
  expect(JSON.stringify(WF.jobs.build.env)).not.toMatch(/SENTRY_AUTH_TOKEN:/);
  expect(steps[iUpload].env.SENTRY_AUTH_TOKEN).toMatch(/secrets\.SENTRY_AUTH_TOKEN/);
});

test('the upload no-ops without a token (and touches no network)', () => {
  const r = runStep(steps[iUpload], ['build/hostv2/assets/a.js', 'build/hostv2/assets/a.js.map']);
  expect(r.status).toBe(0);
  expect(r.out).toMatch(/no SENTRY_AUTH_TOKEN/i);
});

test('the strip step removes every hostv2 map and fails if one survives', () => {
  const r = runStep(steps[iStrip], ['build/hostv2/assets/a.js', 'build/hostv2/assets/a.js.map', 'build/hostv2/assets/b.css.map', 'build/hostv2/index.html']);
  expect(r.status).toBe(0);
  expect(r.hostv2.filter((f) => f.endsWith('.map'))).toEqual([]);
  expect(r.hostv2).toEqual(expect.arrayContaining(['index.html']));
});

test('the tag is pushed after the deploy, for a merge to main, only when new', () => {
  const tag = WF.jobs.tag;
  expect(tag).toBeTruthy();
  expect([].concat(tag.needs)).toEqual(expect.arrayContaining(['build', 'deploy']));
  expect(tag.if).toMatch(/workflow_run/);
  expect(tag.if).toMatch(/needs\.build\.outputs\.is_new == 'true'/);
  expect(tag.permissions).toEqual({ contents: 'write' });
  expect(WF.permissions.contents).toBe('read'); // still read-only everywhere else
  expect(WF.jobs.build.outputs.tag).toMatch(/steps\.calver\.outputs\.tag/);
  expect(JSON.stringify(tag.steps)).toMatch(/git push origin/);
});
