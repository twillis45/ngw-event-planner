// ─── "I HEARD THIS TOO" GETS AN ANSWER (P1-3) ───────────────────────────────
//
// What the creation screen has always said about a clause it could not use:
// *"Worth keeping in mind yourself — the plan won't know about it."* Then the
// event is created, the sentence is discarded, and that is the last the host
// ever hears of it. One disclosure, delivered while she is still typing the
// event into existence, and no way to answer it.
//
// This proves the two halves of the fix on screen:
//   · the sentence survives creation, so the list is still there afterwards;
//   · "Noted" is a real answer — the clause goes, and stays gone across a
//     reload, because it was written to the event and not to component state.
//
// AND IT PROVES THE FALSE ALARMS ARE GONE. The same stored sentence contains
// "she uses a walker", which P1-2 made the app actually read. If the seam
// readers were not passed in, that clause would be listed here as something
// the plan does not hold — while the lodging requirements on another screen
// show it being acted on. The negative assertion is the one that would have
// caught the bug this slice exists to fix.
import { test, expect, settled, dateIn } from './fixtures.mjs';

// Exactly the sentence the measured case used, carrying three clauses of
// three different kinds: one the parser reads (the town), one a SEAM consumer
// reads (the walker), and one nothing reads at all (the lunch).
const SENTENCE = "Mom's 80th in Santa Fe, sit-down lunch, she uses a walker";

const EV = (over = {}) => ({
  id: 'e2e-clause', name: "Mom's 80th", type: 'Birthday',
  date: dateIn(45),
  venueCity: 'Santa Fe', state: 'NM',
  guestMode: 'count', guestCount: 20, totalBudget: 4000,
  budget: [], vendors: [], guests: [],
  createdFromText: SENTENCE,
  ...over,
});

const boot = async (page, ev) => {
  await page.addInitScript((e) => {
    // SEED ONLY IF ABSENT. addInitScript re-runs on EVERY navigation, so an
    // unconditional seed re-writes the pristine event on `page.reload()` and
    // silently erases whatever the test just did — which made the
    // survives-a-reload assertion below fail against working code.
    // `lodgingCockpit.spec.mjs` records the same trap from the other
    // direction (an addInitScript clear() wiping its own seed).
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    }
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
};

// innerText reflects CSS text-transform, and `.shelf-label` is uppercased —
// so the heading comes back as "YOU SAID THIS…" however it is written in JSX.
// Every assertion on it is case-insensitive for that reason, not by habit.
const bodyText = (p) => p.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));

const tapNoted = (p, clause) => p.evaluate((c) => {
  const el = [...document.querySelectorAll('button')]
    .find((x) => (x.innerText || '').includes(c) && /Noted/.test(x.innerText || ''));
  if (!el) return false;
  el.click();
  return true;
}, clause);

test('the clause outlives creation, and says what it is', async ({ page }) => {
  await boot(page, EV());
  const body = await bodyText(page);

  expect(body, 'the block exists after creation, not only during it')
    .toMatch(/You said this, and the plan doesn’t hold it/i);
  expect(body, 'and it names the clause in her own words').toMatch(/“sit-down lunch”/);
  expect(body).toMatch(/tap to tell me you’ve got it/i);
});

test('a clause the app DOES read is not listed as unheld', async ({ page }) => {
  // The false-alarm guard. "she uses a walker" is consumed by heardAccessNeeds
  // at the creation seam and steers the house requirements; listing it here
  // would be the app contradicting itself across two screens.
  await boot(page, EV());
  const body = await bodyText(page);
  expect(body).not.toMatch(/“she uses a walker”/);
  // And the town, which the parser itself read, is not listed either.
  expect(body).not.toMatch(/“Santa Fe”/);
});

test('"Noted" answers it, and the answer survives a reload', async ({ page }) => {
  await boot(page, EV());
  expect(await tapNoted(page, 'sit-down lunch')).toBe(true);
  await page.waitForTimeout(1200);
  // ASSERT ON THE BLOCK, NOT THE PAGE. The confirmation toast quotes the
  // clause back — "Noted — “sit-down lunch” is yours to handle." — so a
  // page-wide `not.toMatch(/“sit-down lunch”/)` fails on the app's own
  // acknowledgement of the thing it just did. Measured: the write had
  // persisted correctly and the test was reading its own toast. The heading
  // is the honest signal; it renders only while something is still owed, and
  // this sentence had exactly one clause to owe.
  expect(await bodyText(page), 'the block stands down immediately')
    .not.toMatch(/You said this, and the plan doesn’t hold it/i);

  // The real test: it was written to the EVENT, not to component state.
  await page.reload();
  await settled(page);
  const after = await bodyText(page);
  expect(after, 'and it is still gone on the next visit').not.toMatch(/“sit-down lunch”/);
  // Nothing is owed any more, so the whole block stands down rather than
  // rendering an empty heading.
  expect(after).not.toMatch(/You said this, and the plan doesn’t hold it/i);
});

test('NEGATIVE CONTROL — an event created before the sentence was kept shows nothing', async ({ page }) => {
  // Every event that exists today. It must be silent, not broken, and must not
  // invent a list from an event it has no sentence for.
  await boot(page, EV({ id: 'e2e-clause-old', createdFromText: undefined }));
  expect(await bodyText(page)).not.toMatch(/You said this, and the plan doesn’t hold it/i);
});
