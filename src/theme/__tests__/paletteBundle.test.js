import { TOKENS, dark, mid, light } from '../palette';

// WHY THIS EXISTS (2026-07-30)
// --------------------------------------------------------------------------
// `dangerSolid` was declared in TOKENS and never added to bundleForMode(), so
// `dark.dangerSolid` was undefined. hostv2/src/theme.js does:
//
//     set('--danger-solid', dark.dangerSolid)   →   setProperty(k, undefined)
//
// and setProperty stringifies its argument, so the custom property was set to
// the LITERAL STRING "undefined". Nothing anywhere treats that as an error:
// CSS parses it as an invalid value, drops the declaration, and the element
// paints nothing. On screen it reads as a deliberate design choice rather than
// a bug, which is exactly why it survived — the over-budget money bar shipped
// with an entirely invisible "spoken for" segment.
//
// The failure was silent at every layer, so the guard has to live at the only
// layer that can still see both sides: the declaration and the bundle.

describe('palette bundles expose every declared token', () => {
  const declared = Object.keys(TOKENS);

  it('TOKENS is non-empty (guards against the export itself breaking)', () => {
    expect(declared.length).toBeGreaterThan(10);
  });

  [['dark', dark], ['mid', mid], ['light', light]].forEach(([name, bundle]) => {
    it(`${name} carries a defined value for every TOKENS key`, () => {
      const missing = declared.filter((k) => bundle[k] === undefined);
      expect(missing).toEqual([]);
    });

    it(`${name} never carries a value that stringifies to "undefined"/"null"`, () => {
      // The exact shape of the shipped bug: a value that survives an existence
      // check but becomes an invalid CSS value the moment it is written out.
      const bad = Object.keys(bundle).filter((k) => {
        const v = bundle[k];
        return v === null || String(v) === 'undefined' || String(v) === 'null' || String(v).trim() === '';
      });
      expect(bad).toEqual([]);
    });
  });

  it('dangerSolid specifically resolves to a colour, not a stray key', () => {
    // The regression that started this. Named on its own so a failure points
    // straight at the token rather than at a list diff.
    expect(dark.dangerSolid).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(dark.dangerSolid).not.toBe(dark.dangerRed);
  });
});
