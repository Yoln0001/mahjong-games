# _*_ coding : utf-8 _*_
# @Time : 2026/1/21 22:39
# @Author : Yoln
# @File : repo
# @Project : mahjong-handle-web
# backend/app/repo.py
from __future__ import annotations

import json
import os
import time
from dataclasses import asdict
from typing import Dict, Optional, Protocol, Callable, TypeVar
import logging
import redis  # pip install redis

from .domain import (
    GameState,
    HandResultData,
    GuessEntry,
    UserProgress,
    new_game,
)

T = TypeVar("T")
log = logging.getLogger("mahjong.repo")
DEBUG_REPO_LOG = os.getenv("DEBUG_REPO_LOG", "").lower() in ("1", "true", "yes", "on")

# -------------------------
# 序列化 / 反序列化（向后兼容）
# -------------------------

def game_to_dict(game: GameState) -> dict:
    return asdict(game)


def _build_hand(hand_d: Optional[dict]) -> HandResultData:
    hand_d = hand_d or {}

    # ✅ 新增：必填字段的向后兼容默认值
    round_wind = int(hand_d.get("round_wind", 1))
    seat_wind = int(hand_d.get("seat_wind", 1))
    wind_raw = hand_d.get("wind_raw")
    if not wind_raw:
        # wind_raw 是两位数字字符串，例如 "23"
        wind_raw = f"{round_wind}{seat_wind}"

    return HandResultData(
        tiles_ascii_13=hand_d.get("tiles_ascii_13") or [],
        win_tile=hand_d.get("win_tile") or "",
        tsumo=bool(hand_d.get("tsumo", False)),

        # ✅ 补齐必填字段
        round_wind=round_wind,
        seat_wind=seat_wind,
        wind_raw=wind_raw,

        raw_14=hand_d.get("raw_14") or "",
        hand_index=int(hand_d.get("hand_index", 0)),

        han=int(hand_d.get("han", 0)),
        fu=int(hand_d.get("fu", 0)),
        cost=int(hand_d.get("cost", 0)),
        yaku_jp=hand_d.get("yaku_jp") or [],
        han_tip=hand_d.get("han_tip") or "",
        tip=hand_d.get("tip") or "",
    )



def game_from_dict(d: dict) -> GameState:
    # 顶层兼容：字段缺失不崩
    game_id = d.get("game_id") or d.get("gameId") or ""
    created_at = float(d.get("created_at", d.get("createdAt", time.time())))
    max_guess = int(d.get("max_guess", d.get("maxGuess", 8)))

    hand = _build_hand(d.get("hand"))

    users: Dict[str, UserProgress] = {}
    users_d = d.get("users") or {}

    for uid, pd in users_d.items():
        pd = pd or {}
        hist = []
        for ed in (pd.get("history") or []):
            ed = ed or {}
            hist.append(
                GuessEntry(
                    guess_tiles_14=ed.get("guess_tiles_14") or ed.get("guessTiles14") or [],
                    colors_14=ed.get("colors_14") or ed.get("colors14") or [],
                    created_at=float(ed.get("created_at", ed.get("createdAt", time.time()))),
                )
            )
        # ✅ 新增：结算字段向后兼容
        finished_at_raw = pd.get("finished_at", pd.get("finishedAt", None))
        finished_at = float(finished_at_raw) if finished_at_raw is not None else None
        users[uid] = UserProgress(
            hit_count_valid=int(pd.get("hit_count_valid", pd.get("hitCountValid", 0))),
            history=hist,
            finished=bool(pd.get("finished", False)),
            win=bool(pd.get("win", False)),
            # ✅ 新增字段（旧数据缺失时给默认值）
            score=int(pd.get("score", 0)),
            finished_at=finished_at,
        )

    return GameState(
        game_id=game_id,
        created_at=created_at,
        max_guess=max_guess,
        hand=hand,
        users=users,
    )


# -------------------------
# Repo 接口：update 强制写回 + ping
# -------------------------

class GameRepo(Protocol):
    def create(self, *, hand_index: int | None = None, max_guess: int = 8) -> GameState: ...
    def get(self, game_id: str) -> Optional[GameState]: ...
    def save(self, game: GameState) -> None: ...
    def delete(self, game_id: str) -> None: ...
    def update(self, game_id: str, updater: Callable[[GameState], T]) -> T: ...
    def ping(self) -> bool: ...
    @property
    def repo_type(self) -> str: ...


# -------------------------
# InMemory 实现
# -------------------------

class InMemoryGameRepo:
    def __init__(self, ttl_seconds: int = 24 * 3600):
        self._games: Dict[str, GameState] = {}
        self._ttl = ttl_seconds

    @property
    def repo_type(self) -> str:
        return "memory"

    def _gc(self) -> None:
        now = time.time()
        expired = [gid for gid, g in self._games.items() if now - g.created_at > self._ttl]
        for gid in expired:
            self._games.pop(gid, None)

    def create(self, *, hand_index: int | None = None, max_guess: int = 8) -> GameState:
        self._gc()
        g = new_game(hand_index=hand_index, max_guess=max_guess)
        self._games[g.game_id] = g
        return g

    def get(self, game_id: str) -> Optional[GameState]:
        self._gc()
        return self._games.get(game_id)

    def save(self, game: GameState) -> None:
        self._games[game.game_id] = game

    def delete(self, game_id: str) -> None:
        self._games.pop(game_id, None)

    def update(self, game_id: str, updater: Callable[[GameState], T]) -> T:
        g = self.get(game_id)
        if not g:
            raise KeyError("GAME_NOT_FOUND")
        result = updater(g)
        # 强制写回（内存就是覆盖）
        self.save(g)
        return result

    def ping(self) -> bool:
        return True


# -------------------------
# Redis 实现
# -------------------------

class RedisGameRepo:
    def __init__(
        self,
        redis_url: str,
        ttl_seconds: int = 24 * 3600,
        prefix: str = "mh:v1:game:",   # 默认带版本号
    ):
        self._ttl = ttl_seconds
        self._prefix = prefix
        self._r = redis.Redis.from_url(redis_url, decode_responses=True)

    @property
    def repo_type(self) -> str:
        return "redis"

    def _key(self, game_id: str) -> str:
        return f"{self._prefix}{game_id}"

    def create(self, *, hand_index: int | None = None, max_guess: int = 8) -> GameState:
        g = new_game(hand_index=hand_index, max_guess=max_guess)
        self.save(g)
        return g

    def get(self, game_id: str) -> Optional[GameState]:
        key = self._key(game_id)
        raw = self._r.get(key)
        if raw is None:
            return None

        try:
            d = json.loads(raw)
            return game_from_dict(d)
        except Exception as e:
            if DEBUG_REPO_LOG:
                log.exception(
                    "redis_get_decode_failed gameId=%s key=%s raw_head=%s",
                    game_id,
                    key,
                    raw[:80],
                )
            else:
                log.error(
                    "redis_get_decode_failed gameId=%s key=%s exc=%s",
                    game_id,
                    key,
                    type(e).__name__,
                )
            return None

    def save(self, game: GameState) -> None:
        raw = json.dumps(game_to_dict(game), ensure_ascii=False)
        self._r.setex(self._key(game.game_id), self._ttl, raw)

    def delete(self, game_id: str) -> None:
        self._r.delete(self._key(game_id))

    def update(self, game_id: str, updater: Callable[[GameState], T]) -> T:
        g = self.get(game_id)
        if not g:
            key = self._key(game_id)
            try:
                exists = int(self._r.exists(key))
                ttl = self._r.ttl(key)
                if exists == 1:
                    log.warning("redis_update_not_found_but_exists gameId=%s key=%s ttl=%s", game_id, key, ttl)
                else:
                    log.info("redis_update_not_found gameId=%s key=%s", game_id, key)
            except Exception:
                log.exception("redis_update_not_found_check_failed gameId=%s key=%s", game_id, key)

            raise KeyError("GAME_NOT_FOUND")

        result = updater(g)
        # 强制写回：所有修改都必须通过 update 才能持久化
        self.save(g)
        return result

    def ping(self) -> bool:
        try:
            return self._r.ping() is True
        except Exception:
            return False


# -------------------------
# 工厂：按环境变量选择 Repo
# -------------------------

def create_repo_from_env() -> GameRepo:
    repo_type = os.getenv("GAME_REPO", "memory").lower()
    ttl = int(os.getenv("GAME_TTL_SECONDS", str(60 * 60)))

    if repo_type == "redis":
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        prefix = os.getenv("GAME_KEY_PREFIX", "mh:v1:game:")
        return RedisGameRepo(redis_url=redis_url, ttl_seconds=ttl, prefix=prefix)

    return InMemoryGameRepo(ttl_seconds=ttl)
