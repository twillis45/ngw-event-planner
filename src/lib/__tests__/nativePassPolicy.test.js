jest.mock('../passEntitlement', () => ({ serverPassHeld: jest.fn() }));
import { serverPassHeld } from '../passEntitlement';
import { briefAllowed, destinationLocked, creationDisclosure } from '../passGate';
const event = { id: 'cust-1', passRequired: true, passReasons: ['destination'], passPurchased: true };
afterEach(() => { delete window.Capacitor; serverPassHeld.mockReset(); });
function platform(name) { window.Capacitor = { isNativePlatform: () => true, getPlatform: () => name }; }
test('Android consumption-only requires a confirmed server entitlement, even while web billing is dormant', () => {
  platform('android');
  expect(briefAllowed(event, 'vendor').allowed).toBe(false);
  expect(destinationLocked(event)).toBe(true);
  serverPassHeld.mockReturnValue(true);
  expect(briefAllowed(event, 'vendor').allowed).toBe(true);
  expect(destinationLocked(event)).toBe(false);
});
test('iOS default none does not unlock paid tools from an existing web purchase', () => {
  platform('ios'); serverPassHeld.mockReturnValue(true);
  expect(briefAllowed(event, 'vendor').allowed).toBe(false);
  expect(destinationLocked(event)).toBe(true);
  expect(creationDisclosure({ passRequired: true })).toBeNull();
});
test('native free first brief remains available', () => {
  platform('ios');
  expect(briefAllowed({ id: 'cust-free' }, 'vendor').allowed).toBe(true);
});

test('Android consumption-only refresh is independent of Stripe purchasing; iOS none does not refresh', () => {
  const oldApi = process.env.REACT_APP_API_BASE_URL;
  const oldBilling = process.env.REACT_APP_BILLING_LIVE;
  process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
  process.env.REACT_APP_BILLING_LIVE = '0';
  const { shouldRefreshPassEntitlement } = require('../passGate');
  try {
    platform('android'); expect(shouldRefreshPassEntitlement()).toBe(true);
    platform('ios'); expect(shouldRefreshPassEntitlement()).toBe(false);
    delete process.env.REACT_APP_API_BASE_URL;
    platform('android'); expect(shouldRefreshPassEntitlement()).toBe(false);
  } finally {
    if (oldApi === undefined) delete process.env.REACT_APP_API_BASE_URL; else process.env.REACT_APP_API_BASE_URL = oldApi;
    if (oldBilling === undefined) delete process.env.REACT_APP_BILLING_LIVE; else process.env.REACT_APP_BILLING_LIVE = oldBilling;
  }
});
