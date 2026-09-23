// ─── WHEN OUR OWN DEADLINE TELLS A HOST TO START TOO LATE ────────────────────
//
// `timingConflict` was written on 2026-09-18 to stop a contradiction being
// filed as an absence, and it reached nobody for five days — not because it was
// forgotten, but because `playbookDecisionBoard` drops the `when` it reads. The
// row carries the derived `dueDate` and `daysOut`; the field the detector needs
// was gone before any caller could ask. Every call returned null and read as
// "no conflict".
//
// ── AND THEN ALL THREE TURNED OUT TO BE FALSE, THE SAME DAY ────────────────
//
// This spec originally asserted that Day Party's venue card SHOWED the warning.
// It did — and it should not have. "Where (daytime outdoor)" offers Backyard /
// Rooftop / Patio / Rented outdoor space: three of four require no booking at
// all, so a party-space booking lead cannot convict its date. The same was true
// of the other two flagged decisions.
//
// The wiring was right and its population was false. The spec now drives the
// CORRECTION — no card in the corpus accuses its own deadline today — and keeps
// the premise that proves the machinery is empty rather than removed.
//
// NO DEADLINE MOVED, in either direction. Every timing source in the registry
// is a commercial practitioner, and a booking guide is not grounds to overrule
// an authored date — but the dates were never the problem here. The MATCHING
// was, and that is what changed.
//
// DRIVEN, BECAUSE JEST CANNOT EXECUTE hostv2. The unit tests in
// src/lib/knowledge/timingProvenance.test.js prove the carry, the sentence and
// the empty population; only a browser proves a host is no longer shown it.
import { test, expect, settled } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}, src);


// THREE TAPS, AND EACH ONE MATTERS. The decisions list is behind "Calls to
// make"; a row expands on tap; and the why-stack — where the stakes line and
// this sentence live — is behind "Why this call matters" on the open card. A
// spec that stops one tap early asserts over a screen that never rendered.
//
// The row's visible label is the SHORT one ("Where"), not the authored label,
// so rows are found by their own text rather than by the corpus's.
const openDecisionCard = async (page, type, rowLabel) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // The date is relative, not literal: a fixed date rots the day it passes, and
  // a decision parked past its window would stop rendering where this looks.
  await page.addInitScript((t) => {
    const d = new Date(Date.now() + 52 * 864e5).toISOString().slice(0, 10);
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-timing', name: 'The Party', type: t,
      date: d, venueCity: 'Baltimore, MD',
      guestMode: 'count', guestCount: 40, totalBudget: 4000,
      budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-timing');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, type);
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, 'Calls to make');
  await page.waitForTimeout(1400);
  await settled(page);
  const opened = await page.evaluate((lbl) => {
    const rx = new RegExp(lbl);
    const el = [...document.querySelectorAll('.frow')].find((x) => rx.test((x.innerText || '').trim()));
    if (!el) return null;
    el.click();
    return (el.innerText || '').replace(/\s+/g, ' ').slice(0, 40);
  }, rowLabel);
  if (!opened) return null;
  await page.waitForTimeout(800);
  await settled(page);
  await tapText(page, 'Why this call matters');
  await page.waitForTimeout(700);
  await settled(page);
  return opened;
};

const openCard = (page) => page.evaluate(() => [...document.querySelectorAll('.frow-decision')]
  .map((x) => (x.innerText || '').replace(/\s+/g, ' ')).join(' | '));

test('(premise) the venue card really opens, with its why-stack expanded', async ({ page }) => {
  // Without this, an absent sentence and an absent screen look identical.
  const opened = await openDecisionCard(page, 'Day Party', '^Where\\b');
  console.log('OPENED:', opened);
  expect(opened).toBeTruthy();
  const card = await openCard(page);
  console.log('CARD >>>', card);
  // The why-stack is open: the authored stakes line is the sentence above ours.
  expect(card).toMatch(/Daytime outdoor is the whole point/);
});

test('THE CARD NO LONGER ACCUSES A SETTING CHOICE', async ({ page }) => {
  // This is the correction. Three of this decision's four options are places
  // the host already has; a booking source has nothing to say about the date.
  await openDecisionCard(page, 'Day Party', '^Where\\b');
  const card = await openCard(page);
  expect(card).not.toMatch(/We put this .* before the date\./);
  expect(card).not.toMatch(/booking guidance behind it/);
});

test('THE AUTHORED DEADLINE IS UNTOUCHED — the matching changed, not the date', async ({ page }) => {
  // The correction removed a warning. It must not have removed, moved or
  // softened the deadline itself, which the row still leads with.
  await openDecisionCard(page, 'Day Party', '^Where\\b');
  const card = await openCard(page);
  expect(card).toMatch(/Good to lock/);
  expect(card).toMatch(/Daytime outdoor is the whole point/);
});

test('NO CARD IN THE CORPUS ACCUSES ITS OWN DEADLINE TODAY', async ({ page }) => {
  // Holiday Party's venue was one of the audit's original four. It is a setting
  // choice too — Host at home / Office / Restaurant / Rented event space — and
  // is vetoed structurally now rather than by its date.
  const opened = await openDecisionCard(page, 'Holiday Party', '^Home, office');
  expect(opened).toBeTruthy();
  const card = await openCard(page);
  expect(card).not.toMatch(/We put this .* before the date\./);
  // …and its why-stack is genuinely populated, so this is not an empty card.
  expect(card).toMatch(/Venue sets capacity/);
});
