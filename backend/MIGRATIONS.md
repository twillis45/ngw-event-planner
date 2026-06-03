# Backend Migrations

The backend talks to Supabase Postgres directly. Schema changes ship as plain
SQL files under `backend/migrations/` and are applied **manually** in the
Supabase SQL Editor — there is **no automated migration runner yet**.

> Apply in numeric order. Each migration is idempotent (`IF NOT EXISTS` / `ON CONFLICT DO NOTHING`)
> so re-running is safe.

---

## Files (apply in this order)

| # | File | Purpose | Required by |
|---|---|---|---|
| 0001 | `0001_communication.sql` | Communication ledger: `event_channels`, `event_messages`, message reads, pins. | Anything calling `/api/events/{id}/communication/*`. |
| 0002 | `0002_event_owners.sql` | `event_owners` table for multi-tenant ownership. Backend claims-on-first-touch. | Per-event auth path in `app/auth.py`. |
| 0003 | `0003_studios.sql` | `studios` + `studio_members` workspaces, RLS helpers, auto-provision trigger, backfill, adds `studio_id` to `event_owners`. | Studio-scoped access in comms service + future studio-scoped tables. |
| 0004 | `0004_email_delivery.sql` | Partial GIN index over `event_messages.metadata->'delivery'` for fast delivery-status queries. No new columns (jsonb only). | Sprint 58.2+ delivery tracking surfaces. |

A later `0005_docusign.sql` may exist for `planner_docusign_tokens` once DocuSign
moves token storage server-side; not present at the time of writing.

---

## How to apply (Supabase SQL Editor)

1. Open Supabase → Project → **SQL Editor** → **+ New query**.
2. For each migration file, in order:
   - Open the file in your editor (`backend/migrations/000N_*.sql`).
   - Copy its full contents into the SQL Editor.
   - Click **Run**. Wait for the green check.
3. Repeat for the next file.

Each file logs `NOTICE` lines reporting what it created. Errors stop execution
mid-file — re-running after fixing is safe (idempotent).

### Production safety

- **Take a snapshot first** (Supabase → Database → Backups → Create snapshot)
  before running migrations on a production project.
- Run migrations during a low-traffic window; the comms tables can experience
  brief lock contention while indexes are added.

---

## Verification queries

After each migration, confirm the schema landed.

### After 0001

```sql
-- Tables present
select table_name from information_schema.tables
 where table_schema = 'public' and table_name in
   ('event_channels','event_messages','event_message_reads','event_message_pins');
-- Channel types enum / check
select column_name, data_type from information_schema.columns
 where table_name = 'event_channels' and column_name in ('channel_type','visibility');
```

Expected: 4 rows for tables; 2 rows for columns.

### After 0002

```sql
select count(*) as owners_table_exists
  from information_schema.tables
 where table_schema='public' and table_name='event_owners';
```

Expected: `owners_table_exists = 1`.

### After 0003

```sql
-- Studios present
select count(*) as studios_table_exists
  from information_schema.tables
 where table_schema='public' and table_name='studios';

-- Backfill ran — every existing user has a studio + owner membership
select
  (select count(*) from auth.users)            as users,
  (select count(*) from studios)               as studios,
  (select count(distinct user_id) from studio_members where role='owner') as owners;

-- event_owners now carries studio_id
select column_name from information_schema.columns
 where table_name='event_owners' and column_name='studio_id';
```

Expected: `studios_table_exists = 1`; `users = studios = owners`; `studio_id` row returned.

### After 0004

```sql
-- Delivery status index exists
select indexname from pg_indexes
 where tablename='event_messages' and indexname like '%delivery%';
```

Expected: at least one matching index.

---

## What's NOT here (deliberate)

- **No automated runner.** No Alembic, no Prisma migrate, no shell script. Manual paste is
  the contract today. Trade-off: tiny ops surface, full visibility per file. Cost: humans
  must remember to apply migrations on each environment.
- **No down-migrations.** Forward-only by design. If you need to roll back a structural
  change, write a new forward migration that undoes it.
- **No tracked applied-versions table.** Re-running is safe because the SQL is idempotent;
  but there is no in-database record of "0003 was applied at T." Track that out-of-band
  (release notes / commit messages) until a runner lands.

## When a migration runner finally lands

Likely options when this gap is closed:

- Add `alembic` + a tiny FastAPI startup hook (Python-native, low ceremony).
- Add a one-line `psql -f` wrapper called from CI before deploy.
- Move to Supabase migrations CLI (`supabase db push`) — requires the project to be linked.

Each has trade-offs. None of them is in scope for the current trust-patch sprint.
