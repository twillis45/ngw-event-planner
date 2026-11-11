// UPLOADED EVENT FILES: ONLY THE UPLOADER AND THE EVENT'S STUDIO (11/11/2026).
//
// Production's event-files bucket had seven hand-made policies that checked
// only the bucket name: anyone with the public key could list, download and
// upload, and any signed-in user could delete any file. 022 replaces them.
// This gate keeps the repo's side of that true; the owner's attestation pack
// (event_files_* rows) checks the live project.
const fs = require('fs');
const path = require('path');
import { contentTypeFor } from '../storage';

const ROOT = path.resolve(__dirname, '../../..');
const MIG = fs.readFileSync(path.join(ROOT, 'supabase/migrations/022_event_files_owner_scoped.sql'), 'utf8')
  .replace(/--[^\n]*/g, '');
const STORAGE = fs.readFileSync(path.join(ROOT, 'src/lib/storage.js'), 'utf8');

const policies = [...MIG.matchAll(/create\s+policy\s+"([^"]+)"\s+on\s+storage\.objects([\s\S]*?);/gi)]
  .map((m) => ({ name: m[1], body: m[2] }));

test('every hand-made production policy is dropped by name', () => {
  for (const name of ['read_anon', 'upload_anon', 'read_authenticated', 'upload_authenticated',
    'Planners can read their own files', 'Planners can upload their own files', 'Planners can delete their own files']) {
    expect(MIG).toMatch(new RegExp(`drop policy if exists "${name}" on storage\\.objects`));
  }
});

test('no new policy is for anon or public, and each one checks the caller', () => {
  expect(policies.map((p) => p.name).sort()).toEqual(
    ['event_files: owner delete', 'event_files: owner or studio read', 'event_files: owner upload']);
  for (const p of policies) {
    expect(p.body).toMatch(/\bto\s+authenticated\b/i);
    expect(p.body).not.toMatch(/\bto\s+(anon|public)\b/i);
    expect(p.body).toMatch(/bucket_id\s*=\s*'event-files'/);
    expect(p.body).toMatch(/auth\.uid\(\)/);
  }
  expect(MIG).not.toMatch(/for\s+update/i);   // uploads never overwrite
});

test("the bucket's type list is the app's own list, and uploads never overwrite", () => {
  const appTypes = STORAGE.match(/const ALLOWED_TYPES = \[([\s\S]*?)\];/)[1].match(/'[^']+'/g).sort();
  const bucketTypes = MIG.match(/allowed_mime_types\s*=\s*array\[([\s\S]*?)\]/)[1].match(/'[^']+'/g).sort();
  expect(bucketTypes).toEqual(appTypes);
  expect(MIG).toMatch(/file_size_limit\s*=\s*10485760/);
  expect(STORAGE).toMatch(/upsert:\s*false/);
  expect(STORAGE).not.toMatch(/upsert:\s*true/);
});

test('a file the browser could not name still gets a type the bucket accepts', () => {
  expect(contentTypeFor({ name: 'Contract.HEIC', type: '' })).toBe('image/heic');
  expect(contentTypeFor({ name: 'quote.pdf', type: 'application/octet-stream' })).toBe('application/pdf');
  expect(contentTypeFor({ name: 'menu.png', type: 'image/png' })).toBe('image/png');
});
