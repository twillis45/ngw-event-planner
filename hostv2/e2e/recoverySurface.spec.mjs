// ─── BACKUPS YOU CAN ACTUALLY PUT BACK ──────────────────────────────────────
//
// The review board's ONE THING, named independently by six of ten seats across
// two panels. `restoreBackup`, `importCustomEvents`, `listBackups` and
// `readWriteLog` were implemented, guarded, unit-tested — and had ZERO callers.
// So the app took a snapshot before every write and no button in the product
// could put one back, while the only export lived inside the save-failure
// banner, which a host with healthy storage never sees.
//
// Panel B's paying-host seat put the cost plainly: "I paid for a plan I keep.
// Discovering at a save failure that my only copy is gone and the restore lives
// in source code is the exact scenario that produces a chargeback."
//
// The board named the shape of this test, so it is written to that shape:
// CORRUPT THE STORE, CLICK RESTORE, ASSERT THE PLAN RETURNS. Driven through the
// UI, because the unit boundary is exactly where this already worked.
import { test, expect, settled } from './fixtures.mjs';

const KEY = 'ngw-hostv2-custom-events';

const boot = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'test-two-days');
  });
  await page.goto('?elegant=1');
  await settled(page);
};

const openSettings = async (page) => {
  const rail = page.locator('.srail-row', { hasText: 'You & settings' });
  if (await rail.count()) { await rail.first().click(); } else {
    if (await page.locator('.sheet').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
    await page.locator('.ev-eyebrow').first().click();
    await page.locator('.sheet').last().getByText('You & settings', { exact: false }).first().click();
  }
  await settled(page);
};

const events = (page) => page.evaluate((k) => {
  try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; }
}, KEY);

test.describe('your data — the recovery surface', () => {
  test('a host with HEALTHY storage can still reach a copy', async ({ page }) => {
    // The whole defect: the export existed only inside the save-failure banner,
    // so it was reachable exactly when things had already gone wrong.
    await boot(page);
    await openSettings(page);
    await expect(page.getByRole('button', { name: /Download a copy/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Restore from a file/i }).first()).toBeVisible();
  });

  test('durability is stated plainly, not reassuringly', async ({ page }) => {
    await boot(page);
    await openSettings(page);
    const sheet = page.locator('.sheet').last();
    await expect(sheet.getByText(/keep your events|blocking storage|Not asked yet|cannot promise/i).first()).toBeVisible();
  });

  test('CORRUPT THE STORE, RESTORE, AND THE PLAN COMES BACK', async ({ page }) => {
    await boot(page);

    const seeded = await page.evaluate((k) => {
      const ev = { id: 'RECOVERY_PROBE', name: 'Recovery probe', date: '2026-12-01' };
      const cur = JSON.parse(localStorage.getItem(k) || '[]');
      const bk = 'ngw-hostv2-backup-probe';
      localStorage.setItem(k, JSON.stringify([...cur, ev]));
      localStorage.setItem(bk, JSON.stringify([...cur, ev]));
      localStorage.setItem('ngw-hostv2-store-backups', JSON.stringify([{ key: bk, at: Date.now() }]));
      return JSON.parse(localStorage.getItem(k)).length;
    }, KEY);
    expect(seeded).toBeGreaterThan(0);          // the precondition, asserted

    // NOW DESTROY IT — the failure the whole feature exists for.
    await page.evaluate((k) => localStorage.setItem(k, '[]'), KEY);
    expect(await events(page)).toHaveLength(0); // and prove it is really gone

    await page.reload();
    await settled(page);
    await openSettings(page);

    // THE ROW THAT MATTERS IS NOT THE FIRST ONE, and that is a real hazard
    // rather than a quirk of this test. The list is newest-first, and once the
    // store has been damaged the app's own next backup is a snapshot OF THE
    // DAMAGE — so the newest copy is the empty one. Restoring the top row put
    // the emptiness back and the assertion below caught it.
    //
    // A host hits this exactly as written: the copy they want is the one from
    // BEFORE whatever went wrong. Showing several, with real timestamps, is
    // what makes that recoverable — which is why the timestamp defect found
    // alongside this ("Invalid Date" on every app-written backup) mattered more
    // than it looked.
    const rows = page.getByRole('button', { name: /Put this back/i });
    expect(await rows.count()).toBeGreaterThan(1);      // more than one copy offered

    page.once('dialog', (d) => d.accept());
    const put = rows.last();                            // the one from before the damage
    await expect(put).toBeVisible();
    await put.click();
    await settled(page);

    const back = await events(page);
    expect(back.length).toBeGreaterThan(0);
    expect(back.some((e) => e && e.id === 'RECOVERY_PROBE')).toBe(true);
  });

  test('restoring asks first — it replaces what is there', async ({ page }) => {
    await boot(page);
    await page.evaluate((k) => {
      const bk = 'ngw-hostv2-backup-probe';
      localStorage.setItem(bk, JSON.stringify([{ id: 'X', name: 'Old', date: '2026-12-01' }]));
      localStorage.setItem('ngw-hostv2-store-backups', JSON.stringify([{ key: bk, at: Date.now() }]));
    }, KEY);
    await page.reload(); await settled(page);
    await openSettings(page);

    let asked = false;
    page.once('dialog', (d) => { asked = true; d.dismiss(); });
    await page.getByRole('button', { name: /Put this back/i }).first().click();
    await settled(page);
    expect(asked).toBe(true);
    expect((await events(page)).some((e) => e && e.id === 'X')).toBe(false);
  });
});
