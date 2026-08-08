import { bpOf, isWideBp, measureFor, BREAKPOINTS, WIDESCREEN, CONTENT_MEASURE } from '../viewport';

// These lock the board-ratified thresholds so a future "tidy-up" cannot quietly
// move them. The 1536 widescreen line in particular was board-REVISED down from
// 1680 because 1680 stranded the 1440/1536 laptops planners actually triage on —
// a number with a reason behind it, not a round guess.

describe('bpOf — the four bands', () => {
  it('names each band at its own width', () => {
    expect(bpOf(390)).toBe('mobile');        // iPhone
    expect(bpOf(768)).toBe('tablet');        // iPad portrait
    expect(bpOf(1024)).toBe('tablet-land');  // iPad landscape
    expect(bpOf(1280)).toBe('desktop');
    expect(bpOf(1920)).toBe('desktop');
  });

  it('puts the boundary widths on the upper side, with no gap between bands', () => {
    expect(bpOf(BREAKPOINTS.tablet - 1)).toBe('mobile');
    expect(bpOf(BREAKPOINTS.tablet)).toBe('tablet');
    expect(bpOf(BREAKPOINTS.tabletLand - 1)).toBe('tablet');
    expect(bpOf(BREAKPOINTS.tabletLand)).toBe('tablet-land');
    expect(bpOf(BREAKPOINTS.desktop - 1)).toBe('tablet-land');
    expect(bpOf(BREAKPOINTS.desktop)).toBe('desktop');
  });

  it('covers every width — no input falls through to undefined', () => {
    for (let w = 200; w <= 2600; w += 7) {
      expect(['mobile', 'tablet', 'tablet-land', 'desktop']).toContain(bpOf(w));
    }
  });

  it('portrait iPad is tablet, NOT mobile — the band that had zero CSS rules', () => {
    // The defect this whole port exists to close: nothing in the stylesheet
    // targeted 640–1023, so 768 rendered the phone layout stretched.
    [640, 744, 768, 810, 834, 1023].forEach((w) => expect(bpOf(w)).toBe('tablet'));
  });
});

describe('isWideBp — "is the sidebar visible"', () => {
  it('shows the rail from tablet-land up, and not below', () => {
    expect(isWideBp('mobile')).toBe(false);
    expect(isWideBp('tablet')).toBe(false);
    expect(isWideBp('tablet-land')).toBe(true);
    expect(isWideBp('desktop')).toBe(true);
  });
});

describe('WIDESCREEN is a refinement inside desktop, not a fifth band', () => {
  it('sits above the desktop threshold', () => {
    expect(WIDESCREEN).toBeGreaterThan(BREAKPOINTS.desktop);
  });

  it('does not introduce a new bp value at its own width', () => {
    // If widescreen ever became its own band it would break every
    // `bp === 'desktop'` check in the donor shell.
    expect(bpOf(WIDESCREEN)).toBe('desktop');
    expect(bpOf(WIDESCREEN + 400)).toBe('desktop');
  });

  it('is 1536, the board-revised value — 1680 stranded real laptops', () => {
    expect(WIDESCREEN).toBe(1536);
    expect(WIDESCREEN).toBeLessThanOrEqual(1536);
  });
});

describe('measureFor — width by content type', () => {
  it('gives every tier a wider measure on a widescreen than on a base screen', () => {
    ['standard', 'wide', 'content', 'data', 'reading'].forEach((tier) => {
      expect(measureFor(tier, true)).toBeGreaterThan(measureFor(tier, false));
    });
  });

  it('lets dense data use more width than standard content', () => {
    expect(measureFor('wide', false)).toBeGreaterThan(measureFor('standard', false));
    expect(measureFor('wide', true)).toBeGreaterThan(measureFor('standard', true));
  });

  it('keeps the tiers close enough to read as ONE app (board ruling 2026-06-11)', () => {
    // The ruling collapsed four tiers to two precisely so the app stopped
    // reading as five different widths. ~80–200px apart is the stated intent.
    const gapBase = measureFor('wide', false) - measureFor('standard', false);
    const gapWide = measureFor('wide', true) - measureFor('standard', true);
    expect(gapBase).toBeGreaterThanOrEqual(80);
    expect(gapBase).toBeLessThanOrEqual(200);
    expect(gapWide).toBeGreaterThanOrEqual(80);
    expect(gapWide).toBeLessThanOrEqual(200);
  });

  it('aliases the legacy names onto the two real tiers', () => {
    expect(measureFor('content', false)).toBe(measureFor('standard', false));
    expect(measureFor('reading', false)).toBe(measureFor('standard', false));
    expect(measureFor('data', false)).toBe(measureFor('wide', false));
  });

  it('lets a multi-pane workspace opt out entirely', () => {
    expect(measureFor('full', false)).toBe('none');
    expect(measureFor('full', true)).toBe('none');
  });

  it('falls back to standard for an unknown tier rather than returning undefined', () => {
    expect(measureFor('nonsense', false)).toBe(CONTENT_MEASURE.standard.base);
    expect(measureFor(undefined, true)).toBe(CONTENT_MEASURE.standard.wide);
  });
});
