"""Prepare today's missing puzzles and tomorrow's set independently of HTTP traffic."""
import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import date, timedelta
from threading import Event, Thread

from .service import DAILY_CHOICES, today

log = logging.getLogger("mahjong.daily")


def prepare_upcoming(service, stop=None, day=None):
    current = date.fromisoformat(day or today())
    failures = 0
    for offset in (0, 1):
        target = (current + timedelta(days=offset)).isoformat()
        for size, difficulty in DAILY_CHOICES:
            if stop is not None and stop.is_set():
                return failures
            try:
                service.prepare_puzzle(target, size, difficulty)
            except Exception:
                failures += 1
                log.exception("Daily preparation failed: %s %s %s; will retry", target, size, difficulty)
    return failures


def run(service, stop):
    while not stop.is_set():
        # Repeat even when complete: detects midnight, restarts and missing storage.
        failures = prepare_upcoming(service, stop)
        stop.wait(10 if failures else 60)


@asynccontextmanager
async def daily_lifespan(app):
    from .api import service
    stop = Event()
    thread = Thread(target=run, args=(service, stop), name="daily-pregeneration", daemon=True)
    thread.start()
    try:
        yield
    finally:
        stop.set()
        # asyncio.to_thread is Python 3.9+; production currently runs Python 3.8.
        await asyncio.get_running_loop().run_in_executor(None, thread.join, 10)


if __name__ == "__main__":
    from .service import DailyService, create_repo
    # Optional deployment preflight: complete both days before opening traffic.
    raise SystemExit(1 if prepare_upcoming(DailyService(create_repo())) else 0)
