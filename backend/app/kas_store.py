"""The one INSERT into `kas_records`.

Extracted 2026-09-24. Two callers write this table and they are NOT the same
operation, which is why only the statement is shared and not the surrounding
logic:

  kas.py     an admin batch upsert — optimistic concurrency against updated_at,
             plus an admin_audit_log entry naming the principal.
  kroger.py  a system-generated price observation — no principal to attribute,
             no concurrent editor to lose a write to, so neither applies.

Folding the whole write would have dragged the audit/principal requirement into
a path that has no principal. Folding only the statement removes the thing that
can actually rot: `kas_records` gains a column, one of two identical INSERTs is
updated, and the other starts writing rows with a hole in it — silently, because
a missing column is a default and not an error. That failure mode is already
recorded in this backend's own test header for the sync helpers ("a mistyped key
maps to None and the row is written with a hole in it rather than rejected").

Note the deliberate asymmetry that survives the fold: `kind` and `created_by`
are re-asserted on conflict. For the admin path that is the existing behaviour.
For an observation both are constant ('observation' / 'kroger-api'), so setting
them again is a no-op — which is why one statement can serve both without either
caller changing behaviour.
"""

import json

UPSERT_SQL = """
    insert into kas_records (id, kind, data, asset_id, created_by, updated_at)
    values ($1, $2, $3::jsonb, $4, $5, now())
    on conflict (id) do update set
      kind=excluded.kind, data=excluded.data, asset_id=excluded.asset_id,
      created_by=excluded.created_by, updated_at=now()
"""


async def upsert_kas_record(conn, record: dict, kind: str, asset_id, created_by):
    """Write one KAS record on an existing connection.

    Takes a connection rather than acquiring one, so the caller keeps control of
    its own transaction — kas.py writes a batch and an audit row atomically.
    """
    await conn.execute(UPSERT_SQL, record["id"], kind, json.dumps(record), asset_id, created_by)
