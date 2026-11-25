// The owner, 11/25/2026, on an iPad, at a guest's question: "For some host the
// prefilled default answer looks like a real value and don't understand the
// input." The reply box showed "Street parking on Pine — the lot fills up by 4."
// (to a question about wine), and the update box "Parking is on Elm after 5 —
// the lot is closed.", in both shells. UX_11 rule 2 (11/24/2026) already says
// an example placeholder starts "For example:" and is faint and italic, so it
// never reads as a saved answer. This holds every field in both shells to it.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPDATE_PLACEHOLDER, replyPlaceholder } from '@app/lib/guestUpdatesKit';

const here = path.dirname(fileURLToPath(import.meta.url));
const files = (dir) => readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.(jsx|js)$/.test(f) ? [p] : [];
});
const SHELLS = [path.resolve(here, '../src'), path.resolve(here, '../../hostv2/src')];

describe('a placeholder never looks like an answer', () => {
  it('a sentence placeholder in either shell starts "For example:"', () => {
    const bad = [];
    for (const f of SHELLS.flatMap(files)) {
      for (const m of readFileSync(f, 'utf8').matchAll(/placeholder="([^"]*)"/g)) {
        if (/[.!]$/.test(m[1]) && !/^For example: /.test(m[1])) bad.push(path.basename(f) + ': ' + m[1]);
      }
    }
    expect(bad).toEqual([]);
  });
  // The owner, same evening: a guest took "Is there parking nearby?" in the
  // ask-the-host box for a question already written, and tapped Send.
  it("the guest's question box says what to do, not a sample question", () => {
    const src = readFileSync(path.resolve(here, '../../hostv2/src/GuestAskV2.jsx'), 'utf8');
    const ph = [...src.matchAll(/placeholder=\{([^}]*)\}/g)].map((m) => m[1]).join(' ');
    expect(ph).not.toMatch(/'[^']*\?'/);
    expect(src).toMatch(/Type your question/);
  });
  it('the update box gives an example, marked as one', () => {
    expect(UPDATE_PLACEHOLDER).toMatch(/^For example: /);
  });
  it('the reply box says what to do, to the guest who asked', () => {
    expect(replyPlaceholder('Linda Stewart')).toBe('Write your reply to Linda');
  });
  it('hostv4 shows every placeholder faint and italic', () => {
    const css = readFileSync(path.resolve(here, '../src/styles.css'), 'utf8');
    const rule = (css.match(/\.field::placeholder\s*\{([^}]*)\}/) || [])[1] || '';
    expect(rule).toMatch(/font-style:\s*italic/);
    expect(rule).toMatch(/color:\s*var\(--ink-3\)/);
  });
});
