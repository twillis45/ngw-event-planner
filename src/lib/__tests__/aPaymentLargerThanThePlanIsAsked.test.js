// Gold run (11/5/2026): a $9,999,999 payment was recorded silently.
import { paymentAboveWholePlan, NO_PLAN_PAYMENT_CEILING } from '../vendorMoney';

test('larger than the whole plan → asked, against the plan', () => {
  expect(paymentAboveWholePlan('9999999', { planned: 5000, expected: 6200 })).toEqual({ ref: 6200, basis: 'plan' });
});
test('within the plan → not asked', () => {
  expect(paymentAboveWholePlan('6200', { planned: 5000, expected: 6200 })).toBeNull();
  expect(paymentAboveWholePlan('62.48', { planned: 5000 })).toBeNull();
});
test('no plan at all → the sanity ceiling stands in', () => {
  expect(paymentAboveWholePlan(String(NO_PLAN_PAYMENT_CEILING + 1), {})).toEqual({ ref: NO_PLAN_PAYMENT_CEILING, basis: 'ceiling' });
  expect(paymentAboveWholePlan('400', {})).toBeNull();
});
test('nonsense is left to the existing $0 check', () => {
  expect(paymentAboveWholePlan('-5', { planned: 10 })).toBeNull();
  expect(paymentAboveWholePlan('abc', { planned: 10 })).toBeNull();
});
