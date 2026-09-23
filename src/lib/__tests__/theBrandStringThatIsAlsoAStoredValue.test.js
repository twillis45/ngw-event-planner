// ─── RENAMING A LABEL THAT IS ALSO A SAVED ANSWER ────────────────────────────
//
// The product rename swept 17 files and 121 occurrences. Exactly one of them was
// not safe to touch, and it took reading the render site to see why.
//
// `RSVP_METHODS` (App.js) renders as `<option key={m}>{m}</option>` — with NO
// value attribute. In HTML an option with no value submits its TEXT, so the
// visible label IS what lands in `client.rsvpMethod` on every record already
// saved. Renaming 'In-app (Event Boss)' would have left every client who picked
// it matching no option at all: the select reads blank, and the next save writes
// the blank back over their answer.
//
// So the VALUE is frozen at the old wording and only the LABEL is renamed. This
// file exists because that distinction is invisible at the call site — the array
// looks like pure display copy, and the next person to run a find-and-replace
// across the brand will have no reason to think otherwise.
//
// The whole pair is deleted when the CRA shell goes.
import fs from 'fs';
import path from 'path';
import { BRAND } from '../brand';

const APP = fs.readFileSync(path.join(__dirname, '..', '..', 'App.js'), 'utf8');

describe('the rename did not orphan a saved answer', () => {
  test('(premise) the option really is rendered without an explicit stored value of its own', () => {
    // If a future edit gives these options a separate id-style value, the hazard
    // is gone and this whole file can go with it. Until then it is real.
    expect(APP).toMatch(/RSVP_METHODS\.map\(m => <option key=\{m\} value=\{m\}>/);
  });

  test('THE INVARIANT: the stored value still reads exactly as it always did', () => {
    // Byte-for-byte. Any drift here silently breaks existing client records.
    expect(APP).toMatch(/const RSVP_METHODS = \[[^\]]*'In-app \(Event Boss\)'/);
  });

  test('…and the LABEL is the new name, so nothing on screen says the old one', () => {
    expect(APP).toMatch(/RSVP_METHOD_LABEL = \(m\) => \(m === 'In-app \(Event Boss\)' \? 'In-app \(No Guesswork Events\)' : m\)/);
    expect(APP).toMatch(/<option key=\{m\} value=\{m\}>\{RSVP_METHOD_LABEL\(m\)\}<\/option>/);
  });

  test('the label maps the old value and passes everything else through untouched', () => {
    // Derived from the source rather than imported, because App.js is a 46k-line
    // CRA module that cannot be imported into a unit test cheaply.
    const label = (m) => (m === 'In-app (Event Boss)' ? 'In-app (No Guesswork Events)' : m);
    expect(label('In-app (Event Boss)')).toBe('In-app (No Guesswork Events)');
    for (const other of ['Email', 'Phone call', 'Text message', 'Other']) {
      expect(label(other)).toBe(other);
    }
  });

  test('NEGATIVE CONTROL: this is the ONLY surviving mention of the old name', () => {
    // The sweep's own proof. Everything else in the CRA shell is renamed, so a
    // second occurrence means something was missed — or a new one crept in.
    // Asserted by CONTEXT, not by a count: every surviving mention must be part
    // of the exact frozen literal. A bare count needs bumping whenever the
    // comment above it is reworded, which makes it a number people edit to go
    // green rather than a rule — it already tripped once on this file's own
    // explanatory comment.
    const bare = APP.replace(/In-app \(Event Boss\)/g, '');
    expect(bare).not.toMatch(/Event Boss/);
  });

  test('NEGATIVE CONTROL: the new name reaches the shell from the brand owner', () => {
    // hostv2 reads lib/brand; the frozen CRA shell carries literals, because
    // threading an import through 92 sites in donor code scheduled for deletion
    // buys nothing. The two must still AGREE.
    expect(BRAND.full).toBe('No Guesswork Events');
    expect(APP).toMatch(/No Guesswork Events/);
    expect(APP).not.toMatch(/EVENT BOSS/);
  });
});
