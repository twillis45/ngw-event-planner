/**
 * A RISK ROW ALWAYS OFFERS AN ACT. DISMISSAL NEVER RENDERS ALONE.
 *
 * The board (2026-08-08, four seats, 3/3/4/5, unanimous no-ship) found that on
 * three of five birthday risks the only button was "Handled - stop showing
 * this". The mechanism: `riskRouteFor` is a keyword regex over the risk's own
 * prose and returns null on a miss, and the render gated the constructive button
 * on that null - so a missing word deleted the forward move and kept the
 * backward one. Norman's line: when the only available action is suppression,
 * the interface has classified the risk as noise.
 *
 * Measured over all 246 authored risks: 130 routed, 116 did not.
 *
 * The fix is a CONTRACT, not a wording: every row renders exactly one
 * constructive act plus the dismiss. Where the route resolves that act is "Plan
 * for this"; where it does not, the authored mitigation becomes a real
 * checklist step on `event.timeline`. These tests assert the contract at the
 * source, because it spans a conditional in JSX that no unit test of either
 * helper alone would catch.
 */
const fs = require('fs');
const path = require('path');
const { checklistRouteFor } = require('../taskRoute');

const SHELL = fs.readFileSync(
  path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
const CODE = SHELL.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const DATA = path.join(__dirname, '../playbooks/data');

describe('the risk row contract', () => {
  test('both risk lists offer the checklist act when no route resolves', () => {
    // Two lists render risks: derived (ctx.activeRisks) and authored (playbook).
    // Both must carry the fallback act, or one of them keeps the dead end.
    // The definition is `const addRiskToChecklist = (r, key) =>`, so it does not
    // match a call-shaped pattern — assert it separately rather than folding it
    // into the count and getting the arithmetic wrong.
    expect(CODE).toMatch(/const addRiskToChecklist = \(/);
    expect([...CODE.matchAll(/addRiskToChecklist\(/g)].length).toBe(2);
  });

  test('the constructive act is a ternary, never a bare && on the route', () => {
    // `{route && <Plan for this>}` is the exact shape of the defect: a null
    // route silently removes the button. A ternary cannot do that.
    expect(CODE).not.toMatch(/\{route &&\s*<button/);
    expect([...CODE.matchAll(/\{route\s*\n?\s*\?\s*<button/g)].length).toBe(2);
  });

  test('dismissal never renders without a sibling act', () => {
    // Every "Handled" button must sit in an actions-row that also contains a
    // constructive branch. Checked by slicing each dismiss back to its row open.
    const dismissals = [...CODE.matchAll(/Handled — stop showing this/g)];
    expect(dismissals.length).toBe(2);
    for (const d of dismissals) {
      const before = CODE.slice(0, d.index);
      const rowStart = before.lastIndexOf('actions-row');
      expect(rowStart).toBeGreaterThan(-1);
      const row = CODE.slice(rowStart, d.index);
      expect(row).toMatch(/Plan for this[\s\S]*Add to my checklist|Add to my checklist/);
    }
  });

  test('the checklist row is written in the shape the timeline engines read', () => {
    // event.timeline is consumed by workflowCompression, dayAlerts, dayBefore,
    // disclosure, helperResponsibility, decisionMemory, duplicateEvent and
    // vendorQuestions. A row missing `task` or `done` reaches none of them.
    const fn = CODE.slice(CODE.indexOf('const addRiskToChecklist'));
    const body = fn.slice(0, fn.indexOf('\n  };'));
    expect(body).toMatch(/timeline:\s*\[\.\.\.existing,/);
    // `id` and `task` are ES shorthand, so a `field:` regex misses them — match
    // a key in any of its legal forms rather than assuming one spelling.
    for (const field of ['id', 'task', 'owner', 'done', 'week', 'leadDays', 'category']) {
      expect(body).toMatch(new RegExp(`\\b${field}\\s*[:,}]`));
    }
  });

  test('no invented date — an unscheduled step says so rather than guessing', () => {
    // Risks carry no lead time (the board's open finding #1). Deriving one from
    // the trigger's prose would be the parse-the-English mistake this replaces.
    const fn = CODE.slice(CODE.indexOf('const addRiskToChecklist'));
    const body = fn.slice(0, fn.indexOf('\n  };'));
    expect(body).toMatch(/week:\s*''/);
    expect(body).toMatch(/leadDays:\s*null/);
  });

  test('adding twice does not duplicate — it lands on the existing row', () => {
    const fn = CODE.slice(CODE.indexOf('const addRiskToChecklist'));
    const body = fn.slice(0, fn.indexOf('\n  };'));
    expect(body).toMatch(/existing\.some\(/);
    expect(body).toMatch(/setSheet\(\{ kind: 'tasks', focus: id \}\)/);
  });
});

describe('the checklist router earns the handoff', () => {
  // The premise of routing through the checklist rather than adding a third
  // regex: its router already reads these strings better. If that stops being
  // true, the fallback is worth less and this should be revisited.
  function allRisks() {
    const out = [];
    for (const f of fs.readdirSync(DATA).filter((n) => n.endsWith('.js'))) {
      const src = fs.readFileSync(path.join(DATA, f), 'utf8');
      for (const m of src.matchAll(
        /\{\s*id:\s*'(r_[^']+)',\s*trigger:\s*'((?:[^'\\]|\\.)*)',\s*severity:\s*'([^']*)',\s*mitigation:\s*'((?:[^'\\]|\\.)*)'/g)) {
        out.push({ file: f, id: m[1], mitigation: m[4] });
      }
    }
    return out;
  }

  test('it resolves a large majority of authored mitigations', () => {
    const risks = allRisks();
    expect(risks.length).toBeGreaterThan(200);   // never assert over an empty set
    const routed = risks.filter((r) => {
      try { return !!checklistRouteFor(r.mitigation, {}, null); } catch { return false; }
    });
    // Measured 209/246 on 2026-08-08. Held with headroom so ordinary authoring
    // does not trip it, but a real regression in the router does.
    expect(routed.length / risks.length).toBeGreaterThan(0.75);
  });

  test('the safe-rides mitigation routes — the one the board led with', () => {
    const hit = checklistRouteFor(
      'Pre-stage a safe-rides plan: rideshare credit/codes, a designated-driver ask in the invite, '
      + 'a couch/guest-room offer, and quietly hold/hand keys.', {}, null);
    expect(hit).toBeTruthy();
    expect(hit.route).toBeTruthy();
  });
});
