// ─── A COUNT ON A CHIP IS A PROMISE ABOUT THE ROWS UNDER IT ──────────────────
//
// The ninth re-score left Design at 9 on this: the vendor toolbar's
// "Everyone N" counted every matching vendor while the DEFAULT lens partitions
// settled vendors into a collapsed fold, so the number sat above fewer cards
// the moment anything was settled. The re-score also named the red-proof that
// had never been run -- seed a settled vendor first -- because ev-x-wanda has
// none, which is the only reason the fault was invisible.
//
// The leaders settle the shape: Linear, Plane, ClickUp and Asana all put a
// count on a GROUP and none on "all". So "Everyone" now carries no number, and
// every remaining chip must equal the rows its lens actually renders.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const boot = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
  });
  await page.goto('?elegant=1');
  await settled(page);
};

const openVendors = async (page) => {
  const rail = page.locator('.srail-row', { hasText: /People you/ });
  if (await rail.count()) { await rail.first().click(); } else {
    await page.locator('.ev-eyebrow').first().click();
    await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click();
    await settled(page);
    await page.locator('.sheet').last().getByText(/People you/).first().click();
  }
  await settled(page);
};

test.describe('lens chips state the truth about their rows', () => {
  test('"Everyone" carries no count, because it is not a group', async ({ page }) => {
    await boot(page);
    await openVendors(page);
    const chips = page.locator('.rtool-lens .chip');
    if (!(await chips.count())) test.skip(true, 'toolbar renders only past six vendors');

    const everyone = chips.filter({ hasText: 'Everyone' }).first();
    await expect(everyone).toHaveCount(1);
    const label = ((await everyone.textContent()) || '').trim();
    // The precise fault: a bare trailing number on the all-lens chip.
    expect(label, `"Everyone" still carries a count: ${JSON.stringify(label)}`).toBe('Everyone');
  });

  test('every OTHER chip equals the rows its own lens renders', async ({ page }) => {
    await boot(page);
    await openVendors(page);
    const chips = page.locator('.rtool-lens .chip');
    if (!(await chips.count())) test.skip(true, 'toolbar renders only past six vendors');

    const labels = await chips.allTextContents();
    let checked = 0;
    for (const raw of labels) {
      const text = raw.trim();
      const m = /(\d+)$/.exec(text);
      if (!m) continue;                       // "Everyone" — covered above
      const claimed = Number(m[1]);
      await chips.filter({ hasText: text.replace(/\s+\d+$/, '') }).first().click();
      await settled(page);
      await page.waitForTimeout(250);
      // Rows the host can actually reach in this lens: the cards on screen,
      // plus any the settled fold is holding (the fold states its own count).
      const cards = await page.locator('.vcard').count();
      const foldText = (await page.locator('.fold-btn').first().textContent().catch(() => '')) || '';
      const folded = Number((/^\s*(\d+)\s+settled/.exec(foldText) || [])[1] || 0);
      expect(cards + folded,
        `chip "${text}" claims ${claimed} but its lens reaches ${cards} card(s) + ${folded} folded`)
        .toBe(claimed);
      checked += 1;
    }
    expect(checked, 'no counted chip was exercised — this test proved nothing').toBeGreaterThan(0);
  });

  // THE SAME FAULT, ONE SCREEN OVER, AND UNGATED. The vendor toolbar counts
  // after the search; the guest roster counted the raw array while its rows
  // were search-filtered, so typing a name left "Coming 24" above two people.
  // Reintroducing that fault and running the existing roster spec passed --
  // nothing covered it.
  //
  // My first attempt at this test hunted for a rail row and SKIPPED, which is
  // exactly as vacuous as 0 === 0. It uses the repo's own idiom now: seed a
  // roster big enough to render the toolbar (>= 8), open the section by name.
  const ROSTER = Array.from({ length: 12 }, (_, k) => ({
    id: 'g-lens' + k,
    name: (k < 3 ? 'Marisol' : 'Person') + ' ' + String(k).padStart(2, '0'),
    rsvp: k % 4 === 0 ? 'Yes' : k % 4 === 1 ? 'No' : k % 4 === 2 ? 'Maybe' : '',
  }));

  test('guest chips count what the search left, not the whole list', async ({ page }) => {
    await page.addInitScript((guests) => {
      localStorage.setItem('ngw-hostv2-last-event', 'test-two-days');
      localStorage.setItem('ngw-hostv2-patch-test-two-days', JSON.stringify({ guests }));
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
      localStorage.setItem('ngw-welcomed', '1');
      localStorage.setItem('ngw-v2-welcomed', '1');
    }, ROSTER);
    await page.goto('?elegant=1');
    await settled(page);
    await openSectionByName(page, 'Guests', { settle: 600 });

    const bar = page.locator('.rtoolbar').last();
    expect(await bar.count(), 'the roster toolbar did not render on 12 guests').toBeGreaterThan(0);

    const rowsNow = () => page.locator('.grow > button:first-of-type').count();
    const before = await rowsNow();
    expect(before, 'no guest rows rendered').toBeGreaterThan(8);

    // Search for the 3 seeded "Marisol" rows.
    await bar.locator('.rtool-q').fill('Marisol');
    await settled(page);
    await page.waitForTimeout(250);
    const after = await rowsNow();
    expect(after, 'the search did not narrow the list').toBeLessThan(before);

    const nums = [];
    for (const t of await bar.locator('.chip').allTextContents()) {
      const m = /(\d+)\s*$/.exec(t.trim());
      if (m) nums.push(Number(m[1]));
    }
    expect(nums.length, 'no counted chip on the roster — nothing was proved').toBeGreaterThan(0);
    const total = nums.reduce((a, b) => a + b, 0);
    expect(total,
      `roster chips total ${total} while the search left ${after} row(s) — the chips are quoting the unfiltered list`)
      .toBe(after);
  });

  // THE RED-PROOF THE AUDIT NAMED TWICE AND NOBODY EVER RAN: seed a SETTLED
  // vendor. ev-x-wanda has zero, which is the only reason the counting fault
  // stayed invisible through three sittings. Settled means, per vendorSettled:
  // a confirmed status, no COI action outstanding, no accountability worry, and
  // no pending confirmation record -- so the seed sets all four deliberately.
  //
  // This does not assume the seed works. It asserts the fold APPEARS, which is
  // the observable proof that a vendor actually reached settled; if the seed is
  // wrong the fold never renders and this fails loudly rather than passing on a
  // list where nothing was settled at all.
  const VENDORS = Array.from({ length: 8 }, (_, k) => ({
    id: 'v-lens' + k,
    name: 'Vendor ' + String(k).padStart(2, '0'),
    category: k % 2 ? 'Catering' : 'Photography',
    // The first three are settled; the rest stay open.
    // WHAT ACTUALLY SETTLES A VENDOR, found by reading vendorSettled and then
    // deriveVendorAccountability rather than guessing: a confirmed status is
    // necessary but nowhere near sufficient. A formal vendor is also scored
    // against its category playbook's requiredConfirmations, so a bare
    // Confirmed still reads criticalUnconfirmed. `isInformal` short-circuits
    // accountability to on_track by design (nothing to hold a friend to), and
    // with a confirmed status and no COI owed, that clears every clause.
    ...(k < 3
      ? { status: 'Confirmed', coiStatus: 'not_required', isInformal: true }
      : { status: 'Researching' }),
  }));

  test('with settled vendors seeded, the fold appears and the counts still hold', async ({ page }) => {
    await page.addInitScript((vendors) => {
      localStorage.setItem('ngw-hostv2-last-event', 'test-two-days');
      localStorage.setItem('ngw-hostv2-patch-test-two-days', JSON.stringify({ vendors }));
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
      localStorage.setItem('ngw-welcomed', '1');
      localStorage.setItem('ngw-v2-welcomed', '1');
    }, VENDORS);
    await page.goto('?elegant=1');
    await settled(page);
    await openSectionByName(page, 'People you', { settle: 600 });

    const bar = page.locator('.rtoolbar').last();
    expect(await bar.count(), 'the vendor toolbar did not render on 8 vendors').toBeGreaterThan(0);

    // THE PROOF THE FIXTURE REACHED THE STATE. No fold means nothing settled,
    // and every assertion below would be vacuous.
    const fold = page.locator('.fold-btn', { hasText: /settled/ });
    expect(await fold.count(),
      'no settled fold — the seed never produced a settled vendor, so this proves nothing')
      .toBeGreaterThan(0);
    const folded = Number((/(\d+)\s+settled/.exec((await fold.first().innerText()) || '') || [])[1] || 0);
    expect(folded, 'the fold rendered but counts zero').toBeGreaterThan(0);

    // "Everyone" still carries no count, WITH settled vendors present -- the
    // exact condition under which the old number went wrong.
    const everyone = bar.locator('.chip', { hasText: /Everyone/ }).first();
    expect(((await everyone.innerText()) || '').trim()).toBe('Everyone');

    // And the counted chips still describe their own groups.
    const visible = await page.locator('.vcard').count();
    const needs = Number((/(\d+)\s*$/.exec((await bar.locator('.chip', { hasText: /Needs you/ }).first().innerText()) || '') || [])[1]);
    const settledChip = Number((/(\d+)\s*$/.exec((await bar.locator('.chip', { hasText: /^Settled/ }).first().innerText()) || '') || [])[1]);
    expect(needs, `"Needs you ${needs}" over ${visible} visible card(s)`).toBe(visible);
    expect(settledChip, `"Settled ${settledChip}" over a fold holding ${folded}`).toBe(folded);
  });
});
