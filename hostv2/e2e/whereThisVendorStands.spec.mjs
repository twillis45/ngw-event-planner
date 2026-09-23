// ─── THE ENGINE SCORED EVERY VENDOR FOR MONTHS AND NO HOST COULD SEE IT ──────
//
// `vendorIntelligence.js` has judged vendors on booking, contact, arrival,
// money, paperwork and post-event settlement since Sprint 53. The CRA cockpit
// read it. hostv2 — the app people actually use — imported 2 of its 13
// functions. The FACTS were already on this screen (agreed cost, paid flag,
// arrival time, contract flag); the VERDICT on them was not.
//
// This is slice 1 of the port, under two owner rulings of 2026-09-23: the frozen
// CRA shell is NOT deleted post-Sprint-2, and only the host-important pieces
// come across.
//
// ── WHY THE SIX, AND WHY THE VERDICT IS RECOMPUTED ─────────────────────────
//
// The engine scores NINE axes. Three are planner machinery and are not rendered
// (scope, timeline, and dayOf — a duplicate of logistics). Filtering only the
// CHIPS would have left the verdict citing evidence the host cannot see:
// measured over 1,568 vendor/event combinations, 208 did exactly that. So the
// shell calls a six-axis accessor and the verdict is computed over the same six
// it draws. The unit guard is
// src/lib/__tests__/theVerdictNamesAVisibleChip.test.js.
//
// DRIVEN, BECAUSE JEST CANNOT EXECUTE hostv2. The unit test proves the engine
// filter; only a browser proves a host is shown it.
import { test, expect, settled } from './fixtures.mjs';

const iso = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

// A plan three weeks out with three vendors, each parked on a different axis:
//   Ironwood   — confirmed, no contract on file        → paperwork
//   Fired Up   — deposit paid, balance with no due date → money
//   Cousin Rae — an informal helper                     → NO ladder at all
const seed = (page) => page.addInitScript((d) => {
  localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
    id: 'e2e-stands', name: 'The Wedding', type: 'Wedding',
    date: d, venueCity: 'Baltimore, MD', market: null,
    guestMode: 'count', guestCount: 80, totalBudget: 40000,
    budget: [], guests: [],
    vendors: [
      { id: 'v1', name: 'Ironwood', category: 'Venue', status: 'Confirmed',
        cost: 12000, contact: 'book@ironwood.test', contractSigned: false,
        depositPaid: true, balancePaid: false, arrivalTime: '2:00 PM' },
      { id: 'v2', name: 'Fired Up', category: 'Catering', status: 'Deposit Paid',
        cost: 9000, depositAmt: 2000, contact: 'chef@firedup.test',
        contractSigned: true, depositPaid: true, balancePaid: false },
      { id: 'v3', name: 'Cousin Rae', category: 'Helper', isInformal: true, cost: 0 },
    ],
  }]));
  localStorage.setItem('ngw-hostv2-last-event', 'e2e-stands');
  localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
  localStorage.setItem('ngw-welcomed', '1');
  localStorage.setItem('ngw-v2-welcomed', '1');
}, iso(21));

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}, src);

// The block lives BELOW THE FOLD (.vc-more), so the card must be opened. A spec
// that asserts over the closed card is asserting over a screen that never
// rendered — and would also pass if the block had been wrongly put on the face.
const openVendor = async (page, name) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, 'Vendors');
  await page.waitForTimeout(900);
  await settled(page);
  const hit = await page.evaluate((n) => {
    const card = [...document.querySelectorAll('.vcard')]
      .find((c) => (c.innerText || '').includes(n));
    if (!card) return null;
    card.click();
    return true;
  }, name);
  if (!hit) return null;
  await page.waitForTimeout(700);
  await settled(page);
  return page.evaluate((n) => {
    const card = [...document.querySelectorAll('.vcard')]
      .find((c) => (c.innerText || '').includes(n));
    return card ? (card.innerText || '').replace(/\s+/g, ' ') : null;
  }, name);
};

test('(premise) the vendor card opens and the block is inside the fold', async ({ page }) => {
  // Without this, an absent block and an absent screen look identical — and the
  // 2026-08-21 one-chip ruling means finding it on the CLOSED face is a failure,
  // not a pass. So: absent before the tap, present after.
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, 'Vendors');
  await page.waitForTimeout(900);
  await settled(page);
  const closed = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.vcard')].find((x) => (x.innerText || '').includes('Ironwood'));
    return c ? !!c.querySelector('.vc-more .fstat-list') && c.classList.contains('open') : null;
  });
  expect(closed).toBe(false);          // present in the DOM, but the card is shut
  const card = await openVendor(page, 'Ironwood');
  console.log('IRONWOOD >>>', card);
  expect(card).toBeTruthy();
  expect(card).toMatch(/Where this stands/i);
});

test('THE VERDICT AND ITS SENTENCE REACH THE HOST', async ({ page }) => {
  // Ironwood is confirmed with no contract on file. That is an `attention` on
  // the paperwork axis, and it is the sentence the ladder picks.
  const card = await openVendor(page, 'Ironwood');
  expect(card).toMatch(/Needs follow-up/);
  expect(card).toMatch(/Contract not on file/);
});

test('ALL SIX AXES RENDER, AND NONE OF THE THREE CUT ONES DO', async ({ page }) => {
  const card = await openVendor(page, 'Ironwood');
  for (const label of ['Booking', 'Staying in touch', 'Arrival', 'Money', 'Paperwork', 'After the event']) {
    expect(card).toContain(label);
  }
  // The cut axes' own sentences. If a future pass re-adds them to the host
  // accessor, these are what a host would start seeing.
  expect(card).not.toMatch(/scope unclear/);
  expect(card).not.toMatch(/run-of-show entries reference/);
});

test('THE MONEY AXIS SAYS WHAT IS ACTUALLY UNTRACKED', async ({ page }) => {
  // Fired Up has a deposit paid and $7,000 outstanding with no due date. The
  // engine calls that `not_tracked`, NOT safe — the SSOT #1 fix — and this is
  // the first time a hostv2 user can read it.
  const card = await openVendor(page, 'Fired Up');
  console.log('FIRED UP >>>', card);
  expect(card).toMatch(/\$7,000 balance has no due date on file/);
});

test('AN INFORMAL HELPER IS NOT PUT THROUGH THE VENDOR LADDER', async ({ page }) => {
  // Standing rule 2026-08-07: helpers get contact, never the paid-vendor ladder.
  // Cousin Rae has no contract, no deposit and no insurance to be judged on, and
  // scoring her against them would invent a problem.
  const card = await openVendor(page, 'Cousin Rae');
  expect(card).toBeTruthy();
  expect(card).not.toMatch(/Where this stands/i);
  expect(card).not.toMatch(/Paperwork/);
});

test('THE NEXT ACTION IS A STATEMENT, NOT A BUTTON THAT CANNOT ACT', async ({ page }) => {
  // getActionableNextStep returns payment/contract/arrival flows that are not
  // wired in this shell yet. Shipping the label as a control would be the
  // CTA-truthfulness defect. It renders as prose until the actions are real.
  const card = await openVendor(page, 'Ironwood');
  expect(card).toMatch(/Next:/);
  const looksLikeAControl = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.vcard')].find((x) => (x.innerText || '').includes('Ironwood'));
    if (!c) return null;
    const host = [...c.querySelectorAll('.vc-more > div')].find((d) => /Where this stands/i.test(d.innerText || ''));
    return host ? host.querySelectorAll('button,[role="button"],a').length : null;
  });
  expect(looksLikeAControl).toBe(0);
});

test('THE FOLD DOES NOT CLIP IT — .vc-more is height-capped', async ({ page }) => {
  // The expanded card is height-capped in CSS. Adding a block to the tallest
  // vendor on the sheet is exactly how that cap starts silently cutting content
  // off the bottom, with no error anywhere.
  await openVendor(page, 'Ironwood');
  const fit = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.vcard')].find((x) => (x.innerText || '').includes('Ironwood'));
    const more = c && c.querySelector('.vc-more');
    if (!more) return null;
    return { scroll: more.scrollHeight, client: more.clientHeight };
  });
  console.log('FOLD >>>', JSON.stringify(fit));
  expect(fit).toBeTruthy();
  expect(fit.scroll).toBeLessThanOrEqual(2400);
  // …and the cap is actually letting it all through, not just fitting by luck.
  expect(fit.client).toBeGreaterThanOrEqual(fit.scroll - 1);
});
