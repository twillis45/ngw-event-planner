// ─── THE GUEST PAGES AND LODGING CLEAR THE NOTCH (design audit 2, 11/20/2026) ─
//
// viewport-fit=cover is set (index.html), so a phone held sideways hands the
// page its full width, sensor housing included, and leaves it to the page to
// keep content out of that band. Nothing read the left and right insets: with
// iPhone-landscape insets emulated (47 / 47), the invite, helper, vendor brief
// and family pages put text 5-7px into the band, the helper's two answer
// buttons with it, and the lodging cockpit's back link and step rail too.
//
// The insets are emulated through Chromium's own safe-area override (the same
// CDP call the audit used), so env(safe-area-inset-*) resolves as on a phone.
// Every visible text run and control must sit clear of both side bands. Side
// insets exist only with the phone on its side, so a project that starts in
// portrait is turned to landscape first (portrait -> landscape, as a guest
// turns the phone), and every project measures the sideways case.
import { test, expect, dateIn } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const INSETS = { top: 0, left: 47, right: 47, bottom: 21 };

const INV_EV = { id: 'cust-notch-invite', rsvpCode: 'notch-invite-code', name: 'Maya’s 40th Birthday', type: 'Birthday', date: dateIn(30), time: '19:00', venueName: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD', guestEstimate: 14, guestMode: 'count', guests: [], vendors: [], budget: [], timeline: [], hostName: 'Casey Morgan' };
const HELPER = { helperName: 'Jordan Avery', hostName: 'Casey Morgan', eventName: 'Friendsgiving at Pine Street', eventDate: dateIn(20), startTime: '16:00', venue: 'Pine Street Commons', venueAddress: '12 Pine Street, Springfield', jobs: [{ kind: 'task', label: 'Bring folding chairs' }], answer: null };
const BRIEF = { vendorId: 'v1', vendorName: 'Capital Rotisserie Catering', contactName: 'Dana Whitfield', category: 'Catering', arrivalTime: '14:30', briefNote: 'Load in through the side gate.', eventId: 'e1', eventName: 'Vida’s Game Night', eventDate: dateIn(30), venue: 'Fort Ward Park', ros: [{ time: '14:30', segment: 'Caterer load-in', location: 'Side gate', notes: 'Ask for Sam' }], hostName: 'Vida Reyes', briefContactName: '', briefContactPhone: '', guestCount: 40, dietCounts: { Vegetarian: 3 }, confirmState: null };
const FAMILY = { name: 'Vida’s Friendsgiving', type: 'Friendsgiving', date: dateIn(12), startTime: '16:00', hostNames: 'Vida Ramos', venue: 'Pine Street Commons', venueCity: 'Alexandria', venueState: 'VA', replies: { yes: 12, no: 2, maybe: 1, waiting: 3 }, ros: [{ time: '16:00', label: 'Doors open' }], rosEdited: true, checklist: [{ task: 'Order the turkey', done: true }], vendors: [] };
const FAM = 'fam-' + 'b'.repeat(28);

const PAGES = [
  { name: 'invite', url: `?rsvp=${INV_EV.rsvpCode}`, ready: '.inv2-sheet',
    seed: [['ngw-hostv2-custom-events', JSON.stringify([INV_EV])], ['ngw-hostv2-last-event', INV_EV.id]],
    routes: (p) => p.route(`${API}/**`, (r) => r.fulfill({ status: 404, json: { detail: 'not found' } })) },
  { name: 'helper', url: '?helper=notchhelpercode123456789', ready: '[data-surface="helper-link-v2"]', controls: ['I’ve got it', 'I can’t'],
    routes: (p) => p.route(`${API}/api/public/helper/notchhelpercode123456789`, (r) => r.fulfill({ status: 200, json: { ok: true, helper: HELPER } })) },
  { name: 'vendor brief', url: '?vendor=notchvendorbrief12345678', ready: '[data-surface="vendor-brief-v2"]',
    routes: (p) => p.route(`${API}/api/public/vendor-brief/notchvendorbrief12345678`, (r) => r.fulfill({ status: 200, json: { ok: true, brief: BRIEF } })) },
  { name: 'family', url: `?family=${FAM}`, ready: '[data-surface="family-view-v2"]',
    routes: async (p) => { await p.route(`${API}/**`, (r) => r.fulfill({ status: 404, json: { detail: 'not found' } })); await p.route(`${API}/api/public/family/${FAM}`, (r) => r.fulfill({ status: 200, json: { ok: true, plan: FAMILY } })); } },
  { name: 'lodging', url: '?demo=lodging', ready: '.lc-wrap',
    go: async (p) => { await p.getByRole('button', { name: /Load the Santa Fe example/i }).click(); await p.locator('.lc-h1').waitFor(); } },
];

// Every visible text run and control inside the viewport, and how far it
// reaches into either side band.
const intrusions = (ins) => {
  const vw = innerWidth, vh = innerHeight;
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const c = getComputedStyle(el);
    if (c.visibility === 'hidden' || c.display === 'none') return false;
    let o = 1; for (let n = el; n; n = n.parentElement) o *= +getComputedStyle(n).opacity;
    return o > 0.05 && !el.closest('[inert],[aria-hidden="true"]');
  };
  const out = [];
  const boxes = [];
  for (const e of document.querySelectorAll('button, a[href], input, textarea, [role=button]')) if (vis(e)) boxes.push(['control', e, e.getBoundingClientRect()]);
  for (const e of document.querySelectorAll('body *')) {
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim().length > 1) || !vis(e)) continue;
    const rg = document.createRange(); rg.selectNodeContents(e);
    const rs = [...rg.getClientRects()].filter((x) => x.width > 1);
    if (!rs.length) continue;
    boxes.push(['text', e, { left: Math.min(...rs.map((x) => x.left)), right: Math.max(...rs.map((x) => x.right)), top: Math.min(...rs.map((x) => x.top)), bottom: Math.max(...rs.map((x) => x.bottom)) }]);
  }
  for (const [kind, e, r] of boxes) {
    if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue;
    const left = ins.left - r.left, right = r.right - (vw - ins.right);
    if (left > 0.5 || right > 0.5) out.push(`${kind} "${(e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 30)}" ${left > 0.5 ? `left ${Math.round(left)}px` : `right ${Math.round(right)}px`}`);
  }
  return { n: boxes.length, out };
};

for (const pg of PAGES) {
  test(`${pg.name}: nothing sits in a sideways phone's sensor band`, async ({ page, context }) => {
    const vp = page.viewportSize();
    if (vp.height > vp.width) await page.setViewportSize({ width: vp.height, height: vp.width });
    if (pg.routes) await pg.routes(page);
    await page.addInitScript((seed) => {
      if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
      for (const [k, v] of seed) localStorage.setItem(k, v);
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
      localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    }, pg.seed || []);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: INSETS });
    await page.goto(pg.url);
    await page.locator(pg.ready).first().waitFor({ timeout: 20000 });
    if (pg.go) await pg.go(page);
    // The stationery's staged reveal fades the page in, and `intrusions` skips
    // anything under 5% opacity. A fixed 1.5s wait often measured before the
    // reply buttons had faded in, so they were never checked (9 of 10 invite
    // runs at 1024x768 passed while "Maybe" sat 6px in the band on every load,
    // 11/25/2026). Wait for every animation and transition to finish instead.
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' && a.playState !== 'pending'), null, { timeout: 15000 });
    await page.waitForTimeout(200);
    // Premise: the override reaches CSS on this page.
    const seen = await page.evaluate(() => {
      const d = document.createElement('div'); d.style.paddingLeft = 'env(safe-area-inset-left, 0px)';
      document.body.appendChild(d); const v = getComputedStyle(d).paddingLeft; d.remove(); return v;
    });
    expect(seen, 'premise: the emulated inset resolves in CSS').toBe('47px');
    for (const name of pg.controls || []) await expect(page.getByRole('button', { name, exact: true }).first()).toBeVisible();
    const r = await page.evaluate(intrusions, INSETS);
    expect(r.n, 'premise: text and controls were measured').toBeGreaterThan(3);
    expect(r.out, `${pg.name}: inside the ${INSETS.left}px side bands`).toEqual([]);
  });
}
