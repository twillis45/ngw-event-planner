import { GLASS_SHAPES, glassSvg, monoSvg, hasGlassShape } from './glassIcons';

// Coverage guard for the glyph single-source-of-truth standard. The cultural event-identity marks
// that EVT_IDENT (App.js) maps event types to MUST each have a glass shape, so <EventGlyph> renders
// the real identity at BOTH hero (glass/SacredMark) and small (mono silhouette) — never degrading to
// the generic flat-icon spark. Keep IDENTITY_ICONS in sync with EVT_IDENT's event-type icons; the
// standard (docs/GLYPH_STANDARD.md) says a new event type must ship {identity icon + hue + glass shape}.
const IDENTITY_ICONS = [
  'crab', 'crawfish', 'grill', 'kinara', 'jebena', 'pupusa', 'star-freedom', 'sun', 'wine',
  'spade', 'die', 'fish', 'house-key', 'house', 'cloche', 'basket', 'candle', 'rings',
  'screen-play', 'users',
];

describe('glyph coverage — single source of truth', () => {
  test('every event-identity icon has a glass shape (no generic-spark fallback)', () => {
    const missing = IDENTITY_ICONS.filter((n) => !hasGlassShape(n));
    expect(missing).toEqual([]);
  });

  test('star-freedom (Juneteenth) renders both hero glass + clean mono', () => {
    expect(glassSvg('star-freedom', '#E8202A', 92)).toMatch(/<svg[\s\S]*<path/);
    expect(monoSvg('star-freedom', '#E8202A', 20)).toMatch(/<svg[\s\S]*<path/);
  });

  test('every glass shape renders valid mono + glass SVG (never throws)', () => {
    Object.keys(GLASS_SHAPES).forEach((n) => {
      expect(glassSvg(n, '#888888', 66)).toMatch(/^<svg/);
      expect(monoSvg(n, '#888888', 20)).toMatch(/^<svg/);
    });
  });

  test('unknown icon → null (graceful; caller falls back, never throws)', () => {
    expect(glassSvg('does-not-exist', '#888888', 20)).toBeNull();
    expect(monoSvg('does-not-exist', '#888888', 20)).toBeNull();
  });
});
