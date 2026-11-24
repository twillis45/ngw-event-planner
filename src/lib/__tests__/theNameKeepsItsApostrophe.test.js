// ─── THE NAME KEEPS ITS APOSTROPHE (owner's invite, 11/24/2026) ──────────────
//
// The owner's invite email read "Mom Lindas …" for a name typed with an
// apostrophe. Round trip in the app: the name in (her sentence, or the name
// she types when the invite asks for one), then what each surface the guest
// gets prints: the invite card, the invite's subject and text, and the email
// subject the shell sends. A straight ' and a curly ’ both. The server's side
// is backend/tests/test_the_name_keeps_its_apostrophe.py, the guest page's is
// hostv2/e2e/theGuestSeesTheWholeAddress.spec.mjs. Made-up names only.
import { parseSmartEventText } from '../smartParseEvent';
import { eventNameFrom } from '../eventName';
import { occasionShortName } from '../occasionWords';
import { outwardGaps } from '../outwardReady';
import { inviteCardModel } from '../inviteCard';
import { draftInvite } from '../doItForMe';
import { inviteSubjectAndBody } from '../inviteBatch';

const EV = {
  type: 'Dinner Party', recordKind: 'host_event', date: '2027-12-04', startTime: '18:00', startTimeSource: 'host',
  venueKind: 'home', venueAddress: '42 Elm Ct', venueCity: 'Springfield', venueState: 'VA', venueZip: '22150',
};

describe.each([["'", 'straight'], ['’', 'curly']])('%s (%s)', (ap) => {
  const name = `Aunt Rosa${ap}s Dinner`;

  test('her sentence names the event with the apostrophe', () => {
    const s = `Aunt Rosa${ap}s Dinner for 12 on 12/4 at 6pm at 42 Elm Ct, Springfield, VA 22150`;
    const p = parseSmartEventText(s);
    const made = eventNameFrom({ sentence: s, honoree: p.honoree, hostName: p.hostName, milestoneName: occasionShortName(p.type) });
    expect(made.name).toMatch(/^Aunt Rosa['’]s /);
  });

  test('a name she types is a real name, kept as typed', () => {
    const ev = { ...EV, name };
    expect(outwardGaps(ev, 'invite').map((g) => g.key)).not.toContain('name');
    expect(ev.name).toBe(name);
  });

  test('the invite card, the subject and the text the email is sent with', () => {
    const ev = { ...EV, name };
    expect(inviteCardModel(ev).name).toBe(name);
    for (const voice of ['as-written', 'tighter', 'warmer', 'playful', 'formal']) {
      const d = draftInvite(ev, null, { voice });
      expect(d.subject).toContain(name);
      expect(inviteSubjectAndBody(d.body, d.subject).subject).toContain(name);
    }
    expect(draftInvite(ev, null).body).toContain(name);
  });
});
