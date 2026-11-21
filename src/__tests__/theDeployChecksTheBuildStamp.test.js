// The Pages deploy refuses to publish a hostv2 index.html that does not carry
// <meta name="ngw-build" content="<RELEASE_SHA> <iso>"> (owner, 11/21/2026:
// "Why do we not track which code version is loaded, only health?"). This runs
// the workflow's REAL step against a built tree and reads its exit code, the
// same way theStampSaysWhatShipped.test.js does for RELEASE_SHA.txt.
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';

const WF = yaml.load(fs.readFileSync(
  path.join(__dirname, '..', '..', '.github', 'workflows', 'pages-from-source.yml'), 'utf8'));
const steps = WF.jobs.build.steps;
const idx = steps.findIndex((s) => s.run && s.run.includes('name=\\"ngw-build\\"'));
const step = steps[idx];
// The page the step checks, read off the step so the fixture cannot drift from it.
const PAGE = step && (step.run.match(/build\/\S+\/index\.html/) || [])[0];
const SHA = '0bc6e20f9a1b2c3d4e5f60718293a4b5c6d7e8f9';

const run = (indexHtml, sha = SHA) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ngw-build-'));
  fs.mkdirSync(path.dirname(path.join(dir, PAGE)), { recursive: true });
  if (indexHtml !== null) fs.writeFileSync(path.join(dir, PAGE), indexHtml);
  try {
    execFileSync('bash', ['-c', step.run], { cwd: dir, env: { ...process.env, RELEASE_SHA: sha }, stdio: 'pipe' });
    return 0;
  } catch (e) {
    return e.status;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

test('premise: the step exists, after the build and before the upload', () => {
  expect(step && step.run).toBeTruthy();
  expect(PAGE).toBeTruthy();
  expect(idx).toBeGreaterThan(steps.findIndex((s) => s.name === 'Build release artifact'));
  expect(idx).toBeLessThan(steps.findIndex((s) => s.uses && s.uses.startsWith('actions/upload-pages-artifact')));
  expect(step.if).toBeUndefined(); // every profile, not only live
});

test('passes when the meta tag names the workflow commit', () => {
  expect(run(`<head><meta name="ngw-build" content="${SHA} 2026-11-21T22:02:00.000Z" /></head>`)).toBe(0);
});

test('fails when the meta tag is missing', () => {
  expect(run('<head><title>x</title></head>')).not.toBe(0);
});

test('fails when the meta tag names another commit, or dev', () => {
  expect(run('<head><meta name="ngw-build" content="ffffffffffffffffffffffffffffffffffffffff 2026-11-21T22:02:00.000Z" /></head>')).not.toBe(0);
  expect(run('<head><meta name="ngw-build" content="dev" /></head>')).not.toBe(0);
});

test('fails when the built page is missing, or RELEASE_SHA is empty', () => {
  expect(run(null)).not.toBe(0);
  expect(run('<head><meta name="ngw-build" content="dev" /></head>', '')).not.toBe(0);
});
