// ─── AN OPTION-ROW HERO NAMES THE ACT — ONE WAY OR THE OTHER ────────────────
//
// Two board rulings meet here, and without this test the second one deletes
// the first.
//
// The Grandmother seat found that the hero asked a question and showed rows
// with "nothing saying those ARE the answers, or what happens if you touch
// one" — so a lead line was added naming the act in words (the arrow glyph is
// banned on this surface: tapping settles in place, it does not navigate).
//
// A later board replaced the assurance with "The plan's been running on my
// pick. Change it if it's wrong — nothing else moves", which discharges that
// finding MORE fully, and called the lead a duplicate where an assurance
// renders. It ruled (a): render the lead if and only if there is no assurance.
//
// The reduction seat called this test ceremony and lost, on the grounds that
// "without it the consolidation is just a deletion with a good story." The
// failure it guards is a NEW playbook shipping an assurance-less hero, where
// the lead is now conditional and the assurance is absent: rows with nothing
// naming the act, which is the Grandmother's card returning.
import fs from 'fs';
import path from 'path';

const SHELL = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'hostv2', 'src', 'HostShellV2.jsx'), 'utf8',
);
const PLAYBOOKS = fs.readFileSync(
  path.join(__dirname, '..', 'playbooks', 'index.js'), 'utf8',
);

describe('an option-row hero always names the act', () => {
  test('the lead line still exists — it was made conditional, not deleted', () => {
    expect(SHELL).toMatch(/decopts-lead/);
    expect(SHELL).toMatch(/Tap one to settle it/);
  });

  test('and it is gated on the ABSENCE of a proposed pick', () => {
    // `proposed` is emitted on the same condition as the assurance, so it is
    // the signal for "an assurance is carrying this card".
    expect(SHELL).toMatch(/\{!proposedOpt && <p className="decopts-lead">/);
  });

  test('the assurance that replaces it NAMES THE ACT', () => {
    // Not merely reassuring: it must tell the host what tapping does. This is
    // the half the lead line used to carry alone.
    const m = /: 'The plan’s been running on my pick\.([^']*)'/.exec(PLAYBOOKS);
    expect(m).not.toBeNull();
    expect(m[1]).toMatch(/Change it/);
  });

  test('and BOUNDS the consequence — the containment promise', () => {
    // The bereaved-host seat called this the most considerate thing on the
    // card: the fear is that touching one thing detonates six others.
    const m = /: 'The plan’s been running on my pick\.([^']*)'/.exec(PLAYBOOKS);
    expect(m[1]).toMatch(/nothing else moves/);
  });

  test('it attributes the pick to the PRODUCT, never to the host', () => {
    // A prior board's ruling, and the one that caught a later board's copy:
    // an unanswered decision must never read as though the host answered it.
    expect(PLAYBOOKS).toMatch(/running on my pick/);
    // "you chose" / "you picked" must not appear in an assurance.
    const assurances = [...PLAYBOOKS.matchAll(/assurance\s*=\s*[\s\S]{0,400}?;/g)].map((x) => x[0]);
    expect(assurances.length).toBeGreaterThan(0);
    for (const a of assurances) expect(a).not.toMatch(/you (chose|picked|selected)/i);
  });
});
