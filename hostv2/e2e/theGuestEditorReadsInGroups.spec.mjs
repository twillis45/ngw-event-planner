// ─── THE GUEST EDITOR READS IN GROUPS (owner, 11/24/2026: "Combine 1A and 1B") ─
//
// A guest row in the Guests sheet opens in place to show, top to bottom:
//   the name, editable where it stands; Reply (one full-width segmented
//   control, "Replies by <date>" when she set one); Who's coming (person
//   cards: the guest's meal and dietary need, the +1's name, children as a
//   count); How to reach them (Phone / Email / Group, each value with a 44px
//   call / text / email link that only OPENS the phone's own app); Actions
//   (one lit button, then "Mark it sent … I sent it myself" and "Nothing is
//   sent."); and Remove, alone at the bottom, naming what it removes.
// Opening a guest scrolls her name to the top of the sheet.
//
// Same data model as before: one +1 text field, a children count, one meal,
// one dietary field. Renaming keeps her replies landing on her row (the old
// name rides along in `aka`, which the reply merge already reads).
//
// Self-pinned: drives a 390 phone and a 1440 desktop itself.
// Made-up names, 555-01xx phones and @example.com emails only.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const FIRST = ['Ana Cole', 'Ben Diaz', 'Cy Evans', 'Di Fox', 'Ed Gray', 'Flo Hart', 'Gus Ives', 'Hal Jett'];
const LAST = ['Ivy Kent', 'Jo Lund', 'Kai Moss', 'Lu Nash'];
const EVENT = {
  id: 'cust-guest-editor', name: 'Harvest Supper', type: 'Dinner Party', date: dateIn(30),
  startTime: '18:30', startTimeSource: 'host', venue: 'Fort Ward Park',
  hostName: 'Juniper Vale', guestMode: 'list', rsvpDeadline: dateIn(14),
  passRequired: false, passReasons: [], budget: [], vendors: [], timeline: [],
  guests: [
    ...FIRST.map((name, k) => ({ id: 'g-a' + k, name, rsvp: k % 2 ? 'Yes' : 'Maybe', group: 'Friends' })),
    {
      id: 'g-linda', name: 'Linda Park', rsvp: '', group: 'Friends', phone: '(202) 555-0187',
      email: 'linda.park@example.com', plusOne: 'Sam Okafor', kids: 1, meal: '—', needs: '',
    },
    ...LAST.map((name, k) => ({ id: 'g-b' + k, name, rsvp: 'Yes', group: 'Friends' })),
  ],
};

const SIZES = [
  { label: 'phone 390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  { label: 'desktop 1440', use: { viewport: { width: 1440, height: 900 } } },
];

const boot = async (page, opts = {}) => {
  await page.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-custom-events')) return;   // seed once; reloads keep her edits
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  if (opts.reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Guests');
  await settled(page);
};

const openGuest = async (page, name) => {
  await page.locator('.rrow', { hasText: name }).locator('.grow button').first().click();
  const ed = page.locator('[data-guest-editor]');
  await expect(ed).toBeVisible();
  return ed;
};

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0]);

for (const size of SIZES) {
  test.describe(size.label, () => {
    test.use(size.use);

    test('the name is edited in place and survives a reload', async ({ page }) => {
      await boot(page);
      const ed = await openGuest(page, 'Linda Park');
      const name = ed.getByRole('textbox', { name: 'Name', exact: true });
      await expect(name).toHaveValue('Linda Park');
      // It is the first thing in the editor.
      const first = await ed.evaluate((el) => {
        const all = [...el.querySelectorAll('input, select, textarea, button, a[href]')]
          .filter((n) => n.getClientRects().length && !n.closest('[aria-hidden="true"]'));
        const firstField = all.find((n) => n.matches('input, select, textarea'));
        return firstField ? firstField.getAttribute('aria-label') : null;
      });
      expect(first).toBe('Name');
      await name.fill('Linda Parker');
      await name.press('Enter');
      await expect.poll(async () => (await stored(page)).guests.find((g) => g.id === 'g-linda').name).toBe('Linda Parker');
      // Her replies still land on her row: the old name rides in `aka`.
      expect((await stored(page)).guests.find((g) => g.id === 'g-linda').aka).toContain('linda park');
      await page.reload();
      await settled(page);
      await openSectionByName(page, 'Guests');
      await settled(page);
      await expect(page.locator('.rrow', { hasText: 'Linda Parker' })).toHaveCount(1);
      const ed2 = await openGuest(page, 'Linda Parker');
      await expect(ed2.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Linda Parker');
      // A blank name is not saved.
      await ed2.getByRole('textbox', { name: 'Name', exact: true }).fill('   ');
      await ed2.getByRole('textbox', { name: 'Name', exact: true }).blur();
      await expect(ed2.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Linda Parker');
      expect((await stored(page)).guests.find((g) => g.id === 'g-linda').name).toBe('Linda Parker');
    });

    test('the groups read in order: name, Reply, Who’s coming, How to reach them, Actions, then Remove', async ({ page }) => {
      await boot(page);
      const ed = await openGuest(page, 'Linda Park');
      const order = await ed.evaluate((el) => [...el.querySelectorAll('[data-ged-group]')]
        .filter((n) => n.getClientRects().length).map((n) => n.getAttribute('data-ged-group')));
      expect(order).toEqual(['name', 'reply', 'coming', 'reach', 'actions', 'remove']);
      const heads = await ed.locator('[data-ged-group] > .ged-head > .ged-title').allInnerTexts();
      expect(heads.map((t) => t.trim())).toEqual(['Reply', 'Who’s coming', 'How to reach them', 'Actions']);

      // Reply: one full-width segmented control, four choices, her date beside it.
      const reply = ed.locator('[data-ged-group="reply"]');
      const radios = reply.getByRole('radio');
      await expect(radios).toHaveText(['Yes', 'Maybe', 'No', 'No reply']);
      await expect(reply.getByRole('radio', { name: 'No reply' })).toHaveAttribute('aria-checked', 'true');
      await expect(reply).toContainText(/Replies by [A-Z][a-z]{2} \d{1,2}/);
      const w = await reply.evaluate((el) => {
        const g = el.querySelector('[role="radiogroup"]').getBoundingClientRect();
        return { group: g.width, box: el.getBoundingClientRect().width };
      });
      expect(w.group).toBeGreaterThan(w.box * 0.85);
      await reply.getByRole('radio', { name: 'Yes' }).click();
      await expect(reply.getByRole('radio', { name: 'Yes' })).toHaveAttribute('aria-checked', 'true');
      await expect.poll(async () => (await stored(page)).guests.find((g) => g.id === 'g-linda').rsvp).toBe('Yes');

      // Who's coming: her card (meal + dietary), the +1 card (name), children as a count.
      const coming = ed.locator('[data-ged-group="coming"]');
      await expect(coming.locator('[data-ged-person]')).toHaveCount(2);
      const me = coming.locator('[data-ged-person="guest"]');
      await expect(me.getByRole('combobox', { name: /Meal for Linda/ })).toBeVisible();
      await expect(me.getByRole('textbox', { name: /Dietary needs/ })).toBeVisible();
      const plus = coming.locator('[data-ged-person="plusone"]');
      await expect(plus.getByRole('textbox', { name: 'Plus one name' })).toHaveValue('Sam Okafor');
      // One meal on the row: the +1 card says nothing about a meal it can't store.
      await expect(plus.getByRole('combobox')).toHaveCount(0);
      await expect(plus).not.toContainText(/meal/i);
      await expect(coming).toContainText(/Children/);
      await expect(coming.locator('[data-ged-kids]')).toHaveText('1');
      await coming.getByRole('button', { name: /Add a child/ }).click();
      await expect(coming.locator('[data-ged-kids]')).toHaveText('2');
      await expect.poll(async () => (await stored(page)).guests.find((g) => g.id === 'g-linda').kids).toBe(2);
      await expect(coming).toContainText(/4 people/);
      await me.getByRole('combobox', { name: /Meal for Linda/ }).selectOption('Vegetarian');
      await expect.poll(async () => (await stored(page)).guests.find((g) => g.id === 'g-linda').meal).toBe('Vegetarian');
      // No button that does nothing.
      await expect(ed.getByText(/Add another guest/)).toHaveCount(0);

      // Actions: she replied Yes above, so there is no nudge and nothing lit;
      // the record stays, then "Nothing is sent."
      const actions = ed.locator('[data-ged-group="actions"]');
      await expect(actions.locator('.cta:not(.soft):not(.ghost)')).toHaveCount(0);
      await expect(actions).toContainText(/Mark it sent to Linda — I sent it myself/);
      await expect(actions).toContainText('Nothing is sent.');
    });

    test('a guest who has not replied gets the nudge as the one lit action', async ({ page }) => {
      await boot(page);
      const ed = await openGuest(page, 'Linda Park');
      const actions = ed.locator('[data-ged-group="actions"]');
      const lit = actions.locator('.cta:not(.soft):not(.ghost)');
      await expect(lit).toHaveCount(1);
      await expect(lit).toHaveText(/Email Linda the nudge/);
      // Signed out it is the mail app's link: it opens, it does not send.
      expect(await lit.getAttribute('href')).toMatch(/^mailto:linda\.park%40example\.com\?subject=/);
    });

    test('the contact actions only open the phone’s own apps: tel:, sms:, mailto:', async ({ page }) => {
      await boot(page);
      const ed = await openGuest(page, 'Linda Park');
      const reach = ed.locator('[data-ged-group="reach"]');
      for (const label of ['Phone', 'Email', 'Group']) await expect(reach.getByLabel(label, { exact: true })).toBeVisible();
      const hrefs = await reach.locator('a[href]').evaluateAll((as) => as.map((a) => [a.getAttribute('aria-label'), a.getAttribute('href')]));
      expect(hrefs).toEqual([
        ['Call Linda', 'tel:2025550187'],
        ['Text Linda', 'sms:2025550187'],
        ['Email Linda', 'mailto:linda.park%40example.com'],
      ]);
      // Nothing in this group is a button that could send.
      await expect(reach.locator('button')).toHaveCount(0);
    });

    test('Remove is last, names what it removes, and undoes', async ({ page }) => {
      await boot(page);
      const ed = await openGuest(page, 'Linda Park');
      const last = await ed.evaluate((el) => {
        const all = [...el.querySelectorAll('button, a[href], input, select')].filter((n) => n.getClientRects().length);
        return all[all.length - 1].textContent.trim();
      });
      expect(last).toBe('Remove Linda Park and the 2 with them');
      const rm = ed.locator('[data-ged-group="remove"]');
      await expect(rm).toContainText('Takes all 3 off the list and the food count. You can undo it right after.');
      await rm.getByRole('button', { name: 'Remove Linda Park and the 2 with them' }).click();
      await expect(page.locator('.rrow', { hasText: 'Linda Park' })).toHaveCount(0);
      expect((await stored(page)).guests.some((g) => g.id === 'g-linda')).toBe(false);
      // As found: no confirm step, the toast's Undo puts her back.
      await page.getByRole('button', { name: 'Undo' }).click();
      await expect(page.locator('.rrow', { hasText: 'Linda Park' })).toHaveCount(1);
      await expect.poll(async () => (await stored(page)).guests.find((g) => g.id === 'g-linda')?.kids).toBe(1);
    });

    test('opening a guest scrolls her name to the top of the sheet', async ({ page }) => {
      await boot(page, { reducedMotion: true });
      const ed = await openGuest(page, 'Linda Park');
      const gap = async () => ed.evaluate((el) => {
        let sc = el.parentElement;
        while (sc && !(sc.scrollHeight > sc.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
        const top = sc ? Math.max(0, sc.getBoundingClientRect().top) : 0;
        return el.querySelector('[data-ged-group="name"]').getBoundingClientRect().top - top;
      });
      // Reduced motion: instant.
      const g = await gap();
      expect(g).toBeGreaterThanOrEqual(-1);
      expect(g).toBeLessThan(80);
    });

    test('with motion on, the scroll is smooth and lands near the top', async ({ page }) => {
      await boot(page);
      const ed = await openGuest(page, 'Linda Park');
      await expect.poll(() => ed.evaluate((el) => {
        let sc = el.parentElement;
        while (sc && !(sc.scrollHeight > sc.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
        const top = sc ? Math.max(0, sc.getBoundingClientRect().top) : 0;
        return Math.round(el.querySelector('[data-ged-group="name"]').getBoundingClientRect().top - top);
      }), { timeout: 4000 }).toBeLessThan(80);
    });

    test('no tap target under 44px, no input under 16px, nothing wider than the screen', async ({ page }) => {
      await boot(page);
      const ed = await openGuest(page, 'Linda Park');
      const bad = await ed.evaluate((el) => {
        const out = [];
        for (const n of el.querySelectorAll('button, a[href], input, select, [role="radio"]')) {
          if (!n.getClientRects().length) continue;
          const r = n.getBoundingClientRect();
          if (r.width < 44 || r.height < 44) out.push(`${n.tagName} "${(n.getAttribute('aria-label') || n.textContent).trim()}" ${Math.round(r.width)}x${Math.round(r.height)}`);
          if (n.matches('input, select') && parseFloat(getComputedStyle(n).fontSize) < 16) out.push(`${n.getAttribute('aria-label')} font ${getComputedStyle(n).fontSize}`);
        }
        return out;
      });
      expect(bad).toEqual([]);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over).toBeLessThanOrEqual(0);
    });
  });
}
