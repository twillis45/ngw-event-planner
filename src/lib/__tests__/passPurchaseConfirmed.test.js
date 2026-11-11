// The pass funnel recorded sheet_viewed and checkout_started, then nothing:
// no step said the purchase actually landed after Stripe returned. Now
// `purchase_confirmed` fires once per event, only after the server (or, for a
// legacy receipt link, Stripe) has confirmed the pass, never on a reopen.
// Observed through the real analytics module: under jsdom the host is
// localhost, so track() writes to its dev tap (window.__NGW_TRACK__) instead
// of PostHog. Red-proofed by dropping the once-per-event guard. That hostv2
// calls this only after confirmation is a behavior claim, so it lives in
// hostv2/e2e/thePassSurvivesTheWebhookRace.spec.mjs, not in a text gate here.

jest.mock('../sentry', () => ({ captureError: jest.fn() }));
const { recordPassFunnel } = require('../failureTelemetry');

const fired = () => (window.__NGW_TRACK__ || []).map(row => row.event);

beforeEach(() => { localStorage.clear(); window.__NGW_TRACK__ = []; });

test('a confirmed purchase is recorded once per event, never again on reopen', async () => {
  await recordPassFunnel('purchase_confirmed', 'Alice-personal-event');
  await recordPassFunnel('purchase_confirmed', 'Alice-personal-event');   // receipt link reopened
  await recordPassFunnel('purchase_confirmed', 'cust-second-event');
  expect(fired()).toEqual(['pass_purchase_confirmed', 'pass_purchase_confirmed']);
  expect(JSON.stringify(window.__NGW_TRACK__)).not.toMatch(/Alice|personal-event|second-event/);
});

test('the other funnel steps still fire every time', async () => {
  await recordPassFunnel('sheet_viewed', 'e1');
  await recordPassFunnel('sheet_viewed', 'e1');
  expect(fired()).toEqual(['pass_sheet_viewed', 'pass_sheet_viewed']);
});

test('an opted-out session records nothing', async () => {
  localStorage.setItem('ngw-analytics-optout', '1');
  await recordPassFunnel('purchase_confirmed', 'e1');
  expect(fired()).toEqual([]);
});
