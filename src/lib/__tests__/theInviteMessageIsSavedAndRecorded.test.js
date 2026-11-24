// Owner, 11/24/2026 (follow-on item 2): the invite message is drafted, saved,
// previewed as an email and as a text, and what went out is kept.
//   * event.inviteMessageDraft { body, voice, savedAt, edited, line }: written
//     through patchEvent so it syncs; the invite draft reads it first.
//   * the page message (deckLine) is the draft's opening line; a changed line
//     after she edited is offered, never written over her words.
//   * texts are body-only (no subject line) and plain punctuation, so they
//     split into fewer messages.
//   * event.invitesSentMessage { subject, body, voice, at }: what went out.
import {
  LINK_PLACEHOLDER, savedInviteDraft, inviteDraftRecord, withLink, lineChange, swapPageLine,
  plainText, textMessageBody, smsSegments, sentSnapshot, sentRecipients, draftStatus,
} from '../inviteMessageDraft';
import { draftInvite } from '../doItForMe';

const EV = {
  id: 'e1', name: 'Mom Linda’s Thanksgiving', type: 'Thanksgiving', date: '2099-11-26', startTime: '15:00', startTimeSource: 'host',
  venue: 'Dana’s house', hostName: 'Dana Reyes',
  deckLine: 'It wouldn’t be the same without you. Come hungry, and bring a story from your year.',
};

test('a saved draft is read back whole; nothing saved reads as null', () => {
  expect(savedInviteDraft({})).toBe(null);
  expect(savedInviteDraft({ inviteMessageDraft: { body: '  ' } })).toBe(null);
  const rec = inviteDraftRecord({ body: 'Hello', voice: 'warmer', edited: true, line: 'x', now: '2026-11-24T19:14:00.000Z' });
  expect(rec).toEqual({ body: 'Hello', voice: 'warmer', savedAt: '2026-11-24T19:14:00.000Z', edited: true, line: 'x' });
  expect(savedInviteDraft({ inviteMessageDraft: rec })).toEqual(rec);
});

test('the reply link fills the placeholder, and only that', () => {
  const body = 'Tap to let us know:\n' + LINK_PLACEHOLDER + '\n\n— Dana';
  expect(withLink(body, 'https://example.com/?rsvp=abc')).toBe('Tap to let us know:\nhttps://example.com/?rsvp=abc\n\n— Dana');
  expect(withLink(body, '')).toBe(body);
});

test('her page message is the draft’s opening line', () => {
  const d = draftInvite(EV, null, { rsvpUrl: 'https://example.com/?rsvp=abc' });
  expect(d.body.split('\n')[1]).toBe(EV.deckLine);
});

test('a changed page line is offered after she edited, never written over her words', () => {
  const saved = { inviteMessageDraft: { body: 'Hi!\n' + EV.deckLine + '\nSee you', edited: true, line: EV.deckLine } };
  expect(lineChange({ ...EV, ...saved })).toBe(null);
  const next = { ...EV, ...saved, deckLine: 'Bring your appetite.' };
  expect(lineChange(next)).toEqual({ from: EV.deckLine, to: 'Bring your appetite.' });
  expect(swapPageLine(saved.inviteMessageDraft.body, EV.deckLine, 'Bring your appetite.')).toBe('Hi!\nBring your appetite.\nSee you');
  expect(swapPageLine('Nothing of it here', EV.deckLine, 'Bring your appetite.')).toBe(null);
  // Not edited: the draft is rebuilt from the page, so nothing is asked.
  expect(lineChange({ ...next, inviteMessageDraft: { ...saved.inviteMessageDraft, edited: false } })).toBe(null);
});

test('texts are body-only and plain punctuation', () => {
  expect(plainText('It wouldn’t — “really” … Thu · 3 PM')).toBe('It wouldn\'t - "really" ... Thu - 3 PM');
  const draft = 'You’re invited — Mom Linda’s Thanksgiving\n\nCome hungry.\nhttps://example.com/?rsvp=abc';
  expect(textMessageBody(draft, 'You’re invited — Mom Linda’s Thanksgiving')).toBe('Come hungry.\nhttps://example.com/?rsvp=abc');
});

test('a text is counted as a phone counts it', () => {
  expect(smsSegments('a'.repeat(160))).toEqual({ chars: 160, gsm: true, parts: 1 });
  expect(smsSegments('a'.repeat(161))).toEqual({ chars: 161, gsm: true, parts: 2 });
  expect(smsSegments('’'.repeat(70))).toEqual({ chars: 70, gsm: false, parts: 1 });
  expect(smsSegments('’'.repeat(71))).toEqual({ chars: 71, gsm: false, parts: 2 });
  // Plain punctuation keeps the invite in the 7-bit alphabet: fewer parts.
  const curly = 'Hi Rosa, ' + 'It wouldn’t be the same — come hungry. '.repeat(4);
  expect(smsSegments(plainText(curly)).parts).toBeLessThan(smsSegments(curly).parts);
});

test('the sent record keeps the words, and each guest’s channel and status', () => {
  expect(sentSnapshot({ subject: 'S', body: 'B', voice: 'as-written', at: '2026-11-24T19:31:00.000Z' }))
    .toEqual({ subject: 'S', body: 'B', voice: 'as-written', at: '2026-11-24T19:31:00.000Z' });
  const ev = {
    guests: [
      { id: 'a', name: 'Linda Reyes', invitedAt: 't', invitedVia: 'email', rsvp: 'Yes' },
      { id: 'b', name: 'Aunt Rosa', invitedAt: 't', invitedVia: 'text', rsvp: '' },
      { id: 'c', name: 'Kevin Park', rsvp: 'No' },
      { id: 'd', name: 'Sam Ortiz' },
      { id: 'e', name: 'Jo Lin', invitedAt: 't', invitedVia: 'email+text', rsvp: 'Maybe' },
    ],
    guestTold: { c: { at: 't', channel: 'message', attested: true } },
  };
  expect(sentRecipients(ev)).toEqual([
    { id: 'a', name: 'Linda Reyes', channel: 'Email', status: 'Replied yes', tone: 'ok' },
    { id: 'b', name: 'Aunt Rosa', channel: 'Text, by you', status: 'Invited', tone: '' },
    { id: 'c', name: 'Kevin Park', channel: 'Sent by you', status: 'Replied no', tone: '' },
    { id: 'e', name: 'Jo Lin', channel: 'Email and text, by you', status: 'Replied maybe', tone: '' },
  ]);
});

test('the Invite message row says where the words stand', () => {
  expect(draftStatus({})).toEqual({ kind: 'none', line: 'Written from your plan · check it' });
  expect(draftStatus({ inviteMessageDraft: { body: 'x', edited: true } }).line).toBe('Draft saved · edited');
  expect(draftStatus({ inviteMessageDraft: { body: 'x', edited: false } }).line).toBe('Draft saved');
  expect(draftStatus({ invitesSentMessage: { body: 'x', at: '2026-11-24T19:31:00' } }))
    .toEqual({ kind: 'sent', line: 'Sent Nov 24 · see what went out' });
});
