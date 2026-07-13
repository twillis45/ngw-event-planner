import { formatPhoneUS, normalizePhone, isValidPhone, isIncompletePhone, isValidEmail, isMalformedEmail } from '../contactFormat';

describe('formatPhoneUS', () => {
  test('the headline case: 1234567890 → (123) 456-7890', () => {
    expect(formatPhoneUS('1234567890')).toBe('(123) 456-7890');
  });
  test('normalizes any input shape to the one format', () => {
    for (const v of ['123.456.7890', '(123) 456-7890', '123-456-7890', '123 456 7890', '+1 (123) 456-7890', '1234567890']) {
      expect(formatPhoneUS(v)).toBe(v.includes('+1') || v.startsWith('1 ') ? '1 (123) 456-7890' : '(123) 456-7890');
    }
  });
  test('leading US country code keeps a "1 " prefix', () => {
    expect(formatPhoneUS('11234567890')).toBe('1 (123) 456-7890');
  });
  test('formats progressively as you type', () => {
    expect(formatPhoneUS('12')).toBe('12');
    expect(formatPhoneUS('1234')).toBe('(123) 4');
    expect(formatPhoneUS('1234567')).toBe('(123) 456-7');
  });
  test('empty stays empty; extra digits are kept, not dropped', () => {
    expect(formatPhoneUS('')).toBe('');
    expect(formatPhoneUS(null)).toBe('');
    expect(normalizePhone(formatPhoneUS('12345678901234'))).toBe('12345678901234'); // no silent truncation
  });
});

describe('phone validity', () => {
  test('10 digits or 11 with leading 1 are complete; blank is allowed', () => {
    expect(isValidPhone('1234567890')).toBe(true);
    expect(isValidPhone('(123) 456-7890')).toBe(true);
    expect(isValidPhone('11234567890')).toBe(true);
    expect(isValidPhone('')).toBe(true);
    expect(isValidPhone('12345')).toBe(false);
  });
  test('isIncompletePhone flags a partial number but not an empty one', () => {
    expect(isIncompletePhone('12345')).toBe(true);
    expect(isIncompletePhone('')).toBe(false);
    expect(isIncompletePhone('1234567890')).toBe(false);
  });
});

describe('email validity', () => {
  test('blank is allowed; a real address passes; junk fails', () => {
    expect(isValidEmail('')).toBe(true);
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('todd@toddwillisphoto.com')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.com')).toBe(false);
  });
  test('isMalformedEmail flags only non-empty bad input', () => {
    expect(isMalformedEmail('')).toBe(false);
    expect(isMalformedEmail('nope')).toBe(true);
    expect(isMalformedEmail('a@b.co')).toBe(false);
  });
  test('normalizePhone strips everything but digits', () => {
    expect(normalizePhone('+1 (123) 456-7890 ext')).toBe('11234567890');
  });
});
