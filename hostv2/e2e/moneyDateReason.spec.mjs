// ─── A MONEY DEADLINE ROW HAD NO REASON ON IT ───────────────────────────────
//
// `money-dates` shipped without `dueInDays`. That field is what feeds
// actionReason's TIME branch, so the row rendered as a bare title — no reason
// cell at all — on a surface whose entire subject is how near a deadline is.
//
// WHAT I FIRST GOT WRONG, recorded because the correction is the useful part.
// I attributed the missing reason to the raiser authoring `because:` where its
// 18 siblings author `why:` (real, and fixed — CommandCenter.jsx:2258 maps
// `consequence: r.why`, so that field was genuinely dead). But that is NOT what
// the host was missing here. The exposure line could never have rendered in this
// cell: actionReason's ladder puts `time` (3) above `consequence` (5), and the
// 84-character exposure line fails the 40-char `fit()` even at a clause
// boundary. The row was bare because nothing fed `time` — no `dueInDays`.
//
// So this file proves the claim that is actually true and actually host-visible:
// the row now carries a reason, and it is the nearness one.
//
// WHY THE EXPAND. The ranked rows below the hero live behind "The rest of your
// plan"; a body-text assertion without it passes on a page that never showed the
// row. Learned by writing this test the wrong way first.
import { test, expect } from './fixtures.mjs';

const EV = 'test-day-before-vendors';

const isoIn = (days) => {
  const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// A refund window 4 days out — inside the raiser's 14-day window.
const MONEY_PATCH = { frontedAmount: 1800, moneyDates: { refundDeadline: isoIn(4) } };

const boot = async (page, patch) => {
  await page.addInitScript(([id, p]) => {
    localStorage.setItem('ngw-hostv2-last-event', id);
    if (p) localStorage.setItem('ngw-hostv2-patch-' + id, JSON.stringify(p));
    else localStorage.removeItem('ngw-hostv2-patch-' + id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [EV, patch || null]);
  await page.goto('?elegant=1');
  // NOT `settled(page)`: on a patched boot it resolved against an empty body
  // (measured — 0 chars via settled, 2789 via a fixed wait). That is a latent
  // flake source in the helper, noted rather than worked around silently.
  await page.waitForTimeout(3500);
  for (const rx of [/the rest of your list/i, /The rest of your plan/i]) {
    const el = page.getByText(rx).first();
    if (await el.count()) { await el.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(800); }
  }
};

/** The money-deadline row's reason cell, or null when the row renders bare. */
const reasonCell = (page) => page.evaluate(() => {
  const hit = [...document.querySelectorAll('button.ef-row')]
    .find((b) => /Refund window closes/.test(b.textContent || ''));
  if (!hit) return { row: false };
  const why = hit.querySelector('.ef-why');
  return { row: true, why: why ? why.textContent.trim() : null, type: why ? why.dataset.reason : null };
});

test.describe('a money deadline on the host screen', () => {
  test('PREMISE — the deadline row is really on the screen', async ({ page }) => {
    // Without this the reason assertion passes on a page with no such row —
    // which is exactly how the first version of this test fooled me.
    await boot(page, MONEY_PATCH);
    expect((await reasonCell(page)).row).toBe(true);
  });

  test('THE ROW CARRIES A REASON — it did not before dueInDays', async ({ page }) => {
    await boot(page, MONEY_PATCH);
    const cell = await reasonCell(page);
    expect(cell.why).toMatch(/due in 4 days/i);
    expect(cell.type).toBe('time');
  });

  test('and no deadline is invented when the host entered none', async ({ page }) => {
    // The control. A gate that only seeds the money state would pass just as
    // happily if this row rendered unconditionally.
    await boot(page, null);
    expect((await reasonCell(page)).row).toBe(false);
  });
});
