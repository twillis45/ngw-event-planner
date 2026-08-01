// ─── ONE OWNER FOR THE TIME VOCABULARY ───────────────────────────────────────
//
// `past its window` / `due today` / `due tomorrow` / `due in N days` used to be
// generated twice — actionReason's time rung and HostShellV2's card-top due chip
// — character-for-character identical from the same input. These gates pin the
// consolidation: the shared helper must reproduce BOTH originals exactly, for
// every offset either one could ever be handed. A refactor that changes a string
// is not a refactor.
import { timeStatusLabel } from '../timeStatusLabel';

// The two implementations as they stood before consolidation, verbatim.
const ORIGINAL_CHIP = (d) => (d < 0 ? 'past its window' : d === 0 ? 'due today' : d === 1 ? 'due tomorrow' : 'due in ' + d + ' days');
const plural = (n, one, many) => `${n} ${Math.abs(n) === 1 ? one : many}`;
const ORIGINAL_LADDER = (d) => {
  if (d < 0) return 'past its window';
  if (d === 0) return 'due today';
  if (d === 1) return 'due tomorrow';
  if (d <= 7) return `due in ${plural(d, 'day', 'days')}`;
  return null;   // the ladder's own <=7 horizon
};

describe('the four labels', () => {
  test('negative days — any distance past the window reads the same', () => {
    for (const d of [-1, -2, -7, -30, -365, -4000]) expect(timeStatusLabel(d)).toBe('past its window');
  });

  test('zero days', () => { expect(timeStatusLabel(0)).toBe('due today'); });

  test('one day', () => { expect(timeStatusLabel(1)).toBe('due tomorrow'); });

  test('multiple days', () => {
    expect(timeStatusLabel(2)).toBe('due in 2 days');
    expect(timeStatusLabel(7)).toBe('due in 7 days');
    expect(timeStatusLabel(30)).toBe('due in 30 days');
  });

  // "due in 1 days" would be the classic pluralisation bug. It cannot occur:
  // 1 is claimed by 'due tomorrow' before the plural branch is reached.
  test('never emits a mis-pluralised "due in 1 days"', () => {
    for (let d = -50; d <= 400; d += 1) expect(timeStatusLabel(d)).not.toBe('due in 1 days');
  });
});

describe('it reproduces BOTH originals exactly', () => {
  test('matches the card-top chip for every offset the chip can receive', () => {
    // The chip has no horizon and guards only for finiteness.
    for (let d = -400; d <= 400; d += 1) {
      expect(timeStatusLabel(d)).toBe(ORIGINAL_CHIP(d));
    }
  });

  test('matches the reason ladder, horizon applied by the caller', () => {
    for (let d = -400; d <= 400; d += 1) {
      const viaHelper = d <= 7 ? timeStatusLabel(d) : null;   // exactly how actionReason calls it
      expect(viaHelper).toBe(ORIGINAL_LADDER(d));
    }
  });
});

describe('honest nulls', () => {
  test('non-finite input is null, never "due in undefined days"', () => {
    for (const bad of [undefined, null, NaN, Infinity, -Infinity, '3', '', {}, [], true]) {
      expect(timeStatusLabel(bad)).toBeNull();
    }
  });

  test('never throws', () => {
    for (const bad of [undefined, null, NaN, {}, [], 'x', Symbol ? 0 : 0]) {
      expect(() => timeStatusLabel(bad)).not.toThrow();
    }
  });
});

describe('the duplicate implementations are gone', () => {
  const fs = require('fs');
  const path = require('path');
  const read = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');

  test('actionReason no longer builds the labels itself', () => {
    const src = read('../actionReason.js');
    expect(src).toMatch(/timeStatusLabel/);
    // The literals may still appear in commentary; they must not appear in an
    // assignment that rebuilds the ladder.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/raw = 'past its window'/);
    expect(code).not.toMatch(/raw = 'due today'/);
  });

  test('the card-top chip no longer builds the labels itself', () => {
    const code = read('../../../hostv2/src/HostShellV2.jsx')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).toMatch(/timeStatusLabel\(a\.dueInDays\)/);
    expect(code).not.toMatch(/\? 'due today' : a\.dueInDays === 1 \? 'due tomorrow'/);
  });
});

describe('the shared constant closes the vendor/status surface', () => {
  const fs = require('fs');
  const path = require('path');
  const { PAST_WINDOW } = require('../timeStatusLabel');
  const shell = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  test('the constant IS the string — no drift between the two forms', () => {
    expect(PAST_WINDOW).toBe('past its window');
    expect(timeStatusLabel(-1)).toBe(PAST_WINDOW);
  });

  // The vendor late-chip keys on `r.status === 'overdue'`, not a day count, so it
  // cannot call timeStatusLabel(n) — it renders the constant instead. That is what
  // makes this module the single owner rather than merely the main one.
  test('the shell renders the constant, never its own copy of the literal', () => {
    expect(shell).toMatch(/\{PAST_WINDOW\}<\/span>/);
    // No quoted literal and no JSX-text literal left anywhere in the shell.
    expect(shell).not.toMatch(/'past its window'/);
    expect(shell).not.toMatch(/>past its window</);
  });

  test('this module is the ONLY production definition of the four labels', () => {
    const files = ['../actionReason.js', '../../../hostv2/src/HostShellV2.jsx'];
    for (const f of files) {
      const code = fs.readFileSync(path.join(__dirname, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
      expect(code).not.toMatch(/'due tomorrow'/);
      expect(code).not.toMatch(/'past its window'/);
    }
  });
});
