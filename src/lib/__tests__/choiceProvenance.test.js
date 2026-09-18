// ─── THE APP MAY NOT SIGN THE HOST'S NAME TO ITS OWN PICK ────────────────────
//
// difmCapable audit, 2026-09-18. A decision the host chose and a decision the
// APP proposed — which they accepted with one tap on "Sounds good" — were
// byte-identical afterwards: the same string in `event.foodChoices[id]`, written
// by the same `settleDecision`, confirmed by the same toast. Nothing recorded
// which had happened, and the settled card printed `Your call: "…"` over both.
//
// Same shape as the start-time stamp deleted earlier the same day, at ~130x the
// scale: `difmCapable: 'can-derive'` proposes on 129 decisions, and measured
// across the corpus all 129 propose their authored literal while 0 respond to
// any event data. So the value being signed as the host's is not even a
// derivation — it is a string an author typed.
import {
  settleChoicePatch, choiceStateFor, choiceAttribution,
  CHOICE_SOURCES, CHOICE_SOURCE_FIELD,
} from '../choiceProvenance';

const DEC = { id: 'alcohol', default: 'Wine + one cocktail', options: ['Host provides full bar', 'Wine + one cocktail'] };

describe('the write cannot store a value without its provenance', () => {
  test('a patch always carries both maps', () => {
    const p = settleChoicePatch({}, 'alcohol', 'BYOB', 'host');
    expect(p.foodChoices.alcohol).toBe('BYOB');
    expect(p[CHOICE_SOURCE_FIELD].alcohol).toBe('host');
  });

  test('existing answers survive a new one', () => {
    const ev = { foodChoices: { seating: 'Open' }, [CHOICE_SOURCE_FIELD]: { seating: 'host' } };
    const p = settleChoicePatch(ev, 'alcohol', 'BYOB', 'accepted');
    expect(p.foodChoices).toEqual({ seating: 'Open', alcohol: 'BYOB' });
    expect(p[CHOICE_SOURCE_FIELD]).toEqual({ seating: 'host', alcohol: 'accepted' });
  });

  test('an unrecognised source falls back to host rather than being stored raw', () => {
    // A typo must not create a third, unhandled provenance value.
    const p = settleChoicePatch({}, 'alcohol', 'BYOB', 'magic');
    expect(CHOICE_SOURCES).toContain(p[CHOICE_SOURCE_FIELD].alcohol);
  });
});

describe('who answered', () => {
  test('a host pick is theirs, and may be attributed', () => {
    const ev = { ...settleChoicePatch({}, 'alcohol', 'BYOB', 'host') };
    const st = choiceStateFor(ev, DEC);
    expect(st.settled).toBe(true);
    expect(st.isHostChoice).toBe(true);
    expect(st.isAppPick).toBe(false);
    expect(st.attributable).toBe(true);
    expect(choiceAttribution(st)).toBe('Your call');
  });

  test('an accepted proposal is OURS, and is never called their call', () => {
    const ev = { ...settleChoicePatch({}, 'alcohol', 'Wine + one cocktail', 'accepted') };
    const st = choiceStateFor(ev, DEC);
    expect(st.isAppPick).toBe(true);
    expect(st.isHostChoice).toBe(false);
    expect(st.attributable).toBe(false);
    expect(choiceAttribution(st)).toBe('Our pick, accepted by you');
    expect(choiceAttribution(st)).not.toMatch(/Your call/);
  });

  test('a value with no recorded source claims nothing', () => {
    // Written before provenance existed, or by the frozen CRA shell. Unknown is
    // its own answer; guessing authorship is the defect this file exists for.
    const st = choiceStateFor({ foodChoices: { alcohol: 'BYOB' } }, DEC);
    expect(st.settled).toBe(true);
    expect(st.source).toBe(null);
    expect(st.attributable).toBe(false);
    expect(choiceAttribution(st)).toBe(null);
  });

  test('a source with no value does not fake a settlement', () => {
    const st = choiceStateFor({ [CHOICE_SOURCE_FIELD]: { alcohol: 'host' } }, DEC);
    expect(st.settled).toBe(false);
    expect(st.attributable).toBe(false);
  });
});

describe('the silent state has a name', () => {
  // The harder half of the finding: choicePickFor falls back to the authored
  // default, so the plan runs on a value nobody chose — pricing the budget and
  // filling the shopping list — before anyone taps. 119 of 131 needs-host rows
  // do this while telling the host "This one's your call to make."
  test('an unanswered decision with a default is running on it', () => {
    const st = choiceStateFor({}, DEC);
    expect(st.settled).toBe(false);
    expect(st.runningOnDefault).toBe(true);
    expect(st.defaultValue).toBe('Wine + one cocktail');
    expect(st.attributable).toBe(false);
  });

  test('an unanswered decision with NO default is simply open', () => {
    const st = choiceStateFor({}, { id: 'menu', default: null, options: [] });
    expect(st.runningOnDefault).toBe(false);
    expect(st.defaultValue).toBe(null);
  });

  test('once answered it is no longer running on the default', () => {
    const ev = { ...settleChoicePatch({}, 'alcohol', 'BYOB', 'host') };
    expect(choiceStateFor(ev, DEC).runningOnDefault).toBe(false);
  });
});

// ─── THE RATCHET: NO WRITE MAY BYPASS THE BUILDER ────────────────────────────
// Adding settleChoicePatch was necessary and NOT sufficient. A sweep found FOUR
// live hostv2 writers still building the patch by hand — the food-sourcing
// control, two lodging pickers, and the food-plan chip row — so a "single write
// builder" was being routed around by four callers on the host's main surface.
// Every one of them wrote a value with no provenance, which is the exact defect
// the builder exists to prevent.
//
// This is the same lesson as the venue verdict (8 copies) and "is the hour ours"
// (4 copies), for the third time today: naming one place as the source does not
// make it the source. Only a check does.
describe('no surface writes a choice without going through the builder', () => {
  const fs = require('fs');
  const path = require('path');
  const HOSTV2 = path.join(__dirname, '..', '..', '..', 'hostv2', 'src');

  const walk = (d, out = []) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.(jsx?|mjs)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
    }
    return out;
  };

  // A hand-built foodChoices patch: the spread-and-assign shape all four used.
  const HANDBUILT = /foodChoices:\s*\{\s*\.\.\./;

  test('hostv2 has no hand-built foodChoices patch', () => {
    const hits = [];
    for (const f of walk(HOSTV2)) {
      const src = fs.readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
        .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
      src.split('\n').forEach((l, i) => {
        if (HANDBUILT.test(l)) hits.push(`${path.relative(HOSTV2, f)}:${i + 1}  ${l.trim().slice(0, 80)}`);
      });
    }
    // Fix by calling settleChoicePatch(event, id, value, source) instead.
    expect(hits).toEqual([]);
  });

  test('canary: the scanner bites the shape it is meant to catch', () => {
    expect(HANDBUILT.test("patchEvent({ foodChoices: { ...(event.foodChoices || {}), sourcing: v } }")).toBe(true);
    expect(HANDBUILT.test("patchEvent(settleChoicePatch(event, 'sourcing', v, 'host')")).toBe(false);
  });

  // App.js is the FROZEN CRA shell (A1 freeze) and carries its own writers. It is
  // deliberately out of scope rather than overlooked: its answers read as
  // source-unknown and claim nothing, which is honest degradation. Stated here so
  // the exclusion is a decision on the record, not a gap nobody noticed.
  test('(scope) the frozen CRA shell is knowingly excluded', () => {
    const app = path.join(__dirname, '..', '..', 'App.js');
    expect(fs.existsSync(app)).toBe(true);
  });
});

describe('the shell writes through the one builder', () => {
  const fs = require('fs');
  const path = require('path');
  const src = () => fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'hostv2', 'src', 'HostShellV2.jsx'), 'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  test('settleDecision no longer builds the foodChoices patch by hand', () => {
    const s = src();
    // The decision argument is OPTIONAL and was added 2026-09-18: a multi
    // decision (a dietary restriction list) must ACCUMULATE answers rather than
    // replace them, and the builder cannot know which kind it is holding
    // without being handed the decision. Widened rather than rewritten so the
    // gate still pins the shell to the one builder — the thing it exists for.
    expect(s).toMatch(/settleChoicePatch\(event, r\.id, opt, source(, r)?\)/);
    // The shape that shipped the bug: a bare spread with no provenance beside it.
    expect(s).not.toMatch(/patchEvent\(\{ foodChoices: \{ \.\.\.\(event\.foodChoices \|\| \{\}\), \[r\.id\]: opt \} \}/);
  });

  test('the accept button is the one path that records an app pick', () => {
    const s = src();
    expect(s).toMatch(/settleDecision\(r, approach\.proposed, 'accepted'\)/);
    // Every other settle is a host tapping an option and takes the default.
    // Scoped to settleDecision calls: a bare /'accepted'\)/ also matches the
    // send ledger's `status === 'accepted'`, which is a different subject
    // entirely — the first version of this assertion caught three and failed.
    const settles = s.match(/settleDecision\([^)]*\)/g) || [];
    expect(settles.length).toBeGreaterThan(3);
    expect(settles.filter((c) => c.includes("'accepted'")).length).toBe(1);
  });

  test('the settled card asks the accessor instead of asserting', () => {
    const s = src();
    expect(s).toMatch(/choiceAttribution\(choiceStateFor\(event, r, r\.id\)\)/);
    // The unconditional claim that shipped the bug.
    expect(s).not.toMatch(/Your call: “\{why\}”/);
  });
});
