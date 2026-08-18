// ─── YOU CANNOT WRITE THE INVITE BEFORE YOU HAVE DECIDED WHAT IT SAYS ────────
//
// Coverage pass, 2026-08-17. Found by sweeping all 39 playbooks for decisions
// scheduled CLOSER to the event than the invite task that depends on them.
//
// The first sweep flagged 76 rows and was WRONG — it compared every decision to
// the invite, and menu, seating and bar legitimately come after invites go out.
// Narrowed to decisions that DECLARE `blocks: ['invite'|'headcount'|…]`, it
// found exactly one, and that one was real:
//
//   Housewarming `window` — "Open-house window or fixed start?" — blocked the
//   invite and was scheduled T-7d, five days AFTER the invite went out at T-12d.
//   The invite task's own label asks the host to state the "open-house window",
//   so the app was telling them to write a fact it had not asked them for yet.
//
// `entry` and `gifts` in the same playbook were the same defect one step hidden:
// both are written into the invite ("shoes-off heads-up", "your gift stance";
// the gifts option literally reads "No gifts (say so on the invite)") but they
// declared only `blocks: ['setup']`, so no rule could see them. They now declare
// the invite and sit at T-14d with it.
//
// WHAT THIS GATE DOES AND DOES NOT COVER, stated because the limit matters:
// only 4 of 215 decisions declare an invite dependency, so this checks a
// DECLARED class, not every real one. An undeclared dependency stays invisible
// here — the honest fix for that is authoring, not a cleverer assertion, and
// pretending otherwise would make this gate read stronger than it is.
import { ALL_PLAYBOOKS } from '../playbooks';

const days = (w) => { const m = /^T-(\d+)d$/.exec(w || ''); return m ? Number(m[1]) : null; };
const inviteTask = (pb) => (pb.tasks || []).find((t) => /invite|save.the.date/i.test(t.task || t.id || ''));
const blocksInvite = (d) => (d.blocks || []).some((b) => /invite|headcount|guestlist|rsvp/i.test(b));

describe('a decision the invite depends on is settled before the invite goes out', () => {
  test('PREMISE — the sweep really reaches invite tasks and blocking decisions', () => {
    // Without this the whole file could pass by finding nothing to check, which
    // is the exact failure mode of a rule aimed at a field nobody authors.
    const withInvite = ALL_PLAYBOOKS.filter((pb) => days((inviteTask(pb) || {}).when) != null);
    const blockers = ALL_PLAYBOOKS.flatMap((pb) => (pb.decisions || []).filter(blocksInvite));
    expect(withInvite.length).toBeGreaterThan(20);
    expect(blockers.length).toBeGreaterThanOrEqual(4);
  });

  test('NO PLAYBOOK ASKS THE HOST TO WRITE A FACT IT HAS NOT ASKED FOR YET', () => {
    const bad = [];
    ALL_PLAYBOOKS.forEach((pb) => {
      const invD = days((inviteTask(pb) || {}).when);
      if (invD == null) return;
      (pb.decisions || []).filter(blocksInvite).forEach((d) => {
        const dd = days(d.when);
        if (dd != null && dd < invD) {
          bad.push(`${pb.type}: "${d.id}" at T-${dd}d, invite at T-${invD}d`);
        }
      });
    });
    expect(bad).toEqual([]);
  });

  test('THE REPORTED CASE — housewarming settles all three invite facts first', () => {
    // Named directly so a regression points at the defect that produced the rule
    // rather than at an anonymous count.
    const hw = ALL_PLAYBOOKS.find((pb) => /housewarming/i.test(pb.type));
    const invD = days(inviteTask(hw).when);
    ['window', 'entry', 'gifts'].forEach((id) => {
      const d = (hw.decisions || []).find((x) => x.id === id);
      expect(d).toBeTruthy();
      expect(d.blocks).toContain('invite');       // the dependency is DECLARED
      expect(days(d.when)).toBeGreaterThanOrEqual(invD);  // and settled in time
    });
  });
});
