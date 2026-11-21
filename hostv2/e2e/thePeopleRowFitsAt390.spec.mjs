// ─── THE PEOPLE ROW FITS AT 390 (found 11/21/2026, fixed the same day) ───────
//
// "People you're hiring" at 390x844, both themes: the "which one needs you
// most" row under the hero put "Night Shift DJ" beside its readiness sentence,
// "Booking in progress — not yet confirmed. ›". `.fstat-v` is `nowrap` and
// `flex-shrink: 0` (made for short values like "National baseline"), so the
// sentence ran to x=413 in dark and x=430 in light on a 390 screen, cut at the
// edge. The same rule sat on an opened card's "Where this stands" notes: "No
// contact details on file — add a phone or email…" ran to x=687 inside a
// card whose edge is 353.
//
// A status sentence wraps; it is not cut (theReasonWrapsNotCuts, design audit
// batch 1). Measured here: every visible line of text in the sheet, at rest and
// with each vendor card open, ends inside the screen and inside every box that
// clips it.
import { test, expect, openSectionByName, dateIn } from './fixtures.mjs';

const EVENT = {
  id: 'people390-ev', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(9), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD', venueCity: 'Annapolis, MD',
  hostName: 'Casey Morgan', guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  guests: [{ id: 'g1', name: 'Jordan Avery', rsvp: 'Yes' }, { id: 'g2', name: 'Riley Park', rsvp: 'Yes', allergens: ['Peanut'] }],
  vendors: [
    { id: 'v-cat', name: 'Harvest Table Catering', category: 'Catering', status: 'Considering', phone: '(410) 555-0142', cost: 2400, budgetCategory: 'Food' },
    { id: 'v-dj', name: 'Night Shift DJ', category: 'DJ', status: 'Deposit Paid', cost: 900, depositAmt: 300, depositPaid: true, contractSigned: true },
  ],
  budget: [{ id: 'food', category: 'Food', budgeted: 2500, actual: 0 }, { id: 'music', category: 'Music', budgeted: 1000, actual: 300 }],
  timeline: [{ id: 't1', task: 'Confirm final headcount with caterer', week: 'This week' }],
};

// Runs in the page: each visible text run in the sheet whose right edge passes
// the screen or the nearest box that clips it.
const cutLines = () => {
  const vw = document.documentElement.clientWidth;
  const body = document.querySelector('.sheet .sheet-body');
  const out = [];
  let lines = 0;
  for (const el of body.querySelectorAll('*')) {
    const nodes = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (!nodes.length) continue;
    let op = 1;
    for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
    if (op < 0.02 || getComputedStyle(el).visibility === 'hidden') continue;
    let clip = { left: 0, right: vw, top: -Infinity, bottom: Infinity };
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ov = getComputedStyle(p).overflowX;
      if (ov === 'visible') continue;
      const b = p.getBoundingClientRect();
      clip = { ...clip, left: Math.max(clip.left, b.left), right: Math.min(clip.right, b.right) };
      // A fold (hidden/clip, e.g. a shut card's .vc-more) hides what is outside
      // it; a scroller (the sheet body) only moves it, so it still counts.
      if (ov === 'hidden' || ov === 'clip') clip = { ...clip, top: Math.max(clip.top, b.top), bottom: Math.min(clip.bottom, b.bottom) };
    }
    for (const n of nodes) {
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) {
        if (!r.width || r.bottom <= clip.top || r.top >= clip.bottom) continue;   // scrolled or folded away
        lines++;
        if (r.right > clip.right + 0.5) out.push(`"${n.textContent.trim().slice(0, 50)}" ends at x=${Math.round(r.right)}, past ${Math.round(clip.right)}`);
      }
    }
  }
  return { lines, out };
};

for (const theme of ['dark', 'light']) {
  test(`every line in People you're hiring fits at 390, cards shut and open (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(([e, th]) => {
      if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
      localStorage.setItem('ngw-hostv2-last-event', e.id);
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
      localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
      localStorage.setItem('ngw-theme', th);
    }, [EVENT, theme]);
    await page.goto('?elegant=1');
    await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(1200);
    await openSectionByName(page, 'People you’re hiring', { settle: 1000 });

    // PREMISE: the row that clipped is on the sheet.
    const top = page.locator('.sheet-body [data-vtop="v-dj"]');
    await expect(top).toBeVisible();
    await expect(top).toContainText('Night Shift DJ');

    const rest = await page.evaluate(cutLines);
    expect(rest.lines, 'premise: the sheet has text').toBeGreaterThan(20);
    expect.soft(rest.out, `cut at rest (${theme})`).toEqual([]);

    for (const id of ['v-cat', 'v-dj']) {
      const card = page.locator(`.vcard[data-vid="${id}"]`);
      await card.locator('.vc-head').click();
      await expect(card).toHaveClass(/\bopen\b/);
      await page.waitForTimeout(700);   // .vc-more's max-height and opacity settle
      const open = await page.evaluate(cutLines);
      expect.soft(open.out, `cut with ${id} open (${theme})`).toEqual([]);
      await card.locator('.vc-head').click();
      await page.waitForTimeout(500);
    }
  });
}
