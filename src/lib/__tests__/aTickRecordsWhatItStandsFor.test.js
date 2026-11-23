// A TICK RECORDS WHAT IT STANDS FOR (owner, 11/18/2026: "make sure check boxes
// link to all places that are done and affected parts of app").
//
// Doing a step in its section already ticks the checklist (taskSatisfied reads
// the section's fact). The reverse was missing: ticking "Send the invite" on
// the checklist left invitesSentAt empty, so the guest sheet still offered "I
// already sent it" and the invite tools; ticking "Collect dietary needs" left
// the food stats at "none yet". One fact, two answers.
//
// The rule is single-source by construction: a tick writes a fact only when
// taskSatisfied says that fact is what completes the step.
import { factsATickRecords, taskSatisfied } from '../taskEngine';

const ev = (extra = {}) => ({ id: 'e', type: 'Dinner Party', guests: [], vendors: [], ...extra });
const step = (task) => ({ id: 's', task, done: false });

// SUPERSEDED FOR SENDS (owner, 11/23/2026, six root causes): "Mark done must
// never record an action as performed (e.g. invite sent) when nothing was
// sent — it marks the step done." On the Thanksgiving walkthrough the hero's
// "Mark done" was the only way off a wrong editor, and tapping it told the
// guest sheet the invite had gone out. A tick records only what noting it
// makes true (dietaryNoted); a send is recorded by the send.
test('ticking an invite step marks the step done and records no send', () => {
  expect(factsATickRecords(ev(), step('Send invites with date/time/place + RSVP-by + allergy ask'))).toEqual({});
  expect(factsATickRecords(ev(), step('Invite everyone with the date, the serve time, and the dietary and overnight ask'))).toEqual({});
});

test('ticking "collect dietary needs" records that they were noted', () => {
  expect(factsATickRecords(ev(), step('Collect dietary needs and decide the fix for each'))).toEqual({ dietaryNoted: true });
  expect(factsATickRecords(ev(), step('Ask every guest for allergies, dietary needs and whether they drink'))).toEqual({ dietaryNoted: true });
});

test('and the section fact ticks the step back (both directions, one rule)', () => {
  expect(taskSatisfied(ev({ dietaryNoted: true }), step('Collect dietary needs and decide the fix for each'))).toBe(true);
});

test('an invite that only ASKS about diets does not claim the answers are in', () => {
  const p = factsATickRecords(ev(), step('Send invites with registry, RSVP-by, dietary ask'));
  expect(p.dietaryNoted).toBeUndefined();
});

test('a chase step is not the invite', () => {
  expect(factsATickRecords(ev(), step('Chase non-responders; lock the final count + any dietary needs'))).toEqual({});
});

test('a step with no fact behind it writes nothing', () => {
  expect(factsATickRecords(ev(), step('Marinate proteins; prep cold sides'))).toEqual({});
});

test('a fact already recorded is never overwritten', () => {
  expect(factsATickRecords(ev({ invitesSentAt: '2026-11-01T00:00:00Z' }), step('Send the invite'))).toEqual({});
});
