// A PANEL STARTS AT ITS HEADING (live check of bf38dde1, 11/25/2026).
//
// The checklist's "Up next" heading sat about 60px below the top of its panel:
// a section heading's top margin (there to separate one section from the one
// above) stacked on the panel's own padding, because nothing was above it. The
// rule is general, so the test is too: in every section door, any panel whose
// first content is a section heading has that heading on its padding, not
// pushed down by a margin meant for the space between sections. Made-up plan.
import { test, expect, settled, openSectionByName, sheetSettled } from './fixtures.mjs';

const DOORS = [
  'Venue', 'Guests & invite', 'The spread & shopping', 'Your money', 'People you’re hiring',
  'Space, seats & helpers', 'Who sits where', 'Your checklist', 'Calendar', 'Calls to make',
  'What could go wrong', 'Messages', 'Make it yours', 'You & settings',
];

const boot = async (page) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.route('**/*', (route) => (route.request().method() === 'GET' ? route.fallback() : route.abort()));
  await page.route('https://e2e-mock.invalid/**', (route) => route.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.goto('?elegant=1');
  await settled(page);
};

// Every panel in the open sheet whose first laid-out content is a section
// heading: how far the heading's box sits below the panel's padding edge.
const headingGaps = (page) => page.evaluate(() => {
  const out = [];
  for (const panel of document.querySelectorAll('.sheet .panel')) {
    let first = panel.firstElementChild;
    while (first && !first.getClientRects().length) first = first.nextElementSibling;
    if (!first) continue;
    const sect = first.matches('.sect') ? first : (first.firstElementChild && first.firstElementChild.matches('.sect') ? first.firstElementChild : null);
    if (!sect) continue;
    const pr = panel.getBoundingClientRect();
    const padTop = parseFloat(getComputedStyle(panel).paddingTop) || 0;
    const gap = Math.round(sect.getBoundingClientRect().top - (pr.top + padTop));
    out.push({ heading: (sect.innerText || '').trim().split('\n')[0].slice(0, 40), gap });
  }
  return out;
});

test.describe('a panel starts at its heading', () => {
  test.beforeEach(async ({}, info) => {
    test.skip(info.project.name !== 'mobile', 'one geometry: the rule is the same at every width');
  });
  for (const door of DOORS) {
    test(door, async ({ page }) => {
      test.setTimeout(60_000);
      await boot(page);
      await openSectionByName(page, door, { settle: 600 });
      await sheetSettled(page);
      const gaps = await headingGaps(page);
      const late = gaps.filter((g) => g.gap > 4);
      expect(late, `${door}: headings pushed below their panel's padding`).toEqual([]);
    });
  }
});
