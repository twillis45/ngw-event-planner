// ─── THE iPAD BOARD: "WHERE YOU STAND" BESIDE THE QUESTION (ruling 26) ──────
//
// Owner ruling 26, 11/21/2026, made from rendered Current / Narrow / Full
// comparisons: "Narrow". On boards 1024-1279 wide:
//   · only the stat column (`.bento`: progress chips, guests, budget) moves
//     beside the question, as at >=1280;
//   · the progress bar runs the FULL board width (question column + stat
//     column) at the TOP, under the event eyebrow ("Lock in at the top");
//   · every other board zone stays below the fold, the handle at the foot;
//   · the question, its option and "Other ways" / "Calls to make" still fit the
//     first screen at 1024x768 (the bar's cost is about 50px);
//   · no text breaks mid-word (why the full two-column board was declined).
//
// RED on the old build: the stat column sat ~1,100px down the page under the
// fold, and the bar was a 293px block at the foot of the question column.
//
// SELF-PINNED: every test sets its own viewport.
import { test, expect, settled, dateIn } from './fixtures.mjs';

const EV = {
  id: 'E2E_TEST_narrow-board', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
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

// 1024x1366 left this list on 11/22/2026: the owner's tall-iPad package
// reverses ruling 26 for PORTRAIT tablets — a 13" iPad held upright now gets
// the header, the parts ribbon and the docked bar, and its first screen is
// held by aTallIPadGetsItsOwnBoard.spec.mjs at the same geometry. The
// landscape sizes keep this ruling.
const SIZES = [[1024, 768], [1180, 820]];

const boot = async (page, w, h) => {
  await page.addInitScript((ev) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.setViewportSize({ width: w, height: h });
  await page.goto('./?elegant=1');
  await settled(page);
  // The ask rises on a 0.5s spring; measure the settled layout, not the frame.
  await page.waitForFunction(() => {
    const a = document.querySelector('.hero.elegant .ask');
    return !!a && a.getAnimations().every((x) => x.playState !== 'running');
  }, null, { timeout: 5000 });
};

const measure = (page) => page.evaluate(() => {
  const B = (el) => { if (!el || !el.getClientRects().length) return null; const r = el.getBoundingClientRect();
    return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width) }; };
  const hero = document.querySelector('.hero.elegant');
  const esc = hero.querySelector(':scope > .escreen.on');
  const ecenter = esc && esc.querySelector(':scope > .ecenter');
  // Every zone that is neither the first screen, the handle, nor the stat
  // column: the rest of the hero, and whatever follows it on the page.
  const others = [...hero.children].filter((c) => !c.matches('.escreen, .efold, .bento'));
  const after = [...hero.parentElement.children].filter((c) => c !== hero && (hero.compareDocumentPosition(c) & 4));
  const intruders = [...others, ...after].map((c) => ({ cls: String(c.className).split(' ')[0] || c.tagName, box: B(c) }))
    .filter((x) => x.box && x.box.w > 0 && x.box.t < innerHeight);
  // Words broken across two lines: one Range per word, more than one line box.
  const broken = [];
  for (const root of [esc, hero.querySelector(':scope > .bento')].filter(Boolean)) {
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!n.parentElement || !n.parentElement.getClientRects().length) continue;
      const re = /\S+/g; let m;
      while ((m = re.exec(n.data))) {
        const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
        const tops = new Set([...rg.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)));
        if (tops.size > 1) broken.push(m[0]);
      }
    }
  }
  const fitters = [...hero.querySelectorAll('button, a')].filter((b) => /^(Other ways|Calls to make)/.test((b.textContent || '').trim()));
  return {
    vh: innerHeight,
    // Every wide board names its event in the title block, which replaced the
    // eyebrow here (owner, 11/24/2026); the bar sits under whichever heads it.
    eyebrow: B(esc && esc.querySelector(':scope > .ev-eyebrow, :scope > .tt-head')),
    eprog: B(esc && esc.querySelector(':scope > .eprog')),
    ecenter: B(ecenter),
    ask: B(hero.querySelector('.ask')),
    card: B(ecenter && ecenter.querySelector('.card')),
    fitters: fitters.map((b) => ({ text: b.textContent.trim().slice(0, 20), box: B(b) })),
    bento: B(hero.querySelector(':scope > .bento')),
    fold: B(hero.querySelector(':scope > .efold')),
    intruders,
    broken,
  };
});

for (const [w, h] of SIZES) {
  test(`${w}x${h} — the stat column stands beside the question`, async ({ page }) => {
    await boot(page, w, h);
    const m = await measure(page);
    expect(m.bento, 'the stat column renders').not.toBeNull();
    expect(m.ecenter, 'the question renders').not.toBeNull();
    // Beside: to the right of the question column, and sharing its band.
    expect(m.bento.l, `stat column left ${m.bento.l} vs question right ${m.ecenter.r}`).toBeGreaterThanOrEqual(m.ecenter.r);
    expect(m.bento.t, 'the stat column starts in the first screen').toBeLessThan(m.vh);
    expect(m.bento.t, 'and beside the question, not under it').toBeLessThan(m.ecenter.b);
  });

  test(`${w}x${h} — the progress bar spans both columns, at the top`, async ({ page }) => {
    await boot(page, w, h);
    const m = await measure(page);
    expect(m.eprog, 'the progress bar renders').not.toBeNull();
    // Full board width: the question column's left edge to the stat column's right.
    expect(Math.abs(m.eprog.l - m.ecenter.l), `bar left ${m.eprog.l} vs board left ${m.ecenter.l}`).toBeLessThanOrEqual(2);
    expect(Math.abs(m.eprog.r - m.bento.r), `bar right ${m.eprog.r} vs board right ${m.bento.r}`).toBeLessThanOrEqual(2);
    // At the top: under the eyebrow, above both the question and the stat column.
    expect(m.eprog.t, 'under the eyebrow').toBeGreaterThanOrEqual(m.eyebrow.b);
    expect(m.eprog.b, 'above the question').toBeLessThanOrEqual(m.ecenter.t);
    expect(m.eprog.b, 'above the stat column').toBeLessThanOrEqual(m.bento.t);
  });

  test(`${w}x${h} — nothing else rises into the first screen; the handle is at the foot`, async ({ page }) => {
    await boot(page, w, h);
    const m = await measure(page);
    expect(m.intruders, 'below-fold zones visible in the first screen').toEqual([]);
    expect(m.fold, 'the fold handle renders').not.toBeNull();
    expect(Math.round((m.fold.t / m.vh) * 100), 'fold handle at the foot (>=80% down)').toBeGreaterThanOrEqual(80);
  });

  test(`${w}x${h} — the question, its option and its two links fit the first screen`, async ({ page }) => {
    await boot(page, w, h);
    const m = await measure(page);
    expect(m.card, 'the option card renders').not.toBeNull();
    expect(m.card.b, 'option card bottom').toBeLessThanOrEqual(m.vh);
    expect(m.fitters.map((f) => f.text.replace(/\s+.*/, '')).sort(), 'Other ways and Calls to make both render').toEqual(['Calls', 'Other']);
    for (const f of m.fitters) expect(f.box.b, `"${f.text}" bottom`).toBeLessThanOrEqual(m.fold.t);
  });

  if (h >= 1000) {
    test(`${w}x${h} — a tall screen puts the question at the top, not the center`, async ({ page }) => {
      await boot(page, w, h);
      const m = await measure(page);
      // The top offset is clamp(24px, 6vh, 72px); centered in a 1,200px row the
      // headline sat ~450px down. 120 leaves room for the offset and no more.
      expect(m.ask.t - m.ecenter.t, `question ${m.ask.t - m.ecenter.t}px below the top of its column`).toBeLessThanOrEqual(120);
    });
  }

  test(`${w}x${h} — no text breaks mid-word`, async ({ page }) => {
    await boot(page, w, h);
    const m = await measure(page);
    expect(m.broken, 'words split across two lines').toEqual([]);
  });
}
