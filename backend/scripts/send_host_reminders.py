#!/usr/bin/env python3
"""Daily: the week-before reminder to each host whose event is 7 days away
(plan G87, owner ruling 11/19/2026). The rules are in app/host_reminders.py.

Scheduled by the `ngw-host-reminders` cron service in render.yaml, with the API
service's DATABASE_URL and email settings. The owner approves that service in
Render. By hand:

    cd backend && python scripts/send_host_reminders.py

Prints counts only, never an address. Exits non-zero when nothing could be
sent at all (email not configured, migration 031 or 032 missing, no
database), so that run shows red in Render; one host's failure does not.
"""
import asyncio
import logging
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app.db import close_pool, get_pool  # noqa: E402
from app.host_reminders import run  # noqa: E402


async def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    try:
        counts = await run(get_pool)
    except Exception as e:  # noqa: BLE001 — no database, say so without details
        print(f"Host reminders did not run: {type(e).__name__}", file=sys.stderr)
        return 1
    finally:
        await close_pool()
    print("Host reminders: " + " ".join(f"{k}={v}" for k, v in counts.items()))
    return 1 if "blocked" in counts else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
