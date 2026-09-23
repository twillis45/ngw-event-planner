// ─── ONE PURCHASE, TWO ACTS, AND ONLY ONE OF THEM HAD A DATE ─────────────────
//
// Elopement's `p_rings` has said "Order/size rings weeks ahead" since it was
// written, and nothing covered it. Its `buyAt: 'T-3d'` is a PACK-IT date — the
// row's own note is explicit that the day-of job is packing them — so on the
// only dated surface a host reads, a $100-$2,000 essential with a six-week
// production queue looked like a three-day errand. An elopement is usually
// travelled to, which makes it worse: the rings must be in hand before the trip.
//
// The lead is researched, not chosen: two independent jewellers, one UK and one
// US, both read in full on 2026-09-23, converging on 6-8 weeks and giving the
// same mechanism (3-6 weeks production, then shipping, inspection and a possible
// resize). Registered in knowledge/timingProvenance.js#rings.
//
// DRIVEN, BECAUSE JEST CANNOT EXECUTE hostv2, and because the checklist is not
// rendered until the host drafts it — a claim about "the task exists" proves
// nothing about the screen until that button is pressed.
import { test, expect, settled } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}, src);

const bodyText = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

const draftChecklist = async (page, type, daysOut) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(([t, d]) => {
    const date = new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-rings', name: 'Our Elopement', type: t,
      date, venueCity: 'Asheville, NC',
      guestMode: 'count', guestCount: 2, totalBudget: 6000,
      budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-rings');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [type, daysOut]);
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, 'Checklist');
  await page.waitForTimeout(1400);
  await settled(page);
  const drafted = await tapText(page, 'Draft my checklist from the playbook');
  await page.waitForTimeout(1600);
  await settled(page);
  return drafted;
};

test('(premise) the checklist really drafts, with the rest of the runway on it', async ({ page }) => {
  // The checklist renders nothing until the host drafts it, so without this a
  // missing task and a missing screen are the same observation.
  const drafted = await draftChecklist(page, 'Elopement', 70);
  expect(drafted).toBeTruthy();
  const t = await bodyText(page);
  expect(t).toMatch(/Submit special-use permit/);
  expect(t).toMatch(/Appear in person at the clerk/);
});

test('THE RINGS HAVE A DATE — and it says why they take that long', async ({ page }) => {
  await draftChecklist(page, 'Elopement', 70);
  const t = await bodyText(page);
  expect(t).toMatch(/Order and size the rings/);
  expect(t).toMatch(/allow 6–8 weeks for making, engraving and any resize/);
});

test('IT IS SEQUENCED, not appended — after the travel booking, before attire', async ({ page }) => {
  // A lead in the wrong place in the runway is a date with no meaning. Read off
  // the rendered order rather than the engine, because the order on screen is
  // the only one a host acts on.
  await draftChecklist(page, 'Elopement', 70);
  const t = await bodyText(page);
  const travel = t.search(/Book flights\/drive plan/);
  const rings = t.search(/Order and size the rings/);
  const attire = t.search(/Choose attire/);
  expect(travel).toBeGreaterThan(-1);
  expect(attire).toBeGreaterThan(-1);
  expect(rings).toBeGreaterThan(travel);
  expect(rings).toBeLessThan(attire);
});

test('the three-day row is still the PACK, not the purchase', async ({ page }) => {
  // The two acts must not collapse back into one. The buy row keeps its own
  // date and its own job; this task is the other half, not a replacement.
  await draftChecklist(page, 'Elopement', 70);
  const t = await bodyText(page);
  expect(t).toMatch(/Order and size the rings/);
  // …and nothing on the drafted list claims to BUY the rings at three days out.
  expect(t).not.toMatch(/Buy wedding rings/i);
});
