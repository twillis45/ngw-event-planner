// CONTACT IS FORMATTED AND CHECKED (owner, 11/26/2026: "Make sure we are auto
// formatting contact info. Phone and email in both versions. Also add
// verification for those values."). One rule set in lib/contactFormat for
// hostv2 and hostv4: a phone formats as it's typed; an email is saved trimmed;
// each says, in one plain line, what's wrong with it. Blank is fine (optional).
import { formatPhoneUS, cleanEmail, phoneProblem, emailProblem } from '../contactFormat';

describe('a phone formats as it is typed', () => {
  it.each([['4105551234', '(410) 555-1234'], ['410.555.1234', '(410) 555-1234'], ['1 410 555 1234', '1 (410) 555-1234'], ['410', '410'], ['4105', '(410) 5']])('%s → %s', (raw, out) => {
    expect(formatPhoneUS(raw)).toBe(out);
  });
});

describe('a phone says what is wrong', () => {
  it('blank and complete numbers are fine', () => {
    for (const v of ['', '(410) 555-1234', '1 (410) 555-1234']) expect(phoneProblem(v)).toBeNull();
  });
  it('a short number asks for the rest', () => {
    expect(phoneProblem('(410) 555-12')).toBe('That number is missing digits. US numbers have 10.');
  });
  it('a long number says so', () => {
    expect(phoneProblem('410555123456')).toBe('That number has too many digits. US numbers have 10.');
  });
});

describe('an email is saved clean and says what is wrong', () => {
  it('trims spaces around it', () => {
    expect(cleanEmail('  ana@example.com ')).toBe('ana@example.com');
  });
  it('blank and well-formed are fine', () => {
    for (const v of ['', 'ana@example.com', 'a.b+c@mail.example.org']) expect(emailProblem(v)).toBeNull();
  });
  it.each(['ana', 'ana@', 'ana@example', 'ana example@x.com', '@example.com'])('%s is flagged', (v) => {
    expect(emailProblem(v)).toBe('That email doesn’t look right. It needs a name, an @ and a domain, like name@example.com.');
  });
});
