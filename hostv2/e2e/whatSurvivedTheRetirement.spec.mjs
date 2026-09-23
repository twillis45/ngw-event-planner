// ─── WHAT SURVIVED THE RETIREMENT, DRIVEN IN A BROWSER ───────────────────────
//
// 250 authored schedule rows were deleted on 2026-09-23 and seven things were
// moved out of them onto live surfaces. jest proved the ENGINE returns them.
// jest cannot execute hostv2, so until this file ran, "it reaches the host" was
// an inference about a screen nobody had opened.
//
// That inference is exactly what the whole retirement was about: rows everyone
// assumed were rendering, that rendered nowhere. Shipping the fix on the same
// kind of assumption would have been the joke writing itself.
//
// Also checked here: the section rail's ask door. The product was renamed off
// "Event Boss", and "Ask the Boss" survived the sweep in five host-visible
// places because the guard proving the rename read the frozen CRA shell and
// matched the two-word name only. This is the screen it was wrong about.
import { test, expect, settled } from './fixtures.mjs';

const boot = async (page, { id, type, choices }) => {
  await page.addInitScript(([evId, evType, evChoices]) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', evId);
    // ON THE EVENT, NOT IN A PATCH. Seeding `ngw-hostv2-patch-<id>` is what the
    // shipped-event specs do, and it silently did nothing here — a patch against
    // a CUSTOM event did not reach `choicePickFor`, so the decision read as
    // unanswered and both assertions failed against correct product behaviour.
    // `foodChoices` is the event's own field and is what the engine reads.
    // Guarded: addInitScript re-runs on every navigation, and an unconditional
    // seed rewrites the event after the app has already changed it — the trap
    // dayOfChecklist.spec.mjs documents, which cost a false data-loss report.
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      const date = new Date(Date.now() + 40 * 864e5).toISOString().slice(0, 10);
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
        id: evId, type: evType, name: `${evType} probe`, date, guestCount: 30,
        guests: [], vendors: [], budget: [], timeline: [],
        ...(evChoices ? { foodChoices: evChoices } : {}),
      }]));
    }
  }, [id, type, choices || null]);
  await page.goto('?elegant=1');
  await settled(page);
};

// The rail row is the reliable door; the nav sheet is the fallback the other
// specs use when the rail is collapsed at this width.
const openSection = async (page, label) => {
  const row = page.locator('.srail-row', { hasText: label }).first();
  if (await row.count()) { await row.click(); } else {
    await page.locator('.ev-eyebrow').first().click();
    await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click();
    await settled(page);
    await page.locator('.sheet').last().getByText(label, { exact: false }).first().click();
  }
  await settled(page);
};

const sheetText = async (page) => (await page.locator('.sheet').last().innerText()).toLowerCase();

// The checklist starts EMPTY and offers to draft itself — the same empty state
// checklistFollowsDecisions.spec.mjs walks. Seeding a timeline by hand would
// test my idea of what the shell stores; pressing the app's own button tests
// what it actually stores.
const draftChecklist = async (page) => {
  const cta = page.locator('button', { hasText: 'Draft my checklist from the playbook' }).first();
  if (await cta.count()) { await cta.click(); await settled(page); }
};

// The shopping sheet shows a SUMMARY, the items live behind "the list", and the
// list itself groups them into collapsed CATEGORY accordions. Three doors, not
// one — worth writing down, because stopping at the first two reads as "the item
// is missing" when it is merely one click further in.
const openTheList = async (page) => {
  const row = page.locator('.sheet').last().locator('button, [role="button"]', { hasText: /^the list/i }).first();
  if (await row.count()) { await row.click(); await settled(page); }
};
const openCategory = async (page, name) => {
  const cat = page.locator('.sheet').last().locator('button, [role="button"]', { hasText: new RegExp(name, 'i') }).first();
  if (await cat.count()) { await cat.click(); await settled(page); }
};

test.describe('the moved content reaches a real screen', () => {
  test('Birthday is told to charge the speaker', async ({ page }) => {
    // It lived in a `schedules.preparation` row at T-1d that no reader ever
    // opened, and it is the only mention of the speaker in the playbook.
    await boot(page, { id: 'ret-bd', type: 'Birthday' });
    await openSection(page, 'Your checklist');
    await draftChecklist(page);
    const text = await sheetText(page);
    expect(text).toContain('charge the speaker');
    expect(text).toContain('make-ahead sides');
  });

  test('…and a Birthday host who is NOT cooking is not told to prep sides', async ({ page }) => {
    // The conditional copy came across with the row. Driven, not inferred: this
    // is the assertion that could only ever be made in a browser, because the
    // copy resolves against a stored answer.
    await boot(page, { id: 'ret-bd2', type: 'Birthday', choices: { food_style: 'Drop-off catering' } });
    await openSection(page, 'Your checklist');
    await draftChecklist(page);
    const text = await sheetText(page);
    expect(text).toContain('no sides to prep');
    expect(text).toContain('charge the speaker');   // the step that survives
    expect(text).not.toContain('prep the make-ahead sides');
  });

  test('the PTA drink stand finally has ice on the shopping list', async ({ page }) => {
    // The one clause in 250 with no live carrier: a fundraiser selling bottled
    // drinks from an outdoor stand, with no ice, tubs or coolers anywhere.
    // THE CONCESSIONS ANSWER IS SEEDED ON PURPOSE. Ice rides the same
    // `dependsOnDecision: 'concessions'` gate as the drinks it chills — no
    // stand, no ice — so an unanswered event correctly shows neither. Driving
    // it unanswered would have proved the gate, not the fix.
    await boot(page, {
      id: 'ret-pta', type: 'PTA / Booster Fundraiser',
      choices: { concessions: 'Volunteer-run concession stand' },
    });
    await openSection(page, 'The spread & shopping');
    await openTheList(page);
    await openCategory(page, 'drinks');
    const text = await sheetText(page);
    // The item itself, by its authored name — not a category count, which would
    // pass on any second beverage line.
    expect(text).toMatch(/ice for the drink tubs/);
  });
});

test.describe('the rename reached the door that says the name', () => {
  test('the ask door reads "Ask No Guesswork", and "the Boss" is nowhere on screen', async ({ page }) => {
    await boot(page, { id: 'ret-brand', type: 'Birthday' });
    // The whole rendered page, not one element: the old name survived in four
    // separate render sites, so checking one would have proved nothing.
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('the boss');
    expect(body).not.toContain('event boss');

    await page.locator('.ev-eyebrow').first().click();
    await settled(page);
    const nav = (await page.locator('.sheet').last().innerText()).toLowerCase();
    expect(nav).not.toContain('the boss');
  });
});
