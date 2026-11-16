#!/usr/bin/env python3
"""Nightly retention for guest photos: remove photos 90 days after their event,
and every photo of an event the host deleted.

SQL cannot delete a Supabase Storage file, so pg_cron cannot do this job the
way it purges RSVPs (009) and guest questions (024). The database names the
photos that are due (guest_photos_due_for_purge, migration 025); this removes
their files through the Storage API, then their rows.

Scheduled nightly by the `ngw-guest-photo-purge` cron service in render.yaml
(08:17 UTC), with the API service's DATABASE_URL, SUPABASE_URL and
SUPABASE_SERVICE_ROLE_KEY. The owner approves that service in Render. By hand:

    cd backend && python scripts/purge_guest_photos.py

Exits non-zero when Storage refuses a delete; the rows stay, so the next run
retries them.
"""
import asyncio
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app.db import close_pool  # noqa: E402
from app.routers.guest_photos import (  # noqa: E402
    RETENTION_DAYS_AFTER_EVENT, _storage_configured, purge_old_guest_photos,
)


async def main() -> int:
    if not _storage_configured():
        print("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.", file=sys.stderr)
        return 2
    try:
        removed = await purge_old_guest_photos(RETENTION_DAYS_AFTER_EVENT)
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        return 1
    finally:
        await close_pool()
    print(f"Removed {removed} guest photo(s).")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
