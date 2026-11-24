// ─── THE HOST TURNS ON AN EVENT HASHTAG, OR DOESN'T (owner ruling E, 11/16) ──
//
// Host-chosen and host-removable, OFF until the host turns it on, in the
// existing identity sheet ("Make it yours" — no new tab): up to three
// suggestions from the event's own data, or the host's own tag, and Remove.
// Stored on the event as `hashtag`; the printed day sheet carries it. Never a
// claim that a tag is unused or available (board 11/16).
import { test, expect, settled, sheetSettled, dateIn, openSectionByName } from './fixtures.mjs';

const EVENT = {
  id: 'ht-e2e', name: 'Vida’s Friendsgiving', type: 'friendsgiving', createdAt: '2026-11-01',
  guestMode: 'list', venue: 'Pine Street Commons', startTime: '16:00', startTimeSource: 'host', hostName: 'Vida Ramos',
  guests: [{ id: 'g1', name: 'Ana Ruiz', rsvp: 'Yes' }], vendors: [], budget: [], timeline: [],
};

const boot = (page, extra = {}) => page.addInitScript(([ev, iso]) => {
  localStorage.setItem('ngw-events', JSON.stringify([{ ...ev, date: iso }]));
  localStorage.setItem('ngw-hostv2-last-event', ev.id);
  localStorage.setItem('ngw-v2-splash-seen', '1');
  localStorage.setItem('ngw-welcomed', '1');
  localStorage.setItem('ngw-v2-welcomed', '1');
  localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Vida Ramos' }));
}, [{ ...EVENT, ...extra }, '2026-11-26']);

// The event as the app stored it: the base list plus this event's patch layer.
const stored = (page) => page.evaluate(() => {
  const base = (JSON.parse(localStorage.getItem('ngw-events') || '[]') || []).find((e) => e.id === 'ht-e2e') || {};
  let patch = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.includes('ht-e2e') && k.includes('patch')) { try { patch = { ...patch, ...JSON.parse(localStorage.getItem(k)) }; } catch { /* not json */ } }
  }
  return { ...base, ...patch };
});

const openIdentity = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('?elegant=1');
  await settled(page);
  // "Make it yours" is the identity sheet; reach it the way a host does.
  const door = page.getByRole('button', { name: /Make it yours/ }).first();
  if (await door.count()) await door.click();
  else {
    await openSectionByName(page, 'Make it yours');
  }
  await sheetSettled(page);
  await expect(page.locator('#sheet-title')).toHaveText('Make it yours');
  return page.locator('[data-event-hashtag]');
};

test('off by default; a suggestion turns it on; Remove turns it off — and nothing claims the tag is free', async ({ page }) => {
  await boot(page);
  const box = await openIdentity(page);
  await box.scrollIntoViewIfNeeded();
  await expect(box).toContainText('Off.');
  await expect(box.locator('[data-hashtag-current]')).toHaveCount(0);
  const picks = box.locator('[data-hashtag-suggestion]');
  expect(await picks.count()).toBeGreaterThan(0);
  expect(await picks.count()).toBeLessThanOrEqual(3);
  await expect(box).not.toContainText(/\bavailable\b|\bunused\b|not taken|is free/i);

  const first = (await picks.first().innerText()).replace(/^Use /, '');
  await picks.first().click();
  await expect(box.locator('[data-hashtag-current]')).toContainText(first);
  expect((await stored(page)).hashtag).toBe(first);

  await box.locator('[data-hashtag-remove]').click();
  await expect(box.locator('[data-hashtag-current]')).toHaveCount(0);
  expect((await stored(page)).hashtag || '').toBe('');
});

test('the host’s own tag is cleaned to something Instagram accepts, and the Instagram link is labeled for what it is', async ({ page }) => {
  await boot(page);
  const box = await openIdentity(page);
  await box.getByRole('textbox', { name: 'Your own hashtag' }).fill('vida’s friends giving!');
  await box.getByRole('button', { name: 'Use #VidasFriendsGiving', exact: true }).click();
  await expect(box.locator('[data-hashtag-current]')).toContainText('#VidasFriendsGiving');
  const link = box.getByRole('link', { name: 'See posts with this tag on Instagram' });
  await expect(link).toHaveAttribute('href', 'https://www.instagram.com/explore/tags/VidasFriendsGiving/');
  // At 390px the field and its button fit without running off the side.
  const overflow = await page.evaluate(() => [...document.querySelectorAll('[data-event-hashtag] *')]
    .filter((n) => n.getBoundingClientRect().right > window.innerWidth + 0.5).length);
  expect(overflow).toBe(0);
});

test('the printed day sheet carries the tag when it is on', async ({ page }) => {
  await boot(page, {
    hashtag: '#VidasFriendsgiving2026',
    runOfShow: [{ id: 'r1', time: '16:00', segment: 'Doors open' }],
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('?elegant=1');
  await settled(page);
  const sheet = page.locator('.printsheet .p-sub');
  await expect(sheet).toHaveCount(1);
  await expect(sheet).toContainText('#VidasFriendsgiving2026');
});
