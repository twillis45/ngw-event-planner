// ─── ONE NUMBER, ONE READER (six root causes, cause 3) ───────────────────────
// The lane-D harness (everyScreenSaysTheSameThing) asks each fact the way each
// surface asks it over the samples. This extends it to every playbook at
// several sizes and budgets for the facts the Thanksgiving walkthrough caught
// disagreeing (P1-3, P1-5, P1-6): the parts handled, the money figures and
// their names, and what "confirmed" means.
const fs = require('fs');
const path = require('path');
const pbm = require('../playbooks');
const { deriveEventPhaseProgress } = require('../phaseProgress');
const { planPartsProgress, planPartsLine } = require('../planProgress');
const { planRibbon } = require('../eventOrientation');
const { hostSpending } = require('../hostSpending');
const { expectedHeadroom } = require('../budgetCopy');
const { moneyFigures, headroomLabel, MONEY_LABELS } = require('../moneyFigures');
const { coversWithWord, confirmedRsvpCovers } = require('../confirmedCovers');
const { derivePlaceIntelligence } = require('../placeIntelligence');
const { planHeroCopy } = require('../planHeroCopy');
const { buildReturnSnapshot } = require('../returnNarration');

const dayOut = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12, 0, 0, 0); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const events = () => {
  const out = [];
  for (const pb of pbm.ALL_PLAYBOOKS) {
    for (const [g, budget, days] of [[14, 400, 3], [40, 3000, 30], [120, '', 120]]) {
      out.push({ id: `ev-${pb.type}-${g}`, type: pb.type, name: 'N', date: dayOut(days), startTime: '15:00', startTimeSource: 'host', venue: 'Our place', venueKind: 'home', venueCity: 'Fort Washington, MD', guestMode: 'count', guestCount: g, totalBudget: budget, guests: [], vendors: [], budget: [], timeline: [] });
    }
  }
  return out;
};

describe('one number, one reader, on every playbook', () => {
  test('parts handled: the strip, the ribbon and the summary line agree', () => {
    const bad = [];
    for (const ev of events()) {
      const cues = deriveEventPhaseProgress(ev);
      const pp = planPartsProgress(cues);
      if (!pp) continue;
      const rib = planRibbon(cues, null);
      if (rib.done !== pp.done || rib.total !== pp.total) bad.push(`${ev.id}: ribbon ${rib.done}/${rib.total} vs ${pp.done}/${pp.total}`);
      if (cues.completedCount !== pp.done || cues.totalCount !== pp.total) bad.push(`${ev.id}: ledger ${cues.completedCount}/${cues.totalCount} vs ${pp.done}/${pp.total}`);
      if (pp.parts.filter((p) => p.handled).length !== pp.done) bad.push(`${ev.id}: listed handled ≠ count`);
      if (cues.summary && /parts? of your plan handled/.test(cues.summary) && cues.summary !== planPartsLine(pp)) bad.push(`${ev.id}: "${cues.summary}" vs "${planPartsLine(pp)}"`);
    }
    expect(bad).toEqual([]);
  });

  test('money: left to spend is expected − spent, the room is budget − expected, and the room is never called "left to spend"', () => {
    const bad = [];
    for (const ev of events()) {
      const money = hostSpending(ev);
      const f = moneyFigures(money);
      if (Math.abs(f.leftToSpend - Math.max(0, money.expected - money.spent)) > 0.01) bad.push(`${ev.id}: left to spend ${f.leftToSpend}`);
      if (f.headroom !== expectedHeadroom(money)) bad.push(`${ev.id}: headroom ${f.headroom} vs ${expectedHeadroom(money)}`);
      if (/left to spend/i.test(headroomLabel(f))) bad.push(`${ev.id}: the room is labeled "${headroomLabel(f)}"`);
    }
    expect(bad).toEqual([]);
    // Cohesion audit #5 (owner-approved 11/24/2026): no figure is called "left
    // to spend" — it read as the budget's room beside "not yet spoken for".
    expect(MONEY_LABELS.leftToSpend).toBe('Still to pay');
    expect(Object.values(MONEY_LABELS).some((w) => /left to spend/i.test(w))).toBe(false);
    // The walkthrough's numbers: $400 budget, $323 expected, $0 spent.
    const f = moneyFigures({ planned: 400, expected: 323, committed: 0, spent: 0 });
    expect([f.leftToSpend, f.headroom, headroomLabel(f)]).toEqual([323, 77, 'Room left in your budget']);
  });

  test('"confirmed" is replies: a planned count with no replies is never called confirmed', () => {
    const bad = [];
    for (const ev of events()) {
      const cw = coversWithWord(ev);
      if (cw.word === 'confirmed' && confirmedRsvpCovers(ev) === 0) bad.push(`${ev.id}: ${cw.n} confirmed with no replies`);
      const roster = { ...ev, guestMode: 'roster', guests: [{ id: 'a', name: 'A B', rsvp: 'Yes' }, { id: 'b', name: 'C D', rsvp: 'Pending' }] };
      const rw = coversWithWord(roster);
      if (rw.word !== 'confirmed' || rw.n !== confirmedRsvpCovers(roster)) bad.push(`${ev.id}: roster says ${rw.n} ${rw.word}`);
    }
    expect(bad).toEqual([]);
  });

  // ── The rest of cause 3 (P1-6 item counts, P2 "Venue address: handled") ──
  test('the venue address: the ledger part and Space\'s Guest arrival read one fact', () => {
    const bad = [];
    for (const base of events()) {
      for (const place of [
        { venue: 'Our place', venueKind: 'home', venueAddress: '' },
        { venue: 'Our place', venueKind: 'home', venueAddress: '12 Oak St, Fort Washington, MD' },
        { venue: 'The Elks Lodge', venueKind: 'venue', venueAddress: '' },
      ]) {
        const ev = { ...base, ...place };
        const part = (deriveEventPhaseProgress(ev).items || []).find((i) => i.id === 'venueaddress');
        if (!part) continue;
        const arrival = derivePlaceIntelligence(ev).sections.find((x) => x.key === 'arrival');
        if ((arrival.state === 'handled') !== part.handled) bad.push(`${ev.id} ${place.venue}${place.venueAddress ? ' + street' : ''}: ledger ${part.handled}, arrival ${arrival.state}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('item counts: every "left to buy" counts the same lines', () => {
    const { itemCounts } = require('../itemCounts');
    const bad = [];
    for (const base of events()) {
      const plan0 = pbm.playbookFoodPlan(base);
      if (!plan0 || !plan0.list || !plan0.list.length) continue;
      // Some lines bought, one a friend brings: the sets the counts disagreed on.
      const got = {}; plan0.list.slice(0, 2).forEach((i) => { got[i.id] = true; });
      const third = plan0.list[2];
      const ev = { ...base, foodGot: got, ...(third ? { foodOwner: { [third.id]: 'Aunt May' } } : {}) };
      const plan = pbm.playbookFoodPlan(ev);
      const c = itemCounts(plan, ev);
      if (c.leftToBuy !== c.listItems - c.listBought) bad.push(`${ev.id}: ${c.leftToBuy} left vs ${c.listItems} − ${c.listBought}`);
      const shop = (deriveEventPhaseProgress(ev).items || []).find((i) => i.id === 'shopping');
      if (shop && !shop.handled && !new RegExp(`· ${c.leftToBuy} left$`).test(shop.cueLabel)) bad.push(`${ev.id}: board "${shop.cueLabel}" vs ${c.leftToBuy}`);
      const hero = planHeroCopy(ev);
      if (hero && hero.state === 'shopping' && !hero.title.includes(`remaining ${c.leftToBuy} item`)) bad.push(`${ev.id}: hero "${hero.title}" vs ${c.leftToBuy}`);
      const snap = buildReturnSnapshot(ev);
      if (snap.foodLeft != null && snap.foodLeft !== c.leftToBuy) bad.push(`${ev.id}: return line ${snap.foodLeft} vs ${c.leftToBuy}`);
    }
    expect(bad).toEqual([]);
  });

  test('item counts: each count prints under its own label on the shell', () => {
    const SRC = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
    // "7 items" on the spread link and "11 items" on the list it opens.
    expect(/\{foodPlan\.itemCount\} \{foodPlan\.itemCount === 1 \? 'item' : 'items'\}/.test(SRC)).toBe(false);
    expect(/All \{foodPlan\.itemCount\} food item/.test(SRC)).toBe(false);
    expect(/COUNT_LABELS\.foodItems\(/.test(SRC)).toBe(true);
    expect(/COUNT_LABELS\.listItems\(/.test(SRC)).toBe(true);
  });

  test('a head: every per-head figure is one division of the total it sits beside', () => {
    const { perHeadRange } = require('../perHead');
    const bad = [];
    for (const ev of events()) {
      const p = pbm.playbookFoodPlan(ev);
      if (!p || !(p.guests > 0)) continue;
      const allIn = perHeadRange(p.foodLow + p.suppliesLow, p.foodHigh + p.suppliesHigh, p.guests);
      if (allIn.low !== p.perGuestAllInLow || allIn.high !== p.perGuestAllInHigh) bad.push(`${ev.id}: all in ${p.perGuestAllInLow}–${p.perGuestAllInHigh} vs ${allIn.low}–${allIn.high}`);
      // The food pair divides the unrounded food sum; it closes on the printed
      // food total to within the total's own rounding (nearest $5).
      if (Math.abs(p.perGuestLow * p.guests - p.foodLow) > 2.5 + p.guests / 2) bad.push(`${ev.id}: food low ${p.perGuestLow} × ${p.guests} vs ${p.foodLow}`);
      if (Math.abs(p.perGuestHigh * p.guests - p.foodHigh) > 2.5 + p.guests / 2) bad.push(`${ev.id}: food high ${p.perGuestHigh} × ${p.guests} vs ${p.foodHigh}`);
    }
    expect(bad).toEqual([]);
    const SRC = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
    // The shell divides nothing by the guests itself.
    expect(SRC.match(/Math\.round\(\w+ \/ guests\)\)?\} a head|\/ foodPlan\.guests/g)).toBe(null);
    // 4 since 11/24/2026: the budget ask's headline per-head moved into
    // lib/budgetCopy budgetAskCopy (owner: "Copy is too wordy"), which reads
    // perHeadText itself, so it is still one division, read through one reader.
    // 2 since 11/26/2026: the budget question reads its per-heads from the
    // shared answer (lib/budgetChoices), and the tier links that divided twice
    // more went with the old layout.
    expect((SRC.match(/perHeadText\(/g) || []).length).toBe(2);
    const COPY = fs.readFileSync(path.join(__dirname, '../budgetCopy.js'), 'utf8');
    expect(COPY).toMatch(/perHeadText\(perHeadRange\(headline, headline, g\), fmt\)/);
  });

  test('the shop\'s "all in" counts the seating sheet\'s gear, the plan costs Your money counts', () => {
    const { allInTotal } = require('../planCosts');
    const bad = [];
    let withGear = 0;
    for (const ev of events()) {
      const fp = pbm.playbookFoodPlan(ev);
      if (!fp || !fp.hasRealCount) continue;
      let cap = null; try { cap = pbm.playbookCapacity(ev); } catch (_e) { cap = null; }
      const all = allInTotal(fp, cap);
      if (all.gearHigh > 0) withGear++;
      const cats = hostSpending(ev).categories || [];
      const exp = cats.filter((c) => ['Catering', 'Bar / Beverage', 'Supplies', 'Rentals'].includes(c.label)).reduce((t, c) => t + (Number(c.expected) || 0), 0);
      if (exp < all.low - 5 || exp > all.high + 5) bad.push(`${ev.id}: money expects ${Math.round(exp)} for food, drinks, supplies and rentals; the shop says ${all.low}–${all.high}`);
    }
    expect(bad).toEqual([]);
    expect(withGear).toBeGreaterThan(0);
    const SRC = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
    expect(/\(foodPlan\.foodLow \|\| 0\) \+ \(foodPlan\.suppliesLow \|\| 0\)/.test(SRC)).toBe(false);
  });

  test('the shell prints these through the readers, not its own counts', () => {
    const SRC = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
    expect(/'Expected left to spend'/.test(SRC)).toBe(false);
    expect(/n\('Completed'\) \+ ' handled'/.test(SRC)).toBe(false);
    expect(/if \(yes > 0\) w\.push\(yes \+ ' confirmed'\)/.test(SRC)).toBe(false);
    expect(/phaseCues\.completedCount/.test(SRC)).toBe(false);
    expect(/planPartsProgress\(phaseCues\)/.test(SRC)).toBe(true);
    // How urgent a call is (P1-7): the Calls list's "time-sensitive" tag reads
    // lib/urgency, the same reader the hero queue raises a call by.
    expect(/r\.timeCritical && r\.status !== 'overdue'/.test(SRC)).toBe(false);
    expect((SRC.match(/urgencyOf\(r\)\.timeSensitive/g) || []).length).toBe(4);
  });
});
