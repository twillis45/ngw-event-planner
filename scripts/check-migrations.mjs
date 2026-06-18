#!/usr/bin/env node
// Sprint 58G-B — migration governance guardrail. Fails (exit 1) if a NEW file under
// backend/migrations/ creates a CANONICAL-owned (shared Supabase) table. Canonical
// schema must live in supabase/migrations/. Existing backend files are grandfathered
// (frozen legacy). Pure Node, no deps. Run: `npm run check:migrations`.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = join(root, 'backend', 'migrations');

// Tables owned by supabase/migrations (the canonical, integration-watched folder).
const CANONICAL = ['studios', 'studio_members', 'events', 'clients', 'studio_invitations', 'studio_settings', 'preferred_vendors'];
// Existing backend files are frozen legacy reference (0003 holds a superseded
// studios/studio_members) — grandfathered so the guardrail only catches NEW drift.
const GRANDFATHERED = new Set([
  '0001_communication.sql', '0002_event_owners.sql', '0003_studios.sql',
  '0004_email_delivery.sql', '0005_admin_support.sql', '0006_admin_errors.sql',
  'README.md',
]);

let files = [];
try { files = readdirSync(BACKEND).filter((f) => f.endsWith('.sql')); } catch { process.exit(0); }

const violations = [];
for (const f of files) {
  if (GRANDFATHERED.has(f)) continue; // frozen legacy
  const sql = readFileSync(join(BACKEND, f), 'utf8');
  for (const t of CANONICAL) {
    const re = new RegExp(`create table\\s+(if not exists\\s+)?(public\\.)?${t}\\b`, 'i');
    if (re.test(sql)) violations.push({ file: f, table: t });
  }
}

if (violations.length) {
  console.error('\n✗ Migration governance violation (Sprint 58G-B):');
  for (const v of violations) {
    console.error(`  backend/migrations/${v.file} creates canonical table "${v.table}".`);
  }
  console.error('\n  Shared Supabase schema is owned by `supabase/migrations` (canonical,');
  console.error('  integration-watched). Move this table there. See each folder\'s README.md.\n');
  process.exit(1);
}
console.log('✓ migration governance: no new shared-table migrations under backend/migrations');
