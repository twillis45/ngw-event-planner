# NGW Events API (FastAPI)

Operational communication ledger backend. Pattern: **frontend → this API → Supabase Postgres → Resend**. No direct frontend DB writes; no realtime.

## Routes (prefix `/api/events/{event_id}/communication`)
- `GET  /channels` — list (idempotently ensures CLIENT + INTERNAL_TEAM)
- `POST /channels/ensure`
- `GET  /channels/{channel_type}/messages`
- `POST /channels/{channel_type}/messages` — standard / approval_request
- `PATCH /messages/{message_id}` — body or approval transition (pending → approved/rejected/expired)
- `POST /messages/{message_id}/pin` · `DELETE /messages/{message_id}/pin`
- `POST /channels/{channel_type}/read`
- `GET /health`

## Run locally
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL etc.
uvicorn app.main:app --reload --port 8000
# smoke test:
curl localhost:8000/health
```

## Apply the schema
Supabase → SQL Editor → run `migrations/0001_communication.sql`.

## Deploy to Render
- New **Web Service**, root dir `backend/`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Set env vars from `.env.example` in the Render dashboard.

## Frontend wiring
Set `REACT_APP_API_BASE_URL=<your Render URL>` in the frontend `.env.local`.
The frontend client is `src/lib/commApi.js`.

## ⚠️ Security status — NOT production-complete
- **No real auth yet.** INTERNAL_TEAM + write routes are gated by a shared `PLANNER_DEV_TOKEN` header (`X-Planner-Token`). That is a temporary dev guard — anyone with the token + URL can write. Replace with Supabase Auth JWT verification + event-ownership checks before real data.
- RLS denies the anon role; the API connects via the Postgres role in `DATABASE_URL` (the intended server path).
- Email failures are logged and never block message creation.

## Parked (per scope)
realtime, typing/presence, reactions, threads, file uploads, vendor chat, SMS, push, AI auto-messaging, direct frontend DB writes.
