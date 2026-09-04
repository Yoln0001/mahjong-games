from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Lock

import redis

from app.modules.nonogram_battle.domain import generate_puzzle

DAILY_CHOICES = ((15, "hard"), (10, "expert"))
CHINA_TIME = timezone(timedelta(hours=8))


def today(now=None):
    return (now or datetime.now(timezone.utc)).astimezone(CHINA_TIME).date().isoformat()


def puzzle_id(day, size, difficulty):
    return f"nonogram-daily:v1:{day}:{size}:{difficulty}"


def catalog(now=None):
    day = today(now)
    midnight = datetime.fromisoformat(day).replace(tzinfo=CHINA_TIME) + timedelta(days=1)
    return {
        "date": day,
        "timeZone": "Asia/Shanghai",
        "refreshAt": midnight.isoformat(),
        "entries": [
            {"id": puzzle_id(day, size, difficulty), "size": size, "difficulty": difficulty}
            for size, difficulty in DAILY_CHOICES
        ],
    }


class SQLiteDailyRepo:
    """Persistent local-development storage. INSERT OR IGNORE publishes once."""
    def __init__(self, path):
        self.path = Path(path)

    def connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self.path), timeout=15)
        conn.execute("CREATE TABLE IF NOT EXISTS daily (id TEXT PRIMARY KEY, payload TEXT NOT NULL)")
        return conn

    def get(self, key):
        conn = self.connect()
        try:
            row = conn.execute("SELECT payload FROM daily WHERE id=?", (key,)).fetchone()
            return json.loads(row[0]) if row else None
        finally:
            conn.close()

    def publish(self, key, payload):
        conn = self.connect()
        try:
            with conn:
                conn.execute("INSERT OR IGNORE INTO daily(id,payload) VALUES (?,?)",
                             (key, json.dumps(payload, ensure_ascii=False)))
                row = conn.execute("SELECT payload FROM daily WHERE id=?", (key,)).fetchone()
            return json.loads(row[0])
        finally:
            conn.close()


class RedisDailyRepo:
    def __init__(self, url):
        self.redis = redis.Redis.from_url(url, decode_responses=True,
                                          socket_connect_timeout=3, socket_timeout=3)

    def get(self, key):
        raw = self.redis.get(f"mh:{key}")
        return json.loads(raw) if raw else None

    def publish(self, key, payload):
        # All concurrent workers return the winner's immutable puzzle.
        # Do not expire published puzzles: deployments must not change today's set.
        self.redis.set(f"mh:{key}", json.dumps(payload, ensure_ascii=False), nx=True)
        published = self.get(key)
        if published is None:
            raise RuntimeError("Published daily puzzle disappeared from storage")
        return published


def create_repo():
    if os.getenv("GAME_REPO", "memory").lower() == "redis":
        return RedisDailyRepo(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    default = Path(__file__).resolve().parents[3] / "data" / "nonogram-daily.sqlite3"
    return SQLiteDailyRepo(os.getenv("NONOGRAM_DAILY_DB_PATH", str(default)))


class DailyNotReady(Exception):
    pass


class DailyService:
    def __init__(self, repo, generator=generate_puzzle):
        self.repo = repo
        self.generator = generator
        self.locks = {choice: Lock() for choice in DAILY_CHOICES}

    def get_catalog(self, now=None):
        result = catalog(now)
        for entry in result["entries"]:
            entry["ready"] = self.repo.get(entry["id"]) is not None
        return result

    def get_puzzle(self, day, size, difficulty, now=None):
        if day != today(now):
            raise ValueError("日期已更新，请刷新每日题目列表。")
        if (size, difficulty) not in DAILY_CHOICES:
            raise ValueError("无效的每日题目尺寸或难度。")
        # Player requests never generate puzzles or wait for generation locks.
        existing = self.repo.get(puzzle_id(day, size, difficulty))
        if existing is None:
            raise DailyNotReady("本题尚未就绪，后台正在补齐题库，请稍后再来。")
        return existing

    def prepare_puzzle(self, day, size, difficulty):
        """Background-only publication; accepts future dates without exposing them."""
        if (size, difficulty) not in DAILY_CHOICES:
            raise ValueError("无效的每日题目尺寸或难度。")
        key = puzzle_id(day, size, difficulty)
        with self.locks[(size, difficulty)]:
            existing = self.repo.get(key)
            if existing is not None:
                return existing
            # Failed candidates are retried by the background worker, never by GET.
            solution, rows, columns = self.generator(size, difficulty)
            payload = {
                "id": key, "date": day,
                "puzzle": {"size": size, "difficulty": difficulty, "solution": solution,
                           "rowClues": rows, "columnClues": columns},
            }
            return self.repo.publish(key, payload)
