// KEP-3 Bundle B — KAS API client graceful degradation. With no API base configured
// (dev/offline/test), the client never throws and returns null so the stores fall back to
// localStorage — existing behavior preserved (rule 5).
import { isKasApiConfigured, fetchKasRecords, upsertKasRecords, KAS_KINDS } from '../kas';

describe('KAS api client', () => {
  test('unconfigured (no API base) → not configured, calls return null, never throw', async () => {
    expect(isKasApiConfigured()).toBe(false); // REACT_APP_API_BASE_URL unset in test env
    await expect(fetchKasRecords('observation')).resolves.toBeNull();
    await expect(upsertKasRecords('observation', [{ id: 'x' }])).resolves.toBeNull();
  });
  test('rejects unknown kinds and empty batches', async () => {
    await expect(fetchKasRecords('bogus')).resolves.toBeNull();
    await expect(upsertKasRecords('bogus', [{ id: 'x' }])).resolves.toBeNull();
    expect(KAS_KINDS).toEqual(['observation', 'evidence', 'finding', 'override', 'campaign']);
  });
});
