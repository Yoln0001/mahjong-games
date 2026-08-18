from __future__ import annotations

import json
import os
import time
from typing import Callable, Dict, Optional, Protocol, TypeVar

import redis

T = TypeVar("T")


class Repo(Protocol):
    def create(self, state: dict) -> dict: ...
    def get(self, match_id: str) -> Optional[dict]: ...
    def update(self, match_id: str, updater: Callable[[dict], T]) -> T: ...


class MemoryRepo:
    def __init__(self, ttl: int = 86400):
        self.ttl = ttl
        self.store: Dict[str, tuple[float, dict]] = {}

    def create(self, state: dict) -> dict:
        self.store[state["matchId"]] = (time.time(), state)
        return state

    def get(self, match_id: str) -> Optional[dict]:
        value = self.store.get(match_id)
        if not value:
            return None
        if time.time() - value[0] > self.ttl:
            self.store.pop(match_id, None)
            return None
        return value[1]

    def update(self, match_id: str, updater: Callable[[dict], T]) -> T:
        state = self.get(match_id)
        if state is None:
            raise KeyError("MATCH_NOT_FOUND")
        result = updater(state)
        self.store[match_id] = (time.time(), state)
        return result


class RedisRepo:
    def __init__(self, url: str, ttl: int):
        self.redis = redis.Redis.from_url(url, decode_responses=True)
        self.ttl = ttl

    def key(self, match_id: str) -> str:
        return f"mh:v1:nonogram-battle:{match_id}"

    def create(self, state: dict) -> dict:
        self.redis.setex(self.key(state["matchId"]), self.ttl, json.dumps(state, ensure_ascii=False))
        return state

    def get(self, match_id: str) -> Optional[dict]:
        raw = self.redis.get(self.key(match_id))
        return json.loads(raw) if raw else None

    def update(self, match_id: str, updater: Callable[[dict], T]) -> T:
        state = self.get(match_id)
        if state is None:
            raise KeyError("MATCH_NOT_FOUND")
        result = updater(state)
        self.redis.setex(self.key(match_id), self.ttl, json.dumps(state, ensure_ascii=False))
        return result


def create_repo() -> Repo:
    ttl = int(os.getenv("GAME_TTL_SECONDS", "86400"))
    if os.getenv("GAME_REPO", "memory").lower() == "redis":
        return RedisRepo(os.getenv("REDIS_URL", "redis://localhost:6379/0"), ttl)
    return MemoryRepo(ttl)
