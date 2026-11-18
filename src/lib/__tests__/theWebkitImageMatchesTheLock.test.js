// The WebKit job runs in Playwright's own image (11/18/2026: its apt-based
// browser install waited 15-28 min behind the runner's background apt-get).
// That image only works if its tag is the exact Playwright version the lock
// installs: an older or newer image carries a different WebKit build, and the
// suite fails with "Executable doesn't exist" — or, worse, runs a browser the
// code was never pinned to. This pins the two together, so a Playwright bump
// that forgets the image fails here, in seconds, not in CI.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..', '..');
const yml = fs.readFileSync(path.join(root, '.github/workflows/checks.yml'), 'utf8');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'hostv2/package-lock.json'), 'utf8'));

test('the WebKit job image is the locked @playwright/test version', () => {
  const job = yml.slice(yml.indexOf('\n  webkit-critical:'));
  const m = /mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-\w+/.exec(job);
  expect(m).not.toBeNull();
  expect(m[1]).toBe(lock.packages['node_modules/@playwright/test'].version);
});

test('the WebKit job no longer installs the browser with apt', () => {
  const start = yml.indexOf('\n  webkit-critical:');
  const next = yml.slice(start + 1).search(/\n  [a-z][\w-]*:\n/);
  const job = next > 0 ? yml.slice(start, start + 1 + next) : yml.slice(start);
  expect(job).toMatch(/container:\s*\n\s*image: mcr\.microsoft\.com\/playwright:/);
  expect(job).not.toMatch(/install --with-deps webkit/);
});
