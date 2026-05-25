# Supabase Setup — NGW Events Communication Layer (Phase 1A)

This wires the event communication layer to Supabase. **Auth-first**: the planner
logs in, events are owned by that account, and Row Level Security keeps internal
notes private to the owning planner.

> Status: **foundation only**. The client + migration + RLS are in place. The
> login gate and comms read/write wiring are the next increments and need your
> live project to test. Nothing here changes the existing localStorage app until
> you add the env vars below.

## 1. Get your project keys
In your Supabase project → **Settings → API**:
- **Project URL** → `REACT_APP_SUPABASE_URL`
- **anon / publishable key** → `REACT_APP_SUPABASE_ANON_KEY`

⚠️ Use the **anon** key only. Never the `service_role` key — it would leak into the
public JS bundle.

## 2. Add env vars locally
```bash
cp .env.example .env.local      # .env.local is gitignored
# then edit .env.local and paste your URL + anon key
```
Restart `npm start` after editing (CRA only reads env at boot).

For the deployed GitHub Pages build, the values must be present at **build time**
(`npm run build`). Set them in your shell or CI before building.

## 3. Run the migration
Supabase → **SQL Editor** → paste the contents of
`supabase/migrations/0001_communication.sql` → **Run**.

Creates: `event_owners`, `event_channels`, `event_messages`, `channel_read_state`,
`pinned_decisions`, the `owns_event()` helper, and **owner-scoped RLS**.

## 4. Enable auth (for the login increment)
Supabase → **Authentication → Providers → Email** → enable.
Then **Authentication → URL Configuration** → add your redirect URLs:
- `http://localhost:3000/ngw-event-planner` (local)
- `https://twillis45.github.io/ngw-event-planner` (production)

## Security model (read this)
- **Owner-scoped:** a planner reads/writes only events they own (`event_owners`).
  Internal notes are unreadable by anyone else.
- **Anon key is public** (it's in the bundle) — RLS is the boundary, not the key.
- **Client read access is NOT enabled yet.** Letting a client read their own CLIENT
  channel safely requires tokenized access via a Supabase Edge Function. Do **not**
  open the `anon` role to the comms tables to shortcut this.
- The `DEV-ONLY` policies at the bottom of the migration are commented out and must
  stay that way for anything with real data.

## What's NOT built yet (parked per scope)
realtime subscriptions, typing/presence, push/SMS, reactions, threaded replies,
vendor channels, file uploads, client signature on approvals, AI auto-messaging.
