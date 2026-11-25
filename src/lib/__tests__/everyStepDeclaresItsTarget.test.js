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

// ─── THE HERO'S OWN RUNGS READ THE DECLARED KIND (cause 1, part 2) ──────────
// rungOwnsHero, the ask ladder beside it, the conflict card, the COI card and
// the "Then" bundle rows tested the queue item's TITLE for /conflict/,
// /collect.*coi|vendor coi/ and /decision/. The producers declare `askKind`
// (heroAskReadsTheDeclaration proves they do, over every playbook); the shell
// reads it.
describe('the shell decides its hero rungs by declared kind, never by a title', () => {
  test('no conflict, COI or decisions rung tests a title', () => {
    const shell = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
    const hits = shell.split('\n')
      .filter((l) => !/^\s*\/\//.test(l))
      .filter((l) => /\/(?:conflict|decision|collect\.\*coi[^/]*)\/i?\.test\(String\((?:q0|a)\.title/.test(l));
    expect(hits).toEqual([]);
    const at = shell.indexOf('const rungOwnsHero = ');
    const rung = shell.slice(at, shell.indexOf(';', at));
    expect(rung).toMatch(/heroRungKind\(q0\) === 'conflict'/);
    expect(rung).toMatch(/heroRungKind\(q0\) === 'coi'/);
    expect(rung).not.toMatch(/\.title/);
    const at2 = shell.indexOf('const heroRungKind = ');
    const kind = shell.slice(at2, shell.indexOf(';', at2));
    expect(kind).toMatch(/a\.kind === 'bundle' && a\.askKind === 'conflict'/);
    expect(kind).toMatch(/a\.askKind === 'coi' \|\| a\.sourceCategory === 'coi'/);
    expect(kind).not.toMatch(/\.title/);
  });
});

// ─── EVERY STEP DECLARES THE FACTS THAT PROVE IT DONE (cause 1, part 2) ─────
// taskSatisfied and timelineStepResolved decided "handled" from ~40 keyword
// rules over the step's text, so a spelling ("groceries" is not "grocery") or
// any word in any row could change the answer. Each step now declares `facts`
// (lib/taskEngine STEP_FACTS; lib/stepTarget stepFactsFor is the only reader of
// a declaration), derived once from the retired rules and committed. Measured
// when it landed: 12,964 checks (every row of every playbook in six states, the
// area steps, every sample row) gave the same answer before and after.
describe('every step declares the facts that prove it done', () => {
  const { taskSatisfied, timelineStepResolved, isKnownStepFact } = require('../taskEngine');
  const { stepFactsFor } = require('../stepTarget');
  const known = (list) => Array.isArray(list) && list.every(isKnownStepFact);

  test('every declared step in every playbook declares known facts, variants included', () => {
    const bad = [];
    let n = 0;
    for (const pb of pbm.ALL_PLAYBOOKS) {
      for (const s of everyDeclaredStep(pb)) {
        n += 1;
        const st = s.derived ? { facts: stepFactsFor({ id: 'ev', type: pb.type }, { id: s.id }) } : s;
        if (!known(st.facts)) { bad.push(`${pb.type}:${s.id} → ${JSON.stringify(st.facts)}`); continue; }
        if (st.factsWithoutCaterer && !known(st.factsWithoutCaterer)) bad.push(`${pb.type}:${s.id} without caterer`);
        if (st.factsWithoutCaterer && !st.labelWithoutCaterer) bad.push(`${pb.type}:${s.id} factsWithoutCaterer with no labelWithoutCaterer`);
        for (const [d, byVal] of Object.entries(st.factsByAnswer || {})) {
          for (const [v, list] of Object.entries(byVal || {})) {
            if (!known(list)) bad.push(`${pb.type}:${s.id} ${d}=${v}`);
            if (!(st.copyByAnswer && st.copyByAnswer[d] && st.copyByAnswer[d][v] != null)) bad.push(`${pb.type}:${s.id} ${d}=${v} has no copy variant`);
          }
        }
      }
      for (const m of (pb.milestones || [])) if (m.facts != null && !known(m.facts)) bad.push(`${pb.type}:milestone ${m.id}`);
    }
    expect(bad).toEqual([]);
    expect(n).toBeGreaterThan(1500);
  });

  test('handled, and resolved, are the same whatever the row says', () => {
    const wrong = [];
    let rows = 0;
    const BOOKED = ['Catering', 'Photography', 'DJ', 'Florist', 'Bakery', 'Officiant', 'Planner', 'Photo Booth']
      .map((c, i) => ({ id: 'b' + i, name: c + ' Co', category: c, status: 'Booked', cost: 500, depositAmt: 100, depositPaid: true, balancePaid: true }));
    for (const pb of pbm.ALL_PLAYBOOKS) {
      for (const ev0 of eventsFor(pb)) {
        for (const ev of [ev0, { ...ev0, vendors: BOOKED, totalBudget: 2000, venue: 'The Hall', venueCity: 'Austin, TX', invitesSentAt: '2026-11-01', dietaryNoted: true,
          guestMode: 'roster', guests: [{ id: 'g1', name: 'Ada Lee', rsvp: 'Yes', giftReceived: true, giftCash: 20 }] }]) {
          let list = [];
          try { list = pbm.playbookChecklist(ev, asOf) || []; } catch (_e) { list = []; }
          const e = { ...ev, timeline: list };
          for (const r of list) {
            rows += 1;
            const own = [taskSatisfied(e, r), timelineStepResolved(e, r)];
            const decoy = [taskSatisfied(e, { ...r, task: DECOY }), timelineStepResolved(e, { ...r, task: DECOY })];
            if (own.join() !== decoy.join()) wrong.push(`${pb.type}:${r.id} ${own} with its words, ${decoy} with the decoy`);
          }
        }
      }
    }
    expect(wrong.slice(0, 40)).toEqual([]);
    expect(rows).toBeGreaterThan(10000);
  });

  test('a row she wrote herself declares nothing, so only her tick proves it', () => {
    const ev = { id: 'ev-own', type: 'Birthday', date: DATE, guestCount: 30, totalBudget: 900 };
    expect(taskSatisfied(ev, { id: 'ev-own-t1', task: 'Set the budget' })).toBe(false);
    expect(taskSatisfied(ev, { id: 'ev-own-t1', task: 'Set the budget', done: false, facts: ['budget-set'] })).toBe(true);
  });

  test('the readers hold no rule over a step’s words', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'taskEngine.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    const fn = (name) => {
      const at = code.indexOf(`export function ${name}`);
      expect(at).toBeGreaterThan(-1);
      let i = code.indexOf('{', code.indexOf(')', at)), depth = 0;
      for (let j = i; j < code.length; j++) { if (code[j] === '{') depth++; else if (code[j] === '}') { depth--; if (!depth) return code.slice(i, j + 1); } }
      return '';
    };
    const facts = code.slice(code.indexOf('export const STEP_FACTS'), code.indexOf('export function taskSatisfied'));
    // A step's words are `task`, `text` or `label` on the row; none is read, and
    // no pattern is matched against them.
    for (const body of [fn('taskSatisfied'), fn('timelineStepResolved'), facts]) {
      expect(body).not.toMatch(/\.(?:task|text|label)\b/);
      expect(body).not.toMatch(/\.test\(\s*(?:s|label|text|words)\s*\)/);
    }
    const target = fs.readFileSync(path.join(__dirname, '..', 'stepTarget.js'), 'utf8');
    const reader = target.slice(target.indexOf('export function stepFactsFor'), target.indexOf('/** stepTargetFor'));
    expect(reader).not.toMatch(/row\.(?:task|text|title|label)\b/);
  });
});

// ─── THE CALLS AND ROLES A STEP STANDS FOR ARE ITS DECLARATION (cause 1, remainder a)
// stepCalls / stepBooks found the step a row stands for by its id, or, for a
// caller holding only words, by the authored label (or the label with only the
// roles left). A row the host wrote in the same words as a playbook step was
// read as that step's calls and roles. The step declares them (`answeredBy`,
// `books`) and a row finds its step by id, never its words.
describe('the calls and roles a step stands for are found by id, never by words', () => {
  const { stepCalls, stepBooks } = pbm;
  const declared = (pb, rowId, evId) => (pb.tasks || []).find((t) => t && rowId === `pbt-${evId}-${t.id}`) || null;
  const BOOKED = (cats) => cats.map((c, i) => ({ id: 'k' + i, name: c + ' Co', category: c, status: 'Booked' }));
  const states = (pb) => eventsFor(pb).flatMap((ev) => [ev, { ...ev, vendors: BOOKED(['Photography', 'Catering']) },
    { ...ev, vendors: BOOKED(['Wedding Planner', 'Photography', 'Catering', 'DJ']) }]);

  test('every row of every playbook: the declaration by id, whatever the row says', () => {
    const wrong = [];
    let rows = 0;
    for (const pb of pbm.ALL_PLAYBOOKS) {
      for (const ev of states(pb)) {
        for (const r of (pbm.playbookChecklist(ev, asOf) || [])) {
          rows += 1;
          const st = declared(pb, r.id, ev.id);
          const calls = (st && Array.isArray(st.answeredBy)) ? st.answeredBy : [];
          // Without its caterer, the roles it lists without the caterer (owner ruling 1).
          const decl = st && st.booksWithoutCaterer && pbm.stepWithoutCaterer(ev, st) ? st.booksWithoutCaterer : (st && st.books);
          const books = (Array.isArray(decl) && decl.length) ? decl : [];
          for (const task of [r.task, DECOY]) {
            if (JSON.stringify(stepCalls(ev, { id: r.id, task })) !== JSON.stringify(calls)) wrong.push(`${pb.type}:${r.id} calls`);
            if (JSON.stringify(stepBooks(ev, { id: r.id, task })) !== JSON.stringify(books)) wrong.push(`${pb.type}:${r.id} books`);
          }
        }
      }
    }
    expect(wrong.slice(0, 40)).toEqual([]);
    expect(rows).toBeGreaterThan(10000);
  });

  test('a row holding only words (one she wrote, in a step’s own words) stands for no call and no role', () => {
    const wrong = [];
    for (const pb of pbm.ALL_PLAYBOOKS) {
      for (const ev of states(pb)) {
        for (const r of (pbm.playbookChecklist(ev, asOf) || [])) {
          if (stepCalls(ev, { task: r.task }).length) wrong.push(`${pb.type}: "${r.task.slice(0, 50)}" calls`);
          if (stepBooks(ev, { task: r.task }).length || stepBooks(ev, { text: r.task }).length) wrong.push(`${pb.type}: "${r.task.slice(0, 50)}" books`);
          if (stepCalls(ev, { id: 'ev-own-t1', task: r.task }).length) wrong.push(`${pb.type}: own row "${r.task.slice(0, 50)}" calls`);
        }
      }
    }
    expect([...new Set(wrong)].slice(0, 40)).toEqual([]);
  });

  test('the readers hold no rule over a row’s words', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'playbooks', 'index.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    for (const name of ['stepCalls', 'stepBooks']) {
      const at = code.indexOf(`export function ${name}(`);
      expect(at).toBeGreaterThan(-1);
      let i = code.indexOf('{', code.indexOf(')', at)), depth = 0, body = '';
      for (let j = i; j < code.length; j++) { if (code[j] === '{') depth++; else if (code[j] === '}') { depth--; if (!depth) { body = code.slice(i, j + 1); break; } } }
      expect(body).not.toMatch(/\.(?:task|text|label|title)\b/);
      expect(body).not.toMatch(/stepLeftAsk|booksLeftLabel/);
    }
  });
});

// ─── A STEP DECLARES WHEN ITS CATERER COMES OUT (cause 1, remainder b) ──────
// The checklist builder dropped a step, or read its labelWithoutCaterer, from
// WORDS in its label: /cater(er|ing)/ without "vs", "instead", "yourself"…
// when she cooks, and /\bcaterer/ without "book", "sign", "hire"… when the
// meal arrives made with no caterer hired. Each step now declares
// `catererOut` ('host-cooks', 'none-hired'), derived once from that rule and
// committed; stepWithoutCaterer reads it, and so do the builder and the
// step's facts.
describe('a step declares when its caterer comes out, never by its words', () => {
  const { cookTasksFor } = require('../playbooks/cookLever');
  const KNOWN = ['host-cooks', 'none-hired'];
  const V = (cat, status) => ({ id: 'v-' + cat, name: cat + ' Co', category: cat, status, cost: 900 });
  const stepsOf = (pb) => [...(pb.tasks || []), ...cookTasksFor(pb), ...pbm.DESTINATION_TASKS];
  const statesOf = (pb) => eventsFor(pb).flatMap((e) => [e, { ...e, vendors: [V('Catering', 'Booked')] }, { ...e, vendors: [V('Catering', 'Considering')] }]);
  const WORDS = ['Give the caterer the final count', 'Book the caterer or cook it yourself', 'Tidy up', 'Catering staged; caterer paid'];

  test('every declaration is known, and a step with a no-caterer label declares when it applies', () => {
    const bad = [];
    for (const pb of pbm.ALL_PLAYBOOKS) {
      for (const s of stepsOf(pb)) {
        if (s.catererOut == null) { if (s.labelWithoutCaterer) bad.push(`${pb.type}:${s.id} labelWithoutCaterer with no catererOut`); continue; }
        if (!Array.isArray(s.catererOut) || !s.catererOut.length || !s.catererOut.every((k) => KNOWN.includes(k))) bad.push(`${pb.type}:${s.id} → ${JSON.stringify(s.catererOut)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('every step, in every caterer state: the same answer whatever its label says', () => {
    const wrong = [];
    let n = 0;
    for (const pb of pbm.ALL_PLAYBOOKS) {
      for (const ev of statesOf(pb)) {
        for (const s of stepsOf(pb)) {
          n += 1;
          const own = pbm.stepWithoutCaterer(ev, s);
          for (const w of WORDS) if (pbm.stepWithoutCaterer(ev, { ...s, label: w }) !== own) { wrong.push(`${pb.type}:${s.id} "${w}"`); break; }
        }
      }
    }
    expect(wrong.slice(0, 40)).toEqual([]);
    expect(n).toBeGreaterThan(100000);
  });

  test('the checklist keeps, drops and rewords the same steps whatever their labels say', () => {
    const wrong = [];
    for (const pb of pbm.ALL_PLAYBOOKS) {
      const states = statesOf(pb);
      // The authored steps it keeps, and which of them read their no-caterer
      // label. (The derived rows' own dedupes are not this rule.)
      const own = new Set((pb.tasks || []).map((t) => t.id));
      const shape = () => states.map((ev) => (pbm.playbookChecklist(ev, asOf) || [])
        .filter((r) => own.has(r.provenance && r.provenance.taskId))
        .map((r) => r.id + ((pb.tasks || []).some((t) => t.labelWithoutCaterer && t.labelWithoutCaterer === r.task) ? ':without' : '')).join(','));
      const before = shape();
      const saved = (pb.tasks || []).map((t) => t.label);
      try {
        (pb.tasks || []).forEach((t) => { t.label = 'Tidy up'; });
        const neutral = shape();
        (pb.tasks || []).forEach((t) => { t.label = 'Give the caterer the final count'; });
        const caterer = shape();
        // Which steps stay: the same as with their own words. Which read the
        // no-caterer label: the same under either swap (with her own words, a
        // label naming only the roles left can coincide with it).
        const ids = (xs) => xs.map((x) => x.replace(/:without/g, '')).join('|');
        if (ids(neutral) !== ids(before) || caterer.join('|') !== neutral.join('|')) wrong.push(pb.type);
      } finally {
        (pb.tasks || []).forEach((t, i) => { t.label = saved[i]; });
      }
    }
    expect(wrong).toEqual([]);
  });

  test('the rule reads no words', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'playbooks', 'index.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    const at = code.indexOf('function catererTakenOut(');
    expect(at).toBeGreaterThan(-1);
    const rule = code.slice(at, code.indexOf('export function playbookChecklist', at));
    expect(rule).not.toMatch(/\.(?:label|task|text|title)\b/);
    expect(rule).not.toMatch(/\.test\(/);
    expect(code).not.toMatch(/BOOKS_A_CATERER/);
  });
});

// ─── A COMPOSITE STEP IS DECLARED (cause 1, remainder c) ────────────────────
// A "Set date, headcount, menu" step bundles foundation parts, so the hero
// never leads with it half done: it is decomposed to the first open
// foundation domino, or skipped once every part is handled. Which steps are
// composites was read from WORDS (/^set\b/ + a separator + a foundation word),
// in CommandCenter's compression tier and decomposeSetComposite. Each step now
// declares `composite` (with `compositeByAnswer` where its words vary by a
// pick), derived once from that rule and committed; lib/stepTarget
// stepIsSetComposite is the one reader.
describe('a composite step is declared, never read off its words', () => {
  const { useFrozenClock, daysFromNow } = require('../../testUtils/frozenClock');
  useFrozenClock();
  const st = require('../stepTarget');
  const COMPOSITE_WORDS = 'Set date, headcount, menu';
  const PLAIN_WORDS = 'Tidy up';

  test('every declaration is a boolean, and each answer variant has a copy variant', () => {
    const bad = [];
    for (const pb of pbm.ALL_PLAYBOOKS) {
      for (const s of everyDeclaredStep(pb)) {
        if (s.composite != null && typeof s.composite !== 'boolean') bad.push(`${pb.type}:${s.id} composite ${JSON.stringify(s.composite)}`);
        for (const [d, byVal] of Object.entries(s.compositeByAnswer || {})) {
          for (const [v, b] of Object.entries(byVal || {})) {
            if (typeof b !== 'boolean') bad.push(`${pb.type}:${s.id} ${d}=${v}`);
            if (!(s.copyByAnswer && s.copyByAnswer[d] && s.copyByAnswer[d][v] != null)) bad.push(`${pb.type}:${s.id} ${d}=${v} has no copy variant`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test('every row of every playbook: the same answer whatever it says; a row she wrote is never a composite', () => {
    expect(typeof st.stepIsSetComposite).toBe('function');
    const wrong = [];
    let rows = 0;
    for (const pb of pbm.ALL_PLAYBOOKS) {
      for (const ev of eventsFor(pb)) {
        for (const r of (pbm.playbookChecklist(ev, asOf) || [])) {
          rows += 1;
          const own = st.stepIsSetComposite(ev, r);
          if (st.stepIsSetComposite(ev, { ...r, task: COMPOSITE_WORDS }) !== own || st.stepIsSetComposite(ev, { ...r, task: PLAIN_WORDS }) !== own) wrong.push(`${pb.type}:${r.id}`);
        }
      }
      if (st.stepIsSetComposite({ id: 'ev-own', type: pb.type }, { id: 'ev-own-t1', task: COMPOSITE_WORDS })) wrong.push(`${pb.type}: her own row`);
    }
    expect(wrong.slice(0, 40)).toEqual([]);
    expect(rows).toBeGreaterThan(5000);
  });

  test('the hero leads with the same step, or the same domino, whatever the rows say', () => {
    const { selectEventNextAction } = require('../../CommandCenter');
    const pick = (a) => (a ? { category: a.category, stepRowId: a.stepRowId || null, leadIsStep: a.leadIsStep, primaryRoute: a.primaryRoute || null, askKind: a.askKind || null } : null);
    const wrong = [];
    let led = 0;
    for (const pb of pbm.ALL_PLAYBOOKS) {
      const picks = {};
      for (const d of pb.decisions || []) { const o = (d.options || [])[0]; const l = typeof o === 'string' ? o : (o && (o.label || o.value)); if (l) picks[d.id] = l; }
      for (const d of [21, 14, 10, 7, 5, 3, 2, 1]) {
        const ev = { id: 'ev-c', type: pb.type, name: 'N', date: daysFromNow(d), guestMode: 'count', guestCount: 30, totalBudget: 9000, venue: 'The Hall', venueCity: 'Austin, TX', startTime: '18:00', guests: [], vendors: [], budget: [], foodChoices: picks, dietaryNoted: true };
        const rows = (pbm.playbookChecklist(ev) || []).map((r) => ({ ...r, done: !(r.dueInDays >= 0) }));
        const own = pick(selectEventNextAction({ ...ev, timeline: rows }));
        // The tier that reads it: a step leading the tight-timeline hero.
        if (!own || own.category !== 'compression' || !own.stepRowId) continue;
        led += 1;
        for (const w of [COMPOSITE_WORDS, PLAIN_WORDS]) {
          const other = pick(selectEventNextAction({ ...ev, timeline: rows.map((r) => (r.id === own.stepRowId ? { ...r, task: w } : r)) }));
          if (JSON.stringify(other) !== JSON.stringify(own)) wrong.push(`${pb.type} T-${d} "${w}": ${JSON.stringify(other)} ≠ ${JSON.stringify(own)}`);
        }
      }
    }
    expect(wrong.slice(0, 20)).toEqual([]);
    expect(led).toBeGreaterThan(0);
  });

  test('the hero reads the declaration: no composite rule over a title', () => {
    const code = fs.readFileSync(path.join(__dirname, '../../CommandCenter.jsx'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/_isSetCompositeTitle/);
    const at = code.indexOf('function decomposeSetComposite(');
    expect(at).toBeGreaterThan(-1);
    const body = code.slice(at, code.indexOf('\n}\n', at));
    expect(body).toMatch(/stepIsSetComposite\(/);
    expect(body).not.toMatch(/\.test\(cmd\.title\)|_isSetComposite/);
    expect((code.match(/stepIsSetComposite\(/g) || []).length).toBe(2);
  });
});

// ─── WHEN SHE COOKS, ONLY THE CATERING PART GOES (owner ruling 1, 11/23/2026)
// A step whose caterer comes out when she cooks ('host-cooks') dropped whole
// unless it authored a labelWithoutCaterer, so "Sign planner, photographer,
// caterer, band/DJ" vanished and took the planner, the photographer and the
// band with it. Each such step now declares either `otherVendors` (the
// non-catering vendors it names) with its no-caterer label, or `catererOnly`
// (its only job is catering, so it may drop).
describe('when she cooks, only a step that is purely catering drops', () => {
  const { cookTasksFor } = require('../playbooks/cookLever');
  // The host shell's playbooks: the shell's occasion picker lists
  // smartParseEvent.HOST_TYPES (Board Meeting, Conference and Team Retreat are
  // not in it; owner ruling 2, round 2). Only steps that are purely catering
  // (`catererOnly`) may drop when she cooks; every other one keeps its work
  // in its no-caterer words (ruling 1, round 2: Quinceañera t_fitting too).
  const { HOST_TYPES } = require('../smartParseEvent');
  const HOST = pbm.ALL_PLAYBOOKS.filter((pb) => HOST_TYPES.includes(pb.type));
  // Nothing pending: Birthday's last invoices keep the bartender (round 2, item 3).
  const PENDING = new Set();
  const stepsOf = (pb) => [...(pb.tasks || []), ...cookTasksFor(pb), ...pbm.DESTINATION_TASKS];
  const cooks = (out) => Array.isArray(out) && out.includes('host-cooks');

  test('every step whose caterer comes out when she cooks is classified', () => {
    const bad = [];
    expect(HOST.length).toBe(44);
    expect(HOST.some((pb) => pb.type === 'Board Meeting')).toBe(false);
    for (const pb of HOST) {
      for (const s of stepsOf(pb)) {
        if (!cooks(s.catererOut) || PENDING.has(`${pb.type}:${s.id}`)) continue;
        const keeps = !!s.labelWithoutCaterer;
        if (keeps === (s.catererOnly === true)) bad.push(`${pb.type}:${s.id} declares ${keeps ? 'both' : 'neither'}`);
        if ((s.otherVendors || []).length && !keeps) bad.push(`${pb.type}:${s.id} names other vendors with no no-caterer label`);
      }
    }
    expect(bad).toEqual([]);
    for (const [type, id] of [['Wedding', 't_keyvendors'], ['Engagement Party', 't_book_bartender'], ['Retirement Party', 't_book_vendors'], ['Quinceañera', 't_vendor_book'], ['Fundraiser / Gala', 't_vendors']]) {
      const s = (pbm.getPlaybook(type).tasks || []).find((t) => t.id === id);
      expect([type, id, (s.otherVendors || []).length > 0]).toEqual([type, id, true]);
    }
  });

  test('in every host-cooks state of every host-shell playbook, such a step stays on the list in its no-caterer words', () => {
    const wrong = [];
    let seen = 0;
    for (const pb of HOST) {
      const named = (pb.tasks || []).filter((s) => cooks(s.catererOut) && s.labelWithoutCaterer);
      if (!named.length) continue;
      for (const ev0 of eventsFor(pb)) {
        if (pbm.foodApproach(ev0).usesCaterer !== false) continue;
        for (const s of named) {
          const ev = s.whenChoice ? { ...ev0, foodChoices: { ...(ev0.foodChoices || {}), [s.whenChoice.id]: s.whenChoice.in[0] } } : ev0;
          if (pbm.foodApproach(ev).usesCaterer !== false) continue;
          seen += 1;
          const row = (pbm.playbookChecklist(ev, asOf) || []).find((r) => r.provenance && r.provenance.taskId === s.id);
          if (!row) wrong.push(`${pb.type}:${s.id} disappeared`);
          else if (!row.task.startsWith(s.labelWithoutCaterer)) wrong.push(`${pb.type}:${s.id} reads "${row.task}"`);
        }
      }
    }
    expect(wrong.slice(0, 40)).toEqual([]);
    expect(seen).toBeGreaterThan(20);
  });
});

// ─── A COMPOSITE NAMES THE FOUNDATION PARTS IT BUNDLES (owner ruling 2, 11/23/2026)
// The retired word rule called "Set the table tonight … if the count calls
// for one" a composite. A composite now declares `bundles`: the foundation
// parts (date, guests, budget, menu) it sets, and only such a step is one.
describe('a composite declares the foundation parts it bundles', () => {
  const PARTS = ['date', 'guests', 'budget', 'menu'];
  test('composite exactly when the step declares two or more foundation parts it bundles', () => {
    const bad = [];
    for (const pb of pbm.ALL_PLAYBOOKS) {
      for (const s of everyDeclaredStep(pb)) {
        const parts = Array.isArray(s.bundles) ? s.bundles : [];
        if (parts.some((p) => !PARTS.includes(p))) bad.push(`${pb.type}:${s.id} bundles ${JSON.stringify(parts)}`);
        // Two or more parts make a bundle (owner ruling, round 2): one part is an atomic step.
        if ((s.composite === true) !== (parts.length >= 2)) bad.push(`${pb.type}:${s.id} composite ${s.composite} bundles ${JSON.stringify(parts)}`);
      }
    }
    expect(bad).toEqual([]);
  });
  test('the ten ruled out are not composites', () => {
    for (const [type, id] of [['Sweet 16', 't_budget'], ['Client Dinner', 't_budget'], ['PTA / Booster Fundraiser', 't_goal_budget'], ['Quinceañera', 't_budget_set'],['Thanksgiving Hosting', 't_table'], ['Vow Renewal', 't_setreception'], ["New Year's Eve Party", 't_early_countdown'],
      ['Repast', 't_memory'], ['Watch Party', 't_repeatable_list'], ['Surprise Proposal', 't_finance']]) {
      const s = (pbm.getPlaybook(type).tasks || []).find((t) => t.id === id);
      expect([type, id, s.composite === true]).toEqual([type, id, false]);
    }
  });
});

// ─── THE BUILDER'S OWN DEDUPES READ DECLARATIONS (owner ruling 3, 11/23/2026)
// The checklist builder added its generic "Confirm your caterer…" row unless
// some row's text contained "cater" (3a), and its "Ask who is bringing which
// dish" row unless some row's text named who brings what (3b). Each step now
// declares it: `coversCaterer`, `assignsDishes`.
describe('the checklist builder’s derived rows read declarations, never row text', () => {
  const V = (cat, status) => ({ id: 'v-' + cat, name: cat + ' Co', category: cat, status, cost: 900 });
  const statesOf = (pb) => eventsFor(pb).flatMap((e) => [e, { ...e, vendors: [V('Catering', 'Booked')] }]);
  const swapped = (pb, id, words) => {
    const states = statesOf(pb);
    const has = () => states.map((ev) => (pbm.playbookChecklist(ev, asOf) || []).some((r) => r.provenance && r.provenance.taskId === id)).join(',');
    const before = has();
    const saved = (pb.tasks || []).map((t) => t.label);
    try {
      return words.map((w) => { (pb.tasks || []).forEach((t) => { t.label = w; }); return has() === before; });
    } finally { (pb.tasks || []).forEach((t, i) => { t.label = saved[i]; }); }
  };

  test('3a: the generic caterer row comes and goes the same whatever the steps say', () => {
    const wrong = [];
    for (const pb of pbm.ALL_PLAYBOOKS) {
      const same = swapped(pb, 'fa-caterer', ['Tidy up', 'Call the caterer']);
      if (!same.every(Boolean)) wrong.push(pb.type);
    }
    expect(wrong).toEqual([]);
  });

  test('3b: the who-brings row comes and goes the same whatever the steps say', () => {
    const wrong = [];
    for (const pb of pbm.ALL_PLAYBOOKS) {
      const same = swapped(pb, 'fa-bringers', ['Tidy up', 'Assign dishes: who brings what']);
      if (!same.every(Boolean)) wrong.push(pb.type);
    }
    expect(wrong).toEqual([]);
  });

  test('the builder holds no rule over a row’s text', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'playbooks', 'index.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    const at = code.indexOf('export function playbookChecklist(');
    const body = code.slice(at, code.indexOf('\n}\n', at));
    expect(body).not.toMatch(/\.test\(\s*(?:String\()?r\.task/);
  });
});

// ─── THE SHOP CLOCK IS A DECLARED STEP (owner ruling 3c, 11/23/2026) ────────
// phaseProgress gave the final week's food and shopping rows their closing
// window from the open timeline row whose TEXT said "shop". Each step that
// carries the clock now declares `shopClock` (a hand-authored sample row
// carries it itself), derived once from that rule and committed; which steps
// SHOULD carry it is an owner call (HANDOFF lists today's answers).
describe('the shop clock reads a declaration, never a row’s words', () => {
  const { useFrozenClock, daysFromNow } = require('../../testUtils/frozenClock');
  useFrozenClock();
  const { deriveEventPhaseProgress } = require('../phaseProgress');
  const clock = (ev) => JSON.stringify((deriveEventPhaseProgress(ev).items || []).filter((i) => i.id === 'food' || i.id === 'shopping')
    .map((i) => [i.id, i.leadDays == null ? null : i.leadDays, !!i.closingWindow]));
  test('the food and shopping rows keep their clock whatever the rows say', () => {
    const wrong = [];
    let clocked = 0;
    for (const pb of pbm.ALL_PLAYBOOKS) {
      const picks = {};
      for (const d of pb.decisions || []) { const o = (d.options || [])[0]; const l = typeof o === 'string' ? o : (o && (o.label || o.value)); if (l) picks[d.id] = l; }
      for (const d of [6, 3, 1]) {
        for (const choices of [{}, picks]) {
          const ev = { id: 'sc', type: pb.type, name: 'N', date: daysFromNow(d), guestMode: 'count', guestCount: 30, totalBudget: 9000, venue: 'The Hall', venueCity: 'Austin, TX', startTime: '18:00', guests: [], vendors: [], budget: [], foodChoices: choices, dietaryNoted: true };
          const rows = pbm.playbookChecklist(ev) || [];
          const own = clock({ ...ev, timeline: rows });
          if (own.includes('true')) clocked += 1;
          for (const w of ['Tidy up', 'Main shop: snacks and drinks']) {
            if (clock({ ...ev, timeline: rows.map((r) => ({ ...r, task: w })) }) !== own) { wrong.push(`${pb.type} T-${d} "${w}"`); break; }
          }
        }
      }
    }
    expect(wrong.slice(0, 40)).toEqual([]);
    expect(clocked).toBeGreaterThan(0);
  });
  test('phaseProgress holds no rule over a row’s words for the clock', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'phaseProgress.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/shop\(ping\)\?/);
  });
});

// ─── EACH PLAYBOOK'S SHOP CLOCK IS ITS REAL GROCERY RUN (owner ruling 1, round 2)
// Round 1 reproduced the word rule's picks: Gender Reveal's clock was the
// sealed envelope for the bakery (T-18d), Watch Party's was building a
// shopping list (T-7d), and 32 playbooks had none because their runs never
// said "shop". Each host-shell playbook now declares `shopClock` on its own
// grocery run(s); the clock is the earliest one still open. A playbook with
// no grocery run declares none, and says why here.
describe('each host-shell playbook’s shop clock is its real grocery run', () => {
  const { useFrozenClock, daysFromNow } = require('../../testUtils/frozenClock');
  useFrozenClock();
  const { HOST_TYPES } = require('../smartParseEvent');
  const { deriveEventPhaseProgress } = require('../phaseProgress');
  const { taskLeadDays } = require('../taskLead');
  const HOST = pbm.ALL_PLAYBOOKS.filter((pb) => HOST_TYPES.includes(pb.type));
  const RUNS = {
    'Dinner Party': ['t_pantry_shop', 't_fresh_shop'], Birthday: ['t_decor_shop', 't_food_shop'],
    'Baby Shower': ['t_nonperish_shop', 't_fresh_shop'], 'Get-Together': ['t_nonperish_shop', 't_fresh_shop'],
    Graduation: ['t_nonperish_shop', 't_food_shop'], 'Watch Party': ['t_nonperish_shop', 't_fresh_shop'],
    'Game Night': ['t_shop'], Housewarming: ['t_dry_shop', 't_fresh_shop'], 'Bridal Shower': ['t_nonperish_shop', 't_fresh_shop'],
    'Gender Reveal': ['t_nonperish_shop', 't_fresh_shop'], 'Engagement Party': ['t_pantry_shop', 't_fresh_shop'],
    Anniversary: ['t_pantry_shop', 't_fresh_shop'], 'Holiday Party': ['t_shop_alc', 't_shop_fresh'], 'Sweet 16': ['t_shop'],
    'Retirement Party': ['t_pantry_shop', 't_fresh_shop'], Reunion: ['t-shop-dry', 't-shop-fresh'],
    'Bachelorette Party': ['t_nonperish_shop', 't_fresh_shop'], 'Bachelor Party': ['t_nonperish_shop', 't_fresh_shop'],
    'Vow Renewal': ['t_pantry_shop', 't_fresh_shop'], 'The Cookout': ['t_nonperish_shop', 't_meat_shop'],
    'Fish Fry': ['t_nonperish', 't_fish'], 'Card Party': ['t_shop'], 'Sunday Dinner': ['t-shop'],
    'Day Party': ['t_nonperish_shop', 't_fresh_shop'], 'Juneteenth Cookout': ['t_nonperish_shop', 't_fresh_shop'],
    'Crab Feast': ['t_shop'], 'Crawfish Boil': ['t_nonperish'], 'Low Country Boil': ['t_nonperish', 't_shrimp'],
    'Pupusa Gathering': ['t_source'], 'Ethiopian Coffee Ceremony': ['t_pantry', 't_freshpickup'], Repast: ['t_supplies'],
    'Kwanzaa Gathering': ['t_nonperish_shop', 't_fresh_shop'], 'Thanksgiving Hosting': ['t_shop'],
    Friendsgiving: ['t_shop', 't_shop_basics'], 'Halloween Party': ['t_shop_food'], "New Year's Eve Party": ['t_shop'],
    'PTA / Booster Fundraiser': ['t_shop'],
  };
  // The host-shell playbooks with no grocery run of their own, and why.
  const NO_RUN = {
    Wedding: 'the caterer and the venue feed the guests; no step is a grocery run',
    Elopement: 'a restaurant or package meal; no step buys food',
    'Quinceañera': 'catered; the steps book the caterer and baker, none shops',
    'Surprise Proposal': 'its one purchase is flowers, candles and a sign for the moment, not food',
    'Client Dinner': 'a restaurant dinner; its one purchase is the client gift',
    'Fundraiser / Gala': 'catered; no step buys food',
    'Group Trip': 'meals are planned per day on the trip (house, out, own); no step is a grocery run',
  };
  test('every host-shell playbook declares its grocery runs, or is listed with why it has none', () => {
    const got = {};
    for (const pb of HOST) {
      const ids = (pb.tasks || []).filter((t) => t.shopClock === true).map((t) => t.id);
      if (ids.length) got[pb.type] = ids;
    }
    expect(got).toEqual(RUNS);
    for (const pb of HOST) expect([pb.type, !!RUNS[pb.type] !== !!NO_RUN[pb.type]]).toEqual([pb.type, true]);
    expect(Object.keys(RUNS).length + Object.keys(NO_RUN).length).toBe(HOST.length);
  });
  test('in the final week the clock is the earliest open grocery run', () => {
    const wrong = [];
    let clocked = 0;
    for (const pb of HOST) {
      for (const d of [6, 2]) {
        const ev = { id: 'sc', type: pb.type, name: 'N', date: daysFromNow(d), guestMode: 'count', guestCount: 30, totalBudget: 9000, venue: 'The Hall', venueCity: 'Austin, TX', startTime: '18:00', guests: [], vendors: [], budget: [], foodChoices: {}, dietaryNoted: true };
        const rows = pbm.playbookChecklist(ev) || [];
        const runs = rows.filter((r) => (RUNS[pb.type] || []).includes(r.provenance && r.provenance.taskId))
          .map((r) => taskLeadDays(r)).filter((x) => x != null).sort((a, b) => a - b);
        const items = (deriveEventPhaseProgress({ ...ev, timeline: rows }).items || []).filter((i) => (i.id === 'food' || i.id === 'shopping') && i.closingWindow);
        const lead = items.length ? items[0].leadDays : null;
        if (lead != null) clocked += 1;
        if (lead != null && lead !== runs[0]) wrong.push(`${pb.type} T-${d}: clock ${lead}, earliest run ${runs[0]}`);
        if (lead == null && runs.length && items.length === 0 && (deriveEventPhaseProgress({ ...ev, timeline: rows }).items || []).some((i) => i.id === 'shopping')) wrong.push(`${pb.type} T-${d}: a run and no clock`);
      }
    }
    expect(wrong).toEqual([]);
    expect(clocked).toBeGreaterThan(30);
  });
});

// ─── "THEN, IN ORDER" READS DECLARED KINDS AND NEVER DROPS A STEP (cohesion F, 11/24/2026) ──
// Two leftovers of cause 1 in the board's "Then, in order" filter:
//   • it hid the venue row (while the venue box is on the board) by the declared
//     blocker type OR a regex over the row's title ("name the venue|add the
//     location|pick the place");
//   • it dropped any row whose route did not resolve, so a step with no declared
//     target (one she wrote herself, "Lock catering") vanished from the list.
// Now the venue is read by its declared kind only (heroAsk.asksForTheVenue), and
// a step with no route falls back to its own checklist row (taskRoute.actionRoute,
// the one fallback reader; batch D's "Up next" reads it too).
describe('"Then, in order" reads declared kinds and never drops a step', () => {
  const { asksForTheVenue } = require('../heroAsk');
  const { actionRoute } = require('../taskRoute');
  const { resolveRoute } = require('../routeResolver');
  const shell = () => fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');

  test('the venue row is known by its declared kind, never its words', () => {
    expect(asksForTheVenue({ blockerType: 'venue-selection', title: 'anything' })).toBe(true);
    expect(asksForTheVenue({ askKind: 'location', title: 'Name the venue' })).toBe(true);
    expect(asksForTheVenue({ askKind: 'location', title: DECOY })).toBe(true);
    // The old regex's words, with no declaration, are not a venue ask.
    for (const t of ['Name the venue', 'Add the location', 'Pick the place in Springfield.']) expect(asksForTheVenue({ title: t })).toBe(false);
    expect(asksForTheVenue({ askKind: 'menu', title: 'Name the venue' })).toBe(false);
  });

  test('a step with no declared target falls back to its own checklist row', () => {
    const ev = { id: 'ev-own', type: 'Birthday', date: DATE };
    const r = actionRoute(ev, { id: 'step:ev-own-t1', taskId: 'ev-own-t1', title: 'Lock catering', route: null });
    expect(r).toEqual({ tab: 'Timeline', taskId: 'ev-own-t1', timelineId: 'ev-own-t1' });
    expect(resolveRoute(r)).toEqual({ kind: 'tasks', focus: 'ev-own-t1' });
    expect(actionRoute(ev, { stepRowId: 'ev-own-t2', title: 'x' })).toEqual({ tab: 'Timeline', taskId: 'ev-own-t2', timelineId: 'ev-own-t2' });
    // A declared route always wins; an action that is no step and has no route stays null.
    expect(actionRoute(ev, { taskId: 'ev-own-t1', route: { tab: 'Vendors' } })).toEqual({ tab: 'Vendors' });
    expect(actionRoute(ev, { primaryRoute: { tab: 'Budget' } })).toEqual({ tab: 'Budget' });
    expect(actionRoute(ev, { id: 'x', title: 'Lock catering' })).toBeNull();
  });

  test('the shell’s "Then, in order" filter reads the kind and the fallback, no title regex', () => {
    const src = shell();
    const at = src.indexOf('const thenItems = ');
    expect(at).toBeGreaterThan(-1);
    const body = src.slice(at, src.indexOf(';\n', at));
    expect(body).toMatch(/asksForTheVenue\(a\)/);
    expect(body).toMatch(/actionRoute\(event, a\)/);
    expect(body).not.toMatch(/\.test\(|\.match\(|a\.title/);
    expect(body).not.toMatch(/name the venue|add the location|pick the place/i);
  });
});
