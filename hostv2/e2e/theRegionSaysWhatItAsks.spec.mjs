// ─── WHAT THE REGION ASKS, BEFORE THE HOST GOES LOOKING ───────────────────
//
// Lodging board 2026-09-27, finding #2, and Don Norman's dissent in the same
// sitting. The board barred the published rungs from firing a budget warning;
// he would not accept that nothing replaced it — "silence is also a claim",
// and a host planning in a region they cannot afford should not find that out
// by walking into it.
//
// This is what replaces it, and the placement is the argument: it sits with
// the three doors, at the moment before a host goes searching, because the
// question a regional band can honestly answer is "what will the rooms cost"
// — which on a destination event is mostly a question about what GUESTS will
// pay. The lodging form models a room block (rate, code, deadline) that
// guests book themselves.
//
// AND IT IS THE COCKPIT, NOT THE SHEET. The `lodging` sheet in HostShellV2 is
// unreachable — goToLodgingCockpit navigates to ?demo=lodging before it can
// open — and its own comment says so. Building this there would have rendered
// it to nobody, which is the third time today that trap was available.
import { test, expect, settled } from './fixtures.mjs';

const openCockpit = async (page, event) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((ev) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, event);
  await page.goto('?demo=lodging');
  await settled(page);
};

const SANTA_FE = {
  id: 'e2e-lodge', name: 'Santa Fe 80th', type: 'Birthday',
  date: '2027-06-17', endDate: '2027-06-20', isDestination: true,
  venueCity: 'Santa Fe', state: 'NM', guestMode: 'count', guestCount: 10,
  totalBudget: 6000, budget: [], vendors: [], guests: [],
};

// Inside Airbnb covers 34 regions and Santa Fe is not one of them; Los
// Angeles is. The two fixtures are the two halves of the rule.
const LA = { ...SANTA_FE, id: 'e2e-lodge-la', name: 'LA 80th', venueCity: 'Los Angeles', state: 'CA' };

test('PREMISE: the cockpit really opens on the looking stage', async ({ page }) => {
  // Without this the band assertions could pass over a blank screen, and the
  // sheet-versus-cockpit mistake would be invisible.
  await openCockpit(page, SANTA_FE);
  await expect(page.getByText('Go find some places.')).toBeVisible({ timeout: 15000 });
});

test('a covered region states what whole places ask, and credits the source', async ({ page }) => {
  await openCockpit(page, LA);
  const band = page.locator('.lc-band');
  await expect(band).toBeVisible({ timeout: 15000 });
  const txt = (await band.innerText()).replace(/\s+/g, ' ');
  expect(txt).toMatch(/Whole places around here were asking \$\d+–\$\d+ a night/);
  // The qualifier is the engine's own and is not optional: these are ASKING
  // prices and they exclude fees. Shortened 2026-09-27 after the host read
  // the full five-line version on a phone as too dense — the short form is
  // `basisShort`, and it keeps exactly the facts a host cannot infer plus
  // the attribution the CC BY 4.0 license requires.
  expect(txt).toMatch(/Asking prices, before fees/i);
  expect(txt).toMatch(/Inside Airbnb/i);
  expect(txt).toMatch(/CC BY 4\.0/i);
  // …and it is SHORT. The long form ran 323 characters; this is the gate on
  // it not creeping back.
  expect(txt.length).toBeLessThan(140);
});

test('THE FEDERAL CAP IS NOT SHOWN — cut by the host, 2026-09-27', async ({ page }) => {
  // Santa Fe has no Inside Airbnb region, so the ladder falls to rung 4: a
  // GSA reimbursement ceiling for ONE hotel room. The host is shopping whole
  // houses for ten people. It is precise, official-sounding and answers a
  // question nobody asked, and a disclaimer does not undo an anchor.
  // Silence here is the design, not a gap.
  await openCockpit(page, SANTA_FE);
  await expect(page.getByText('Go find some places.')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.lc-band')).toHaveCount(0);
  const body = await page.evaluate(() => document.body.innerText || '');
  expect(body).not.toMatch(/federal cap/i);
  expect(body).not.toMatch(/GSA/);
});

test('NOTHING IS CONVERTED — a nightly band never becomes a stay total', async ({ page }) => {
  // A place-night multiplied by three nights, or by ten guests, would be a
  // different unit wearing this one's authority. No rung is ever silently
  // converted into another rung's shape.
  await openCockpit(page, LA);
  const txt = (await page.locator('.lc-band').innerText()).replace(/\s+/g, ' ');
  for (const forbidden of ['for the stay', 'total', 'a head', 'per guest']) {
    expect(txt.toLowerCase()).not.toContain(forbidden);
  }
});

test('THE GATE RED-PROOFING CAUGHT: own evidence silences the average', async ({ page }) => {
  // Mutating the own-evidence check passed all four of the original tests —
  // a gate blind to its own fault. Once the host has picked a place, this
  // surface shows their real price, and a regional average beside it is
  // noise arguing with something better.
  await openCockpit(page, {
    ...LA,
    id: 'e2e-lodge-picked',
    lodgingOptions: [{
      id: 'opt1', name: 'The house on Rose Ave', url: 'https://www.airbnb.com/rooms/123',
      total: 4200, nights: 3, sleeps: 10, status: 'chosen',
    }],
  });
  await expect(page.locator('.lc-band')).toHaveCount(0);
});

test('no town, no claim', async ({ page }) => {
  // The ladder returns null without a state, and a band that guessed one
  // would be the whole point missed.
  await openCockpit(page, { ...SANTA_FE, id: 'e2e-notown', venueCity: '', state: '' });
  await expect(page.locator('.lc-band')).toHaveCount(0);
});

test('THERE IS A WAY BACK — the cockpit is not a dead end', async ({ page }) => {
  // Host, 2026-09-27: "make sure the host has a means to get back into the
  // rest of the event from where everyone stays."
  //
  // The cockpit is its own page (?demo=lodging). Measured before this: every
  // link on the looking stage went deeper or went OUT — five stage tabs,
  // three doors to Airbnb/Vrbo/Hotels, a paste box, and "Add the venue
  // address". Nothing returned to the event. The browser's back button is not
  // an affordance the app offers, and it is gone once a door has opened in
  // the same tab.
  await openCockpit(page, LA);
  const back = page.locator('.lc-back');
  await expect(back).toBeVisible({ timeout: 15000 });
  // It names where it goes. "Back" alone describes the browser, not a place.
  await expect(back).toContainText(/rest of the plan/i);

  await back.click();
  // It actually leaves: the demo param is what put us in the cockpit.
  await page.waitForFunction(() => !/demo=lodging/.test(location.search), null, { timeout: 15000 });
  // …and lands in the host shell with the event intact, not on a blank route.
  await expect(page.locator('.app, .sheet').first()).toBeVisible({ timeout: 20000 });
  const body = await page.evaluate(() => document.body.innerText || '');
  expect(body).toMatch(/LA 80th|Birthday/i);
});

test('the three doors are the same width', async ({ page }) => {
  // Host read them as different sizes. Measured at 390 and at the simulator's
  // 402 they were already identical (112 / 115), so this pins that rather
  // than changing it — if a future label or padding change makes them ragged,
  // this is where it shows up instead of in someone's eye.
  await openCockpit(page, LA);
  const widths = await page.evaluate(() => [...document.querySelectorAll('.lc-door')]
    .map((d) => Math.round(d.getBoundingClientRect().width)));
  expect(widths.length).toBe(3);
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
});

// ─── WHAT IT IS EACH, AND WHETHER ANYONE ASKED WHO'S COUNTED ──────────────
//
// Host, 2026-09-28: "we need per head to pass to group", and "include cost
// per head there too". A total answers the host's question; a per-person
// answers the group's, and the weighing stage is where a host is about to
// tell people what it costs them.
//
// The hedge is the point. $4,510 is $282 across sixteen and $265 across
// seventeen, and the app has never asked whether the host is in the number —
// the creation chip says "How many?" and the strings "including you" /
// "counting you" appear nowhere in the repo. Until somebody answers, the line
// says so rather than printing a settled figure.
const WEIGHING = {
  id: 'e2e-each', name: '50th at Disneyland', type: 'Birthday',
  date: '2027-11-06', endDate: '2027-11-11', isDestination: true,
  venueCity: 'Anaheim', state: 'CA', guestMode: 'count', guestCount: 16,
  totalBudget: 12000, budget: [], vendors: [], guests: [],
  lodgingOptions: [
    { id: 'o1', label: 'The house on Rose Ave', url: 'https://www.airbnb.com/rooms/1',
      sleeps: 10, beds: 4, totalPrice: 4200, pricePerNight: 840, fees: 310,
      amenities: ['kitchen', 'pool'], nights: 5,
      sources: { label: 'read', totalPrice: 'read', sleeps: 'typed', fees: 'read' } },
    { id: 'o2', label: 'Casa Verde', url: 'https://www.airbnb.com/rooms/2',
      sleeps: 12, totalPrice: 5100, nights: 5, sources: { label: 'read', totalPrice: 'read' } },
  ],
};

// THE PAIR, NOT THE ELEMENT (2026-09-29). Per-head used to be one line —
// "$282 each across 16 — nobody said…" — inside .lc-card-each. It is now the
// card's LEAD figure with the denominator and hedge welded underneath, because
// the host asked for it to carry more weight. The FACT these tests protect is
// unchanged: the figure and what it was divided by are both on screen and read
// as one statement. So the helper reads the pair and joins it, rather than
// pinning the assertions to which element happens to hold which half.
const eachLines = (page) => page.evaluate(() => {
  const cards = [...document.querySelectorAll('.lc-card')];
  if (cards.length) {
    return cards.map((c) => {
      const lead = c.querySelector('.lc-card-lead-each');
      const tail = c.querySelector('.lc-card-each');
      return [lead && lead.innerText, tail && tail.innerText]
        .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
  }
  return [...document.querySelectorAll('.lc-card-each')]
    .map((e) => e.innerText.replace(/\s+/g, ' ').trim());
});

test('a place says what it is EACH, not only what it is', async ({ page }) => {
  await openCockpit(page, WEIGHING);
  const lines = await eachLines(page);
  expect(lines.length).toBeGreaterThan(1);
  expect(lines[0]).toMatch(/\$\d+ each across 16/);
});

test('UNASKED IS SAID, not silently resolved', async ({ page }) => {
  await openCockpit(page, WEIGHING);
  expect((await eachLines(page))[0]).toMatch(/nobody said if you’re in that number/);
});

test('answering it moves the money, and drops the hedge', async ({ page }) => {
  // The whole reason the count is the urgent half: the same house is $282 or
  // $265 depending on one unasked question.
  await openCockpit(page, { ...WEIGHING, id: 'e2e-each-in', hostCounts: true });
  const inCount = await eachLines(page);
  expect(inCount[0]).toMatch(/across 16/);
  expect(inCount[0]).not.toMatch(/nobody said/);

  await openCockpit(page, { ...WEIGHING, id: 'e2e-each-out', hostCounts: false });
  const plusHost = await eachLines(page);
  expect(plusHost[0]).toMatch(/across 17/);
  expect(plusHost[0]).not.toMatch(/nobody said/);
  expect(plusHost[0]).not.toEqual(inCount[0]);
});

test('no total, no per-head — never a zero', async ({ page }) => {
  await openCockpit(page, {
    ...WEIGHING, id: 'e2e-each-none',
    lodgingOptions: [
      { id: 'n1', label: 'Just a link', url: 'https://www.airbnb.com/rooms/9', sources: { label: 'read' } },
      { id: 'n2', label: 'Another link', url: 'https://www.airbnb.com/rooms/8', sources: { label: 'read' } },
    ],
  });
  expect(await eachLines(page)).toEqual([]);
});
