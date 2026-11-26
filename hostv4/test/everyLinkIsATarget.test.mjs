// The live-check session, 11/26/2026, measured hostv4 text links under the
// 44px target at touch sizes: Undo 38×21, "How we got these" 120×41, "Keep as
// written" 111×39, "Save this version" 114×41, "Open the current app" 143×41.
// They sat in a sentence, where three rules had zeroed their min-height so the
// line stayed even. A link in a sentence is 44 tall now, with a negative margin
// so the sentence's lines don't move.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const css = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/styles.css'), 'utf8');
const rules = [...css.matchAll(/([^{}]*\.link[^{}]*)\{([^}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));

describe('every link is a 44px target', () => {
  // The live-check session, 11/26/2026: the guest sheet's "Done" measured 40×44,
  // short a word wide. 44 is a width rule too, so every link carries it.
  it('every link is at least 44 wide, and no rule narrows it', () => {
    const base = rules.find((r) => r.sel === '.link');
    expect(base.body).toMatch(/min-width:\s*44px/);
    const bad = rules.filter((r) => /min-width:\s*([0-3]?\d|4[0-3])px/.test(r.body) || /min-width:\s*0\b/.test(r.body)).map((r) => r.sel);
    expect(bad).toEqual([]);
  });
  it('no rule takes a link below 44px', () => {
    const bad = rules.filter((r) => /min-height:\s*0\b/.test(r.body) || /min-height:\s*([0-3]?\d|4[0-3])px/.test(r.body)).map((r) => r.sel);
    expect(bad).toEqual([]);
  });
  it('a link in a sentence is 44 tall without moving the line', () => {
    const r = rules.find((x) => /\.fine \.link/.test(x.sel) && /\.done \.link/.test(x.sel) && /\.line \.link/.test(x.sel));
    expect(r, 'one rule for links in a sentence').toBeTruthy();
    expect(r.body).toMatch(/display:\s*inline-flex/);
    expect(r.body).toMatch(/min-height:\s*44px/);
    expect(r.body).toMatch(/margin:\s*-1\dpx/);
  });
});
