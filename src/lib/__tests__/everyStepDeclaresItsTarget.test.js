// ─── EVERY STEP DECLARES ITS TARGET (six root causes, cause 1) ───────────────
//
// The mechanism removed: a step's button, route and in-place editor were chosen
// by words in its title ("dietary" → the allergy counter on the invite step,
// P0-2; "Order the turkey" → the who's-cooking editor, P1-2). Now each step
// declares `target`, and lib/stepTarget is the only reader.
//
// This walks EVERY playbook (all 47), and for each one the checklist under the
// default picks, every single pick of every call, a roster event (replies
// tracked) and a destination trip (fly and drive), and asserts for every row:
//   1. the step declares a known target (none is a declared "no button");
//   2. the checklist's button is exactly that target's label and route;
//   3. the hero's in-place editor is exactly that target's editor;
//   4. neither depends on the row's words — the same row with its words
//      replaced by every trigger the old regexes used gives the same answer.
// And the resolvers' source holds no regex over a title.
const fs = require('fs');
const path = require('path');
const pbm = require('../playbooks');
const { checklistRouteFor } = require('../taskRoute');
const { stepTargetKey, targetFor, isKnownTarget, everyDeclaredStep } = require('../stepTarget');
const { editorKindFor } = require('../heroEditor');

const asOf = new Date('2026-11-23T12:00:00');
const DATE = '2027-06-10';
// Every word the retired rules keyed on, in one sentence.
const DECOY = 'Invite everyone: dietary allergy ask, venue location, rain backup, final guest count, catering count, budget, order the turkey, chase non-responders, parking, menu';

function eventsFor(pb) {
  const base = { id: 'ev-steps', type: pb.type, name: 'Steps', date: DATE, startTime: '18:00', guests: [], vendors: [], budget: [], timeline: [], guestMode: 'count', guestCount: 20 };
  const out = [
    base,
    { ...base, guestMode: 'roster', guestCount: 0, guests: [{ id: 'g1', name: 'Ada Lee', rsvp: 'Pending' }, { id: 'g2', name: 'Bo Kim', rsvp: 'Yes', kids: 1 }] },
    { ...base, isDestination: true, travelMode: 'fly', kidsCount: 2 },
    { ...base, isDestination: true, travelMode: 'drive' },
  ];
  for (const d of (pb.decisions || [])) {
    for (const opt of (d.options || [])) {
      const label = typeof opt === 'string' ? opt : (opt && (opt.label || opt.value));
      if (label) out.push({ ...base, foodChoices: { [d.id]: label } });
    }
  }
  return out;
}

describe('every step declares where its work is done', () => {
  test('every declared step in every playbook names a known target', () => {
    const bad = [];
    let n = 0;
    for (const pb of pbm.ALL_PLAYBOOKS) {
      const calls = new Set([...(pb.decisions || []).map((d) => d.id)]);
      for (const s of everyDeclaredStep(pb)) {
        n += 1;
        if (!isKnownTarget(s.target)) bad.push(`${pb.type}:${s.id} → ${s.target}`);
        else if (s.target.startsWith('call:') && !calls.has(s.target.slice(5))) bad.push(`${pb.type}:${s.id} → ${s.target} (no such call)`);
      }
    }
    expect(bad).toEqual([]);
    expect(pbm.ALL_PLAYBOOKS.length).toBe(47);
    expect(n).toBeGreaterThan(1500);
  });

  test('the checklist button and the hero editor are the declared target, whatever the words', () => {
    const wrong = [];
    let rows = 0;
    const playbooks = new Set();
    for (const pb of pbm.ALL_PLAYBOOKS) {
      for (const ev of eventsFor(pb)) {
        let list = [];
        try { list = pbm.playbookChecklist(ev, asOf) || []; } catch (_e) { list = []; }
        for (const r of list) {
          rows += 1; playbooks.add(pb.type);
          const key = stepTargetKey(ev, { id: r.id });
          if (!isKnownTarget(key)) { wrong.push(`${pb.type}:${r.id} has no declared target`); continue; }
          const want = targetFor(key, ev);
          const meta = { taskId: r.id, week: r.week, category: r.category };
          for (const words of [r.task, DECOY]) {
            const hit = checklistRouteFor(words, meta, ev);
            const got = hit ? { label: hit.label, route: hit.route || null, href: hit.href || null } : null;
            const exp = want ? { label: want.label, route: want.route || null, href: want.href || null } : null;
            if (JSON.stringify(got) !== JSON.stringify(exp)) wrong.push(`${pb.type}:${r.id} [${words === DECOY ? 'decoy' : 'own words'}] button ${JSON.stringify(got)} ≠ ${JSON.stringify(exp)}`);
            // The hero card for this step, as the plan hands it over.
            const action = { id: 'decision:' + r.id, taskId: r.id, title: words, domain: 'decision', route: (want && want.route) || null };
            const ed = editorKindFor(action, ev);
            if (ed !== ((want && want.editor) || null)) wrong.push(`${pb.type}:${r.id} [${words === DECOY ? 'decoy' : 'own words'}] editor ${ed} ≠ ${(want && want.editor) || null}`);
          }
        }
      }
    }
    expect(wrong.slice(0, 40)).toEqual([]);
    expect(playbooks.size).toBe(47);
    expect(rows).toBeGreaterThan(5000);
  });

  test('Thanksgiving: the invite opens the invite, the turkey opens the list, and only the dietary step gets the allergy counter', () => {
    const ev = { id: 'ev-tg', type: 'Thanksgiving Hosting', date: DATE, guests: [], vendors: [], guestMode: 'count', guestCount: 14 };
    const row = (sid) => ({ id: `pbt-ev-tg-${sid}` });
    expect(stepTargetKey(ev, row('t_invite'))).toBe('invite');
    expect(editorKindFor({ taskId: row('t_invite').id, title: 'Invite everyone with the date, the serve time, and the dietary and overnight ask' }, ev)).toBe(null);
    expect(checklistRouteFor('anything', { taskId: row('t_invite').id }, ev).label).toBe('Open the invite');
    expect(editorKindFor({ taskId: row('t_order_bird').id, title: 'Order the turkey', route: { tab: 'Planning', focusField: 'food-plan' } }, ev)).toBe(null);
    expect(checklistRouteFor('x', { taskId: row('t_order_bird').id }, ev).label).toBe('Open the list');
    expect(editorKindFor({ taskId: row('t_dietary').id, title: 'Collect dietary needs' }, ev)).toBe('diet');
  });

  test('a row carried over from another event id (a duplicated plan) still finds its step by id', () => {
    const ev = { id: 'copy-2', type: 'Group Trip' };
    expect(stepTargetKey(ev, { id: 'pbt-e2e-dates-t_dates' })).toBe(stepTargetKey({ id: 'e2e-dates', type: 'Group Trip' }, { id: 'pbt-e2e-dates-t_dates' }));
    expect(stepTargetKey(ev, { id: 'pbt-e2e-dates-t_dates' })).toBeTruthy();
  });

  test('a row with no declared target (one she wrote herself) is an honest check-off with no button', () => {
    const ev = { id: 'ev-own', type: 'Birthday', date: DATE };
    expect(checklistRouteFor('Send the invites and chase RSVPs', { taskId: 'ev-own-t1' }, ev)).toBeNull();
    expect(editorKindFor({ id: 'x', taskId: 'ev-own-t1', title: 'Collect dietary needs and allergies', domain: 'decision' }, ev)).toBe(null);
  });

  test('the resolvers read no title: no regex runs over a title, label or step text', () => {
    const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const body = (code, name) => {
      const at = code.indexOf(`export function ${name}`);
      expect(at).toBeGreaterThan(-1);
      let i = code.indexOf('{', code.indexOf(')', at)), depth = 0;
      for (let j = i; j < code.length; j++) { if (code[j] === '{') depth++; else if (code[j] === '}') { depth--; if (!depth) return code.slice(i, j + 1); } }
      return '';
    };
    const route = body(src('taskRoute.js'), 'checklistRouteFor');
    const editor = body(src('heroEditor.js'), 'editorKindFor');
    const key = body(src('stepTarget.js'), 'stepTargetKey');
    const target = body(src('stepTarget.js'), 'targetFor');
    // The button's resolver never touches the words it is handed.
    expect(route).not.toMatch(/\btask\b/);
    expect(route).not.toMatch(/\.(?:test|match|search)\(/);
    // The editor reads the action's declared fields, never its title or CTA words.
    expect(editor).not.toMatch(/\ba\.(?:title|label|cta|ask)\b/);
    expect(key).not.toMatch(/row\.(?:task|title|label)\b/);
    expect(target).not.toMatch(/\.(?:test|match|search)\(/);
    // The shell's hero editor is the lib's, not a second copy of the rules.
    const shell = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
    const wk = shell.slice(shell.indexOf('const wiredKind = '), shell.indexOf('const wiredKind = ') + 400);
    expect(wk).toMatch(/editorKindFor\(/);
    expect(wk).not.toMatch(/a\.title/);
  });
});

describe('"Mark done" marks the step; it never records a send', () => {
  const { factsATickRecords } = require('../taskEngine');
  const { stepIsASend } = require('../stepTarget');
  test('across every playbook, ticking a send step writes no send fact and is known to be a send', () => {
    const bad = [];
    for (const pb of pbm.ALL_PLAYBOOKS) {
      const ev = { id: 'ev-send', type: pb.type, date: DATE, guests: [], vendors: [], guestMode: 'count', guestCount: 20 };
      for (const r of (pbm.playbookChecklist(ev, asOf) || [])) {
        const f = factsATickRecords(ev, { ...r, done: false });
        if (f.invitesSentAt) bad.push(`${pb.type}:${r.id} records invitesSentAt`);
        if (['invite', 'nudge', 'updates'].includes(stepTargetKey(ev, r)) && !stepIsASend(ev, r)) bad.push(`${pb.type}:${r.id} not known as a send`);
      }
    }
    expect(bad).toEqual([]);
  });
});

// ─── RISKS DECLARE THEIRS (cause 1, remainder) ───────────────────────────────
describe('a risk row and its checklist step route by the risk’s declared target', () => {
  const { riskTargetFor, RISK_TYPE_TARGETS, stepTargetKey: key, isKnownTarget: known } = require('../stepTarget');
  const { cookRisksFor } = require('../playbooks/cookLever');
  test('every playbook risk and every derived risk type declares a known target; the prose never decides', () => {
    const bad = [];
    let n = 0;
    for (const pb of pbm.ALL_PLAYBOOKS) {
      const ev = { id: 'ev-r', type: pb.type };
      for (const r of [...(pb.risks || []), ...cookRisksFor(pb)]) {
        n += 1;
        if (!known(r.target)) { bad.push(`${pb.type}:${r.id} → ${r.target}`); continue; }
        const own = riskTargetFor(ev, { id: r.id, trigger: r.trigger, mitigation: r.mitigation });
        const decoy = riskTargetFor(ev, { id: r.id, trigger: DECOY, mitigation: 'rain weather crab vendor seat budget food' });
        if (JSON.stringify(own) !== JSON.stringify(decoy)) bad.push(`${pb.type}:${r.id} changes with its words`);
        if (key(ev, { id: 'risk-' + r.id }) !== r.target) bad.push(`${pb.type}:${r.id} mitigation step lost its target`);
      }
    }
    for (const [t, k] of Object.entries(RISK_TYPE_TARGETS)) if (!known(k)) bad.push(`derived ${t} → ${k}`);
    expect(bad).toEqual([]);
    expect(n).toBeGreaterThan(300);
  });
  test('the shell’s risk router is the lib’s, and reads no prose', () => {
    const shell = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
    const at = shell.indexOf('const riskRouteFor = ');
    const body = shell.slice(at, shell.indexOf('\n', at));
    expect(/riskTargetFor\(/.test(body)).toBe(true);
    expect(/trigger|mitigation|description|\.test\(/.test(body)).toBe(false);
  });
});

describe('the coming-up rows route by kind and declared target, not by their label', () => {
  test('routeUpNext reads no label', () => {
    const shell = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
    const at = shell.indexOf('const routeUpNext = (u) => {');
    const body = shell.slice(at, shell.indexOf('\n  };', at));
    expect(/u\.label|\.test\(/.test(body)).toBe(false);
    expect(/stepTargetFor\(event/.test(body)).toBe(true);
  });
});

describe('milestone routing is the step’s declaration outside the frozen CRA', () => {
  test('no caller but src/App.js routes a row through milestoneActionRoute', () => {
    const root = path.join(__dirname, '../../..');
    const files = [path.join(root, 'src/CommandCenter.jsx'), path.join(root, 'hostv2/src/HostShellV2.jsx'),
      ...fs.readdirSync(path.join(root, 'src/lib')).filter((f) => f.endsWith('.js')).map((f) => path.join(root, 'src/lib', f))];
    const callers = files.filter((f) => /milestoneActionRoute\(/.test(fs.readFileSync(f, 'utf8').replace(/export function milestoneActionRoute/, '')));
    expect(callers.map((f) => path.relative(root, f))).toEqual([]);
  });
});
