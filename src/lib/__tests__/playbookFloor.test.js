// ─── NO EVENT TYPE IS SILENT ────────────────────────────────────────────────
//
// The task-coverage audit of 2026-08-21 measured the worst failure this product
// has: nine of the taxonomy's 48 types had no playbook, so a bare Town Hall
// produced ros 0, checklist 0, decisions 0, risks 0, raises 0. The app offered
// the type at intake and then had nothing whatsoever to say. A host cannot tell
// that apart from "there is nothing left to do".
//
// The floor borrows a near playbook rather than authoring nine from scratch.
// That is only acceptable while it is SAID OUT LOUD, which is what most of this
// file is about: a borrowed playbook that presents itself as the type's own
// would be the app claiming knowledge it does not have.
import { getPlaybook, playbookChecklist, BORROWED_TYPES } from '../playbooks';
import { EVENT_TAXONOMY } from '../eventTaxonomy.mjs';

const ALL_TYPES = Object.keys(EVENT_TAXONOMY || {});
const evOf = (type) => ({ id: 'ev-floor', type, date: '2026-11-14', guestCount: 40 });

describe('the floor', () => {
  test('every type in the taxonomy now has something to say — except one, on purpose', () => {
    const silent = ALL_TYPES.filter((t) => (playbookChecklist(evOf(t)) || []).length === 0);
    // "Other" is the deliberate exception: the honest answer for a type the
    // host invented is that we have no playbook for it. Silence WITH a reason
    // is fine. Silence without one is the defect this floor exists to close.
    expect(silent).toEqual(['Other']);
  });

  test('a borrowed playbook produces real work, not a token gesture', () => {
    for (const t of BORROWED_TYPES) {
      const n = (playbookChecklist(evOf(t)) || []).length;
      // Jest's `expect` takes one argument (the 2-arg message form is
      // Playwright/Vitest), so the type goes in the loop's own failure context.
      if (n <= 8) throw new Error(`${t} borrowed a playbook but produced only ${n} tasks`);
    }
  });
});

describe('a borrow never passes itself off as the real thing', () => {
  test('it is flagged, names what it borrowed from, and says why', () => {
    for (const t of BORROWED_TYPES) {
      const pb = getPlaybook(t);
      expect(pb.isDefault).toBe(true);
      expect(pb.appliedTo).toBe(t);
      // The reason is a real sentence, not a label. A host reading "borrowed"
      // learns nothing; a host reading "an all-hands runs like a board meeting
      // scaled up" can judge for themselves whether it holds.
      expect(typeof pb.because).toBe('string');
      expect(pb.because.split(' ').length).toBeGreaterThan(6);
    }
  });

  test('provenance names the SOURCE playbook, never the requested type', () => {
    // The load-bearing one. Every generated row stamps
    // `provenance.source = ${playbook.type} playbook`, so leaving `type` as the
    // source type is what makes a borrowed task say "Board Meeting playbook" on
    // a town hall — which is exactly true. Rewriting it to the requested type
    // would have been a one-word change that made the app claim an authored
    // playbook it does not have.
    const rows = playbookChecklist(evOf('Town Hall')) || [];
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      if (!r.provenance || !r.provenance.source) continue;
      expect(r.provenance.source).toMatch(/Board Meeting playbook/);
      expect(r.provenance.source).not.toMatch(/Town Hall/);
    }
  });

  test('an authored type is NOT flagged as borrowed', () => {
    // Red-proofs the flag itself: if `isDefault` were set unconditionally,
    // every test above would still pass and the honesty line would appear on
    // all 39 authored playbooks.
    for (const t of ['Wedding', 'Conference', 'Board Meeting', 'Dinner Party']) {
      const pb = getPlaybook(t);
      if (!pb) throw new Error(`${t} should be authored and is not`);
      if (pb.isDefault) throw new Error(`${t} is authored but flagged as a borrow`);
    }
  });
});

describe('the map keeps up with the taxonomy', () => {
  test('every unauthored type is either borrowed or the deliberate silence', () => {
    // The guard against the corpus growing a tenth silent type. Adding an event
    // type is a one-line change in the taxonomy; without this, doing so
    // reintroduces total silence and nothing says a word.
    const unauthored = ALL_TYPES.filter((t) => {
      const pb = getPlaybook(t);
      return !pb || pb.isDefault;
    });
    const accounted = new Set([...BORROWED_TYPES, 'Other']);
    const orphans = unauthored.filter((t) => !accounted.has(t));
    if (orphans.length) throw new Error(`no playbook and no borrow: ${orphans.join(', ')}`);
    expect(orphans).toEqual([]);
  });
});
