// Artwork identity marks — one image, every size. Pins the registry contract
// and the sourcing rule that only processed /public assets are referenced.

import { ARTWORK_MARKS, artworkFor } from '../artworkMarks';

describe('artworkMarks', () => {
  test('crab resolves to the NOAA artwork asset', () => {
    expect(artworkFor('crab')).toBe('/crab-hero.png');
  });

  test('non-artwork icons stay on the drawn glyph system', () => {
    expect(artworkFor('grill')).toBeNull();
    expect(artworkFor('rings')).toBeNull();
    expect(artworkFor(undefined)).toBeNull();
  });

  test('every registered artwork is a local /public png (no external URLs)', () => {
    Object.values(ARTWORK_MARKS).forEach(f => {
      expect(f).toMatch(/^[a-z0-9-]+\.png$/);
      expect(f).not.toMatch(/^https?:/);
    });
  });
});
