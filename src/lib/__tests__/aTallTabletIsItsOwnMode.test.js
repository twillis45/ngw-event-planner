// ─── A TALL TABLET IS ITS OWN MODE (owner ruling, 11/22/2026) ────────────────
//
// The tall-iPad package: a portrait tablet (640–1279 wide, taller than wide)
// gets the docked bottom bar and the full-width board, and NO left rail. It is
// read the way lib/viewport.js reads the band since #236: from matchMedia, the
// question the stylesheet itself asks, never from innerWidth. Landscape tablets
// and desktops keep today's layout, rail included; phones are unchanged.
//
// The trap this closes: a 13" iPad in portrait is exactly 1024 wide, which is
// the tablet-land band, so showsRail() raised a rail on a portrait screen.
import { readTallTablet, isTallTablet, showsRail } from '../responsiveSurface';
import { readPortrait } from '../viewport';

const realMM = window.matchMedia;
// An engine at w x h: answers min-width and orientation the way a browser does.
const engineAt = (w, h) => {
  window.matchMedia = (q) => {
    const mw = /min-width:\s*(\d+)px/.exec(q);
    const or = /orientation:\s*(portrait|landscape)/.exec(q);
    let matches = false;
    if (mw) matches = w >= Number(mw[1]);
    else if (or) matches = or[1] === 'portrait' ? h >= w : w > h;
    return { matches, addEventListener() {}, removeEventListener() {} };
  };
};
afterEach(() => { window.matchMedia = realMM; });

describe('readTallTablet — a portrait tablet, read from the engine', () => {
  test.each([
    [834, 1194, true],    // iPad Pro 11" portrait
    [1024, 1366, true],   // iPad Pro 13" portrait — the tablet-land width
    [1194, 834, false],   // 11" landscape keeps the rail
    [1366, 1024, false],  // 13" landscape keeps the rail
    [390, 844, false],    // a phone is a phone
    [1440, 900, false],   // a desktop is a desktop
    [1280, 1600, false],  // a tall desktop window is still desktop
    [640, 900, true],     // the band's floor
  ])('%i x %i -> %s', (w, h, want) => {
    engineAt(w, h);
    expect(readTallTablet()).toBe(want);
  });

  test('portrait is the engine’s answer, not innerWidth vs innerHeight', () => {
    engineAt(834, 1194);
    expect(readPortrait()).toBe(true);
    engineAt(1194, 834);
    expect(readPortrait()).toBe(false);
  });
});

describe('isTallTablet — the pure rule', () => {
  test('a tablet band in portrait', () => {
    expect(isTallTablet({ bp: 'tablet', portrait: true })).toBe(true);
    expect(isTallTablet({ bp: 'tablet-land', portrait: true })).toBe(true);
  });
  test('not landscape, not a phone, not a desktop', () => {
    expect(isTallTablet({ bp: 'tablet', portrait: false })).toBe(false);
    expect(isTallTablet({ bp: 'tablet-land', portrait: false })).toBe(false);
    expect(isTallTablet({ bp: 'mobile', portrait: true })).toBe(false);
    expect(isTallTablet({ bp: 'desktop', portrait: true })).toBe(false);
    expect(isTallTablet(null)).toBe(false);
  });
});

describe('showsRail is false on a tall tablet', () => {
  test('a 13" iPad in portrait (tablet-land width) gets no rail', () => {
    expect(showsRail({ bp: 'tablet-land', portrait: true, stage: 'plan' })).toBe(false);
  });
  test('the same width in landscape keeps it', () => {
    expect(showsRail({ bp: 'tablet-land', portrait: false, stage: 'plan' })).toBe(true);
    expect(showsRail({ bp: 'desktop', portrait: true, stage: 'plan' })).toBe(true);
  });
});
