// ─── A READINESS VERDICT MAY ONLY CITE AN AXIS THE HOST CAN SEE ──────────────
//
// The vendor cockpit port (owner ruling 2026-09-23: "the vendor pieces that are
// IMPORTANT to a host should be used only") shows SIX of the engine's nine
// readiness axes. The obvious way to do that is to render six chips and leave
// `getVendorReadiness` alone.
//
// That would have shipped the defect this codebase keeps finding. MEASURED over
// 1,568 vendor/event combinations BEFORE writing any of it: 208 (13.3%) produce
// a readiness sentence sourced from an axis hostv2 does not render. A host would
// read a label with a sentence under it and find nothing on the screen that
// explains either.
//
// ── AND THE SWEEP CORRECTED THE SCOPE, NOT THE OTHER WAY ROUND ──────────────
//
// The first scoping pass cut `closeout` as "belongs in the money view". The
// sweep put 112 of those 208 cases on it — it is the ONLY axis that can turn a
// past event critical, and its sentence is money the host owes. Cutting it would
// have hidden the cause of a red state. It is kept, and this file pins that.
//
// Three axes stay cut, and two of them are argued by the engine's own comments:
// `scope` ("we don't have a scope field"), `timeline` (run-of-show rows — a
// planner cross-reference), and `dayOf` (a duplicate of `logistics`; both key
// off the same arrival field).
import {
  getVendorChallengeSummary,
  getVendorReadiness,
  getHostVendorReadiness,
  getHostVendorChallenges,
  HOST_READINESS_AXES,
  getHostHighestRiskVendor,
} from '../vendorIntelligence';

const iso = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const CUT = ['scope', 'timeline', 'dayOf'];

// The sweep the scoping decision was made on, rebuilt. Every assertion about a
// population below runs over THIS, so the numbers in the comments stay checkable.
const sweep = () => {
  const out = [];
  for (const status of ['', 'Considering', 'Quoted', 'Contracted', 'Deposit Paid', 'Confirmed', 'Booked'])
    for (const d of [-5, 0, 3, 10, 25, 45, 120])
      for (const category of ['Catering', null])
        for (const contractSigned of [true, false])
          for (const depositPaid of [true, false])
            for (const balancePaid of [true, false])
              for (const arrivalTime of ['3:00 PM', null]) {
                const vendor = {
                  id: 'v', name: 'Probe', category, status, cost: 5000,
                  contractSigned, depositPaid, balancePaid, arrivalTime, contact: 'a@b.c',
                };
                out.push({ vendor, event: { id: 'e', date: iso(d), vendors: [vendor] } });
              }
  return out;
};

// Which axis produced this verdict's sentence, if any.
const sourceAxis = (challenges, readiness) => {
  const hit = Object.entries(challenges).find(([, x]) => x && x.note === readiness.summary);
  return hit ? hit[0] : null;
};

describe('(premise) the defect is real on the unfiltered engine', () => {
  test('the nine-axis verdict cites a cut axis on a measurable slice of the corpus', () => {
    // Without this, every assertion below could be passing over an engine that
    // never had the problem — and the fix would be guarding nothing.
    const rows = sweep();
    const bad = rows.filter(({ vendor, event }) => {
      const c = getVendorChallengeSummary(vendor, event);
      const a = sourceAxis(c, getVendorReadiness(vendor, event));
      return a && CUT.includes(a);
    });
    expect(rows.length).toBe(1568);
    // 96 of the original 208: the other 112 were `closeout`, which the sweep
    // caused to be KEPT rather than cut. If a future pass re-cuts it, the
    // population assertion below fails and says so.
    expect(bad.length).toBe(96);
  });

  test('and the sentences are exactly the two the scoping call named', () => {
    const seen = new Set();
    for (const { vendor, event } of sweep()) {
      const c = getVendorChallengeSummary(vendor, event);
      const a = sourceAxis(c, getVendorReadiness(vendor, event));
      if (a && CUT.includes(a)) seen.add(`${a}: ${getVendorReadiness(vendor, event).summary}`);
    }
    expect([...seen].sort()).toEqual([
      'scope: Vendor category not set — scope unclear.',
      'timeline: No run-of-show entries reference this vendor.',
    ]);
  });
});

describe('THE FIX: the host verdict never cites a chip the host cannot see', () => {
  test('across the whole sweep, zero verdicts come from a hidden axis', () => {
    // This is the guard. It is the same probe as the premise, run against the
    // host accessor instead of the raw one.
    const offenders = [];
    for (const { vendor, event } of sweep()) {
      const shown = getHostVendorChallenges(vendor, event);
      const r = getHostVendorReadiness(vendor, event);
      if (!r.summary) continue;
      const visible = shown.some((x) => x.note === r.summary);
      // A verdict may also be one of the ladder's own sentences ("Not booked
      // yet.", the untracked line) rather than an axis note — those are the
      // function's own words, not an axis's, and are fine.
      const isAxisNote = Object.values(getVendorChallengeSummary(vendor, event)).some((x) => x && x.note === r.summary);
      if (isAxisNote && !visible) offenders.push(`${vendor.status || '(none)'} → "${r.summary}"`);
    }
    expect(offenders).toEqual([]);
  });

  test('closeout is KEPT — the sweep is why, and this pins it', () => {
    // A vendor five days past their event with an unpaid balance. The only axis
    // that produces this, and it is money owed. If someone re-cuts closeout, the
    // host loses the cause of a red "Critical" — this fails first.
    const vendor = { id: 'v', name: 'Ironwood', category: 'Venue', status: 'Confirmed', cost: 5000, balancePaid: false };
    const event = { id: 'e', date: iso(-5), vendors: [vendor] };
    const r = getHostVendorReadiness(vendor, event);
    expect(r.level).toBe('critical');
    expect(r.summary).toBe('Final payment not recorded after event.');
    expect(getHostVendorChallenges(vendor, event).some((x) => x.key === 'closeout')).toBe(true);
    expect(HOST_READINESS_AXES).toContain('closeout');
  });

  test('the three cut axes are absent from what the host is shown', () => {
    const vendor = { id: 'v', name: 'Probe', status: 'Confirmed', cost: 5000, contact: 'a@b.c' };
    const event = { id: 'e', date: iso(10), vendors: [vendor] };
    const keys = getHostVendorChallenges(vendor, event).map((x) => x.key);
    expect(keys).toEqual(HOST_READINESS_AXES);
    for (const k of CUT) expect(keys).not.toContain(k);
    // …and the engine still computes all nine, so nothing was deleted.
    expect(Object.keys(getVendorChallengeSummary(vendor, event)).length).toBe(9);
  });

  test('the counts are over the six too — not the nine', () => {
    // If `counts` kept counting nine while the chips showed six, a host could
    // read "2 not tracked" beside six chips none of which is untracked.
    //
    // FOUND BY THIS TEST FAILING: `counts` has FOUR buckets and an axis has
    // FIVE levels. An axis at 'not_started' — which `booking` and
    // `communication` both return — lands in none of them. That is pre-existing
    // engine behaviour shared with the frozen shell, so it is pinned here, not
    // changed: the counted buckets plus the not_started axes make the whole set.
    // The summary line only ever says "N of M checks passing", never a total, so
    // nothing the host reads is wrong — but a future reader summing `counts` and
    // expecting the axis count would be, and now fails here instead.
    for (const { vendor, event } of sweep().slice(0, 200)) {
      const r = getHostVendorReadiness(vendor, event);
      if (r.level === 'not_started') continue;   // returns before counting
      const counted = (r.counts.critical || 0) + (r.counts.attention || 0) + (r.counts.safe || 0) + (r.counts.notTracked || 0);
      const notStarted = getHostVendorChallenges(vendor, event).filter((x) => x.level === 'not_started').length;
      expect(counted + notStarted).toBe(HOST_READINESS_AXES.length);
    }
  });
});

describe('NEGATIVE CONTROL: the CRA shell’s engine is byte-for-byte unchanged', () => {
  test('called with no axes argument, every verdict in the sweep is identical', () => {
    // The whole design is that this is ADDITIVE. `src/App.js` is frozen and its
    // cockpit calls getVendorReadiness(vendor, event) with two arguments. If the
    // filter ever changes the default path, the frozen shell's behaviour moved —
    // which is a change to a frozen surface, not a port.
    for (const { vendor, event } of sweep()) {
      const withNoArg = getVendorReadiness(vendor, event);
      const withExplicitNull = getVendorReadiness(vendor, event, null);
      expect(withExplicitNull).toEqual(withNoArg);
      // Nine axes went into it, not six. (Plus the not_started axes `counts`
      // does not bucket — see the note in the counts test above.)
      if (withNoArg.level === 'not_started') continue;
      const counted = (withNoArg.counts.critical || 0) + (withNoArg.counts.attention || 0)
        + (withNoArg.counts.safe || 0) + (withNoArg.counts.notTracked || 0);
      const notStarted = Object.values(getVendorChallengeSummary(vendor, event))
        .filter((x) => x && x.level === 'not_started').length;
      expect(counted + notStarted).toBe(9);
    }
  });

  test('and the host verdict genuinely DIFFERS somewhere — or the filter is inert', () => {
    // A filter that never changes an answer is a filter nobody needed. This is
    // the vacuous-guard check: prove the two paths actually diverge.
    const diverged = sweep().filter(({ vendor, event }) => {
      const a = getVendorReadiness(vendor, event);
      const b = getHostVendorReadiness(vendor, event);
      return a.summary !== b.summary || a.level !== b.level;
    });
    expect(diverged.length).toBeGreaterThan(0);
  });
});

// ─── AND THE SAME POPULATION RULE, ONE LEVEL UP ─────────────────────────────
//
// `getHighestRiskVendor` was one of the four functions with ZERO coverage when
// this port was scoped. It is kept (it answers "which vendor needs you most"),
// so it gets its test WITH its port rather than in a separate up-front pass.
//
// The rule it has to obey is slice 1's, applied to a list: rank over the axes
// the reader renders. Ranking over nine would name a vendor worst on the
// strength of a run-of-show row the host will never see.
describe('which vendor needs the host most', () => {
  const V = (over) => ({ id: 'x', name: 'X', category: 'Venue', status: 'Confirmed',
    cost: 1000, contact: 'a@b.c', contractSigned: true, depositPaid: true,
    balancePaid: true, arrivalTime: '1:00 PM', coiStatus: 'received',
    coiVerified: true, coiExpiryDate: iso(200), payDueDate: iso(10), ...over });

  test('(premise) a settled roster names nobody', () => {
    // Without this, "it excludes helpers" could pass on a function that returns
    // null for everything.
    const a = V({ id: 'a', name: 'Alpha' });
    const b = V({ id: 'b', name: 'Beta', category: 'Catering' });
    expect(getHostHighestRiskVendor([a, b], { id: 'e', date: iso(21), vendors: [a, b] })).toBe(null);
  });

  test('it names the one with the real problem, in the engine’s own words', () => {
    const fine = V({ id: 'a', name: 'Alpha' });
    const bad = V({ id: 'b', name: 'Beta', contractSigned: false });
    const ev = { id: 'e', date: iso(21), vendors: [fine, bad] };
    const top = getHostHighestRiskVendor([fine, bad], ev);
    expect(top).toBeTruthy();
    expect(top.vendor.id).toBe('b');
    expect(top.readiness.summary).toMatch(/contract/i);
  });

  test('A HELPER IS DROPPED BEFORE RANKING, not after', () => {
    // An informal helper has no contract, deposit or insurance to be judged on
    // (standing rule 2026-08-07). Ranked, a cousin would outrank a caterer on
    // paperwork she was never going to file. Dropping after the sort would
    // still be wrong — it would return null when the helper won, hiding the
    // real worst vendor rather than naming it.
    const helper = { id: 'h', name: 'Cousin Rae', isInformal: true, cost: 0 };
    const mild = V({ id: 'a', name: 'Alpha', contractSigned: false });
    const ev = { id: 'e', date: iso(21), vendors: [helper, mild] };
    const top = getHostHighestRiskVendor([helper, mild], ev);
    expect(top).toBeTruthy();
    expect(top.vendor.id).toBe('a');
  });

  test('IT RANKS ON THE SIX — a cut axis cannot decide who is worst', () => {
    // `scope` fires on a missing category and is not rendered. On the six it is
    // invisible, so a vendor whose ONLY issue is a missing category must not be
    // named over one with a genuine paperwork gap.
    const noCategory = V({ id: 'a', name: 'Alpha', category: undefined });
    const noContract = V({ id: 'b', name: 'Beta', contractSigned: false });
    const ev = { id: 'e', date: iso(21), vendors: [noCategory, noContract] };
    const six = getHostHighestRiskVendor([noCategory, noContract], ev);
    expect(six.vendor.id).toBe('b');
    // …and the summary it carries is one the host can see a chip for.
    const shown = getHostVendorChallenges(six.vendor, ev).map((x) => x.note);
    expect(shown).toContain(six.readiness.summary);
  });
});
