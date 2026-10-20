// ─── THE ATTENDANCE ZONE, ON SCREEN, TELLING THE TRUTH ──────────────────────
//
// PEOPLE/ATTENDANCE REDESIGN, step 3 — the required redesign test from
// PEOPLE_ATTENDANCE_PRODUCT_CONTRACT.md §A3 and §4.
//
// WHAT THIS IS FOR. `aFirmNumberIsNotAReply.test.js` pins the word choice at
// the module (16 tests, red-proofed). jest cannot execute hostv2, so only a
// browser can prove the sentence actually reaches a host — which is the whole
// lesson the parity manifest records: *"'already centralized in code' is not
// 'already the redesign' — check the SCREEN."*
//
// THE TWO ASSERTIONS THAT MATTER MOST, both measured defects rather than style:
//
//   1. Two events differing ONLY in `guestCountSource` must not read the same.
//      Sprint 0.5 D1 gave the engine provenance; if the screen ignores it, the
//      host still cannot tell her number from ours.
//   2. A settled headcount must never say anyone replied. `attendanceBand()`
//      reports `confirmed: n` on basis 'count' with an empty roster, so a
//      surface reading the field instead of the basis lies here and nowhere
//      else — one field, two meanings.
import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

const EV = (over = {}) => ({
  id: 'e2e-people', name: 'The Cookout', type: 'Cookout',
  date: dateIn(45),
  venueCity: 'Annapolis', state: 'MD',
  totalBudget: 4000, budget: [], vendors: [], guests: [],
  ...over,
});

const boot = async (page, ev) => {
  await page.addInitScript((e) => {
    // Conditional: addInitScript re-runs on every navigation, so an
    // unconditional seed erases what the test just did on reload.
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    }
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  // ?people=1 is the opt-in door while the redesign earns the default.
  await page.goto('?elegant=1&people=1');
  await settled(page);
  await openSectionByName(page, 'Guests', { settle: 600 });
};

// The zone is an AskColumn inside the sheet; read the sheet's text.
const sheetText = (p) => p.evaluate(() => {
  const el = document.querySelector('.sheet');
  return ((el && el.innerText) || '').replace(/\s+/g, ' ');
});

const roster = (n, rsvp) => Array.from({ length: n }, (_, i) => ({
  id: 'g' + i, name: 'Guest ' + i, rsvp,
}));

test('AN APP-SUPPLIED NUMBER SAYS SO, and says it is being held back', async ({ page }) => {
  await boot(page, EV({
    guestMode: 'count', guestEstimate: 40, guestCountSource: 'playbook-typical',
  }));
  const body = await sheetText(page);

  expect(body).toMatch(/Who’s coming/i);
  // The engine's own disclosure, reaching a host for the first time.
  expect(body).toMatch(/not a number you gave/i);
  // The actionable half: what withholding actually means for her.
  expect(body).toMatch(/stays out of anything we send/i);
  // And the offer to make it hers, naming the number.
  expect(body).toMatch(/Yes, plan for 40/);
  // It must NOT claim anyone replied or confirmed anything.
  expect(body).not.toMatch(/40 people said yes/i);
});

test('HER OWN NUMBER IS NOT APOLOGISED FOR — the paired fixture', async ({ page }) => {
  // Differs from the test above by ONE field. Without this pair, the assertions
  // there could pass on a surface that disclaims every number it shows.
  await boot(page, EV({
    id: 'e2e-people-hers',
    guestMode: 'count', guestEstimate: 40, guestCountSource: 'host',
  }));
  const body = await sheetText(page);

  expect(body).toMatch(/Who’s coming/i);
  expect(body).not.toMatch(/not a number you gave/i);
  expect(body).not.toMatch(/stays out of anything we send/i);
  expect(body).not.toMatch(/Yes, plan for 40/);
});

test('A SETTLED HEADCOUNT NEVER SAYS ANYONE REPLIED', async ({ page }) => {
  // basis 'count' returns `confirmed: 40` with an empty roster. This is the
  // screen-level guard against reading that field as a reply count.
  await boot(page, EV({
    id: 'e2e-people-locked',
    guestMode: 'count', guestCount: 40, guestCountSource: 'host', guestCountLocked: true,
  }));
  const body = await sheetText(page);

  expect(body).toMatch(/The number you settled on/i);
  expect(body).not.toMatch(/said yes/i);
  expect(body).not.toMatch(/still to answer/i);
});

test('A ROSTER SAYS WHO SAID YES, and what is still out', async ({ page }) => {
  await boot(page, EV({
    id: 'e2e-people-roster', guestMode: 'list',
    guests: [...roster(3, 'Yes'), ...roster(2, '').map((g, i) => ({ ...g, id: 'p' + i }))],
  }));
  const body = await sheetText(page);

  expect(body).toMatch(/3 said yes, 2 still to answer/i);
  // A roster is hers by construction — no provenance disclaimer, no offer.
  expect(body).not.toMatch(/not a number you gave/i);
  expect(body).not.toMatch(/Yes, plan for/);
});

test('CONFIRMING IT MAKES IT HERS — and the write lands on the event', async ({ page }) => {
  await boot(page, EV({
    id: 'e2e-people-confirm',
    guestMode: 'count', guestEstimate: 40, guestCountSource: 'playbook-typical',
  }));

  const clicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.sheet button')]
      .find((x) => /Yes, plan for 40/.test(x.innerText || ''));
    if (!b) return false;
    b.click();
    return true;
  });
  expect(clicked).toBe(true);
  await page.waitForTimeout(700);

  const after = await sheetText(page);
  expect(after, 'the disclosure is gone because the number is hers now').not.toMatch(/not a number you gave/i);
  expect(after).not.toMatch(/stays out of anything we send/i);

  // Asserted on the stored event, not just on the screen: the provenance field
  // is what every outward gate in the app reads.
  const stored = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0]; }
    catch { return null; }
  });
  expect(stored.guestCountSource).toBe('host');
  expect(Number(stored.guestCount)).toBe(40);
});

test('NEGATIVE CONTROL — without ?people=1 the legacy body is untouched', async ({ page }) => {
  // The migration guarantee. 129 existing specs run against the legacy surface,
  // and nothing retires until parity closes.
  await page.addInitScript((e) => {
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    }
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV({ id: 'e2e-people-off', guestMode: 'count', guestEstimate: 40, guestCountSource: 'playbook-typical' }));
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Guests', { settle: 600 });

  const body = await sheetText(page);
  expect(body).not.toMatch(/stays out of anything we send/i);
  expect(body).not.toMatch(/Yes, plan for 40/);
});

// ─── A KNOWN NEED WITH AN OWNER WE DO NOT KNOW (step 7) ─────────────────────
//
// Exactly what `heardAccessNeeds` writes from "…, she uses a walker" — the
// measured case P1-2 was built for. `who` is null because "she" is not a name.
const WALKER = [{ kind: 'step-free', phrase: 'she uses a walker', source: 'host-said' }];

test('an unowned need is stated, in her words, WITHOUT inventing a person', async ({ page }) => {
  await boot(page, EV({
    id: 'e2e-people-need',
    guestMode: 'list',
    guests: [{ id: 'g1', name: 'Tonya Brooks', rsvp: 'Yes' }, { id: 'g2', name: 'Ray Okafor', rsvp: 'Yes' }],
    accessNeeds: WALKER,
  }));
  const body = await sheetText(page);

  expect(body).toMatch(/What someone needs/i);
  expect(body).toMatch(/Step-free access/i);
  // HER OWN WORDS, verbatim — the reason the engine keeps `phrase` at all.
  expect(body).toMatch(/she uses a walker/);
  // The unknown, said as an unknown.
  expect(body).toMatch(/don’t know which person this is for/i);
  expect(body).toMatch(/won’t guess/i);

  // THE SHARPEST GUARD IN THE SLICE. Two named people are on this roster and
  // neither of them said anything about stairs. If the surface attached the
  // need to one of them — by proximity, by order, by "probably the honoree" —
  // it would be inventing a fact about a real person.
  const needsBlock = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('.shelf-label')]
      .find((el) => /what someone needs/i.test(el.innerText || ''));
    let t = '', n = labels && labels.nextElementSibling;
    for (let i = 0; i < 4 && n; i += 1, n = n.nextElementSibling) t += ' ' + (n.innerText || '');
    return t.replace(/\s+/g, ' ');
  });
  expect(needsBlock).not.toMatch(/Tonya|Ray/);
});

test('and it claims only the reach an unowned need actually has', async ({ page }) => {
  // `domainsFor` gives an unowned requirement LODGING ONLY — the one domain it
  // can reach truthfully, because that search is sized by the count, not by
  // who. A surface promising a seat check would be promising something
  // seatingPlan cannot do: it reads the guest row, which has nothing on it.
  await boot(page, EV({ id: 'e2e-people-reach', guestMode: 'count', guestEstimate: 20, guestCountSource: 'host', accessNeeds: WALKER }));
  const body = await sheetText(page);

  expect(body).toMatch(/Where everyone stays is already planned around it/i);
  expect(body).toMatch(/can’t be until we know who/i);
});

test('a NAMED need says both reaches are real, because they are', async ({ page }) => {
  // A roster row HAS a name, so `who` is known by construction and
  // `guestNeedsStepFree` lets seatingPlan act on it.
  await boot(page, EV({
    id: 'e2e-people-named',
    guestMode: 'list',
    guests: [{ id: 'g1', name: 'Tonya Brooks', rsvp: 'Yes', access: ['Step-free / wheelchair'] }],
  }));
  const body = await sheetText(page);

  expect(body).toMatch(/Step-free access/i);
  expect(body).toMatch(/Tonya Brooks/);
  expect(body).toMatch(/Their seat and where they stay are both checked/i);
  expect(body).not.toMatch(/don’t know which person/i);
});

test('NEGATIVE CONTROL — no need, no zone', async ({ page }) => {
  // The guard against a primitive that grows into a checklist: a host with
  // nothing to accommodate is asked nothing and shown no empty section.
  await boot(page, EV({ id: 'e2e-people-noneed', guestMode: 'count', guestEstimate: 20, guestCountSource: 'host' }));
  expect(await sheetText(page)).not.toMatch(/What someone needs/i);
});
