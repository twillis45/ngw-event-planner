// THE INVITE PAGE'S DESIGN, ONE RULE FOR BOTH SHELLS (owner, 11/26/2026: "start
// the card design" in hostv4). hostv2's InviteDesignSheet saved its fields with
// rules written inline: the suggested line saved unchanged is stored EMPTY (so it
// stays the suggestion if the type changes), and "how guests reach you" must be a
// phone or an email, or empty. hostv4 needs the same rules, so they live here.
import { storedInviteMessage, inviteContactProblem, inviteDesignEdit, INVITE_LAYOUTS } from '../inviteDesign';
import { suggestedInviteLine, INVITE_MESSAGE_MAX } from '../inviteDeck';

const ev = { id: 'e1', name: 'Harvest Supper', type: 'Dinner Party', date: '2099-12-31' };

describe('the message', () => {
  it('the suggestion saved unchanged is stored empty', () => {
    expect(storedInviteMessage(ev, suggestedInviteLine(ev))).toBe('');
    expect(storedInviteMessage(ev, '  ' + suggestedInviteLine(ev) + ' ')).toBe('');
  });
  it('her words are stored trimmed, at most the limit', () => {
    expect(storedInviteMessage(ev, '  Come hungry. ')).toBe('Come hungry.');
    expect(storedInviteMessage(ev, 'x'.repeat(INVITE_MESSAGE_MAX + 20)).length).toBe(INVITE_MESSAGE_MAX);
  });
});

describe('how guests reach you', () => {
  it.each(['', '(410) 555-1234', 'pat@example.com'])('%s is fine', (v) => expect(inviteContactProblem(v)).toBeNull());
  it.each(['call me', '555', 'pat@'])('%s is not', (v) => expect(inviteContactProblem(v)).toBe('Add a phone number or an email address, or leave it empty.'));
});

describe('the edit', () => {
  it('saves only the fields given, through the rules', () => {
    const ed = inviteDesignEdit(ev, { message: suggestedInviteLine(ev), inviteLayout: 'glance' });
    expect(ed.patch).toEqual({ deckLine: '', inviteLayout: 'glance' });
    expect(ed.msg).toMatch(/saved/);
  });
  it('a bad contact is refused, not saved', () => {
    expect(inviteDesignEdit(ev, { hostContact: 'call me' })).toEqual({ error: 'Add a phone number or an email address, or leave it empty.' });
  });
  it('a layout must be one of the two', () => {
    expect(INVITE_LAYOUTS.map(([v]) => v)).toEqual(['classic', 'glance']);
    expect(inviteDesignEdit(ev, { inviteLayout: 'poster' })).toEqual({ error: 'Pick Classic or At a glance.' });
  });
});
