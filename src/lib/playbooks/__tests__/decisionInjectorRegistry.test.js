// ─── EVERY SURFACE SEES THE SAME DECISIONS ───────────────────────────────────
//
// Not every decision is authored in a playbook file. Three engines inject their
// own — destination, the cook lever, military retirement — and each was named BY
// HAND at every call site. Three injectors, three wiring idioms, four call
// sites, and each site a different subset:
//
//   choicePickFor            cook via a special-cased early return, then
//                            destination and military through a find() chain
//   playbookDecisionBoard    all three, spread
//   playbookDecisionOptions  all three, spread
//   playbookFoodPlan         cook ONLY — under a comment claiming it "reads the
//                            SAME combined list every other surface reads"
//
// That last one is the whole argument. The comment asserted the property the
// code did not have, and the shape it produces — one surface seeing fewer
// decisions than the board — is the board-vs-food-plan divergence this corpus
// already has a name for, and already shipped once this same day via the cook
// lever's choices list.
//
// The registry makes adding an injector ONE entry instead of four call-site
// edits across three idioms. This file stops the call sites drifting back.
import fs from 'fs';
import path from 'path';
import {
  ALL_PLAYBOOKS, getPlaybook, injectedDecisionsFor,
  playbookDecisionBoard, playbookFoodPlan,
} from '../index';

const INDEX = path.join(__dirname, '..', 'index.js');
const source = () => fs.readFileSync(INDEX, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

const iso = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const ev = (type, extra) => ({ id: 'reg', type, date: iso(45), guestMode: 'count', guestCount: 24, foodChoices: {}, ...extra });

describe('the registry is the only way in', () => {
  test('injectedDecisionsFor is exported and returns an array', () => {
    expect(typeof injectedDecisionsFor).toBe('function');
    expect(Array.isArray(injectedDecisionsFor(ev('Backyard BBQ'), getPlaybook('Backyard BBQ')))).toBe(true);
  });

  // THE RATCHET. Outside the registry's own definition, no consumer may name an
  // individual injector — that is how the four call sites drifted apart.
  test.each([
    ['destinationDecisionsFor'],
    ['cookDecisionsFor'],
    ['militaryDecisionsFor'],
  ])('%s is not called outside the registry', (fn) => {
    const lines = source().split('\n');
    const calls = [];
    lines.forEach((l, i) => {
      if (!new RegExp(`\\b${fn}\\s*\\(`).test(l)) return;
      // The definition itself, the import, and the registry entries are the
      // legitimate mentions.
      if (/^\s*(export\s+)?(function|const)\s/.test(l)) return;
      if (/^\s*import\s/.test(l)) return;
      if (/=>\s*\w+DecisionsFor\(|=>\s*cookDecisionsFor\(/.test(l)) return;   // a registry entry
      calls.push(`index.js:${i + 1}  ${l.trim().slice(0, 80)}`);
    });
    expect(calls).toEqual([]);
  });

  test('canary: the scanner would bite a re-added call site', () => {
    const bite = (l) => /\bcookDecisionsFor\s*\(/.test(l)
      && !/^\s*(export\s+)?(function|const)\s/.test(l)
      && !/=>\s*cookDecisionsFor\(/.test(l);
    expect(bite('    ...cookDecisionsFor(pb),')).toBe(true);
    expect(bite('  (event, pb) => cookDecisionsFor(pb),')).toBe(false);
    expect(bite('const cookDecisionsFor = (pb) => { const d = cookDecisionFor(pb); return d ? [d] : []; };')).toBe(false);
  });
});

describe('the board and the food plan draw from the same well', () => {
  // The cook lever is the injector with a MENU-shaped decision, so it is the one
  // that can actually diverge between these two surfaces. A Backyard BBQ that
  // opts into the lever is the honest fixture.
  const TYPES = ['Backyard BBQ', 'Birthday', 'Watch Party', 'Holiday Party'];

  test.each(TYPES)('%s — every food-plan choice is a decision the board knows', (type) => {
    const e = ev(type);
    const board = playbookDecisionBoard(e) || {};
    const known = new Set();
    for (const bucket of ['open', 'locked', 'deferred']) {
      for (const row of (board[bucket] || [])) {
        const id = row && (row.id || (row.decision && row.decision.id));
        if (id) known.add(id);
      }
    }
    const choices = ((playbookFoodPlan(e) || {}).choices || []).map((c) => c.id);
    // A choice the board has never heard of is the divergence this file exists
    // to prevent — the host answering something on one screen that the other
    // screen still counts as open.
    const orphans = choices.filter((id) => !known.has(id));
    expect(orphans).toEqual([]);
  });

  test('(premise) at least one type actually injects a decision', () => {
    const injected = ALL_PLAYBOOKS
      .map((pb) => injectedDecisionsFor(ev(pb.type), pb).length)
      .reduce((a, b) => a + b, 0);
    expect(injected).toBeGreaterThan(0);
  });
});
