# _*_ coding : utf-8 _*_
# @Time : 2026/2/5 21:55
# @Author : Yoln
# @File : repo
# @Project : mahjong-handle-web
# backend/app/modules/link/repo.py
from __future__ import annotations

import json
import os
import time
from typing import Dict, Optional, Protocol, Callable, TypeVar, Any, List
import logging
import redis

T = TypeVar("T")
log = logging.getLogger("mahjong.link.repo")


class LinkRepo(Protocol):
    def create(self, initial: dict) -> dict: ...
    def get(self, game_id: str) -> Optional[dict]: ...
    def save(self, game_id: str, state: dict) -> None: ...
    def delete(self, game_id: str) -> None: ...
    def update(self, game_id: str, updater: Callable[[dict], T]) -> T: ...
    def ping(self) -> bool: ...
    @property
    def repo_type(self) -> str: ...


class InMemoryLinkRepo:
    def __init__(self, ttl_seconds: int = 24 * 3600):
        self._ttl = ttl_seconds
        self._store: Dict[str, tuple[float, dict]] = {}

    @property
    def repo_type(self) -> str:
        return "memory"

    def _gc(self) -> None:
        now = time.time()
        expired = [gid for gid, (ts, _) in self._store.items() if now - ts > self._ttl]
        for gid in expired:
            self._store.pop(gid, None)

    def create(self, initial: dict) -> dict:
        # link 的 game_id 在 service/domain 生成，这里假设 initial 已包含
        self._gc()
        gid = initial["gameId"]
        self._store[gid] = (time.time(), initial)
        return initial

    def get(self, game_id: str) -> Optional[dict]:
        self._gc()
        v = self._store.get(game_id)
        return v[1] if v else None

    def save(self, game_id: str, state: dict) -> None:
        self._store[game_id] = (time.time(), state)

    def delete(self, game_id: str) -> None:
        self._store.pop(game_id, None)

    def update(self, game_id: str, updater: Callable[[dict], T]) -> T:
        st = self.get(game_id)
        if st is None:
            raise KeyError("GAME_NOT_FOUND")
        result = updater(st)
        self.save(game_id, st)
        return result

    def ping(self) -> bool:
        return True


class RedisLinkRepo:
    def __init__(self, redis_url: str, ttl_seconds: int, prefix: str = "mh:v1:link:"):
        self._ttl = ttl_seconds
        self._prefix = prefix
        self._r = redis.Redis.from_url(redis_url, decode_responses=True)

    @property
    def repo_type(self) -> str:
        return "redis"

    def _key(self, game_id: str) -> str:
        return f"{self._prefix}{game_id}"

    def create(self, initial: dict) -> dict:
        gid = initial["gameId"]
        raw = json.dumps(initial, ensure_ascii=False)
        self._r.setex(self._key(gid), self._ttl, raw)
        return initial

    def get(self, game_id: str) -> Optional[dict]:
        raw = self._r.get(self._key(game_id))
        if raw is None:
            return None
        return json.loads(raw)

    def save(self, game_id: str, state: dict) -> None:
        raw = json.dumps(state, ensure_ascii=False)
        self._r.setex(self._key(game_id), self._ttl, raw)

    def delete(self, game_id: str) -> None:
        self._r.delete(self._key(game_id))

    def update(self, game_id: str, updater: Callable[[dict], T]) -> T:
        st = self.get(game_id)
        if st is None:
            raise KeyError("GAME_NOT_FOUND")
        result = updater(st)
        self.save(game_id, st)
        return result

    def ping(self) -> bool:
        try:
            return self._r.ping() is True
        except Exception:
            return False


def create_link_repo_from_env() -> LinkRepo:
    repo_type = os.getenv("GAME_REPO", "memory").lower()
    ttl = int(os.getenv("GAME_TTL_SECONDS", str(24 * 60 * 60)))

    if repo_type == "redis":
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        prefix = os.getenv("LINK_KEY_PREFIX", "mh:v1:link:")
        return RedisLinkRepo(redis_url=redis_url, ttl_seconds=ttl, prefix=prefix)

    return InMemoryLinkRepo(ttl_seconds=ttl)
