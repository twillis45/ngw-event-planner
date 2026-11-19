// Owner ruling 11/19/2026 (plan G87): promotions only to people who tick an
// unchecked opt-in at sign-up. The server reads `marketing_opt_in.at`
// (backend app/host_email.opted_in).
import { signUpData, MARKETING_OPT_IN_LABEL } from '../marketingConsent';

test('no tick, no opt-in: nothing rides on the sign-in request', () => {
  expect(signUpData(false)).toEqual({});
  expect(signUpData(undefined)).toEqual({});
  expect(signUpData('true')).toEqual({});
});

test('a tick records when, and the exact words the host saw', () => {
  const at = new Date('2026-11-19T15:00:00Z');
  expect(signUpData(true, at)).toEqual({ marketing_opt_in: { at: '2026-11-19T15:00:00.000Z', text: MARKETING_OPT_IN_LABEL, version: 'v1-2026-11-19' } });
});
