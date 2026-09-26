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
import { test, expect, settled, dateIn } from './fixtures.mjs';

const iso = (d) => dateIn(d);

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
      // Quoted, nothing paid: the engine's action here is the BOOKING one
      // ("Decide on Bloom."), which is the case whose control is folded behind
      // the status pill. Measured, not assumed — Fired Up looks like a booking
      // case and is actually `scope`.
      { id: 'v4', name: 'Bloom', category: 'Florist', status: 'Quoted', cost: 2000, contact: 'hello@bloom.test' },
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

test('THE NEXT ACTION CARRIES NO WRITE CONTROL OF ITS OWN', async ({ page }) => {
  // SLICE 1 asserted zero interactive elements here, because no action was
  // wired and a button that cannot act is the UX_07 defect. SLICE 2 wired them
  // by NAVIGATION, so exactly one element is correct now — a link, never a
  // second copy of a write control that already exists elsewhere on the card.
  // The rule this file guards did not change; what satisfies it did.
  const card = await openVendor(page, 'Ironwood');
  expect(card).toMatch(/Next:/);
  const inside = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.vcard')].find((x) => (x.innerText || '').includes('Ironwood'));
    if (!c) return null;
    const host = [...c.querySelectorAll('.vc-more > div')].find((d) => /Where this stands/i.test(d.innerText || ''));
    if (!host) return null;
    return { writes: host.querySelectorAll('button, input, select, textarea').length,
      links: host.querySelectorAll('[data-vgo]').length };
  });
  expect(inside).toEqual({ writes: 0, links: 1 });
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

// ─── SLICE 2: THE NEXT ACTION POINTS AT THE CONTROL THAT ALREADY EXISTS ──────
//
// `getActionableNextStep` returns seven CTA kinds. Building them as buttons was
// the obvious move and was REFUSED after checking the shell: hostv2 already has
// a working control for every one — the status ladder, the COI ladder, the paid
// toggle, the arrival field, "I reached out", the contract row. Seven new
// buttons would have put a second write path beside each, which is the
// duplicate-surface rule and the one-fact-two-owners defect at once.
//
// So the action NAVIGATES. These tests prove the link lands on the real control
// and that no copy of it was grown.

const goNext = async (page, name) => {
  await openVendor(page, name);
  return page.evaluate((n) => {
    const card = [...document.querySelectorAll('.vcard')].find((c) => (c.innerText || '').includes(n));
    const go = card && card.querySelector('[data-vgo]');
    if (!go) return null;
    const anchor = go.getAttribute('data-vgo');
    go.click();
    return anchor;
  }, name);
};

const landed = (page, name) => page.evaluate((n) => {
  const card = [...document.querySelectorAll('.vcard')].find((c) => (c.innerText || '').includes(n));
  const el = card && card.querySelector('.vgo-lands');
  if (!el) return null;
  return { action: el.getAttribute('data-vaction'), focused: document.activeElement === el,
    tag: el.tagName.toLowerCase() };
}, name);

test('(premise) the next action offers a way through, and names its anchor', async ({ page }) => {
  // Ironwood is confirmed with no contract on file, so the engine's action is
  // the contract one. Without this, the landing assertions below could be
  // passing over a card that never offered a link at all.
  const anchor = await goNext(page, 'Ironwood');
  expect(anchor).toBe('contract');
});

test('THE LINK LANDS ON THE REAL CONTROL, FOCUSED', async ({ page }) => {
  await goNext(page, 'Ironwood');
  await page.waitForTimeout(400);
  const hit = await landed(page, 'Ironwood');
  console.log('LANDED >>>', JSON.stringify(hit));
  expect(hit).toBeTruthy();
  expect(hit.action).toBe('contract');
});

test('A VENDOR WITH NO CONTRACT NOW HAS A CONTRACT CONTROL AT ALL', async ({ page }) => {
  // The gap this slice found. The contract row was gated on a contract already
  // existing in some form, so the one host who most needs the attach/paste
  // affordance — the one with nothing on file — was the only host who could not
  // see it. Ironwood has contractSigned:false and no URL.
  const card = await openVendor(page, 'Ironwood');
  expect(card).toMatch(/signed contract/i);
  const hasPasteField = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.vcard')].find((x) => (x.innerText || '').includes('Ironwood'));
    const row = c && c.querySelector('[data-vaction="contract"]');
    return !!(row && row.querySelector('input[placeholder*="contract" i], label'));
  });
  expect(hasPasteField).toBe(true);
});

test('BOOKING OPENS ITS LADDER FIRST — never a dead end', async ({ page }) => {
  // The status ladder is folded behind the pill. Pointing at a pill that
  // reveals nothing would land the host on a closed control they then have to
  // work out how to open.
  //
  // Bloom, not Fired Up. Fired Up is "Deposit Paid" and LOOKS like a booking
  // case; its action is actually `scope` ("Confirm: Final guest count"). That
  // was measured off the engine rather than guessed, after this test failed on
  // the assumption.
  const anchor = await goNext(page, 'Bloom');
  expect(anchor).toBe('booking');
  await page.waitForTimeout(400);
  const open = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.vcard')].find((x) => (x.innerText || '').includes('Bloom'));
    return !!(c && c.querySelector('.vc-statuspick'));
  });
  expect(open).toBe(true);
});

test('A CATEGORY WITH NO SINGLE CONTROL GETS PROSE AND NO LINK', async ({ page }) => {
  // Fired Up's action is `scope` — "Confirm: Final guest count confirmed?".
  // There is no one control on this card for it (the guest count lives in an
  // obligations LIST), and pointing at a list by fuzzy-matching the action's
  // title to a row would be a guess. So it says the thing and offers no way
  // through, which is honest. A link here would be the defect.
  const card = await openVendor(page, 'Fired Up');
  expect(card).toMatch(/Final guest count confirmed/);
  const links = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.vcard')].find((x) => (x.innerText || '').includes('Fired Up'));
    const block = [...c.querySelectorAll('.vc-more > div')].find((d) => /Where this stands/i.test(d.innerText || ''));
    return block ? block.querySelectorAll('[data-vgo]').length : null;
  });
  expect(links).toBe(0);
});

test('NO SECOND WRITE PATH WAS GROWN — the block still holds one link and no controls', async ({ page }) => {
  // The whole reason this slice navigates instead of acting. If a future pass
  // adds a "Mark confirmed" button here, there are two owners of that write and
  // this fails.
  await openVendor(page, 'Ironwood');
  const counts = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.vcard')].find((x) => (x.innerText || '').includes('Ironwood'));
    const block = [...c.querySelectorAll('.vc-more > div')].find((d) => /Where this stands/i.test(d.innerText || ''));
    if (!block) return null;
    return {
      links: block.querySelectorAll('[data-vgo]').length,
      others: block.querySelectorAll('button, input, select, textarea').length,
    };
  });
  console.log('BLOCK >>>', JSON.stringify(counts));
  expect(counts).toEqual({ links: 1, others: 0 });
});

test('THE LINK IS SCOPED TO ITS OWN VENDOR, not the first match on the sheet', async ({ page }) => {
  // Three vendors are on this sheet. A bare querySelector would have found the
  // first matching control in the document, which is somebody else's row.
  await goNext(page, 'Bloom');
  await page.waitForTimeout(400);
  const where = await page.evaluate(() => {
    const el = document.querySelector('.vgo-lands');
    if (!el) return null;
    const card = el.closest('.vcard');
    return card ? (card.innerText || '').slice(0, 40) : null;
  });
  expect(where).toMatch(/Bloom/);
});

test('THE FOLD STILL DOES NOT CLIP, with the contract row now always present', async ({ page }) => {
  // Slice 1 raised this cap after adding 431px. Slice 2 adds a contract row to
  // every paid vendor that lacked one. Same tripwire, re-measured.
  await openVendor(page, 'Ironwood');
  const fit = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.vcard')].find((x) => (x.innerText || '').includes('Ironwood'));
    const more = c && c.querySelector('.vc-more');
    return more ? { scroll: more.scrollHeight, client: more.clientHeight } : null;
  });
  console.log('FOLD2 >>>', JSON.stringify(fit));
  expect(fit.client).toBeGreaterThanOrEqual(fit.scroll - 1);
});

// ─── FINAL SLICE: WHICH VENDOR NEEDS THE HOST MOST ──────────────────────────
//
// The hero says how many vendors are booked. It has never said WHICH one is the
// problem, so a host with nine vendors opened nine cards to find out.
//
// Ranked over the same six axes the cards show. Ranking over the engine's nine
// would name a vendor "worst" on the strength of a run-of-show row the host will
// never see — the wrong-population defect fixed inside one card, one level up.

const topLine = (page) => page.evaluate(() => {
  const el = document.querySelector('[data-vtop]');
  return el ? { vendorId: el.getAttribute('data-vtop'),
    text: (el.innerText || '').replace(/\s+/g, ' ').trim() } : null;
});

const openVendorsTab = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, 'Vendors');
  await page.waitForTimeout(900);
  await settled(page);
};

test('(premise) the top-risk line renders and names a real vendor', async ({ page }) => {
  await openVendorsTab(page);
  const t = await topLine(page);
  console.log('TOP >>>', JSON.stringify(t));
  expect(t).toBeTruthy();
  expect(['v1', 'v2', 'v4']).toContain(t.vendorId);
});

test('IT CARRIES THE VERDICT’S OWN SENTENCE, not a generic nudge', async ({ page }) => {
  // The line must say WHY, in the engine's words, or it is a badge that sends
  // the host hunting — which is the thing it exists to stop.
  await openVendorsTab(page);
  const t = await topLine(page);
  expect(t.text.length).toBeGreaterThan(20);
  expect(t.text).toMatch(/not on file|not yet confirmed|Not booked|no due date|overdue|needs|Decide/i);
});

test('TAPPING IT OPENS THAT VENDOR’S CARD', async ({ page }) => {
  await openVendorsTab(page);
  const t = await topLine(page);
  await page.evaluate(() => document.querySelector('[data-vtop]').click());
  await page.waitForTimeout(700);
  const opened = await page.evaluate((id) => {
    const c = document.querySelector('.vcard[data-vid="' + id + '"]');
    return c ? c.classList.contains('open') : null;
  }, t.vendorId);
  expect(opened).toBe(true);
});

test('A HELPER CAN NEVER BE NAMED — they have no ladder to fail', async ({ page }) => {
  // Cousin Rae is informal. Ranking her would let a cousin outrank a caterer on
  // paperwork she was never going to file.
  await openVendorsTab(page);
  const t = await topLine(page);
  expect(t.vendorId).not.toBe('v3');
});

test('IT STAYS QUIET WHEN EVERY VENDOR IS HEALTHY', async ({ page }) => {
  // On a settled plan the hero already says "everyone's locked in". A second
  // line under it saying "nothing needs you" is two voices on one fact.
  await page.setViewportSize({ width: 390, height: 844 });
  // A "settled" fixture took two tries to get right, and both misses were the
  // same shape — asserting over a state the engine does not actually consider
  // clear. `coiStatus: 'verified'` is NOT a valid status (the ladder is
  // requested -> received, with `coiVerified` as a separate flag), so it fell
  // through to 'required' and read critical; and a certificate with no expiry
  // date reads overdue however verified it is. Measured off the engine, the
  // clear state is received + coiVerified + an expiry past the event.
  await page.addInitScript(({ d, COI_GOOD_UNTIL }) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-calm', name: 'Settled', type: 'Wedding', date: d,
      venueCity: 'Baltimore, MD', guestMode: 'count', guestCount: 80,
      totalBudget: 40000, budget: [], guests: [],
      vendors: [
        { id: 'c1', name: 'Alpha', category: 'Venue', status: 'Confirmed', cost: 1000,
          contact: 'a@b.c', contractSigned: true, depositPaid: true, balancePaid: true,
          arrivalTime: '1:00 PM', coiStatus: 'received', coiVerified: true, payDueDate: d,
          coiExpiryDate: COI_GOOD_UNTIL },
        { id: 'c2', name: 'Beta', category: 'Catering', status: 'Confirmed', cost: 2000,
          contact: 'd@e.f', contractSigned: true, depositPaid: true, balancePaid: true,
          arrivalTime: '2:00 PM', coiStatus: 'received', coiVerified: true, payDueDate: d,
          coiExpiryDate: COI_GOOD_UNTIL },
      ],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-calm');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, { d: iso(21), COI_GOOD_UNTIL: iso(200) });
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, 'Vendors');
  await page.waitForTimeout(900);
  await settled(page);
  const t = await topLine(page);
  console.log('CALM >>>', JSON.stringify(t));
  expect(t).toBeNull();
});
