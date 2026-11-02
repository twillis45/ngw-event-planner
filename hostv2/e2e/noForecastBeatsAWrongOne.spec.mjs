// ─── GOLD-06 (weather baseline) + GOLD-10's producer failure ────────────────
//
// Two open rows, one contract. The GOLD matrix has carried "weather has no
// e2e" since the gate — it is the row the Sprint 0 verdict cites as the reason
// both verdicts are scoped — and GOLD-10's third gap is "producer failure".
// Weather IS a producer, so the honest-failure rule and the weather baseline
// are the same assertion read from two sides.
//
// THE RULE, in HostShellV2's own words at the live-weather effect:
//
//   "When NOT configured, the labeled sample drives the same engines. NEVER
//    both: a configured app shows live weather or nothing — a fabricated
//    fallback could contradict the real sky."
//
// and in the catch that swallows a producer failure:
//
//   "stay quiet — no forecast beats a wrong one"
//
// That is a strong claim and it had no browser guard. The failure it prevents
// is specific and bad: an app wired to a real forecast, whose provider is
// down, quietly showing a SAMPLE forecast the host reads as the real sky — and
// then planning a 30-person outdoor party against invented rain.
//
// WHY THIS NEEDS NO NEW BUNDLE. `isWeatherConfigured()` is
// `Boolean(REACT_APP_OPENWEATHER_KEY || REACT_APP_API_BASE_URL)`. The shared
// e2e bundle (5233) has neither, so it is the UNCONFIGURED arm. The GOLD-09
// passgate bundle (5266) carries an API base, so it is the CONFIGURED arm.
// Same event, same fixture, same boot — configuration is the only variable,
// which is what makes the two arms a differential rather than two anecdotes.
//
// THE FIXTURE IS LOAD-BEARING AND COST A RUN. The venue NAME comes from
// `ev.venue`, not `ev.venueName` (venueFor.js:39). With the wrong key the
// venue is nameless, `isLikelyOutdoor` is false, the whole weather effect
// returns early, and BOTH arms read clean — a false pass on both sides at
// once. The producer-call assertion in the configured arm is what makes that
// failure mode impossible to miss: no calls means the path never ran.
//
// RUN: cd hostv2 && npm run e2e:build && npm run test:e2e
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';

const UNCONFIGURED = previewUrl(5233);   // no API base  → sample path
const CONFIGURED   = previewUrl(5266);   // has API base → live-or-nothing

const inDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// Outdoor venue, inside the 14-day forecast window, with a geocodable town.
// All three are required by the effect's own gate; drop any one and weather
// never runs.
const EVENT = {
  id: 'cust-wx-1',
  name: 'Riverside Park Picnic',
  type: 'birthday',
  date: inDays(7),
  guestCount: 30,
  venue: 'Riverside Park',     // ev.venue — NOT venueName. See the header.
  venueCity: 'Annapolis',
  venueState: 'MD',
};

const SAMPLE_LABEL = /Sample forecast/i;

/**
 * Boot with the weather producer failing, and report both what was asked of
 * it and what the host ended up reading.
 */
const run = async (page, base) => {
  const producerCalls = [];
  await page.route('**/api/weather/**', (route) => {
    producerCalls.push(route.request().url().split('/api/weather/')[1].split('?')[0]);
    route.fulfill({ status: 500, body: '{}' });   // the provider is down
  });
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(6500);
  const text = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
  return { producerCalls, text };
};

test.describe('GOLD-06 + GOLD-10 — no forecast beats a wrong one', () => {
  // ── 1 · UNCONFIGURED: the sample is allowed, but it must SAY it is a sample
  // An unlabeled sample is a fabricated forecast, which is the one thing the
  // whole module is written to avoid.
  test('with no provider configured, the sample runs and is labeled as a sample', async ({ page }) => {
    const { producerCalls, text } = await run(page, UNCONFIGURED);
    expect(producerCalls, 'an unconfigured app must not call a provider it does not have')
      .toHaveLength(0);
    expect(text, 'the sample forecast reached the host with no label on it — that is a fabricated forecast')
      .toMatch(SAMPLE_LABEL);
  });

  // ── 2 · CONFIGURED + PROVIDER DOWN: silence, never the sample ────────────
  // The one that matters. A host whose provider is down must get nothing, not
  // invented rain they will plan a 30-person outdoor party around.
  test('with a provider configured and failing, it shows nothing — never the sample', async ({ page }) => {
    const { producerCalls, text } = await run(page, CONFIGURED);

    // Proves the weather path actually RAN. Without this, the absence below
    // could just mean the fixture never triggered weather at all — which is
    // exactly what a wrong venue key produces, and it reads identical.
    expect(producerCalls.length, 'the producer was never called — the weather path did not run, so the silence proves nothing')
      .toBeGreaterThan(0);

    expect(text, 'a configured app fell back to the SAMPLE when its provider failed — the host would read invented rain as the real sky')
      .not.toMatch(SAMPLE_LABEL);
  });

  // ── 3 · THE DIFFERENTIAL, STATED AS ONE TEST ─────────────────────────────
  // Tests 1 and 2 are each other's control, and this asserts the relationship
  // directly so a future change cannot quietly satisfy both by showing nothing
  // anywhere (which would pass test 2 while silently gutting test 1).
  test('configuration is the only thing that changes the answer', async ({ browser }) => {
    const c1 = await browser.newContext();
    const c2 = await browser.newContext();
    const [unconf, conf] = await Promise.all([
      run(await c1.newPage(), UNCONFIGURED),
      run(await c2.newPage(), CONFIGURED),
    ]);
    expect(SAMPLE_LABEL.test(unconf.text), 'unconfigured must show the labeled sample').toBe(true);
    expect(SAMPLE_LABEL.test(conf.text), 'configured must not').toBe(false);
    expect(unconf.producerCalls).toHaveLength(0);
    expect(conf.producerCalls.length).toBeGreaterThan(0);
    await c1.close();
    await c2.close();
  });
});
