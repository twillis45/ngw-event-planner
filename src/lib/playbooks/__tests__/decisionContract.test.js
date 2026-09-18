// ─── THE CONTRACT A PROPOSING DECISION MUST MEET ─────────────────────────────
//
// THE SYSTEMATIC HALF of the defaultWhy work. Authoring 127 strings across 30
// files is content, and content drifts: the ninth copy goes stale, or a new
// playbook ships without one and nobody notices. So the STRUCTURE is enforced
// here, once, and the prose stays where a human can review it.
//
// THE DEFECT. `playbookDecisionOptions` used to read
//
//     defaultWhy: d.defaultWhy || d.why || ''
//
// while the comment four lines above it said "never invented at render time.
// Absent ⇒ names only." The code contradicted its own comment. `why` answers
// "why does this DECISION matter"; `defaultWhy` answers "why is THIS OPTION our
// pick". Substituting the first for the second put a decision-level sentence
// under a badge reading "our pick" — on 127 of 129 can-derive decisions.
//
// `decisionND.js` carried its own copy of the same fallback, so fixing one
// reader alone would have left the other lying. Both are gone.
//
// THE RULE THIS FILE ENFORCES, and it is the honest one: if the app is going to
// PROPOSE an option out loud, it must be able to say why that option. A
// can-derive decision that nobody can write a defaultWhy for has not failed to
// be documented — it has failed to justify proposing, and belongs in
// `needs-host`. Either outcome satisfies this test; silence does not.
import { ALL_PLAYBOOKS } from '../index';

const decisionsOf = (pb) => (pb && Array.isArray(pb.decisions) ? pb.decisions : []);

const proposing = [];
for (const pb of ALL_PLAYBOOKS) {
  for (const d of decisionsOf(pb)) {
    if (!d || d.difmCapable !== 'can-derive') continue;
    // Nothing to justify when there is no default to propose.
    if (d.default == null || d.default === '') continue;
    proposing.push({ pb: pb.type, d });
  }
}

describe('a decision that proposes out loud can say why', () => {
  test('(premise) the sweep found the proposing population', () => {
    expect(ALL_PLAYBOOKS.length).toBeGreaterThanOrEqual(39);
    expect(proposing.length).toBeGreaterThan(100);
  });

  test('every proposing decision authors its own defaultWhy', () => {
    const missing = proposing
      .filter(({ d }) => !String(d.defaultWhy || '').trim())
      .map(({ pb, d }) => `${pb} · ${d.id} (proposes ${JSON.stringify(d.default)})`);
    // Fix by EITHER authoring a defaultWhy, OR moving the decision to
    // difmCapable:'needs-host'. Both are honest; shipping neither is not.
    expect(missing).toEqual([]);
  });

  test('defaultWhy is never just the decision-level why wearing a badge', () => {
    // The exact substitution the removed fallback performed.
    const echoed = proposing
      .filter(({ d }) => {
        const dw = String(d.defaultWhy || '').trim();
        return dw && dw === String(d.why || '').trim();
      })
      .map(({ pb, d }) => `${pb} · ${d.id}`);
    expect(echoed).toEqual([]);
  });

  test('defaultWhy names the option it is defending', () => {
    // A reason that never mentions its own pick is a reason for something else.
    // Matched loosely — the first distinctive word of the default is enough —
    // because the copy should read naturally, not quote the option verbatim.
    const orphans = proposing
      .filter(({ d }) => {
        const dw = String(d.defaultWhy || '').toLowerCase();
        if (!dw) return false;                       // covered by the test above
        const words = String(d.default).toLowerCase()
          .split(/[^a-z0-9']+/).filter((w) => w.length > 3);
        if (!words.length) return false;             // nothing distinctive to match
        return !words.some((w) => dw.includes(w));
      })
      .map(({ pb, d }) => `${pb} · ${d.id}: ${JSON.stringify(String(d.default))} not named in its own defaultWhy`);
    expect(orphans).toEqual([]);
  });

  test('defaultWhy carries the override clause — who this default is wrong for', () => {
    // The house pattern's second half, and the reason it exists: a default that
    // only argues FOR itself is a recommendation for everyone, which it is not.
    // The five hand-authored precedents all carry it.
    const noValve = proposing
      .filter(({ d }) => {
        const dw = String(d.defaultWhy || '').trim();
        if (!dw) return false;
        // THE VALVE, not one phrasing of it (widened 2026-09-18 after the
        // authoring pass). The first version accepted only imperative forms and
        // pushed CULTURAL copy toward "Change it if…" — a Juneteenth red table
        // and a funeral repast had their softer valves ("belongs to you", "is
        // just as right if") rewritten to satisfy a regex. That is the contract
        // deforming the content, which is worse than the gap it closed.
        // What must be present is an acknowledgement that this default is not
        // right for everyone; the grammar is the author's.
        return !/\b(change it|swap it|pick another|choose .* instead|override|if you|unless you|not for you|belongs to you|your own|is just as right|just as good|equally right|yours to)\b/i.test(dw);
      })
      .map(({ pb, d }) => `${pb} · ${d.id}`);
    expect(noValve).toEqual([]);
  });
});

describe('the readers no longer substitute why for defaultWhy', () => {
  const fs = require('fs');
  const path = require('path');
  const LIB = path.join(__dirname, '..', '..');
  const strip = (f) => fs.readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  test.each([
    ['playbooks/index.js', path.join(LIB, 'playbooks', 'index.js')],
    ['decisionND.js', path.join(LIB, 'decisionND.js')],
  ])('%s', (_label, file) => {
    const src = strip(file);
    expect(src).not.toMatch(/defaultWhy\s*\|\|\s*d(opts)?\.why/);
  });
});
