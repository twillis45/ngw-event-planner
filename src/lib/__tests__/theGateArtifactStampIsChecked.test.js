// Runs scripts/check-artifact-stamp.mjs inside the jest suite so CI and
// verify:fast both execute it — a check that only runs when someone remembers
// it is the eyeball comparison it replaced. Red-proofed by pointing it at a
// page whose stamp disagrees with the record, and at a HANDOFF with no Watch
// row: both must fail.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const SCRIPT = path.join(ROOT, 'scripts/check-artifact-stamp.mjs');

const run = (env = {}) => {
  try {
    const out = execFileSync(process.execPath, [SCRIPT], { env: { ...process.env, ...env }, encoding: 'utf8', stdio: 'pipe' });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: String(e.stderr || '') + String(e.stdout || '') };
  }
};

test('the committed gate artifact passes its stamp check', () => {
  const r = run();
  expect(r.out).toMatch(/✓ gate artifact stamp/);
  expect(r.code).toBe(0);
});

describe('and the check can fail', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-'));
  const page = fs.readFileSync(path.join(ROOT, 'docs/artifact/the-first-recorded-gate.html'), 'utf8');
  const handoff = fs.readFileSync(path.join(ROOT, 'HANDOFF.md'), 'utf8');

  test('a stamp that disagrees with the record fails', () => {
    const p = path.join(tmp, 'page.html');
    fs.writeFileSync(p, page.replace(/data-recorded="\d{4}-\d{2}-\d{2}"/, 'data-recorded="2026-01-01"'));
    const r = run({ STAMP_PAGE: p });
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/stamp 2026-01-01 != newest gate record/);
  });

  test('a HANDOFF with no Watch row fails', () => {
    const h = path.join(tmp, 'HANDOFF.md');
    fs.writeFileSync(h, handoff.split('\n').filter((l) => !/^\|\s*Watch\s*\|/.test(l)).join('\n'));
    const r = run({ STAMP_HANDOFF: h });
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/no "\| Watch \|" row/);
  });

  test('a page that regressed to static marks fails', () => {
    const p = path.join(tmp, 'page2.html');
    fs.writeFileSync(p, page.replace('<input type="checkbox" checked disabled aria-label="handled">', '<span class="mark ok">&check;</span>'));
    const r = run({ STAMP_PAGE: p });
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/static "mark ok" is back/);
  });
});
