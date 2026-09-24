// ─── THE ONE ELEMENT EVERY ELEGANT SCREEN KEEPS HAS TO BE READABLE ───────────
//
// Host, 2026-09-24: "this also need adjustment not easily readable", against a
// masthead reading
//
//   43 DAYS · MARGARET ADEYEMI'S RETIREMENT CELEBRATION · RETIREMENT PARTY · FRI, NOV 6
//
// Measured on the live build at 390px before the fix: 83 characters, 11.5px,
// weight 700, uppercase, 1.035px tracking — FOUR wrapped lines, 64px tall, the
// last line an orphan "6". Contrast was never the problem (5.29:1, passes AA);
// all-caps plus wide tracking plus length was.
//
// The element was ported as "countdown · event name, uppercase" — two facts —
// and had grown to four, each added deliberately. The fix drops the type only
// when the NAME already says it, so no fact is lost.
//
// WHY A LINE COUNT AND NOT A CHARACTER COUNT: the complaint was about wrapping,
// and a character budget would pass a long name that happens to break well and
// fail a short one that does not. This measures the thing the host saw.
import { test, expect, settled } from './fixtures.mjs';

const boot = async (page, ev) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
};

const base = {
  date: '2026-11-06', venueCity: 'Annapolis', venueState: 'MD',
  guestMode: 'count', guestCount: 9, totalBudget: 1200,
  budget: [], vendors: [], guests: [],
};

const masthead = (page) => page.evaluate(() => {
  const el = document.querySelector('.eb-text');
  if (!el) return null;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    text: el.innerText.replace(/\s+/g, ' ').trim(),
    lines: Math.round(r.height / parseFloat(cs.lineHeight || cs.fontSize)),
  };
});

test('(premise) the elegant masthead is on screen and carries the countdown', async ({ page }) => {
  await boot(page, { ...base, id: 'mh-premise', name: 'Wanda turns 50', type: 'Birthday' });
  const m = await masthead(page);
  expect(m).toBeTruthy();
  expect(m.text).toMatch(/\d+\s+DAYS/);
});

test('A LONG NAME FITS IN TWO LINES — it was four', async ({ page }) => {
  await boot(page, {
    ...base, id: 'mh-long',
    name: "Margaret Adeyemi's Retirement Celebration", type: 'Retirement Party',
  });
  const m = await masthead(page);
  expect(m.lines).toBeLessThanOrEqual(2);
  // The identity and the calendar entry both survive the cut.
  expect(m.text).toMatch(/MARGARET ADEYEMI/);
  expect(m.text).toMatch(/NOV 6/);
  // The restatement does not: the name already says "Retirement".
  expect(m.text).not.toMatch(/RETIREMENT PARTY/);
});

test('THE TYPE SURVIVES WHEN THE NAME DOES NOT SAY IT', async ({ page }) => {
  // The half that matters. Dropping the type here would leave a host looking at
  // "Wanda turns 50" with nothing on screen saying what kind of event it is.
  await boot(page, { ...base, id: 'mh-keep', name: 'Wanda turns 50', type: 'Birthday' });
  const m = await masthead(page);
  expect(m.text).toMatch(/BIRTHDAY/);
  expect(m.lines).toBeLessThanOrEqual(2);
});
