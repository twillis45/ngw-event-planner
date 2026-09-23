// ─── WHEN OUR OWN DEADLINE TELLS A HOST TO START TOO LATE ────────────────────
//
// `timingConflict` was written on 2026-09-18 to stop a contradiction being
// filed as an absence, and it reached nobody for five days — not because it was
// forgotten, but because `playbookDecisionBoard` drops the `when` it reads. The
// row carries the derived `dueDate` and `daysOut`; the field the detector needs
// was gone before any caller could ask. Every call returned null and read as
// "no conflict".
//
// Three decisions in the corpus put a host LATER than a real dated source
// supports. Day Party's venue is one: our deadline is four weeks out, and the
// booking guidance behind it says two months. A host who follows our date may
// find nothing available.
//
// IT DOES NOT MOVE THE DEADLINE. Every timing source in the registry is a
// commercial practitioner, and a booking guide is not grounds to overrule an
// authored date. What it does is stop the disagreement being invisible.
//
// DRIVEN, BECAUSE JEST CANNOT EXECUTE hostv2. The unit tests in
// src/lib/knowledge/timingProvenance.test.js prove the carry and the sentence;
// only a browser proves a host reads it.
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

test('THE DISAGREEMENT IS ON THE CARD — four weeks against a two-month floor', async ({ page }) => {
  await openDecisionCard(page, 'Day Party', '^Where\\b');
  const card = await openCard(page);
  expect(card).toMatch(/We put this 4 weeks before the date\./);
  expect(card).toMatch(/booking guidance behind it says 2 months at least/);
  expect(card).toMatch(/start it sooner/);
});

test('IT NEVER SAYS OUR DATE IS WRONG, and the row keeps its own deadline', async ({ page }) => {
  // The registry's own rule: every timing source is a commercial practitioner,
  // so this discloses a disagreement and does not overrule an authored date.
  await openDecisionCard(page, 'Day Party', '^Where\\b');
  const card = await openCard(page);
  // The sentence must EXIST before its wording can be judged. `slice` on a
  // missing needle returns text that trivially satisfies the absence below —
  // the vacuous-guard shape this repo has already been caught by twice, and it
  // showed up here on the first red-proof run.
  const at = card.indexOf('We put this');
  expect(at).toBeGreaterThan(-1);
  const line = card.slice(at, card.indexOf('start it sooner') + 20);
  expect(line).not.toMatch(/wrong|too late|mistake|should be|overdue/i);
  // …and the authored deadline is still what the row leads with.
  expect(card).toMatch(/Good to lock/);
});

test('A DECISION WITH NO DISAGREEMENT SAYS NOTHING — the negative control', async ({ page }) => {
  // Holiday Party's venue was one of the four the 2026-09-18 audit listed, and
  // has since been authored to T-75d, inside the source's window. If this ever
  // prints the sentence, the detector has started firing on agreement.
  const opened = await openDecisionCard(page, 'Holiday Party', '^Home, office');
  expect(opened).toBeTruthy();
  const card = await openCard(page);
  console.log('CONTROL CARD >>>', card);
  expect(card).not.toMatch(/We put this .* before the date\./);
});
