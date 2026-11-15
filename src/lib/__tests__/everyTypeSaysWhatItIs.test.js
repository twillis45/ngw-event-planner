// ─── EVERY AUTHORED TYPE SAYS WHAT IT IS ────────────────────────────────────
//
// Found 11/15/2026 on the live site: the owner's Friendsgiving opened with
// "This is a gathering." — the warm floor eventIdentity uses when a type has no
// description. Friendsgiving was new that day, and Thanksgiving Hosting,
// Halloween Party and New Year's Eve Party had been on the floor since they
// were authored. A new playbook should not be able to miss this silently.
import { ALL_PLAYBOOKS } from '../playbooks';
import { identityStatement } from '../eventIdentity';

test.each(ALL_PLAYBOOKS.map((pb) => [pb.type]))('%s has its own description, not the generic floor', (type) => {
  expect(identityStatement({ type })).not.toBe('This is a gathering.');
});

test('Friendsgiving reads as what it is', () => {
  expect(identityStatement({ type: 'Friendsgiving' })).toBe('This is Thanksgiving with friends.');
});
