// ─── THE AXIS THE CHART WAS MISSING ──────────────────────────────────────────
//
// `1c163c97` un-hid `.tile-a` for the rail composition — the board's named
// single-highest-leverage change. `styles.css:909` still says
// `display:none !important` for the phone, and the desktop exception at :4866
// overrides it ONLY under `.stagewrap--responsive-command[data-rail="1"]
// [data-bp="desktop"]`.
//
// NOTHING MEASURED IT. `tile-a` appears nowhere in e2e/ or __tests__/. The
// richest computed block on the surface — the lifecycle line and the named,
// routed, dot-marked plan-part chips — is held open by a three-attribute
// selector, any one of which a future refactor of the stagewrap could rename
// while every gate in this suite stayed green. It spent months hidden once
// already; the failure mode is proven, not hypothetical.
//
// WHY BOTH DIRECTIONS. Asserting only that the chips render would pass for a
// rule that dropped the scope and un-hid them on the phone too, where the bento
// is a 2x2 grid and `.tile-a` really is a card — the board scoped the exception
// deliberately. So the mobile case is not padding: it is the other half of the
// promise.
//
// WHY NOT `toBeVisible()` ALONE. The double-header defect (anti-pattern 5) and
// the double-fraction defect are both about something being visible that should
// not be, alongside something that should. `count()` passes on a `display:none`
// node — the lesson heroVoid.spec.mjs already paid for — so every assertion
// here reads computed `display` or a measured box.
import { test, expect } from './fixtures.mjs';

const EV = {
  id: 'E2E_TEST_statchips', type: 'Birthday', name: 'Stat Chips', isDestination: true,
  venueCity: 'Santa Fe', venueState: 'NM', date: '2027-06-20', endDate: '2027-06-24',
  guestMode: 'count', guestEstimate: 5, guestCount: 5, totalBudget: 2000,
  budget: [], guests: [], vendors: [], timeline: [],
};

const boot = async (page) => {
  await page.addInitScript((ev) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
};

/** Wait on the splash being gone, never on a timeout — see responsiveBaseline. */
const settled = (page) =>
  page.waitForFunction(() => {
    const sp = document.querySelector('.splash');
    if (sp) {
      const cs = getComputedStyle(sp);
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01) return false;
    }
    const app = document.querySelector('.app');
    return !!app && (app.innerText || '').trim().length > 120;
  }, null, { timeout: 20_000 });

const readColumn = (page) =>
  page.evaluate(() => {
    const stage = document.querySelector('.stagewrap');
    const tile = document.querySelector('.hero.elegant .bento .tile-a');
    const head = document.querySelector('.hero.elegant .bento-head');
    const disp = (n) => (n ? getComputedStyle(n).display : null);
    const box = (n) => {
      if (!n) return null;
      const r = n.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top) };
    };
    // Only chips that actually paint. A chip inside a hidden ancestor has a
    // zero box, so this counts what a host can see and click, not what exists.
    const chips = tile
      ? [...tile.querySelectorAll('button.chip')].filter((c) => c.getBoundingClientRect().width > 0)
      : [];
    const label = tile && tile.querySelector('.t-label');
    return {
      bp: stage ? stage.getAttribute('data-bp') : null,
      rail: stage ? stage.getAttribute('data-rail') : null,
      responsiveCommand: !!(stage && stage.classList.contains('stagewrap--responsive-command')),
      tileDisplay: disp(tile),
      tileBox: box(tile),
      headDisplay: disp(head),
      numDisplay: disp(tile && tile.querySelector('.t-num')),
      subDisplay: disp(tile && tile.querySelector('.t-sub')),
      labelY: box(label) ? box(label).y : null,
      // The lifecycle sentence the heading is supposed to introduce.
      metaY: box(tile && tile.querySelector('.v-meta')) ? box(tile.querySelector('.v-meta')).y : null,
      chipCount: chips.length,
      chipNames: chips.map((c) => c.innerText.trim()),
      // Each chip states its part AND its state AND that it routes — the reason
      // the block was worth un-hiding, and what a "simplifying" refactor loses
      // first. See feedback: CTAs name the act.
      chipAria: chips.map((c) => c.getAttribute('aria-label') || ''),
    };
  });

// The plan parts the block names. Order is the engine's and is stable across
// the fixture — asserting the SET rather than the sequence keeps this from
// breaking on a legitimate re-rank while still catching a lost chip.
//
// SEVEN SINCE 2026-08-14, and the two venue entries are the point. The board
// split one fact in two: `Where it happens` is the TOWN (which genuinely
// unblocks weather, shopping and lodging search) and `Venue address` is the
// signed address (which gates COI, the dock, final rentals, power, run-of-show
// and transport). Before the split a single chip labelled "Venue" read
// "handled" off a town while a card below it said "Not set yet" — one word
// answering two questions. See docs/audits/2026-08-14_VENUE_READER_BOARD_RULING.md.
const PARTS = ['Date & time', 'Where it happens', 'Venue address', 'Guests', 'Food', 'Lodging', 'Budget'];

test.describe('the stat column carries the named set', () => {
  test('1440x900 — the named plan-part set, one header, one fraction', async ({ page }) => {
    await boot(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./');
    await settled(page);
    const m = await readColumn(page);

    // The three attributes the exception is keyed to. If any one drifts the
    // rule stops matching, and this is the assertion that says WHICH.
    expect(m.bp, 'the desktop regime').toBe('desktop');
    expect(m.rail, 'the rail is up — the composition the exception is scoped to').toBe('1');
    expect(m.responsiveCommand, 'the responsive command canvas class').toBe(true);

    // ── The block is open.
    expect(m.tileDisplay, 'the richest block on the surface is not suppressed here').not.toBe('none');
    expect(m.tileBox.w, 'the stat column tile has real width').toBeGreaterThan(200);
    expect(m.tileBox.h, 'and real height — a collapsed tile is a hidden tile').toBeGreaterThan(120);

    // ── The named set, which is what earns the column under UX_04 Zone 1.
    expect(m.chipCount, `visible plan-part chips (${m.chipNames.join(', ')})`).toBe(PARTS.length);
    expect(m.chipNames.slice().sort()).toEqual(PARTS.slice().sort());
    // Every chip must say it routes. "Open it." is the act; a bare part name is
    // the state UX_06 and the CTA doctrine both forbid.
    for (const aria of m.chipAria) {
      expect(aria, 'each chip names its act, not just its part').toMatch(/Open it/i);
      expect(aria, 'each chip states handled-or-open — the dot must be readable too')
        .toMatch(/handled|still open/i);
    }

    // ── ONE HEADER. `.bento-head` exists in the DOM for the phone, where
    // `.tile-a` is hidden and the section would otherwise have no heading at
    // all. Here `.tile-a` brings its own, and rendering both is the double
    // header (anti-pattern 5).
    expect(m.headDisplay, '.bento-head defers to the tile’s own heading here').toBe('none');

    // ── ...AND IT GOES FIRST. In the DOM the lifecycle sentence precedes
    // `.t-label`; a lone `order:-1` puts the heading back on top. Measured, so
    // it fails if that declaration is dropped in a refactor of the flex column.
    expect(m.labelY, 'the heading sits above the paragraph it introduces')
      .toBeLessThan(m.metaY);

    // ── ONE FRACTION. The progress rule in the command header already says
    // "3 of 6"; the tile's own big numeral would state the same fact twice in
    // one viewport, which the Zone 1 clause forbids outright.
    expect(m.numDisplay, 'the tile’s duplicate fraction stays down').toBe('none');
    expect(m.subDisplay, 'and its caption with it').toBe('none');
  });

  // THE OTHER HALF OF THE PROMISE. `styles.css:909` is deliberately left alone
  // for the phone — there the bento is a 2x2 grid and `.tile-a` is a card, so
  // un-hiding it globally would put a boxed card on top of two bare hairline
  // rows. A rule that dropped the `[data-bp="desktop"]` scope would look like a
  // pass on the case above and quietly break this one.
  test('430x860 — the phone exception is untouched', async ({ page }) => {
    await boot(page);
    await page.setViewportSize({ width: 430, height: 860 });
    await page.goto('./');
    await settled(page);
    const m = await readColumn(page);

    expect(m.bp, 'the phone regime').toBe('mobile');
    expect(m.tileDisplay, 'the elegant phone bento keeps .tile-a suppressed').toBe('none');
    expect(m.chipCount, 'so none of its chips paint').toBe(0);
    // And the DOM heading that exists FOR this case is the one carrying the
    // section here — the mirror of the desktop assertion above.
    expect(m.headDisplay, '.bento-head is the phone’s heading and must render').not.toBe('none');
  });
});
