// ─── THE ACCESSIBILITY FLOOR ────────────────────────────────────────────────
//
// This file pins work that was ALREADY DONE and had nothing protecting it.
//
// I opened the board's #4 expecting to find defects — my own notes carried it as
// "untouched: keyboard path, drawer/modal, contrast". Measured on 2026-08-16, the
// host shell scored: 47 visible interactive elements with ZERO missing accessible
// names, ZERO text below the WCAG AA contrast ratio, sheets carrying
// role="dialog" + aria-modal + aria-labelledby, focus moving into the dialog on
// open, Escape closing it, focus RETURNING to the button that opened it, and
// focus trapped in both directions across 40 Tabs and 6 Shift+Tabs.
//
// That is a better result than most shipped software and it was held up by
// nothing. Every one of those properties is the kind that dies quietly: a new
// icon button with no aria-label, a token nudged a shade lighter, a sheet that
// forgets to restore focus. Nobody notices, because the people who would notice
// are the people already least likely to file a bug.
//
// So this is a FLOOR, not an audit. It asserts the properties that currently
// hold, so the day one of them stops holding is the day a test goes red rather
// than the day a host using VoiceOver gives up.
//
// WHY THESE FIVE. They are the ones that cannot be seen in a screenshot and
// therefore cannot be caught by the visual matrix: a name a screen reader reads,
// a ratio a designer's eye approves at 2.9:1, a focus ring that goes nowhere, a
// dialog a keyboard cannot leave, a dialog a keyboard cannot escape.
//
// ─── IT WALKS EVERY SECTION, AND FINDS ITS OWN LIST ────────────────────────
//
// The first version covered the home screen and ONE sheet. I only found that
// boundary by accident: a fault injected into a checklist row changed nothing,
// because no test ever rendered a checklist row. A floor with an invisible edge
// reports "accessible" about the small part it happens to visit.
//
// So the sweep now ENUMERATES the Sections door at runtime and walks whatever it
// offers, rather than carrying a hardcoded list of sheet kinds. A hardcoded list
// is wrong the day someone adds a sheet, and wrong silently — the new surface is
// simply never visited and the suite stays green. Reading the door means a
// section that exists for hosts is a section this checks, by construction.
//
// The PREMISE test guards that mechanism: if the door ever yields fewer rows than
// expected, the sweep is measuring less than it claims and says so.
import { test, expect } from './fixtures.mjs';

const boot = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-last-event', 'test-day-before-vendors');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await page.waitForFunction(() => {
    const s = document.querySelector('.splash');
    if (s && parseFloat(getComputedStyle(s).opacity) > 0.01) return false;
    const a = document.querySelector('.app');
    return !!a && (a.innerText || '').trim().length > 120;
  }, null, { timeout: 20000 });
};

// Runs in the page: WCAG relative luminance and contrast ratio.
const CONTRAST_PROBE = () => {
  const lum = (c) => {
    const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s) => {
    const m = /rgba?\(([^)]+)\)/.exec(s);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
  };
  // Walk up for the first OPAQUE background — a translucent layer would give a
  // ratio against a color nobody actually sees.
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.9) return c.rgb;
      n = n.parentElement;
    }
    return [20, 21, 24];
  };
  const ratio = (f, b) => {
    const L1 = lum(f); const L2 = lum(b);
    const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
    return (hi + 0.05) / (lo + 0.05);
  };
  const vis = (el) => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05;
  };
  const bad = [];
  for (const el of [...document.querySelectorAll('p,span,div,button,a,h1,h2,h3,strong,em,label')].filter(vis)) {
    // Only elements holding their OWN text — otherwise a container is judged on
    // a descendant's color and every wrapper reports twice.
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (!fg || fg.a < 0.5) continue;
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);   // WCAG "large text"
    const need = large ? 3 : 4.5;
    const cr = ratio(fg.rgb, bgOf(el));
    if (cr < need) bad.push({ text: (el.innerText || '').trim().slice(0, 40), ratio: Math.round(cr * 100) / 100, need, px: Math.round(size) });
  }
  return bad;
};

const NAME_PROBE = () => {
  const vis = (el) => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05;
  };
  const els = [...document.querySelectorAll('button,a[href],input,select,textarea,[role=button]')].filter(vis);
  const unnamed = els.filter((el) => {
    const t = (el.innerText || '').trim();
    return !t && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.getAttribute('title');
  }).map((el) => `${el.tagName}.${(el.className || '').toString().slice(0, 40)}`);
  return { total: els.length, unnamed };
};


/** The Sections door, read at runtime — never a hardcoded list of sheets. */
const sectionRows = async (page) => {
  // THE DOOR MOVES WITH THE VIEWPORT (2026-08-21). When the persistent rail is
  // up (desktop/widescreen) it IS the section list, and the top menu's "Jump to
  // a section" row is deliberately not rendered — it would open a sheet whose
  // only content is a second copy of the rail. Read whichever door is real
  // rather than assuming the phone's; hardcoding the menu path made this sweep
  // fail at desktop while the app was fine.
  const rail = page.locator('.srail button');
  if (await rail.count()) {
    const railLabels = await rail.allInnerTexts();
    return railLabels.map((t) => (t || '').split('\n')[0].trim())
      .filter(Boolean)
      .filter((t) => !/^(New event|Ask No Guesswork|Close)$/.test(t));
  }
  await page.locator('.ev-eyebrow').first().click({ timeout: 8000 });
  await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click({ timeout: 8000 });
  const labels = await page.locator('.sheet').last().locator('button').allInnerTexts();
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(200);
  // First line only: each row renders "Label\nsub-label".
  return labels.map((t) => (t || '').split('\n')[0].trim())
    .filter(Boolean)
    .filter((t) => !/^(New event|Ask No Guesswork|Close)$/.test(t));   // leave the shell / start a flow / not a section
};

/**
 * Open one section by its door label, from a FRESH BOOT. Returns false if it did
 * not open.
 *
 * The reboot is not defensive padding — the first version reused one page and
 * silently measured a THIRD of the app. After tabbing through a sheet, focus can
 * land in a text field, and Escape from a field is swallowed by that field's own
 * cancel (HostShellV2 documents exactly this). The sheet stayed open, the
 * Sections door was unreachable, and every later section quietly failed to open
 * while the sweep still reported success on the handful it managed. Twelve
 * sections open this way; four did the other way.
 */
const openSection = async (page, label) => {
  try {
    await boot(page);
    // Same rule as sectionRows: use the door this viewport actually has.
    const railBtn = page.locator('.srail button', { hasText: label }).first();
    if (await page.locator('.srail button').count()) {
      await railBtn.click({ timeout: 6000 });
    } else {
      await page.locator('.ev-eyebrow').first().click({ timeout: 6000 });
      await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click({ timeout: 6000 });
      await page.locator('.sheet').last().getByText(label, { exact: false }).first().click({ timeout: 6000 });
    }
    await page.waitForTimeout(300);
    return await page.locator('.sheet').count() > 0;
  } catch { return false; }
};

test.describe('the accessibility floor', () => {
  test('every visible control has a name a screen reader can read', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(NAME_PROBE);
    // PREMISE built in: a screen with no controls would pass vacuously.
    expect(r.total).toBeGreaterThan(20);
    expect(r.unnamed).toEqual([]);
  });

  test('no text sits below the WCAG AA contrast ratio', async ({ page }) => {
    await boot(page);
    const bad = await page.evaluate(CONTRAST_PROBE);
    expect(bad).toEqual([]);
  });

  test('PREMISE — the Sections door really lists the app\'s surfaces', async ({ page }) => {
    // The sweep below is only as wide as this list. If the door stops yielding
    // rows, every sweep assertion passes over nothing at all.
    await boot(page);
    const rows = await sectionRows(page);
    expect(rows.length).toBeGreaterThan(8);
    expect(rows).toContain('Your checklist');      // the surface the old floor missed
  });

  test('EVERY section holds the floor — names and contrast', async ({ page }) => {
    // The sweep. Walks each row the Sections door offers, opens it, and probes.
    // Any surface a host can reach is a surface this covers; the failure message
    // names the section so a red run points at the screen, not at the suite.
    test.setTimeout(180_000);
    await boot(page);
    const rows = await sectionRows(page);
    const findings = [];
    let visited = 0;
    for (const label of rows) {
      const opened = await openSection(page, label);
      if (!opened) continue;               // a row that needs state we have not set
      visited++;
      const names = await page.evaluate(NAME_PROBE);
      for (const u of names.unnamed) findings.push(`[${label}] unnamed control: ${u}`);
      const bad = await page.evaluate(CONTRAST_PROBE);
      for (const b of bad) findings.push(`[${label}] contrast ${b.ratio} < ${b.need} on "${b.text}" (${b.px}px)`);
    }
    // Without this the loop could visit nothing and report a clean sweep.
    expect(visited, 'the sweep opened no sections at all').toBeGreaterThan(9);
    expect(findings).toEqual([]);
  });

  test('EVERY section that opens as a dialog traps the keyboard', async ({ page }) => {
    // aria-modal="true" is a promise to assistive tech that the background is
    // inert. A sheet that makes the promise and lets Tab walk out leaves the user
    // somewhere the screen reader says does not exist — worse than never having
    // claimed it.
    test.setTimeout(180_000);
    await boot(page);
    const rows = await sectionRows(page);
    const findings = [];
    let checked = 0;
    for (const label of rows) {
      if (!await openSection(page, label)) continue;
      const claims = await page.evaluate(() => {
        const s = document.querySelector('.sheet');
        return !!(s && s.getAttribute('aria-modal') === 'true');
      });
      if (!claims) continue;               // not a modal; nothing promised
      checked++;
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab');
        const out = await page.evaluate(() => {
          const s = document.querySelector('.sheet'); const a = document.activeElement;
          if (!s || !a || s.contains(a)) return null;
          return `${a.tagName}|${(a.innerText || '').trim().slice(0, 24)}`;
        });
        if (out) { findings.push(`[${label}] focus escaped to ${out}`); break; }
      }
    }
    expect(checked, 'no section claimed aria-modal — the sweep proved nothing').toBeGreaterThan(9);
    expect(findings).toEqual([]);
  });

  test('a sheet announces itself as a dialog, and says what it is', async ({ page }) => {
    await boot(page);
    await page.locator('.ev-eyebrow').first().click({ timeout: 8000 });
    const sheet = page.locator('.sheet').first();
    await expect(sheet).toHaveAttribute('role', 'dialog');
    await expect(sheet).toHaveAttribute('aria-modal', 'true');
    // aria-modal tells assistive tech the background is inert. The focus-trap
    // test below is what makes that claim TRUE rather than a promise.
    await expect(sheet).toHaveAttribute('aria-labelledby', /.+/);
  });

  test('focus enters the dialog, and comes back to where it started', async ({ page }) => {
    // The half everyone forgets is the return. Without it a keyboard user who
    // closes a sheet is dropped at the top of the document and has to walk the
    // whole page again to get back to where they were.
    await boot(page);
    const trigger = page.locator('.ev-eyebrow').first();
    await trigger.click({ timeout: 8000 });
    await expect(page.locator('.sheet').last()).toBeVisible({ timeout: 8000 });
    expect(await page.evaluate(() => {
      const s = document.querySelector('.sheet'); const a = document.activeElement;
      return !!(s && a && s.contains(a));
    })).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.locator('.sheet')).toHaveCount(0, { timeout: 8000 });
    expect(await page.evaluate(() => document.activeElement && document.activeElement.className || ''))
      .toContain('ev-eyebrow');
  });

  test('a keyboard cannot fall out of an open dialog', async ({ page }) => {
    // What makes aria-modal="true" honest. Without a trap, Tab walks out into
    // background content the dialog has just told assistive tech to ignore —
    // the user is somewhere the screen reader says does not exist.
    await boot(page);
    await page.locator('.ev-eyebrow').first().click({ timeout: 8000 });
    await expect(page.locator('.sheet').last()).toBeVisible({ timeout: 8000 });

    const escaped = [];
    const outside = () => page.evaluate(() => {
      const s = document.querySelector('.sheet'); const a = document.activeElement;
      if (!s || !a) return null;
      if (s.contains(a)) return null;
      return `${a.tagName}|${(a.innerText || '').trim().slice(0, 30)}`;
    });
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const out = await outside();
      if (out) escaped.push(`fwd ${i}: ${out}`);
    }
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Shift+Tab');
      const out = await outside();
      if (out) escaped.push(`back ${i}: ${out}`);
    }
    expect(escaped).toEqual([]);
  });
});

// ─── THE FOCUS RING ITSELF, WHICH THIS FILE HAD NEVER MEASURED ──────────────
//
// This spec gated TEXT contrast (WCAG 1.4.3) from the day it was written and
// never looked at the indicator that tells a keyboard user where they are.
// WCAG 1.4.11 sets a separate 3:1 floor for non-text UI, and the app was
// failing it everywhere at once, from one token in one global rule:
//
//     --steel #4c6675  vs page --bg #141518   3.01:1   (0.01 over)
//     --steel #4c6675  vs card --card #1E1F22 2.72:1   FAILS
//     --steel-soft #8AA3B0 on the same two    6.91 / 6.24
//
// `outline-offset` draws the ring OUTSIDE the control, on whatever sits
// behind it, and on this app that is usually a card — so the failing number
// is the real one, not the edge case.
//
// The repo had already established this. A C1 colour audit moved TEXT onto
// --steel-soft "purely to clear the contrast floor that --steel failed", and
// left every focus ring on the failing token. One fix, one site, same token
// wrong everywhere else.
//
// TABBED, NOT SCRIPTED. `el.focus()` from an evaluated script does not make
// the element match `:focus-visible` when the page is not really focused — I
// measured "no outline at all" that way first and would have gone hunting a
// bug that did not exist. A real Tab is the only honest instrument here.
test.describe('the focus indicator holds its own floor', () => {
  const RING_MIN = 3.0;   // WCAG 1.4.11, non-text contrast

  test('(premise) tabbing really moves focus and really paints a ring', async ({ page }) => {
    await boot(page);
    await page.keyboard.press('Tab');
    const seen = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const c = getComputedStyle(el);
      return { tag: el.tagName, style: c.outlineStyle, width: c.outlineWidth, visible: el.matches(':focus-visible') };
    });
    expect(seen, 'Tab moved focus off body').not.toBeNull();
    expect(seen.visible, 'the focused element matches :focus-visible').toBe(true);
    // A ring that is not painted cannot be measured, and a spec that measured
    // `none` would report a passing contrast of Infinity.
    expect(seen.style).not.toBe('none');
  });

  // THE TOKEN ITSELF, because the sweep below could not fail for the reason it
  // was written. Red-proofing found that: reverting the focus colour to the
  // failing --steel left the sweep GREEN, because the controls reachable in 25
  // tabs happen to sit on --bg (#141518), where --steel measures 3.01 and
  // scrapes the floor by a hundredth. The surfaces where it measures 2.72 are
  // the cards, and whether a tab lands on one is an accident of layout.
  // So the rule is asserted where it is actually decided — on the token, over
  // BOTH surfaces a ring is ever drawn on. The sweep stays: it catches a
  // surface nobody thought about. This catches the colour going back.
  test('the focus colour clears 3:1 on BOTH surfaces a ring lands on', async ({ page }) => {
    await boot(page);
    const m = await page.evaluate(() => {
      const rt = getComputedStyle(document.documentElement);
      const hex = (h) => { h = h.trim().replace('#', ''); if (h.length === 3) h = h.split('').map((x) => x + x).join('');
        return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
      // Read the colour the app ACTUALLY paints a ring with, not a token name:
      // a probe element inherits whatever :focus-visible resolves to.
      const probe = document.createElement('button');
      document.body.appendChild(probe);
      probe.focus();
      const ring = getComputedStyle(probe).outlineColor;
      probe.remove();
      const rgb = (/rgba?\(([^)]+)\)/.exec(ring) || [])[1];
      const ringRgb = rgb ? rgb.split(',').slice(0, 3).map(Number) : hex(rt.getPropertyValue('--steel-soft'));
      return { ring, bg: cr(ringRgb, hex(rt.getPropertyValue('--bg'))), card: cr(ringRgb, hex(rt.getPropertyValue('--card'))) };
    });
    expect(m.bg, `focus colour ${m.ring} on --bg`).toBeGreaterThanOrEqual(3);
    expect(m.card, `focus colour ${m.ring} on --card`).toBeGreaterThanOrEqual(3);

    // AND THE LANDING-RING FAMILY, which paints with box-shadow and border
    // rather than outline and so sat outside every check here. All three were
    // still on the failing token while this file was green.
    const fam = await page.evaluate(() => {
      const rt = getComputedStyle(document.documentElement);
      const hex = (h) => { h = h.trim().replace('#', ''); if (h.length === 3) h = h.split('').map((x) => x + x).join('');
        return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
      const first = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); return m ? m[1].split(',').slice(0, 3).map(Number) : null; };
      const probe = (cls, prop) => {
        const d = document.createElement('div');
        d.className = cls; document.body.appendChild(d);
        const v = first(getComputedStyle(d)[prop]); d.remove();
        return v;
      };
      const out = {};
      for (const [name, cls, prop] of [['rowfocus', 'rowfocus', 'boxShadow'], ['vrow', 'vrow focus', 'borderTopColor']]) {
        const rgb = probe(cls, prop);
        if (rgb) out[name] = { card: cr(rgb, hex(rt.getPropertyValue('--card'))), bg: cr(rgb, hex(rt.getPropertyValue('--bg'))) };
      }
      return out;
    });
    for (const [name, r] of Object.entries(fam)) {
      expect(r.card, `${name} ring on --card`).toBeGreaterThanOrEqual(3);
      expect(r.bg, `${name} ring on --bg`).toBeGreaterThanOrEqual(3);
    }
  });

  test('EVERY ring reached by tabbing clears 3:1 against what is behind it', async ({ page }) => {
    await boot(page);
    const bad = [];
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const lum = (c) => {
          const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const parse = (s) => {
          const m = /rgba?\(([^)]+)\)/.exec(s || '');
          if (!m) return null;
          const p = m[1].split(',').map((x) => parseFloat(x));
          return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
        };
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const c = getComputedStyle(el);
        // AN OUTLINE IS NOT THE ONLY KIND OF FOCUS RING, and skipping the
        // others is how this gate stayed 12/12 green while a 2.72:1 indicator
        // shipped. A bench proved it: `.rowfocus` (the row-landing ring, ~20
        // call sites) paints with `box-shadow` and `.vrow.focus` with
        // `border`, so `return null` on `outlineStyle === 'none'` excused
        // exactly the indicators that were still on the failing token.
        // That is the same hole I had just diagnosed in my own first attempt,
        // repeated one indicator over.
        let ring = null;
        if (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0) ring = parse(c.outlineColor);
        if (!ring) ring = parse((c.boxShadow || '').replace(/^none$/, ''));
        if (!ring && parseFloat(c.borderTopWidth) > 0) ring = parse(c.borderTopColor);
        if (!ring) return null;
        // WHICH SURFACE THE RING SITS ON DEPENDS ON ITS OFFSET, and getting
        // this wrong made the gate unable to fail. Red-proofing caught it: with
        // the token reverted to the failing --steel the test still passed,
        // because the ring had moved INSIDE the control (offset -2px) while
        // this still measured it against the first opaque ANCESTOR. An inset
        // ring is drawn over the control's own fill, so that is the backdrop.
        const inset = parseFloat(c.outlineOffset) < 0;
        let n = inset ? el : el.parentElement, back = null;
        while (n && n !== document.documentElement) {
          const b = parse(getComputedStyle(n).backgroundColor);
          if (b && b.a > 0.9) { back = b.rgb; break; }
          n = n.parentElement;
        }
        if (!back) back = parse(getComputedStyle(document.documentElement).backgroundColor)?.rgb || [20, 21, 24];
        const [hi, lo] = [lum(ring.rgb), lum(back)].sort((a, b) => b - a);
        return {
          ratio: +(((hi + 0.05) / (lo + 0.05)).toFixed(2)),
          label: (el.getAttribute('aria-label') || el.innerText || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40),
          color: c.outlineColor,
        };
      });
      if (r && r.ratio < RING_MIN) bad.push(`${r.ratio}:1 on "${r.label}" (${r.color})`);
    }
    expect(bad, `focus rings under ${RING_MIN}:1`).toEqual([]);
  });

  // ── AND THE RING IS NOT CLIPPED AWAY BY AN ANCESTOR ───────────────────────
  // Host, 2026-10-07: "border is clipped on top and sides". A ring can pass
  // every contrast check and still be invisible, because `outline-offset`
  // draws it OUTSIDE the border box and an ancestor with `overflow:clip` cuts
  // it off. Measured on the venue editor: the slot's edges were flush with all
  // three of its controls, so the input lost its ring on the left and top, and
  // the Save button on the right.
  //
  // Only NON-SCROLLING clippers count. A scroll container legitimately clips
  // what is outside it, and flagging that would make this gate cry on every
  // control near a scroll edge.
  test('no focus ring is clipped away by a non-scrolling ancestor', async ({ page }) => {
    await boot(page);
    const bad = [];
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const c = getComputedStyle(el);
        if (c.outlineStyle === 'none' || parseFloat(c.outlineWidth) === 0) return null;
        const reach = parseFloat(c.outlineOffset) + parseFloat(c.outlineWidth);
        if (!(reach > 0)) return null;             // an inset ring cannot be clipped
        const b = el.getBoundingClientRect();
        // INVISIBLE CONTROLS ARE NOT CLIPPED RINGS, and finding out which kind
        // of invisible took three guesses — recorded so the next reader skips
        // them. The offender was the splash's "Skip intro", reported as cut on
        // all four sides. It is not zero-sized (my second guess) and it is not
        // off-screen (my first): `boot()` waits for the splash to reach
        // opacity <= 0.01, and an element at opacity 0 is still in the DOM and
        // still TABBABLE. A ring nobody can see cannot be clipped away from
        // them. `checkVisibility` covers ancestor opacity too, which a direct
        // read of the element's own style would miss.
        if (b.width === 0 || b.height === 0) return null;
        if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })) return null;
        const ring = { left: b.left - reach, right: b.right + reach, top: b.top - reach, bottom: b.bottom + reach };
        const cut = [];
        let n = el.parentElement;
        while (n && n !== document.documentElement) {
          const s = getComputedStyle(n);
          const box = n.getBoundingClientRect();
          const fixed = (ax) => ax === 'hidden' || ax === 'clip';   // not auto/scroll
          // A RING CANNOT BE DRAWN OFF THE SCREEN, so an ancestor edge sitting
          // at the viewport edge is geometry, not a CSS defect. Measured: two
          // toasts pinned at the app frame's bottom (859) inside a stagewrap
          // ending at 860. Nothing a stylesheet does puts a ring below the
          // last pixel. Only edges INSIDE the viewport can clip a ring away.
          const VW = window.innerWidth, VH = window.innerHeight;
          const onScreenEdge = { left: box.left <= 1, right: box.right >= VW - 1, top: box.top <= 1, bottom: box.bottom >= VH - 1 };
          // THE CONTROL'S OWN BOX MUST BE INSIDE on that side, or this is not a
          // clipped ring at all — it is an off-screen control. The first run of
          // this gate flagged "Skip intro" cut on all FOUR sides, which is the
          // signature of a box wholly outside its ancestor: the splash had
          // already left. A ring is only "clipped away" when the host can see
          // the control and cannot see its ring.
          if (fixed(s.overflowX)) {
            if (!onScreenEdge.left && b.left >= box.left - 0.5 && ring.left < box.left - 0.5) cut.push('left');
            if (!onScreenEdge.right && b.right <= box.right + 0.5 && ring.right > box.right + 0.5) cut.push('right');
          }
          if (fixed(s.overflowY)) {
            if (!onScreenEdge.top && b.top >= box.top - 0.5 && ring.top < box.top - 0.5) cut.push('top');
            if (!onScreenEdge.bottom && b.bottom <= box.bottom + 0.5 && ring.bottom > box.bottom + 0.5) cut.push('bottom');
          }
          if (cut.length) return {
            label: (el.getAttribute('aria-label') || el.innerText || el.placeholder || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 30),
            by: String(n.className || n.tagName).slice(0, 24),
            sides: [...new Set(cut)].join('+'),
          };
          n = n.parentElement;
        }
        return null;
      });
      if (r) bad.push(`"${r.label}" ring cut ${r.sides} by .${r.by}`);
    }
    expect(bad, 'focus rings clipped by a non-scrolling ancestor').toEqual([]);
  });
});
