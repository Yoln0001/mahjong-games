# _*_ coding : utf-8 _*_
# @Time : 2026/1/24 3:12
# @Author : Yoln
# @File : test_redis_repo_roundtrip
# @Project : mahjong-handle-web
# backend/tests/test_redis_repo_roundtrip.py
import os
import pytest

from app.repo import RedisGameRepo
from app.domain import evaluate_guess


REDIS_URL = os.getenv("REDIS_URL")


@pytest.mark.skipif(not REDIS_URL, reason="REDIS_URL not set; skip redis integration test")
def test_redis_repo_roundtrip_persists_state():
    repo = RedisGameRepo(
        redis_url=REDIS_URL,
        ttl_seconds=120,
        prefix="mh:test:v1:game:",
    )

    g = repo.create(hand_index=None, max_guess=8)
    user_id = "u1"

    # 第一次合法提交：必须持久化 hit_count_valid 与 history
    def updater(game):
        ok, err = evaluate_guess(game=game, user_id=user_id, guess_str="123m123p123s111z55z")
        assert err is None
        assert ok is not None
        return ok

    ok1 = repo.update(g.game_id, updater)
    assert ok1.remain == 7

    # 重新从 Redis 拉取，检查状态确实写回
    g2 = repo.get(g.game_id)
    assert g2 is not None
    assert user_id in g2.users
    assert g2.users[user_id].hit_count_valid == 1
    assert len(g2.users[user_id].history) == 1
