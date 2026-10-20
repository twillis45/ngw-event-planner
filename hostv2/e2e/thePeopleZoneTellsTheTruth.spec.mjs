// ─── THE ATTENDANCE ZONE, ON SCREEN, TELLING THE TRUTH ──────────────────────
//
// PEOPLE/ATTENDANCE REDESIGN, step 3 — the required redesign test from
// PEOPLE_ATTENDANCE_PRODUCT_CONTRACT.md §A3 and §4.
//
// WHAT THIS IS FOR. `aFirmNumberIsNotAReply.test.js` pins the word choice at
// the module (16 tests, red-proofed). jest cannot execute hostv2, so only a
// browser can prove the sentence actually reaches a host — which is the whole
// lesson the parity manifest records: *"'already centralized in code' is not
// 'already the redesign' — check the SCREEN."*
//
// THE TWO ASSERTIONS THAT MATTER MOST, both measured defects rather than style:
//
//   1. Two events differing ONLY in `guestCountSource` must not read the same.
//      Sprint 0.5 D1 gave the engine provenance; if the screen ignores it, the
//      host still cannot tell her number from ours.
//   2. A settled headcount must never say anyone replied. `attendanceBand()`
//      reports `confirmed: n` on basis 'count' with an empty roster, so a
//      surface reading the field instead of the basis lies here and nowhere
//      else — one field, two meanings.
import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

const EV = (over = {}) => ({
  id: 'e2e-people', name: 'The Cookout', type: 'Cookout',
  date: dateIn(45),
  venueCity: 'Annapolis', state: 'MD',
  totalBudget: 4000, budget: [], vendors: [], guests: [],
  ...over,
});

const boot = async (page, ev) => {
  await page.addInitScript((e) => {
    // Conditional: addInitScript re-runs on every navigation, so an
    // unconditional seed erases what the test just did on reload.
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    }
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  // ?people=1 is the opt-in door while the redesign earns the default.
  await page.goto('?elegant=1&people=1');
  await settled(page);
  await openSectionByName(page, 'Guests', { settle: 600 });
};

// The zone is an AskColumn inside the sheet; read the sheet's text.
const sheetText = (p) => p.evaluate(() => {
  const el = document.querySelector('.sheet');
  return ((el && el.innerText) || '').replace(/\s+/g, ' ');
});

// ── THE DISCLOSURE, AND WHY THESE ASSERTIONS MOVED (owner correction, 2026-10-20)
//
// OBSOLETE IMPLEMENTATION, not required behaviour: the first cut rendered every
// sentence the engine holds on the first viewport. The owner stopped it — "the
// audit must not become the UI" — so the reasoning moved behind a disclosure.
//
// REQUIRED BEHAVIOUR, unchanged and still asserted below: every one of those
// sentences is still REACHABLE and still true. These tests now open the
// disclosure to prove compression did not become deletion. A test that simply
// dropped the assertion would have let the truth go with the prose.
const open = (page, label) => page.evaluate((l) => {
  const b = [...document.querySelectorAll('.sheet button')]
    .find((x) => (x.innerText || '').trim().startsWith(l));
  if (!b) return false;
  b.click();
  return true;
}, label);

const roster = (n, rsvp) => Array.from({ length: n }, (_, i) => ({
  id: 'g' + i, name: 'Guest ' + i, rsvp,
}));

test('AN APP-SUPPLIED NUMBER SAYS SO, and says it is being held back', async ({ page }) => {
  await boot(page, EV({
    guestMode: 'count', guestEstimate: 40, guestCountSource: 'playbook-typical',
  }));
  const body = await sheetText(page);

  expect(body).toMatch(/who’s coming/i);
  // ── WHY THESE MARKERS MOVED A SECOND TIME (owner §5, 2026-10-20) ────────
  // OBSOLETE PRESENTATION: the "our estimate" chip plus a "Yes, plan for 40"
  // button under the band read as a configuration form — "the decision is the
  // story. The controls support the decision." The provenance now leads the
  // composition instead of annotating it: the recommended number IS the
  // headline, under a "Plan around" eyebrow, and the sentence beneath says in
  // host language what the chip used to label.
  // REQUIRED BEHAVIOUR, unchanged: an app-supplied number is still marked as
  // ours, still offered rather than assumed, and still says nobody replied.
  expect(body).toMatch(/Plan around/i);
  expect(body).toMatch(/Nobody has replied yet/i);
  expect(body).toMatch(/Plan for 40/);
  // It must NOT claim anyone replied or confirmed anything.
  expect(body).not.toMatch(/40 people said yes/i);

  // AND THE TRUTH IS STILL THERE, one tap away — both halves of it.
  expect(await open(page, 'Why this number')).toBe(true);
  await page.waitForTimeout(250);
  const more = await sheetText(page);
  expect(more).toMatch(/not a number you gave/i);
  expect(more).toMatch(/stays out of anything we send/i);
});

test('HER OWN NUMBER IS NOT APOLOGISED FOR — the paired fixture', async ({ page }) => {
  // Differs from the test above by ONE field. Without this pair, the assertions
  // there could pass on a surface that disclaims every number it shows.
  await boot(page, EV({
    id: 'e2e-people-hers',
    guestMode: 'count', guestEstimate: 40, guestCountSource: 'host',
  }));
  const body = await sheetText(page);

  expect(body).toMatch(/who’s coming/i);
  expect(body).not.toMatch(/Plan around/i);
  expect(body).not.toMatch(/Nobody has replied yet/i);
  expect(body).not.toMatch(/Plan for 40/);
  expect(body).not.toMatch(/not a number you gave/i);
});

test('A SETTLED HEADCOUNT NEVER SAYS ANYONE REPLIED', async ({ page }) => {
  // basis 'count' returns `confirmed: 40` with an empty roster. This is the
  // screen-level guard against reading that field as a reply count.
  await boot(page, EV({
    id: 'e2e-people-locked',
    guestMode: 'count', guestCount: 40, guestCountSource: 'host', guestCountLocked: true,
  }));
  const body = await sheetText(page);

  expect(body).toMatch(/The number you settled on/i);
  expect(body).not.toMatch(/said yes/i);
  expect(body).not.toMatch(/still to answer/i);
});

test('A ROSTER SAYS WHO SAID YES, and what is still out', async ({ page }) => {
  await boot(page, EV({
    id: 'e2e-people-roster', guestMode: 'list',
    guests: [...roster(3, 'Yes'), ...roster(2, '').map((g, i) => ({ ...g, id: 'p' + i }))],
  }));
  const body = await sheetText(page);

  expect(body).toMatch(/3 said yes, 2 still to answer/i);
  // A roster is hers by construction — no provenance disclaimer, no offer.
  expect(body).not.toMatch(/not a number you gave/i);
  expect(body).not.toMatch(/Plan for \d/);
});

test('CONFIRMING IT MAKES IT HERS — and the write lands on the event', async ({ page }) => {
  await boot(page, EV({
    id: 'e2e-people-confirm',
    guestMode: 'count', guestEstimate: 40, guestCountSource: 'playbook-typical',
  }));

  const clicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.sheet button')]
      .find((x) => /^Plan for 40$/.test((x.innerText || '').trim()));
    if (!b) return false;
    b.click();
    return true;
  });
  expect(clicked).toBe(true);
  await page.waitForTimeout(700);

  const after = await sheetText(page);
  expect(after, 'the estimate state is gone because the number is hers now').not.toMatch(/Plan around/i);
  expect(after).not.toMatch(/Plan for 40/);

  // Asserted on the stored event, not just on the screen: the provenance field
  // is what every outward gate in the app reads.
  const stored = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0]; }
    catch { return null; }
  });
  expect(stored.guestCountSource).toBe('host');
  expect(Number(stored.guestCount)).toBe(40);
});

test('NEGATIVE CONTROL — without ?people=1 the legacy body is untouched', async ({ page }) => {
  // The migration guarantee. 129 existing specs run against the legacy surface,
  // and nothing retires until parity closes.
  await page.addInitScript((e) => {
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    }
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV({ id: 'e2e-people-off', guestMode: 'count', guestEstimate: 40, guestCountSource: 'playbook-typical' }));
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Guests', { settle: 600 });

  const body = await sheetText(page);
  expect(body).not.toMatch(/Plan around/i);
  expect(body).not.toMatch(/Plan for 40/);
  expect(body).not.toMatch(/Know who’s coming/i);
});

// ─── A KNOWN NEED WITH AN OWNER WE DO NOT KNOW (step 7) ─────────────────────
//
// Exactly what `heardAccessNeeds` writes from "…, she uses a walker" — the
// measured case P1-2 was built for. `who` is null because "she" is not a name.
const WALKER = [{ kind: 'step-free', phrase: 'she uses a walker', source: 'host-said' }];

test('an unowned need is stated, in her words, WITHOUT inventing a person', async ({ page }) => {
  await boot(page, EV({
    id: 'e2e-people-need',
    guestMode: 'list',
    guests: [{ id: 'g1', name: 'Tonya Brooks', rsvp: 'Yes' }, { id: 'g2', name: 'Ray Okafor', rsvp: 'Yes' }],
    accessNeeds: WALKER,
  }));
  const body = await sheetText(page);

  // THE "STILL UNKNOWN" REGISTER (art-direction pass, 2026-10-20). The
  // references productize truthful uncertainty as a LABELLED LIST — the
  // Understanding step's "You want / Still unknown" columns — so the four
  // sentences the functional proof spent on this became one labelled row.
  // OBSOLETE PRESENTATION, not obsolete behaviour: every fact below is the
  // same fact, and all of it is still on the FIRST view rather than behind a
  // disclosure, which is a strictly stronger claim than the test it replaces.
  expect(body).toMatch(/STILL UNKNOWN/i);
  expect(body).toMatch(/Who needs step-free access/i);
  expect(body).toMatch(/she uses a walker/);
  expect(body).toMatch(/won’t guess which person/i);

  // THE SHARPEST GUARD IN THE SLICE. Two named people are on this roster and
  // neither of them said anything about stairs. If the surface attached the
  // need to one of them — by proximity, by order, by "probably the honoree" —
  // it would be inventing a fact about a real person.
  const needsBlock = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('.shelf-label')]
      .find((el) => /what someone needs/i.test(el.innerText || ''));
    let t = '', n = labels && labels.nextElementSibling;
    for (let i = 0; i < 4 && n; i += 1, n = n.nextElementSibling) t += ' ' + (n.innerText || '');
    return t.replace(/\s+/g, ' ');
  });
  expect(needsBlock).not.toMatch(/Tonya|Ray/);
});

test('and it claims only the reach an unowned need actually has', async ({ page }) => {
  // `domainsFor` gives an unowned requirement LODGING ONLY — the one domain it
  // can reach truthfully, because that search is sized by the count, not by
  // who. A surface promising a seat check would be promising something
  // seatingPlan cannot do: it reads the guest row, which has nothing on it.
  await boot(page, EV({ id: 'e2e-people-reach', guestMode: 'count', guestEstimate: 20, guestCountSource: 'host', accessNeeds: WALKER }));
  const body = await sheetText(page);

  // The unknown is stated as an unknown, and nothing claims a reach it does
  // not have. NO RAW ENGINE IDS: a capture caught "the-day" on screen in an
  // earlier cut, and ACCESS_DOMAINS are ids, not host language.
  expect(body).toMatch(/Who needs step-free access/i);
  expect(body).toMatch(/won’t guess which person/i);
  expect(body).not.toMatch(/the-day|notYetApplied|appliedTo/);
});

test('a NAMED need says both reaches are real, because they are', async ({ page }) => {
  // A roster row HAS a name, so `who` is known by construction and
  // `guestNeedsStepFree` lets seatingPlan act on it.
  await boot(page, EV({
    id: 'e2e-people-named',
    guestMode: 'list',
    guests: [{ id: 'g1', name: 'Tonya Brooks', rsvp: 'Yes', access: ['Step-free / wheelchair'] }],
  }));
  const body = await sheetText(page);

  // A named need moves out of "Still unknown" into "Accounted for".
  expect(body).toMatch(/Accounted for/i);
  expect(body).toMatch(/Tonya Brooks needs step-free access/i);
  expect(body).toMatch(/Their seat and where they stay are both checked/i);
  expect(body).not.toMatch(/STILL UNKNOWN/i);
});

test('NEGATIVE CONTROL — no need, no zone', async ({ page }) => {
  // The guard against a primitive that grows into a checklist: a host with
  // nothing to accommodate is asked nothing and shown no empty section.
  await boot(page, EV({ id: 'e2e-people-noneed', guestMode: 'count', guestEstimate: 20, guestCountSource: 'host' }));
  const t = await sheetText(page);
  expect(t).not.toMatch(/Step-free access/i);
  expect(t).not.toMatch(/STILL UNKNOWN/i);
});

// ─── A REPLY-BY DATE IS HERS, OR IT IS NOT ON SCREEN (owner §11) ────────────
//
// FOUND BY LOOKING AT A FRAME, NOT BY READING A DIFF. The §10 block renders a
// reply-by as the outcome it buys ("a final headcount by November 27"), and the
// first capture printed exactly that over a fixture whose host had never set
// one — because `rsvpDeadlineFor(event)` RETURNS A DATE REGARDLESS. It carries
// `source: 'derived'` (event.date − 7d) until the host commits, and
// `source === 'override'` is the only value that means she chose it.
//
// This is the 2026-07-14 defect, reintroduced one composition later. It was
// fixed then in the GUEST invite and left standing in the HOST line forty rows
// away; the shell's own comment calls that "half a fix is its own kind of lie".
// A third surface now reads the same field, so the invariant gets a test rather
// than a third comment.
test('A DERIVED REPLY-BY IS NEVER SPOKEN AS A DATE SHE SET', async ({ page }) => {
  // No `rsvpDeadline` anywhere on this event. `rsvpDeadlineFor` will still
  // return one, which is the whole trap.
  await boot(page, EV({
    id: 'e2e-people-noreplyby', guestMode: 'list',
    guests: [...roster(2, 'Yes'), ...roster(3, '').map((g, i) => ({ ...g, id: 'q' + i }))],
  }));
  const body = await sheetText(page);

  // The outcome block is there and names the real outstanding replies...
  expect(body).toMatch(/GET RESPONSES/i);
  expect(body).toMatch(/3 people haven’t answered yet/i);
  // ...and offers the deadline as something to SET, never as something that is.
  expect(body).toMatch(/Set a date you need the final number by/i);
  expect(body).not.toMatch(/Replies close/i);
  expect(body).not.toMatch(/A final headcount by/i);
});

test('AND WHEN SHE HAS SET ONE, IT IS SPOKEN AS THE OUTCOME IT BUYS', async ({ page }) => {
  // The paired fixture. Without it the assertions above would pass on a surface
  // that simply never shows a deadline — which is not the behaviour either.
  const iso = dateIn(20);
  await boot(page, EV({
    id: 'e2e-people-replyby', guestMode: 'list', rsvpDeadline: iso,
    guests: [...roster(2, 'Yes'), ...roster(3, '').map((g, i) => ({ ...g, id: 'q' + i }))],
  }));
  const body = await sheetText(page);

  const pretty = new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  expect(body).toContain(pretty);
  // §11: framed by what it buys — a reliable final headcount in time — not as a
  // date field with a Change button beside it.
  expect(body).toMatch(/A final headcount by/i);
  expect(body).toMatch(/3 more replies/i);
});

// ─── §24/§25/§36 · HIERARCHY IS NOT DELETION ────────────────────────────────
//
// The owner's instruction on both the invite actions and the administrative
// tail was the same, twice: *"Do NOT delete capability. Do NOT bury capability
// so deeply that it becomes effectively lost. This is progressive disclosure,
// not removal."*
//
// That is a testable claim, and it is the one a composition pass is most likely
// to break by accident — a control does not throw when it stops being rendered.
// So the rule these pin is: EVERY action is reachable in at most ONE disclosure
// from the state the host is already in.
const ACTIONS = [
  'Share the RSVP link', 'Show the QR', 'Preview the RSVP', 'Copy the invite',
  'Draft the guest brief', 'Update everyone', 'Write a nudge to send',
];

const buttonTexts = (page) => page.evaluate(() => [...document.querySelectorAll('.sheet button')]
  .map((b) => (b.innerText || '').trim()));

test('ALL SEVEN INVITE ACTIONS SURVIVE — one fold away at most', async ({ page }) => {
  await boot(page, EV({
    id: 'e2e-people-acts', guestMode: 'list',
    guests: [...roster(2, 'Yes'), ...roster(3, '').map((g, i) => ({ ...g, id: 'q' + i }))],
  }));

  // DOMINANT: one full-width CTA, and it is the one the STATE calls for —
  // replies are outstanding, so the job is getting them.
  // SCOPED TO THE BLOCK, not to the sheet. The sheet has other `.cta`s — the
  // quick-add "Add them" is one, and it comes first in the DOM — so a loose
  // `.sheet button.cta` query answers a different question than the one being
  // asked. (It did, on the first run.)
  const primary = await page.evaluate(() => {
    const b = document.querySelector('#guests-invites-anchor button.cta');
    return b ? (b.innerText || '').trim() : null;
  });
  expect(primary, 'with replies outstanding the dominant action is the share link').toBe('Share the RSVP link');

  // The rest are reachable after exactly one tap on a LABELLED fold — not an
  // anonymous overflow, because a labelled fold says what is inside it.
  expect(await open(page, 'More ways to reach people')).toBe(true);
  await page.waitForTimeout(250);
  const labels = await buttonTexts(page);
  const missing = ACTIONS.filter((a) => !labels.some((t) => t.startsWith(a)));
  expect(missing, 'every production invite action is still reachable').toEqual([]);
});

test('THE DOMINANT ACTION FOLLOWS THE STATE, not a preference', async ({ page }) => {
  // The paired fixture. Everyone has answered, so there is nothing to chase and
  // the loudest button on the screen must stop telling her to chase it.
  await boot(page, EV({ id: 'e2e-people-allin', guestMode: 'list', guests: roster(4, 'Yes') }));
  const cta = await page.evaluate(() => {
    const b = document.querySelector('#guests-invites-anchor button.cta');
    return b ? (b.innerText || '').trim() : null;
  });
  expect(cta).toBe('Update everyone');
  const body = await sheetText(page);
  expect(body).toMatch(/Everyone has answered/i);
});

test('THE ADMIN TAIL IS SUBORDINATED, NOT REMOVED', async ({ page }) => {
  await boot(page, EV({ id: 'e2e-people-admin', guestMode: 'list', guests: roster(3, 'Yes') }));
  const before = await sheetText(page);
  // Configuration is not competing with the guest work...
  expect(before).not.toMatch(/By headcount/);
  expect(before).not.toMatch(/Import a guest list/);
  // ...and it is one labelled tap away, with everything in it.
  expect(await open(page, 'How the invite looks, and your list')).toBe(true);
  await page.waitForTimeout(250);
  const after = await sheetText(page);
  for (const m of ['Invite look', 'By headcount', 'Import a guest list', 'Download the guest list']) {
    expect(after, `${m} survives inside the fold`).toContain(m);
  }
});

// ─── §7/§8 · FOUR CONCEPTS, FOUR PLACES, ON HOSTILE DATA ────────────────────
//
// The owner's defect report was three strings: `+1 Pat · with Ray`,
// `with Georgia Vegetarian`, `+1 Georgia · with ... no stairs`. Each is a
// relationship fact and a dietary fact sharing one separator, so they read as
// one phrase. The fix is structural — identity, party and need are three
// elements — and the thing that would silently undo it is someone merging them
// back to save a line, which is exactly how they got merged the first time.
test('IDENTITY, PARTY AND NEED ARE THREE ELEMENTS — never one sentence', async ({ page }) => {
  await boot(page, EV({
    id: 'e2e-people-grammar', guestMode: 'list',
    guests: [
      { id: 'a1', name: 'Tonya Brooks', rsvp: 'Yes', coupleId: 'cA', plusOne: 'Pat', kids: 2, diets: ['Vegetarian'] },
      { id: 'a2', name: 'Ray Brooks', rsvp: 'No', coupleId: 'cA' },
      // An unnamed +1: `plusOne` truthy but blank is real data, and "+1" with
      // nothing after it is the string this guards against.
      { id: 'a3', name: 'Alma Reyes', rsvp: 'Yes', plusOne: '   ' },
    ],
  }));

  const first = await page.evaluate(() => {
    const row = document.querySelector('.people-roster .rrow');
    if (!row) return null;
    const q = (c) => { const el = row.querySelector(c); return el ? (el.innerText || '').trim() : null; };
    return { name: q('.pr-name'), party: q('.pr-party'), need: q('.pr-need') };
  });
  expect(first).not.toBeNull();
  // IDENTITY is the name and only the name.
  expect(first.name).toBe('Tonya Brooks');
  // PARTY is who else arrives because of her — one concept, one line.
  expect(first.party).toMatch(/with Ray/);
  expect(first.party).toMatch(/\+1 Pat/);
  expect(first.party).toMatch(/2 kids/);
  // NEED is what the plan must do differently, and it is NOT in the party line.
  expect(first.party).not.toMatch(/Vegetarian/);
  expect(first.need).toMatch(/Vegetarian/);

  // An unnamed +1 never renders as a dangling "+1".
  const blank = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.people-roster .rrow')];
    const r = rows.find((x) => /Alma Reyes/.test(x.innerText || ''));
    const el = r && r.querySelector('.pr-party');
    return el ? (el.innerText || '').trim() : '';
  });
  expect(blank).not.toMatch(/\+1\s*$/);
});

test('“USE A DIFFERENT NUMBER” REVEALS THE STEPPER, and only then', async ({ page }) => {
  // §5: *"the decision is the story. The controls support the decision."* The
  // headcount stepper is suppressed until the host asks to adjust — which means
  // there are now two ways to lose the control entirely (suppress it and never
  // reveal it), and neither throws.
  await boot(page, EV({
    id: 'e2e-people-adjust',
    guestMode: 'count', guestEstimate: 40, guestCountSource: 'playbook-typical',
  }));
  const shown = () => page.evaluate(() => {
    const el = document.getElementById('guests-entry-anchor');
    return !!el && getComputedStyle(el).display !== 'none';
  });
  expect(await shown(), 'the form is not the decision').toBe(false);
  expect(await open(page, 'Use a different number')).toBe(true);
  await page.waitForTimeout(300);
  expect(await shown(), 'and the control is one tap away, not gone').toBe(true);
});

test('NEGATIVE CONTROL AT DESKTOP — the legacy sheet is not recomposed', async ({ page }) => {
  // The browser half of the per-switch guarantee. `theBaselineOutlivesTheRedesign`
  // pins the source; this pins what paints. Without the flag at the rail band
  // there must be no People grid, no People rail, and the roster must still be
  // the production data-tier table it has always been there.
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.addInitScript((e) => {
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    }
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV({ id: 'e2e-people-legacy-desktop', guestMode: 'list', guests: roster(10, 'Yes') }));
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Guests', { settle: 600 });

  const shape = await page.evaluate(() => ({
    grid: !!document.querySelector('.people-grid'),
    rail: !!document.querySelector('.people-rail'),
    peopleRoster: !!document.querySelector('.people-roster'),
    // The production table's own marks: a visible column header, and a
    // `.gdetail` that is still a child of the roster when one is open.
    headerVisible: (() => {
      const h = document.querySelector('.roster .ghead');
      return !!h && h.getClientRects().length > 0;
    })(),
  }));
  expect(shape).toEqual({ grid: false, rail: false, peopleRoster: false, headerVisible: true });
});
