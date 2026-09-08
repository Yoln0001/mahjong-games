import asyncio
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI

from app.modules.nonogram_daily.service import SQLiteDailyRepo
from app.modules.nonogram_share import api
from app.modules.nonogram_share.service import ShareService
from app.modules.nonogram_battle.domain import solution_clues


def puzzle(size=5):
    solution = [[row == column or row + column == size - 1 for column in range(size)] for row in range(size)]
    rows, columns = solution_clues(solution)
    return {"size": size, "difficulty": "hard", "solution": solution, "rowClues": rows, "columnClues": columns}


class ShareTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.service = ShareService(SQLiteDailyRepo(Path(self.temp.name) / "shares.sqlite3"))

    def tearDown(self):
        self.temp.cleanup()

    def test_same_puzzle_has_stable_link_and_survives_restart(self):
        first = self.service.publish(puzzle())
        second = self.service.publish(puzzle())
        self.assertEqual(first, second)
        self.assertEqual(len(first["id"]), 20)
        restarted = ShareService(SQLiteDailyRepo(Path(self.temp.name) / "shares.sqlite3"))
        self.assertEqual(restarted.get(first["id"]), first)

    def test_rejects_invalid_size_shape_and_clues(self):
        invalid = puzzle()
        invalid["rowClues"][0] = [99]
        with self.assertRaisesRegex(ValueError, "线索"):
            self.service.publish(invalid)
        invalid = puzzle()
        invalid["solution"][0].pop()
        with self.assertRaisesRegex(ValueError, "题目数据"):
            self.service.publish(invalid)
        invalid = puzzle()
        invalid["size"] = 6
        with self.assertRaisesRegex(ValueError, "尺寸"):
            self.service.publish(invalid)

    def test_http_create_read_and_not_found(self):
        app = FastAPI()
        app.include_router(api.router, prefix="/api/nonogram-share")

        async def request(method, path, body=None):
            events = []
            sent = False
            async def receive():
                nonlocal sent
                if sent:
                    return {"type": "http.disconnect"}
                sent = True
                return {"type": "http.request", "body": json.dumps(body).encode() if body else b"", "more_body": False}
            async def send(event):
                events.append(event)
            await app({"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1",
                       "method": method, "scheme": "http", "path": path, "root_path": "",
                       "query_string": b"", "headers": [(b"content-type", b"application/json")],
                       "server": ("test", 80), "client": ("test", 1)}, receive, send)
            start = next(event for event in events if event["type"] == "http.response.start")
            data = b"".join(event.get("body", b"") for event in events if event["type"] == "http.response.body")
            return start["status"], json.loads(data), dict(start["headers"])

        with patch.object(api, "service", self.service):
            status, created, _ = asyncio.run(request("POST", "/api/nonogram-share", puzzle()))
            self.assertEqual(status, 200, created)
            share_id = created["data"]["id"]
            status, loaded, headers = asyncio.run(request("GET", f"/api/nonogram-share/{share_id}"))
            self.assertEqual(status, 200)
            self.assertEqual(loaded["data"], created["data"])
            self.assertEqual(headers[b"cache-control"], b"public, max-age=86400")
            self.assertEqual(asyncio.run(request("GET", "/api/nonogram-share/not-valid"))[0], 404)
            self.assertEqual(asyncio.run(request("GET", "/api/nonogram-share/aaaaaaaaaaaaaaaaaaaa"))[0], 404)


if __name__ == "__main__":
    unittest.main()
