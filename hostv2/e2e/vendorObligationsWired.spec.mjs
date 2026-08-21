// ─── THE DERIVED OBLIGATIONS HAVE TO REACH THE HOST'S SCREEN ────────────────
//
// `vendorObligations` and its 13 unit tests prove the DERIVATION is right. They
// prove nothing about whether a host ever sees it. The standing rule in this
// repo is that a fix is done only when driven live, and the matching rule is
// that an engine improvement which never reaches runtime UI is not a shipped
// change. This file is that half.
//
// THE GAP BEING CLOSED. A booked caterer with `coiStatus: 'missing'`, no
// deposit, no signed contract and no arrival time produced a checklist that
// mentioned none of it, while `getVendorCOIState` already returned
// `{ required: true, status: 'required' }` for that same vendor.
//
// WHY THE FIXTURE HAS TWO VENDORS. One owes four things; one is fully settled.
// A gate that only seeded the owing vendor would pass just as happily if the
// group rendered a row for every vendor alive. The settled vendor is the
// control, and it is the assertion I care most about — silence is the property
// that keeps this list worth reading.
//
// NOTE ON THE SEEDED STATE: `test-day-before-vendors` has NO authored timeline
// ("No tasks yet"), which makes it the right stage on purpose. The derived group
// renders in the empty-checklist branch as well as the populated one, and this
// is the only test that covers that branch.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

// TSW owes all four. Ironwood owes nothing — deliberately settled on every axis
// the module reads, including `coiVerified: true`, so a regression that fires on
// "required && !verified" (the bug this shipped with for an hour) shows up here
// as an extra row rather than as nothing at all.
const OWING_PATCH = {
  vendors: [
    { id: 'tdv-v1', name: 'Ironwood Room', category: 'Venue', status: 'Confirmed', cost: 2200,
      depositPaid: true, contractSigned: true, arrivalTime: '3:00 PM',
      coiStatus: 'received', coiVerified: true },
    { id: 'tdv-v2', name: 'TSW Catering', category: 'Catering', status: 'Booked', cost: 4200,
      depositPaid: false, contractSigned: false, arrivalTime: null,
      coiStatus: 'missing', coiVerified: false },
  ],
};

// Boot matches boardMatrix's verbatim, and the flags are not optional: without
// the splash-seen/welcomed keys the full splash plays over every probe, and the
// gate Date.parse()s that value, so an epoch-millis string parses NaN and the
// splash plays anyway. Learned the hard way by elementFromPoint debugging.
const EV = 'test-day-before-vendors';
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
  await settled(page);
};

/** Open the checklist the way a host does — through the Sections door. */
const openChecklist = async (page) => {
  await openSectionByName(page, 'Your checklist', { timeout: 5000 });
  await expect(page.locator('#sheet-title')).toHaveText('Your checklist', { timeout: 5000 });
};

test.describe('what your vendors still owe, on the host screen', () => {
  test('the outstanding obligations are visible, and name the vendor', async ({ page }) => {
    test.setTimeout(60_000);
    await boot(page, OWING_PATCH);
    await openChecklist(page);

    const sheet = page.locator('.sheet').last();
    await expect(sheet.getByText('From your vendors', { exact: false })).toBeVisible({ timeout: 5000 });

    // All four obligations, each naming the vendor rather than saying "a vendor".
    for (const re of [/certificate of insurance/i, /deposit/i, /contract/i, /arrival time/i]) {
      await expect(sheet.getByText(re).first()).toBeVisible({ timeout: 5000 });
    }
    await expect(sheet.getByText(/TSW Catering/).first()).toBeVisible();
  });

  test('the SETTLED vendor is never mentioned — silence is the whole point', async ({ page }) => {
    // The control. A derived list that always has rows in it trains the host to
    // skim past it, at which point the real obligation is invisible again for a
    // brand-new reason. Ironwood owes nothing and must not appear.
    test.setTimeout(60_000);
    await boot(page, OWING_PATCH);
    await openChecklist(page);

    const group = page.locator('.sheet').last().locator('text=From your vendors').locator('..');
    await expect(group).not.toContainText('Ironwood');
    await expect(page.locator('.sheet').last().getByText('From your vendors · 4 outstanding')).toBeVisible({ timeout: 5000 });
  });

  test('each row carries the RULE that produced it', async ({ page }) => {
    // UX_08 permits rule-based inference as a source only when the rule is
    // visible to the host. A derived row with no stated reason is an assertion
    // the host cannot check, which is the thing that doctrine bars.
    test.setTimeout(60_000);
    await boot(page, OWING_PATCH);
    await openChecklist(page);
    const sheet = page.locator('.sheet').last();
    await expect(sheet.getByText(/turn a vendor away at load-in/i)).toBeVisible({ timeout: 5000 });
    await expect(sheet.getByText(/held date is not a booked date/i)).toBeVisible();
  });

  test('a row ROUTES to that vendor — never a dead tap', async ({ page }) => {
    // The CTA rule: a row lands on the thing it is about, not on a tab top.
    // These obligations resolve by fixing the vendor record, so the row has to
    // put the host on that vendor.
    test.setTimeout(60_000);
    await boot(page, OWING_PATCH);
    await openChecklist(page);

    await page.locator('.sheet').last().getByText(/certificate of insurance/i).first().click({ timeout: 5000 });
    await expect(page.locator('#sheet-title')).toHaveText(/People you.{0,3}re hiring/, { timeout: 5000 });
    await expect(page.locator('.sheet').last()).toContainText('TSW Catering');
  });

  test('with every vendor settled, the group does not render at all', async ({ page }) => {
    // Not the same test as the Ironwood control: this proves the GROUP itself
    // disappears, heading and count included, rather than rendering an empty
    // shell that still occupies the screen and still says "From your vendors".
    test.setTimeout(60_000);
    await boot(page, {
      vendors: [
        { id: 'tdv-v1', name: 'Ironwood Room', category: 'Venue', status: 'Confirmed',
          depositPaid: true, contractSigned: true, arrivalTime: '3:00 PM',
          coiStatus: 'received', coiVerified: true },
      ],
    });
    await openChecklist(page);
    await expect(page.locator('.sheet').last().getByText('From your vendors', { exact: false })).toHaveCount(0);
  });
});
