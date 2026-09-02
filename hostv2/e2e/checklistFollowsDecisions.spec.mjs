// ─── THE CHECKLIST FOLLOWS THE DECISIONS, ON THE ACTUAL SCREEN ──────────────
//
// The unit test proves the merge. This proves the HOST sees it, which is the
// half that has failed before in this repo: `playbookMilestones`,
// `playbookTasks` and `playbookDayOfChecklist` are all finished engines with
// zero imports in hostv2, so 382 milestones reach nobody. An engine that is
// correct and unwired is indistinguishable, from the host's chair, from one
// that was never written.
//
// It also pins the thing that would be worst to get wrong. The reconcile runs
// on an effect keyed on the event and writes through `patchEvent`; if the merge
// were not idempotent, each write would re-render, reconcile, and write again,
// forever. A render loop does not look like a crash — it looks like a warm
// laptop and a battery going flat.
import { test, expect, settled, RAIL_MIN_WIDTH } from './fixtures.mjs';

// The app's own crab feast, not a hand-seeded one. The first version invented
// an event id and localStorage shape; the shell ignored both and booted the
// retirement-party sample instead, so the assertions were reading a completely
// different event's checklist. Using a real event also means the stored
// timeline is the one the app actually ships with.
const EV = 'my-crab-feast';
const ORDERING = 'Order steamed for pickup';
const STEAMING = 'Steam them myself';

// Seeds a crab feast whose stored checklist was generated while ORDERING, then
// sets the decision to whatever this run is testing. That ordering matters: it
// reproduces the real defect, which is a list written under one answer and read
// under another.
const openChecklist = async (page) => {
  const door = page.locator('.srail-row', { hasText: 'Your checklist' }).first();
  if (await door.count()) { await door.click(); } else {
    await page.locator('.ev-eyebrow').first().click();
    await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click();
    await settled(page);
    await page.locator('.sheet').last().getByText('Your checklist', { exact: false }).first().click();
  }
  await settled(page);
};

// Walks the REAL host path, in the real order:
//   1. boot the app's own crab feast with the decision at ORDERING,
//   2. draft the checklist from the playbook (the app's own empty-state CTA),
//      so the stored list is genuinely written under that answer,
//   3. change the decision and reload.
//
// Step 2 is not decoration. Seeding a timeline by hand would have tested my
// idea of what the shell stores; drafting it through the app's own button
// tests what the shell actually stores. And without it there is no defect to
// reproduce at all — the reconcile deliberately stands aside when no list has
// been drafted yet, because `draftTimeline` owns that case.
const bootAndDraft = async (page, choice) => {
  await page.addInitScript(([id, first]) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', id);
    localStorage.setItem(`ngw-hostv2-patch-${id}`, JSON.stringify({
      foodChoices: { steam_vs_order: first },
    }));
  }, [EV, ORDERING]);
  await page.goto('?elegant=1');
  await settled(page);

  await openChecklist(page);
  await page.getByRole('button', { name: /Draft my checklist/i }).click();
  await settled(page);
  const drafted = await page.locator('.sheet').last().innerText();
  // The premise, asserted rather than assumed: the list really was written
  // under the ordering answer. If this ever stops holding, the swap assertion
  // below would be passing for the wrong reason.
  expect(drafted, 'the drafted list was not written under the ordering answer')
    .toMatch(/Lock a hot pickup slot/i);

  if (choice !== ORDERING) {
    // The host changes their mind. Written through the app's own patch layer —
    // the same store a decision-board pick lands in — then reloaded, which is
    // the state a host returns to on their next visit.
    await page.evaluate(([id, next]) => {
      const k = `ngw-hostv2-patch-${id}`;
      const cur = JSON.parse(localStorage.getItem(k) || '{}');
      cur.foodChoices = { ...(cur.foodChoices || {}), steam_vs_order: next };
      localStorage.setItem(k, JSON.stringify(cur));
    }, [EV, choice]);
    await page.reload();
    await settled(page);
    await openChecklist(page);
  }
  return page.locator('.sheet').last().innerText();
};

test.describe('the reconcile reaches the host', () => {
  test('drafting writes a list under the answer that is current', async ({ page }) => {
    // bootAndDraft asserts the premise internally: the drafted list really is
    // written under the ordering answer. That is the state the whole defect
    // depends on, so it gets its own named test rather than living only as a
    // precondition inside another one.
    const text = await bootAndDraft(page, ORDERING);
    expect(text).toMatch(/Lock a hot pickup slot/i);
  });

  test('it runs on a real event and moves that event\'s list', async ({ page }) => {
    // THE WIRING PROOF, and the one this repo has most often skipped: three
    // finished engines (playbookMilestones, playbookTasks,
    // playbookDayOfChecklist) have zero imports in hostv2, so being correct in
    // lib/ says nothing about reaching a host.
    //
    // The reconcile announces itself when it changes something, so the toast is
    // the observable that it ran against real event state — not a fixture, not
    // a unit harness. The sample this boots was authored before the reconcile
    // existed and has a stale stored list, which is exactly the population that
    // needed fixing.
    // Observed as the WRITE, not as a toast. The first version watched for the
    // announcement — and then the catch-up pass was correctly made silent,
    // which would have left this test passing on a message that no longer
    // exists if the assertion had been any vaguer. The write is the thing that
    // actually happened; the sentence was only ever a description of it.
    await page.addInitScript(() => {
      window.__tlWrites = 0;
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (String(k).startsWith('ngw-hostv2-patch-') && String(v).includes('"timeline"')) {
          window.__tlWrites += 1;
        }
        return orig.call(this, k, v);
      };
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
      localStorage.setItem('ngw-welcomed', '1');
      localStorage.setItem('ngw-v2-welcomed', '1');
    });
    await page.goto('?elegant=1');
    await settled(page);
    await expect.poll(() => page.evaluate(() => window.__tlWrites), { timeout: 10_000 })
      .toBeGreaterThan(0);

    // And it wrote a REAL reconciliation, not an empty rewrite: the stored list
    // carries engine rows afterwards.
    const engineRows = await page.evaluate(() => {
      const k = Object.keys(localStorage).find((x) => x.startsWith('ngw-hostv2-patch-'));
      const tl = (JSON.parse(localStorage.getItem(k) || '{}').timeline) || [];
      return tl.filter((t) => t && typeof t.id === 'string' && t.id.startsWith('pbt-')).length;
    });
    expect(engineRows).toBeGreaterThan(0);
  });

  test('reconciling settles — it does not write in a loop', async ({ page }) => {
    // Counts real writes rather than watching for slowness: every persist goes
    // through localStorage, so a patch/render/patch cycle shows up as a write
    // count that keeps climbing after the screen has stopped changing. This is
    // the failure that would not look like a bug — just a warm laptop.
    await page.addInitScript(() => {
      window.__writes = 0;
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (String(k).startsWith('ngw-hostv2-patch-')) window.__writes += 1;
        return orig.call(this, k, v);
      };
    });
    await bootAndDraft(page, STEAMING);
    const first = await page.evaluate(() => window.__writes);
    await page.waitForTimeout(2500);
    const second = await page.evaluate(() => window.__writes);
    expect(second - first, `still writing after settling: ${first} -> ${second}`).toBe(0);
    expect(second).toBeLessThan(12);
  });
});

test('the crab swap, driven through the decision board itself', async ({ page }) => {
  test.skip(!page.viewportSize() || page.viewportSize().width < RAIL_MIN_WIDTH, 'uses the rail to reach both sheets');

  // THE ONE THAT WAS OPEN. Two earlier attempts produced a flaky test rather
  // than a failing feature and it was recorded as a gap rather than papered
  // over. The missing step was a disclosure: the decision renders its current
  // pick and hides the alternatives behind "Other ways", so a walk that looked
  // for the option directly found nothing and timed out.
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'my-crab-feast');
  });
  await page.goto('?elegant=1');
  await settled(page);

  // 1. Draft the checklist under the default answer (order steamed for pickup).
  await openChecklist(page);
  await page.getByRole('button', { name: /Draft my checklist/i }).click();
  await settled(page);
  const before = await page.locator('.sheet').last().innerText();
  expect(before, 'the drafted list was not written under the ordering answer')
    .toMatch(/Lock a hot pickup slot/i);
  expect(before).not.toMatch(/rack steamer pot/i);

  // 2. Change the decision the way a host does: open the call, disclose the
  //    alternatives, pick a different one.
  await page.locator('.srail-row', { hasText: 'Calls to make' }).first().click();
  await settled(page);
  const board = page.locator('.sheet').last();
  await board.locator('button', { hasText: 'Other ways' }).first().click();
  await settled(page);
  await board.locator('button', { hasText: 'Steam them myself' }).first().click();
  await settled(page);

  // 3. The checklist followed, without a reload.
  await openChecklist(page);
  const after = await page.locator('.sheet').last().innerText();
  expect(after, 'the steamer row never arrived').toMatch(/rack steamer pot/i);
  expect(after, 'the pickup row is still being asked for').not.toMatch(/Lock a hot pickup slot/i);
});
