// ─── EXACTLY ONE WAY OUT OF AN OPEN SECTION, WHEREVER YOU ARE ───────────────
//
// THE COMPLAINT (host, 2026-09-27). "Done button not in workflow. User goes
// down list and looks back up the list to complete section."
//
// MEASURED on the sim before the change: with the Drinks section open the
// sheet is 1,556px of scroll against an 844px screen, and the only `Done` sat
// at y=312. A host who walks the list downward — which is the whole point of a
// shopping list — ends ~700px BELOW the exit and has to scroll back up past
// everything they just ticked.
//
// THE FIX. The pinned bar is already at the bottom and already sticky, so
// while a drill-in is open it becomes the exit: the money text on the right
// gives way to `Done` and the progress fraction stays on the left. A SWAP,
// because "$255 in the cart · $135 to go" is 173px of a 390px bar.
//
// ── WHY THIS IS A GATE AND NOT JUST A COMMIT ───────────────────────────────
//
// Two failures are possible and they are opposites, which is why one test
// asserts both directions rather than two tests asserting one each.
//
//   TWO  — the drill-in's own header `Done` is still there alongside the
//          bar's. A host at the top of a section sees the same button twice,
//          four inches apart. This is what the first build actually did.
//
//   NONE — the header `Done` is removed outright. Driven on the sim: open the
//          list on Shop, switch to Plan, and the list drill-in IS STILL
//          RENDERED (`{foodSect.list && (` carries no tab guard) while the bar
//          is NOT, because the bar requires `sheet.kind !== 'foodplan'`. The
//          host is inside the list with no way out. Same for a no-kitchen
//          event and for an empty plan.
//
// So the two are one fact with two readers (`barIsExit` in HostShellV2), and
// this asserts the property that fact exists to guarantee: ALWAYS EXACTLY ONE.
import { test, expect, settled } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}, src);

// Count only buttons whose WHOLE label is Done, and only inside the open
// sheet. Counting the string anywhere in the document would also catch the
// "Done" status tag on a plan row and read 2 for a reason that is not a
// duplicate exit — a false red is how a gate gets ignored.
const countDone = (page) => page.evaluate(() => {
  const sheet = document.querySelector('.sheet') || document.body;
  return [...sheet.querySelectorAll('button,[role="button"]')]
    .filter((b) => {
      if (/^done$/i.test((b.innerText || '').trim()) === false) return false;
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;   // a hidden button is not an exit
    }).length;
});

const openTheList = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    // Guarded: an unconditional seed re-runs on reload and would wipe the very
    // state a later assertion depends on.
    if (localStorage.getItem('ngw-hostv2-last-event') === 'e2e-oneexit') return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-oneexit', name: 'Mom’s 80th', type: 'Birthday',
      date: '2027-06-17', venueCity: 'Annapolis', state: 'MD',
      guestMode: 'count', guestCount: 12, totalBudget: 2000,
      budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-oneexit');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, "what you.?re serving|dietary needs on the food plan");
  await page.waitForTimeout(1500);
  await settled(page);
  await tapText(page, '^Done$');          // back out of any dietary drill-in
  await page.waitForTimeout(1200);
  await settled(page);
  await tapText(page, 'The list[\\s\\S]*item');
  await page.waitForTimeout(1500);
  await settled(page);
};

test('(premise) with no section open the bar shows money, not an exit', async ({ page }) => {
  // Without this the "exactly one" assertions below could pass because the bar
  // always shows Done, which would be its own defect.
  await openTheList(page);
  await tapText(page, '^Done$');
  await page.waitForTimeout(1200);
  await settled(page);
  expect(await countDone(page)).toBe(0);
});

test('on Shop the exit is the pinned bar, and there is exactly one', async ({ page }) => {
  await openTheList(page);
  expect(await countDone(page)).toBe(1);

  // And it is the BAR's, not the header's — the whole point is that it is
  // reachable from the bottom of a long section.
  const inBar = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.ftotal button')]
      .find((x) => /^done$/i.test((x.innerText || '').trim()));
    return !!b;
  });
  expect(inBar).toBe(true);
});

test('and it actually closes the section', async ({ page }) => {
  await openTheList(page);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.ftotal button')]
      .find((x) => /^done$/i.test((x.innerText || '').trim()));
    if (b) b.click();
  });
  await page.waitForTimeout(1200);
  await settled(page);
  expect(await countDone(page)).toBe(0);
});

test('THE TRAP, NOW CLOSED AT THE SOURCE: Plan has the bar too', async ({ page }) => {
  // This test used to assert the OPPOSITE — that the bar was absent on Plan,
  // so the drill-in headers had to keep their own exit. That was true and it
  // was the trap: the list drill-in has no tab guard and survives the switch,
  // while the bar required `sheet.kind !== 'foodplan'`.
  //
  // 2026-09-27, host: "do bar for plan and bringing". The bar is now on every
  // food tab, so the trap is gone at its source rather than worked around.
  // The PROPERTY this file exists for is unchanged and is why the rewrite was
  // safe to make: always exactly one way out, wherever you are.
  await openTheList(page);
  await tapText(page, '^Plan$');
  await page.waitForTimeout(1200);
  await settled(page);

  const hasBar = await page.evaluate(() => !!document.querySelector('.ftotal'));
  expect(hasBar).toBe(true);
  expect(await countDone(page)).toBe(1);
  // …and it is the bar's, not a header's.
  const inBar = await page.evaluate(() => [...document.querySelectorAll('.ftotal button')]
    .some((x) => /^done$/i.test((x.innerText || '').trim())));
  expect(inBar).toBe(true);
});
