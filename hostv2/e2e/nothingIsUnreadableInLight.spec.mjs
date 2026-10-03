// WALK EVERY RENDERED TEXT NODE AND MEASURE IT.
//
// Light mode shipped 2026-09-28. On 2026-09-29 this walk found 57 text nodes
// below WCAG AA in light and ZERO in dark — five token values that never
// branched on the mode or were tuned against a ground their text does not sit
// on. None of it was visible as "broken"; it read as the washed-out look you
// get when a theme is nearly right.
//
// This is the DELIVERY check. lightModeClearsAA.test.js holds the token
// values, which is the coverage check — it reaches surfaces this cannot,
// including the status tints that no screen in this file happens to render.
// Neither replaces the other: a token can be correct and still be applied to
// a surface that composites it differently, and a surface can be clean today
// because nothing on it uses the broken token yet.
//
// Dark is measured on the same pass, deliberately. The whole lesson of light
// mode here is that one mode passing proves nothing about the other.
import { test, expect, settled } from './fixtures.mjs';

const AUDIT = () => {
  const px = (c) => { const m = String(c).match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
  const alpha = (c) => { const m = String(c).match(/[\d.]+/g); return m && m.length > 3 ? Number(m[3]) : 1; };
  const L = (rgb) => {
    const f = rgb.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  };
  const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  // The painted ground, not the nearest ancestor: transparent and
  // near-transparent backgrounds are walked through, exactly as the eye does.
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const a = alpha(getComputedStyle(n).backgroundColor);
      if (a > 0.85) { const c = px(getComputedStyle(n).backgroundColor); if (c) return c; }
      n = n.parentElement;
    }
    return px(getComputedStyle(document.body).backgroundColor) || [255, 255, 255];
  };
  const bad = [];
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > window.innerHeight) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0' || cs.display === 'none') continue;
    // ── AND NOT BEHIND A FADING ANCESTOR ─────────────────────────────────
    // The check above reads the NODE's own style. The splash wordmark is
    // opacity 1 on itself while its .splash parent fades through 0.01, so a
    // giant "No Guesswork" in dark-mode ink over a dark panel was being
    // graded at 1.01:1 in a light-mode run — text no human can read, and no
    // human was meant to.
    //
    // It only surfaced when this spec stopped sleeping 2000ms and started
    // waiting on settled(), which releases the moment the splash is at
    // opacity <= 0.01 rather than once it has left the DOM. The sleep was
    // hiding a hole in the audit, not preventing one.
    //
    // Threshold, not zero: a node at 0.02 is as unreadable as one at 0, and
    // an exact-equality test is what let this through in the first place.
    let ghost = false;
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const acs = getComputedStyle(a);
      if (acs.visibility === 'hidden' || acs.display === 'none' || Number(acs.opacity) < 0.1) { ghost = true; break; }
    }
    if (ghost) continue;
    // Only nodes that own their text — otherwise a wrapper is judged on a
    // child's color and every failure is reported once per ancestor.
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim())
      .map((n) => n.textContent.trim()).join(' ');
    if (!own) continue;
    const fg = px(cs.color); const bg = bgOf(el);
    if (!fg || !bg) continue;
    const size = parseFloat(cs.fontSize); const w = Number(cs.fontWeight) || 400;
    // WCAG large-text allowance: 24px, or 18.66px at 700+.
    const need = (size >= 24 || (size >= 18.66 && w >= 700)) ? 3.0 : 4.5;
    const cr = ratio(fg, bg);
    if (cr < need) bad.push(`${cr.toFixed(2)}:1 (need ${need}) ${size}px/${w} ${cs.color} on rgb(${bg.join(',')}) "${own.slice(0, 40)}"`);
  }
  return bad;
};

const seed = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-aa', name: '50th at Disneyland', type: 'Birthday',
      date: '2027-11-06', endDate: '2027-11-11', isDestination: true,
      venueCity: 'Anaheim', state: 'CA', guestMode: 'count', guestCount: 16,
      totalBudget: 12000, budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-aa');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
};

for (const mode of ['light', 'dark']) {
  test(`every word on the plan clears AA — ${mode}`, async ({ page }) => {
    await seed(page);
    await page.goto(`?elegant=1&theme=${mode}`);
    await settled(page);
    const bad = await page.evaluate(AUDIT);
    expect(bad.join('\n') || 'none', `${bad.length} text nodes below AA in ${mode}`).toBe('none');
  });
}
