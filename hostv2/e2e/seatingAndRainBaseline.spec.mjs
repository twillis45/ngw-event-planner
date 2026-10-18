// ─── P1-1 · PARITY BASELINES FOR SEATING AND RAIN ───────────────────────────
//
// CHARACTERISATION, NOT SPECIFICATION. Every assertion here records what these
// two surfaces DO TODAY, measured by driving them, so that a redesign which
// changes any of it fails loudly and deliberately rather than quietly. If a
// line below goes red during the redesign, the first question is "did we mean
// to change that?" — not "fix the test". Several of these behaviours are
// subtle enough that nobody would notice losing them.
//
// WHY THEY HAD NO BROWSER COVERAGE. Both have real unit tests
// (`seatingPlan.test.js`, `rainPlanReadiness.test.js`, `rainAssist.test.js`)
// and neither had a single e2e. jest cannot execute hostv2, so everything
// between the engine and the host — which control exists, what it is labelled,
// what happens when it is pressed, what the sheet says when the answer is
// absent — was unmeasured. That is the whole surface a redesign touches.
//
// SCOPE, so this does not overlap GOLD-07. `gold07RsvpCascade` owns seating's
// EMPTY → POPULATED transition as a consequence of replies arriving. This file
// owns the surface's own behaviour once populated: the tallies, the access
// instruction, and what assignment actually does.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

// One roster, carrying one of each thing the seating surface claims to know
// about: a guest bringing kids, a vegetarian, a wheelchair user, and a NO that
// must not be seated. 'Reunion' matches phaseProgress's OUTDOOR_TYPE, which is
// what puts this event in scope for the rain plan at all.
const EV = (over = {}) => ({
  id: 'e2e-p11', name: 'Harrell reunion', type: 'Reunion',
  date: dateIn(45), endDate: dateIn(49),
  venueCity: 'Santa Fe', state: 'NM',
  guestMode: 'list', totalBudget: 4000,
  budget: [], vendors: [],
  guests: [
    { id: 'g1', name: 'Denise Harrell', rsvp: 'Yes', meal: 'Standard', kids: 2 },
    { id: 'g2', name: 'Ray Harrell', rsvp: 'Yes', meal: 'Standard' },
    { id: 'g3', name: 'Tonya Brooks', rsvp: 'Yes', meal: 'Vegetarian', access: ['Step-free / wheelchair'] },
    { id: 'g4', name: 'Marcus Brooks', rsvp: 'Yes', meal: 'Standard' },
    { id: 'g5', name: 'Alma Pierce', rsvp: 'No' },
    { id: 'g6', name: 'June Pierce', rsvp: 'Yes', meal: 'Standard' },
  ],
  ...over,
});

const bodyText = (p) => p.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
const sheetText = (p) => p.evaluate(() => {
  const sh = document.querySelector('.sheet');
  return sh ? (sh.innerText || '').replace(/\s+/g, ' ') : '';
});
const tap = (p, rx) => p.evaluate((s) => {
  const re = new RegExp(s);
  const el = [...document.querySelectorAll('button,[role="button"],[role="radio"],a')]
    .filter((x) => re.test((x.innerText || '').trim())).pop();
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}, rx.source);

const storedEvent = (p) => p.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0] || null; }
  catch { return null; }
});

const boot = async (page, ev) => {
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

test.describe('BASELINE · Who sits where', () => {
  test('the surface counts only confirmed guests, and tallies what it knows about them', async ({ page }) => {
    await boot(page, EV());
    await openSectionByName(page, 'Who sits where', { timeout: 6000 });
    await page.waitForTimeout(700);
    const s = await sheetText(page);

    // Five yeses out of six rows. The NO is not seated and not counted — the
    // surface seats people who said they are coming, not people who were asked.
    expect(s).toMatch(/Seated so far 0 of 5/);
    expect(s, 'a guest who declined is not given a chair').not.toMatch(/Alma Pierce/);

    // The three tallies, each traceable to one roster field.
    expect(s, 'from guest.meal').toMatch(/Veg 1/);
    expect(s, 'from guest.kids').toMatch(/Kids 2/);
    expect(s, 'from guest.access').toMatch(/Wheelchair 1/);

    // And the table suggestion explains itself rather than appearing as a bare
    // number the host cannot argue with.
    expect(s).toMatch(/1 table · about 5 a table/);
    expect(s).toMatch(/1 table — what a reunion this size usually needs/);
  });

  test('an access need becomes a named instruction, not a silent flag', async ({ page }) => {
    // The load-bearing one for the redesign, and the easiest to lose: the
    // structured `access` array does not just increment a counter, it produces
    // a sentence naming WHO and WHAT, which is the only form a host can act on
    // while actually seating people.
    await boot(page, EV());
    await openSectionByName(page, 'Who sits where', { timeout: 6000 });
    await page.waitForTimeout(700);
    const s = await sheetText(page);
    expect(s).toMatch(/Seat with easy access: Tonya Brooks/);
    expect(s).toMatch(/asked for a step-free spot/);
  });

  test('tap a name then a table and the assignment is real on both sides', async ({ page }) => {
    await boot(page, EV());
    await openSectionByName(page, 'Who sits where', { timeout: 6000 });
    await page.waitForTimeout(700);
    expect(await sheetText(page)).toMatch(/Table 1 empty/);

    await tap(page, /^Tonya Brooks/);
    await page.waitForTimeout(300);
    await tap(page, /^Table 1/);
    await page.waitForTimeout(800);
    const s = await sheetText(page);

    // The count moves, the chip leaves the unassigned list, and the TABLE now
    // carries both the person and her dietary tally — the same fact in the two
    // places the host reads it.
    expect(s).toMatch(/Seated so far 1 of 5/);
    expect(s).toMatch(/Table 1 Veg 1 1 seated/);
    // Reversible: a mistap is correctable in place.
    expect(s, 'the assignment can be undone from where it was made').toMatch(/unseat/);
    // The table's own settings open with it — shape and capacity are part of
    // seating, not a separate configuration screen.
    expect(s).toMatch(/What kind of table/);
    expect(s).toMatch(/Seats at this table/);
  });
});

test.describe('BASELINE · If it rains', () => {
  test('an outdoor event with no backup is asked for one, and the sheet says so plainly', async ({ page }) => {
    await boot(page, EV());
    expect(await bodyText(page), 'the ranked plan carries the ask').toMatch(/Add a rain backup/i);

    await tap(page, /Add a rain backup/i);
    await page.waitForTimeout(900);
    const s = await sheetText(page);

    // States the ABSENCE as the state, rather than rendering an empty control.
    expect(s).toMatch(/Open sky and no backup named yet/i);

    // Five named backups plus a written-for-you option. "Rain or shine" matters
    // most: declining a backup is a real answer the surface accepts, not a gap
    // it nags about.
    for (const choice of ['Do it for me', 'The reunion move', 'Tent on standby',
      'Carport / garage', 'Move it indoors', 'Rain or shine']) {
      expect(s, `the "${choice}" option exists`).toContain(choice);
    }

    // The written-for-you text is shown BEFORE it is accepted — the host reads
    // what would be written in her name rather than discovering it afterwards.
    expect(s).toMatch(/“Do it for me”: “If weather turns, move guests/);
  });

  test('the forecast-watch offer states its own limit instead of overpromising', async ({ page }) => {
    // CTA truthfulness (UX_07) on a surface that could easily claim a push
    // notification it cannot send. Recorded because a redesign rewriting this
    // copy is exactly when the caveat goes missing.
    await boot(page, EV());
    await tap(page, /Add a rain backup/i);
    await page.waitForTimeout(900);
    const s = await sheetText(page);
    expect(s).toMatch(/While the app is open/i);
    expect(s).toMatch(/Lock-screen alerts land when the installable app ships/i);
  });

  test('picking a backup writes it, and leads straight to telling the guests', async ({ page }) => {
    await boot(page, EV());
    await tap(page, /Add a rain backup/i);
    await page.waitForTimeout(900);
    await tap(page, /^Carport \/ garage$/);
    await page.waitForTimeout(900);

    // Persisted verbatim as the host's own words.
    expect((await storedEvent(page)).rainPlan).toBe('Carport / garage');
    // And the surface advances to the consequence — a backup nobody was told
    // about is not a backup. The draft is host-sent, never app-sent.
    const s = await sheetText(page);
    expect(s).toMatch(/Rain note to guests/i);
    expect(s, 'the app drafts; the host sends').toMatch(/Mark it sent — I sent it myself/);
  });

  test('"Do it for me" writes the authored plan it previewed, word for word', async ({ page }) => {
    await boot(page, EV());
    await tap(page, /Add a rain backup/i);
    await page.waitForTimeout(900);
    const preview = await sheetText(page);
    await tap(page, /^Do it for me$/);
    await page.waitForTimeout(1200);

    const written = (await storedEvent(page)).rainPlan || '';
    expect(written).toMatch(/^If weather turns, move guests and the key activities under cover\./);
    // What it wrote must be what it showed. The sheet truncates the preview with
    // an ellipsis, so the comparison is on the part that was actually visible —
    // which is the part the host agreed to.
    const shown = (preview.match(/“Do it for me”: “([^”]*)/) || [])[1] || '';
    const visible = shown.replace(/\s*…\s*$/, '').trim();
    expect(visible.length, 'premise: a preview was actually shown').toBeGreaterThan(40);
    expect(written.startsWith(visible), 'the app wrote what it previewed').toBe(true);
  });

  test('a backup already named is not asked for again', async ({ page }) => {
    await boot(page, EV({ rainPlan: 'The barn behind the house' }));
    expect(await bodyText(page), 'answered is answered').not.toMatch(/Add a rain backup/i);
  });

  test('NEGATIVE CONTROL — an indoor-typed event is never asked at all', async ({ page }) => {
    // Without this the whole block could pass on an app that asks everyone.
    // The gate is phaseProgress:322 — OUTDOOR_TYPE on the event type, or
    // isLikelyOutdoor on the venue name/notes. A Birthday in a named ballroom
    // matches neither.
    await boot(page, EV({
      id: 'e2e-p11-indoor', type: 'Birthday', name: 'Ruth’s 70th',
      venue: 'The Lodge ballroom',
    }));
    expect(await bodyText(page)).not.toMatch(/Add a rain backup/i);
  });
});
