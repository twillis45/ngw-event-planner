// An uploaded contract is re-signed when it is opened; its stored one-hour URL
// is never reused. A pasted link is the host's own and is used as written.
import { contractUrlFor } from '../contractLink';
import { getSignedUrl } from '../storage';

jest.mock('../storage', () => ({ getSignedUrl: jest.fn() }));

const STALE = 'https://proj.supabase.co/storage/v1/object/sign/event-files/u/e/contract/1_a.pdf?token=EXPIRED';
const FRESH = 'https://proj.supabase.co/storage/v1/object/sign/event-files/u/e/contract/1_a.pdf?token=FRESH';
const stored = { contractStoragePath: 'u/e/contract/1_a.pdf', contractFileName: 'a.pdf', contractUrl: STALE };

beforeEach(() => getSignedUrl.mockReset());

test('an uploaded file is re-signed from its storage path, never the stored URL', async () => {
  getSignedUrl.mockResolvedValue({ ok: true, url: FRESH });
  await expect(contractUrlFor(stored)).resolves.toEqual({ ok: true, url: FRESH });
  expect(getSignedUrl).toHaveBeenCalledWith('u/e/contract/1_a.pdf');
});

test('a failed re-sign is a failure, not a fallback to the expired URL', async () => {
  getSignedUrl.mockResolvedValue({ ok: false, error: 'Object not found' });
  await expect(contractUrlFor(stored)).resolves.toEqual({ ok: false, error: 'Object not found' });
  getSignedUrl.mockRejectedValue(new Error('Failed to fetch'));
  await expect(contractUrlFor(stored)).resolves.toEqual({ ok: false, error: 'Failed to fetch' });
  getSignedUrl.mockResolvedValue({ ok: true, url: null });
  const r = await contractUrlFor(stored);
  expect(r.ok).toBe(false);
  expect(JSON.stringify(r)).not.toContain('EXPIRED');
});

test('a pasted link (no storage path) is used as written and never signed', async () => {
  const pasted = { contractUrl: 'https://drive.example.com/contract' };
  await expect(contractUrlFor(pasted)).resolves.toEqual({ ok: true, url: 'https://drive.example.com/contract' });
  expect(getSignedUrl).not.toHaveBeenCalled();
});

test('nothing on file opens nothing', async () => {
  await expect(contractUrlFor(null)).resolves.toMatchObject({ ok: false });
  await expect(contractUrlFor({ contractFileName: 'a.pdf' })).resolves.toMatchObject({ ok: false });
  expect(getSignedUrl).not.toHaveBeenCalled();
});
