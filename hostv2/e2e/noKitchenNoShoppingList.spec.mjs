// ─── A GROCERY RUN FOR A HOST WITH A MINI FRIDGE ─────────────────────────────
//
// `foodSpanNote` has computed `listApplies` since the day it was written —
// three-valued, FALSE only when we KNOW there is no kitchen — and nothing in the
// app read it. Grepped across src and hostv2: the only consumer was its own unit
// test. So a destination stay in a hotel or a room block was still handed the
// backyard shopping run measured on the Santa Fe 80th: proteins from a butcher,
// a veggie tray from a grocery deli, ice from a gas station.
//
// THE ASYMMETRY IS DELIBERATE. `false` withholds the list and names the reason.
// `null` (untold) still ships it — withholding on a question nobody has asked
// yet punishes every host who simply has not been asked, and the span note
// already discloses what the number covers. Same line foodSpan.js draws for
// itself.
//
// DRIVEN, AND THIS IS THE THIRD ATTEMPT. The first two were written blind
// against a landing page that never rendered the list, so their `not.toMatch`
// assertions could not fail — in a file written to catch exactly that. What the
// blind attempts missed is that ANSWERING the lodging question REMOVES the food
// sheet's usual door: on an untouched event the board row reads "Decide what
// you're serving" and opens the sheet's menu, but the moment
// `foodChoices.dest_lodging` is set that same row relabels to "Note dietary
// needs on the food plan" and opens the sheet ALREADY DRILLED INTO the dietary
// panel. Every selector pinned to the menu therefore found nothing. Captured by
// walking it, not guessed:
//
//   board -> "Note dietary needs on the food plan"   (sheet opens on dietary)
//         -> "Done"                                  (back out to the menu)
//         -> "The list · N of M bought"              (the shopping list)
//
// The kitchen answer is `foodChoices.dest_lodging`, the control the host presses,
// and `kitchenSignal` ranks a told answer above any inference from a listing URL.
import { test, expect, settled } from './fixtures.mjs';

// ── THE HERO'S SIGNATURE STRING CHANGED (2026-09-24) ──────────────────
//
// These tests use a hero phrase as a PROXY for "the money hero is on screen",
// which is what the no-kitchen gate has to withhold. Board D moved the money to
// the headline, so "Bought so far" (the old eyebrow over the bought count) and
// "a head · sized for" (the old two-line sub) are both gone. The hero now
// signs itself with "estimate, all in".
//
// The guarantee is untouched: no kitchen, no money on the sheet.

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}, src);

const bodyText = (page) => page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));

// `pick` is what the host answered about where everyone stays. null = not asked.
// These two strings are not decoration: `kitchenSignal` matches /house/ for the
// rental and /room block/ for the hotel, so each drives a real branch.
const openList = async (page, pick) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((p) => {
    const ev = {
      id: 'e2e-kitchen', name: 'Mom’s 80th', type: 'Birthday',
      date: '2027-06-17', endDate: '2027-06-21',
      isDestination: true, venueCity: 'Santa Fe', state: 'NM',
      guestMode: 'count', guestCount: 10, totalBudget: 4000,
      budget: [], vendors: [], guests: [],
      ...(p ? { foodChoices: { dest_lodging: p } } : {}),
    };
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-kitchen');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, pick);
  await page.goto('?elegant=1');
  await settled(page);
  // Whichever label the food row is wearing for THIS fixture — see the header.
  await tapText(page, "what you.?re serving|dietary needs on the food plan");
  await page.waitForTimeout(1500);
  await settled(page);
  // Back out of the dietary drill-in. A no-op on the untold fixture, whose menu
  // carries no "Done" at all — which is exactly why it is safe to always send.
  await tapText(page, '^Done$');
  await page.waitForTimeout(1200);
  await settled(page);
  await tapText(page, 'The list[\\s\\S]*bought');
  await page.waitForTimeout(1500);
  await settled(page);
};

test('(premise) a whole-home rental really does render the shopping list', async ({ page }) => {
  // Everything below is worthless unless the list is genuinely on screen for a
  // host who HAS a kitchen. This is the test that makes the absences mean
  // something — and it is the assertion both earlier attempts lacked.
  await openList(page, 'A house we rent for everyone');
  const t = await bodyText(page);
  expect(t).not.toMatch(/no kitchen to cook in/i);
  expect(t).toMatch(/Drinks 0 of 3 bought/i);
  expect(t).toMatch(/SHOPPING AT/i);
});

test('a room block withholds the list and says why', async ({ page }) => {
  await openList(page, 'A room block I guarantee fills');
  const t = await bodyText(page);
  // The reason is named…
  expect(t).toMatch(/no shopping list here/i);
  expect(t).toMatch(/no kitchen to cook in/i);
  // …and what to do instead is named too, rather than leaving a hole.
  expect(t).toMatch(/caterer, a restaurant, or a room that feeds people/i);
  // The sections and the store chips are gone — this is the withheld list, not
  // a styled-over one.
  expect(t).not.toMatch(/Drinks \d+ of \d+ bought/i);
  expect(t).not.toMatch(/SHOPPING AT/i);
  expect(t).not.toMatch(/Check off all/i);
});

test('the sheet stops counting a shop that is not happening', async ({ page }) => {
  // THE HALF THE FIRST CUT MISSED. The gate withheld the list while the hero
  // two inches above went on reading "Bought so far 0 of 4" and "one good store
  // run covers all of it" — the sheet contradicting itself on one screen. The
  // hero now reads the same fact the list does.
  await openList(page, 'A room block I guarantee fills');
  const t = await bodyText(page);
  expect(t).not.toMatch(/one good store run/i);
  expect(t).not.toMatch(/estimate, all in/i);
  expect(t).toMatch(/Nothing to shop for/i);
  // And no action that operates on the withheld list survives.
  expect(t).not.toMatch(/Copy the shopping list/i);
  expect(t).not.toMatch(/Lock the rest to typical prices/i);
});

test('no restaurant number is invented to replace the grocery one', async ({ page }) => {
  // The tempting fix is to keep the dollars and relabel them "eating out". Every
  // priced line in the corpus is a GROCERY band, so that would publish a figure
  // nobody measured. The money goes rather than being re-badged.
  await openList(page, 'A room block I guarantee fills');
  const t = await bodyText(page);
  expect(t).not.toMatch(/estimate, all in/i);
  expect(t).not.toMatch(/est\. prices ·/i);
  // (premise) the same fixture with a kitchen DOES price it — so the absence
  // above is the gate, not a fixture that never had money to show.
  await openList(page, 'A house we rent for everyone');
  expect(await bodyText(page)).toMatch(/estimate, all in/i);
});

test('the span disclosure survives the withholding, and is said once', async ({ page }) => {
  // Withholding the list must not also swallow the honest scope sentence — the
  // host still needs to know the plan sized one gathering, not five days. It
  // must also not print twice: the first cut repeated it inside the gate block
  // when the hero above was already showing it.
  await openList(page, 'A room block I guarantee fills');
  const t = await bodyText(page);
  const hits = t.match(/a shopping list is not the plan for a hotel stay/gi) || [];
  expect(hits.length).toBe(1);
});

test('NEGATIVE CONTROL: an UNTOLD kitchen still ships the list', async ({ page }) => {
  // The deliberate asymmetry. Not being asked is not the same as being told
  // there is no kitchen, and a gate that withholds from everyone is not a fix.
  await openList(page, null);
  const t = await bodyText(page);
  expect(t).not.toMatch(/no kitchen to cook in/i);
  expect(t).toMatch(/Drinks 0 of 3 bought/i);
  expect(t).toMatch(/estimate, all in/i);
});

test('NEGATIVE CONTROL: a LOCAL event is untouched by any of it', async ({ page }) => {
  // The gate rides on the destination food-span note. A backyard party has no
  // span and no lodging question, and must never lose its list to this — note
  // it is seeded WITH the room-block answer, so it would fail if the gate read
  // the answer alone instead of the span.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const ev = {
      id: 'e2e-local', name: 'Back yard 80th', type: 'Birthday',
      date: '2027-06-17', isDestination: false,
      venueCity: 'Silver Spring', state: 'MD',
      guestMode: 'count', guestCount: 10, totalBudget: 4000,
      budget: [], vendors: [], guests: [],
      foodChoices: { dest_lodging: 'A room block I guarantee fills' },
    };
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-local');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, "what you.?re serving|dietary needs on the food plan");
  await page.waitForTimeout(1500);
  await settled(page);
  await tapText(page, '^Done$');
  await page.waitForTimeout(1200);
  await settled(page);
  await tapText(page, 'The list[\\s\\S]*bought');
  await page.waitForTimeout(1500);
  await settled(page);
  const t = await bodyText(page);
  expect(t).not.toMatch(/no kitchen to cook in/i);
  expect(t).toMatch(/Drinks \d+ of \d+ bought/i);
});
