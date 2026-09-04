import tempfile
import unittest
import asyncio
import json
from urllib.parse import urlencode
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from threading import Barrier, Event
from unittest.mock import patch

from fastapi import FastAPI
from app.modules.nonogram_daily import api
from app.modules.nonogram_daily.service import DailyNotReady, DailyService, RedisDailyRepo, SQLiteDailyRepo, catalog, today
from app.modules.nonogram_daily.worker import prepare_upcoming, daily_lifespan
from app.modules.nonogram_battle.domain import solution_clues


def sample(size, difficulty):
    solution = [[column <= row for column in range(size)] for row in range(size)]
    rows, columns = solution_clues(solution)
    return solution, rows, columns


class DailyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "daily.sqlite3"
        self.repo = SQLiteDailyRepo(self.path)
        self.service = DailyService(self.repo, sample)

    def tearDown(self):
        self.temp.cleanup()

    def test_china_midnight_and_two_slots(self):
        before = datetime(2026, 9, 4, 15, 59, 59, tzinfo=timezone.utc)
        after = datetime(2026, 9, 4, 16, 0, 0, tzinfo=timezone.utc)
        self.assertEqual(today(before), "2026-09-04")
        self.assertEqual(today(after), "2026-09-05")
        a, b = catalog(before), catalog(after)
        self.assertEqual([(e["size"], e["difficulty"]) for e in a["entries"]], [(15, "hard"), (10, "expert")])
        self.assertEqual(a["refreshAt"], "2026-09-05T00:00:00+08:00")
        self.assertTrue(set(entry["id"] for entry in a["entries"]).isdisjoint(entry["id"] for entry in b["entries"]))

    def test_all_slots_are_persisted_and_immutable(self):
        with patch.object(self.service, "generator", wraps=sample) as generate:
            for entry in catalog()["entries"]:
                first = self.service.prepare_puzzle(today(), entry["size"], entry["difficulty"])
                self.assertEqual(self.service.get_puzzle(today(), entry["size"], entry["difficulty"]), first)
                restarted = DailyService(SQLiteDailyRepo(self.path), lambda *_: self.fail("Must not regenerate"))
                self.assertEqual(restarted.get_puzzle(today(), entry["size"], entry["difficulty"]), first)
            self.assertEqual(generate.call_count, 2)

    def test_concurrent_publication_returns_same_puzzle(self):
        barrier = Barrier(2)
        def generate(size, difficulty):
            barrier.wait(timeout=5)
            return sample(size, difficulty)
        services = [DailyService(SQLiteDailyRepo(self.path), generate) for _ in range(2)]
        with ThreadPoolExecutor(2) as pool:
            futures = [pool.submit(service.prepare_puzzle, today(), 15, "hard") for service in services]
            results = [future.result(timeout=10) for future in futures]
        self.assertEqual(results[0], results[1])
        self.assertEqual(self.repo.publish(results[0]["id"], {"wrong": True}), results[0])

    def test_reject_old_date_invalid_size_and_generation_failure(self):
        with self.assertRaises(ValueError):
            self.service.get_puzzle("2000-01-01", 10, "normal")
        with self.assertRaises(ValueError):
            self.service.get_puzzle(today(), 6, "normal")
        with patch.object(self.service, "generator", side_effect=ValueError("极难生成失败")):
            with self.assertRaises(ValueError):
                self.service.prepare_puzzle(today(), 10, "expert")
        self.service.prepare_puzzle(today(), 10, "expert")
        self.assertEqual(self.service.get_puzzle(today(), 10, "expert")["puzzle"]["difficulty"], "expert")

    def test_reads_never_generate_or_wait_for_generation_lock(self):
        with patch.object(self.service, "generator", side_effect=AssertionError("GET must not generate")):
            with self.service.locks[(15, "hard")]:
                with self.assertRaises(DailyNotReady):
                    self.service.get_puzzle(today(), 15, "hard")
            self.assertFalse(any(e["ready"] for e in self.service.get_catalog()["entries"]))

    def test_background_prepares_tomorrow_retries_and_preserves_published(self):
        with patch.object(self.service, "generator", wraps=sample) as generate:
            self.assertEqual(prepare_upcoming(self.service, day="2026-09-04"), 0)
            self.assertEqual(generate.call_count, 4)
            self.assertEqual(prepare_upcoming(self.service, day="2026-09-04"), 0)
            self.assertEqual(generate.call_count, 4)
            after = datetime(2026, 9, 4, 16, 0, tzinfo=timezone.utc)
            self.assertTrue(all(e["ready"] for e in self.service.get_catalog(after)["entries"]))
            self.service.get_puzzle("2026-09-05", 10, "expert", now=after)
        with patch.object(self.service, "generator", side_effect=ValueError("retry")), self.assertLogs("mahjong.daily", level="ERROR"):
            self.assertEqual(prepare_upcoming(self.service, day="2026-09-06"), 4)
        self.assertEqual(prepare_upcoming(self.service, day="2026-09-06"), 0)

    def test_lifespan_starts_and_stops_worker(self):
        started, ended = Event(), Event()
        def fake_run(service, stop):
            started.set()
            stop.wait(3)
            if stop.is_set():
                ended.set()
        async def exercise():
            async with daily_lifespan(None):
                self.assertTrue(await asyncio.to_thread(started.wait, 1))
        with patch("app.modules.nonogram_daily.worker.run", side_effect=fake_run):
            asyncio.run(exercise())
        self.assertTrue(ended.is_set())

    def test_redis_publishes_once_without_expiration(self):
        values = {}
        def set_value(key, value, *, nx):
            self.assertTrue(nx)
            if key not in values:
                values[key] = value
                return True
            return False
        with patch("app.modules.nonogram_daily.service.redis.Redis.from_url") as client:
            client.return_value.get.side_effect = values.get
            client.return_value.set.side_effect = set_value
            repo = RedisDailyRepo("redis://localhost:6379/0")
            self.assertIsNone(repo.get("test"))
            self.assertEqual(repo.publish("test", {"first": True}), {"first": True})
            self.assertEqual(repo.publish("test", {"second": True}), {"first": True})
            self.assertIn("mh:test", values)

    def test_http_contract(self):
        app = FastAPI()
        app.include_router(api.router, prefix="/api/nonogram-daily")
        async def request(path, params=None):
            events = []
            async def receive():
                return {"type": "http.request", "body": b"", "more_body": False}
            async def send(event):
                events.append(event)
            await app({"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1",
                       "method": "GET", "scheme": "http", "path": path, "root_path": "",
                       "query_string": urlencode(params or {}).encode(), "headers": [],
                       "server": ("test", 80), "client": ("test", 1)}, receive, send)
            start = next(event for event in events if event["type"] == "http.response.start")
            body = b"".join(event.get("body", b"") for event in events if event["type"] == "http.response.body")
            return start["status"], json.loads(body), dict(start["headers"])
        with patch.object(api, "service", self.service):
            status, listing, headers = asyncio.run(request("/api/nonogram-daily/catalog"))
            self.assertEqual(status, 200)
            self.assertEqual(len(listing["data"]["entries"]), 2)
            self.assertEqual(headers[b"cache-control"], b"no-store")
            params = {"date": today(), "size": 10, "difficulty": "expert"}
            status, _, headers = asyncio.run(request("/api/nonogram-daily/puzzle", params))
            self.assertEqual(status, 503)
            self.assertEqual(headers[b"retry-after"], b"10")
            self.service.prepare_puzzle(today(), 10, "expert")
            status, response, _ = asyncio.run(request("/api/nonogram-daily/puzzle", params))
            self.assertEqual(status, 200, response)
            self.assertEqual(response["data"]["puzzle"]["size"], 10)
            self.assertEqual(asyncio.run(request("/api/nonogram-daily/puzzle", {"date": today(), "size": 25, "difficulty": "expert"}))[0], 409)
            self.assertEqual(asyncio.run(request("/api/nonogram-daily/puzzle", {"date": today(), "size": 6}))[0], 422)
            self.assertEqual(asyncio.run(request("/api/nonogram-daily/puzzle", {"date": "2000-01-01", "size": 5}))[0], 409)


if __name__ == "__main__":
    unittest.main()
