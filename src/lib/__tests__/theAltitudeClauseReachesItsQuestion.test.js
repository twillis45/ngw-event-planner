// ─── THE APP ASKED THE QUESTION AND THREW AWAY THE ANSWER ─────────────────
//
// The Santa Fe 80th, typed by a host in one breath:
//
//   "…she uses a walker and the altitude is hard on her"
//
// The app put both clauses under DIDN'T MAKE IT INTO THE PLAN and added
// "the plan won't know about them". Three taps away sat `dest_health` —
// "Any guests with heart or lung conditions?" — authored for exactly this,
// CDC-grounded through knowledge/destinationContext, with a pacing task
// (`dest_t_health`) gated behind a Yes.
//
// So this was never a missing capability. It was a wired engine with its
// intake disconnected: the host answered the question before it was asked,
// and the answer was filed under "didn't make it".
//
// THREE THINGS THIS FILE REFUSES TO DO, each a line the re-score board drew:
//
// 1. NO MEDICAL INFERENCE FROM AGE. `dest_health`'s own authoring comment
//    records that the meta-analysis behind it found NO age link to altitude
//    illness — heart and lung health is what predicts who struggles. "80th"
//    must never propose Yes.
// 2. NO MEDICAL INFERENCE FROM A MOBILITY AID. A walker is not a
//    cardiopulmonary condition. "She uses a walker" stays in the disclosure
//    block, because no slot exists for it and inventing one would be worse.
// 3. PROPOSE, NEVER ANSWER. The pick is a RECOMMENDATION carrying the host's
//    own words as its reason, one tap to change — not a stored answer. The
//    app does not get to record a health fact about a named person on their
//    behalf.
import { parseSmartEventText, unusedClauses } from '../smartParseEvent';
import { choicePickFor, playbookChecklist, injectedDecisionsFor, getPlaybook, decisionProposal } from '../playbooks';

const SEED = "Mom's 80th birthday in Santa Fe New Mexico on June 14 2027, "
  + 'about 30 people flying in for 3 nights, dinner at an adobe courtyard, '
  + 'she uses a walker and the altitude is hard on her';

const ev = (extra) => ({
  id: 'alt', name: "Mom's 80th", type: 'Birthday', date: '2027-06-14', endDate: '2027-06-17',
  venueCity: 'Santa Fe', state: 'NM', guestMode: 'count', guestCount: 30,
  isDestination: true, ...extra,
});
const health = (e) => injectedDecisionsFor(e, getPlaybook(e.type)).find((d) => d.id === 'dest_health');
const taskIds = (e) => (playbookChecklist(e) || []).map((t) => (t.provenance && t.provenance.taskId) || '');

describe('the altitude clause reaches the question the app already asks', () => {
  test('(premise) the question and its task exist and are wired to each other', () => {
    const d = health(ev());
    expect(d).toBeTruthy();
    expect(d.options).toContain('Yes');
    expect(d.default).toBe('Not sure');
    // The task is gated on a Yes, so proposing one is the whole mechanism.
    const t = getPlaybook('Birthday');
    expect(t).toBeTruthy();
  });

  test('THE PARSE HEARS IT: the altitude clause becomes a field', () => {
    const p = parseSmartEventText(SEED);
    expect(p.healthNoted).toBeTruthy();
    expect(p.healthNoted.quote).toMatch(/altitude/i);
  });

  test('AND THE DISCLOSURE DROPS IT, because it is no longer unused', () => {
    const dropped = unusedClauses(SEED, {});
    expect(dropped.join(' | ')).not.toMatch(/altitude/i);
    // …while the walker, which has no slot, is still declared honestly.
    expect(dropped.join(' | ')).toMatch(/walker/i);
  });

  test('THE QUESTION IS PROPOSED Yes, carrying the host\'s own words', () => {
    const e = ev({ healthNoted: { yes: true, quote: 'the altitude is hard on her' } });
    const prop = decisionProposal(e, getPlaybook(e.type), health(e));
    expect(prop.pick).toBe('Yes');
    expect(prop.basis).toBe('recommended');
    expect(prop.because).toMatch(/altitude is hard on her/i);
  });

  test('AND THE PACING TASK FIRES off that proposal', () => {
    const e = ev({ healthNoted: { yes: true, quote: 'the altitude is hard on her' } });
    expect(choicePickFor(e, 'dest_health')).toBe('Yes');
    expect(taskIds(e)).toContain('dest_t_health');
  });

  test('NEGATIVE CONTROL: age proposes nothing', () => {
    // dest_health's own comment: the research found NO age link. An 80th
    // birthday must not become a health claim.
    const e = ev();
    expect(choicePickFor(e, 'dest_health')).toBe('Not sure');
    expect(taskIds(e)).not.toContain('dest_t_health');
    expect(parseSmartEventText("Mom's 80th birthday in Santa Fe New Mexico on June 14 2027").healthNoted).toBeFalsy();
  });

  test('NEGATIVE CONTROL: a mobility aid is not a cardiopulmonary condition', () => {
    const p = parseSmartEventText("Mom's 80th birthday in Denver on June 14 2027, she uses a walker");
    expect(p.healthNoted).toBeFalsy();
  });

  test('NEGATIVE CONTROL: a LOCAL event is untouched', () => {
    const e = ev({ isDestination: false, venueCity: 'Baltimore', state: 'MD',
      healthNoted: { yes: true, quote: 'the altitude is hard on her' } });
    expect(taskIds(e)).not.toContain('dest_t_health');
  });

  test('THE HOST STILL OWNS IT: an explicit answer beats the proposal', () => {
    const e = ev({ healthNoted: { yes: true, quote: 'the altitude is hard on her' },
      foodChoices: { dest_health: 'No' } });
    expect(choicePickFor(e, 'dest_health')).toBe('No');
    expect(taskIds(e)).not.toContain('dest_t_health');
  });
});
