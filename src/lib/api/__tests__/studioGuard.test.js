// Sprint 58E-B — the uuid-studio guard that stops the events/clients 22P02 400.
import { isCloudStudioId } from '../studio';

describe('58E-B isCloudStudioId — only real (uuid) studios reach the cloud', () => {
  test('rejects the dev-bypass placeholder (the 400 cause)', () => {
    expect(isCloudStudioId('dev-studio')).toBe(false);
  });
  test('rejects null / undefined / empty / non-uuid', () => {
    [null, undefined, '', 'studio', '123', 'not-a-uuid', 42].forEach(v => expect(isCloudStudioId(v)).toBe(false));
  });
  test('accepts a real uuid (prod studio)', () => {
    expect(isCloudStudioId('8f14e45f-ceea-467a-9c2b-0b1f9a3c4d5e')).toBe(true);
    expect(isCloudStudioId('8F14E45F-CEEA-467A-9C2B-0B1F9A3C4D5E')).toBe(true);
  });
});
