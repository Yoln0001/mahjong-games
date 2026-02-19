from __future__ import annotations

import json
import os
import time
from typing import Callable, Dict, Optional, Protocol, TypeVar

import redis

T = TypeVar("T")


class BattleRepo(Protocol):
    def create(self, initial: dict) -> dict: ...
    def get(self, match_id: str) -> Optional[dict]: ...
    def save(self, match_id: str, state: dict) -> None: ...
    def delete(self, match_id: str) -> None: ...
    def update(self, match_id: str, updater: Callable[[dict], T]) -> T: ...
    def ping(self) -> bool: ...
    @property
    def repo_type(self) -> str: ...


class InMemoryBattleRepo:
    def __init__(self, ttl_seconds: int = 24 * 3600):
        self._ttl = ttl_seconds
        self._store: Dict[str, tuple[float, dict]] = {}

    @property
    def repo_type(self) -> str:
        return "memory"

    def _gc(self) -> None:
        now = time.time()
        expired = [mid for mid, (ts, _) in self._store.items() if now - ts > self._ttl]
        for mid in expired:
            self._store.pop(mid, None)

    def create(self, initial: dict) -> dict:
        self._gc()
        mid = initial["matchId"]
        self._store[mid] = (time.time(), initial)
        return initial

    def get(self, match_id: str) -> Optional[dict]:
        self._gc()
        v = self._store.get(match_id)
        return v[1] if v else None

    def save(self, match_id: str, state: dict) -> None:
        self._store[match_id] = (time.time(), state)

    def delete(self, match_id: str) -> None:
        self._store.pop(match_id, None)

    def update(self, match_id: str, updater: Callable[[dict], T]) -> T:
        state = self.get(match_id)
        if state is None:
            raise KeyError("MATCH_NOT_FOUND")
        result = updater(state)
        self.save(match_id, state)
        return result

    def ping(self) -> bool:
        return True


class RedisBattleRepo:
    def __init__(self, redis_url: str, ttl_seconds: int, prefix: str = "mh:v1:battle:"):
        self._ttl = ttl_seconds
        self._prefix = prefix
        self._r = redis.Redis.from_url(redis_url, decode_responses=True)

    @property
    def repo_type(self) -> str:
        return "redis"

    def _key(self, match_id: str) -> str:
        return f"{self._prefix}{match_id}"

    def create(self, initial: dict) -> dict:
        mid = initial["matchId"]
        raw = json.dumps(initial, ensure_ascii=False)
        self._r.setex(self._key(mid), self._ttl, raw)
        return initial

    def get(self, match_id: str) -> Optional[dict]:
        raw = self._r.get(self._key(match_id))
        if raw is None:
            return None
        return json.loads(raw)

    def save(self, match_id: str, state: dict) -> None:
        raw = json.dumps(state, ensure_ascii=False)
        self._r.setex(self._key(match_id), self._ttl, raw)

    def delete(self, match_id: str) -> None:
        self._r.delete(self._key(match_id))

    def update(self, match_id: str, updater: Callable[[dict], T]) -> T:
        state = self.get(match_id)
        if state is None:
            raise KeyError("MATCH_NOT_FOUND")
        result = updater(state)
        self.save(match_id, state)
        return result

    def ping(self) -> bool:
        try:
            return self._r.ping() is True
        except Exception:
            return False


def create_battle_repo_from_env() -> BattleRepo:
    repo_type = os.getenv("GAME_REPO", "memory").lower()
    ttl = int(os.getenv("BATTLE_TTL_SECONDS", os.getenv("GAME_TTL_SECONDS", str(24 * 60 * 60))))

    if repo_type == "redis":
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        prefix = os.getenv("BATTLE_KEY_PREFIX", "mh:v1:battle:")
        return RedisBattleRepo(redis_url=redis_url, ttl_seconds=ttl, prefix=prefix)

    return InMemoryBattleRepo(ttl_seconds=ttl)
