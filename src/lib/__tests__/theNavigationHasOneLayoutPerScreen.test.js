// ─── ONE NAVIGATION LAYOUT PER SCREEN (owner rulings, 11/23/2026) ────────────
//
// The navigation package: which chrome a screen carries is one decision, read
// once (navLayout), so the shell and the stylesheet cannot disagree.
//
//   'pill'      a phone (elegant mode): the tall header, the progress on top,
//               and a bottom pill (Create · Plan · The Day · After | All
//               sections · Search). No ☰, no floating NEXT bar.
//   'bar'       a portrait tablet 640–1023 wide: today's tall mode, the
//               docked bottom bar, no rail.
//   'tall-rail' a portrait tablet at least 1024 wide (the 12.9"/13"): the tall
//               board with the landscape rail always up, and no bottom bar.
//   'rail'      landscape tablets and desktops: unchanged.
//   'menu'      the ?elegant=0 fallback below the rail band: its own v2 chrome.
import { navLayout, isTallRail, showsRail } from '../responsiveSurface';

describe('navLayout', () => {
  test.each([
    // bp, portrait, elegant, want
    ['mobile', true, true, 'pill'],
    ['mobile', false, true, 'pill'],        // a phone on its side is still a phone
    ['tablet', true, true, 'bar'],          // 768x1024, 834x1194
    ['tablet-land', true, true, 'tall-rail'], // 1024x1366
    ['tablet-land', false, true, 'rail'],   // 1366x1024, 1024x768
    ['tablet', false, true, 'menu'],        // a small landscape tablet below the rail band
    ['desktop', false, true, 'rail'],
    ['desktop', true, true, 'rail'],        // a tall desktop window is a desktop
    ['mobile', true, false, 'menu'],        // ?elegant=0 keeps its own chrome
    ['tablet', true, false, 'menu'],
    ['tablet-land', true, false, 'rail'],
  ])('%s portrait=%s elegant=%s -> %s', (bp, portrait, elegant, want) => {
    expect(navLayout({ bp, portrait, elegant })).toBe(want);
  });

  test('the tall rail is the rail: showsRail agrees with navLayout everywhere', () => {
    for (const bp of ['mobile', 'tablet', 'tablet-land', 'desktop']) {
      for (const portrait of [true, false]) {
        const layout = navLayout({ bp, portrait, elegant: true });
        expect(showsRail({ bp, portrait, stage: 'plan' })).toBe(layout === 'rail' || layout === 'tall-rail');
        expect(isTallRail({ bp, portrait })).toBe(layout === 'tall-rail');
      }
    }
  });
});
