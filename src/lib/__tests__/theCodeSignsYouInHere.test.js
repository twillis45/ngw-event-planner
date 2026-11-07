// The sign-in code keeps you in the browser you started in (live smoke test,
// 11/7/2026). A sign-in link tapped in a mail app opens that app's own browser,
// which has none of the host's plan, so the event seemed to vanish. The same
// email now carries a code the host types where they already are.
import { signInCode } from '../signInCode';

test('a six-digit code is read as typed', () => {
  expect(signInCode('482913')).toBe('482913');
});

test('spaces and dashes people add are ignored', () => {
  expect(signInCode(' 482 913 ')).toBe('482913');
  expect(signInCode('482-913')).toBe('482913');
});

test('a longer project code (up to ten digits) is accepted', () => {
  expect(signInCode('48291375')).toBe('48291375');
});

test('too short, too long or not a number is refused', () => {
  expect(signInCode('48291')).toBeNull();
  expect(signInCode('48291375012')).toBeNull();
  expect(signInCode('abc123')).toBeNull();
  expect(signInCode('')).toBeNull();
  expect(signInCode(null)).toBeNull();
});
