# _*_ coding : utf-8 _*_
# @Time : 2026/1/23 21:34
# @Author : Yoln
# @File : test_guess_rules
# @Project : mahjong-handle-web
import time
from app.modules.handle.domain import (
    GameState,
    HandResultData,
    evaluate_guess,
    GuessErrorCode,
)


def _make_game() -> GameState:
    hand = HandResultData(
        tiles_ascii_13=["1m","2m","3m","1p","2p","3p","1s","2s","3s","1z","1z","1z","5z"],
        win_tile="5z",
        tsumo=False,
        raw_14="123m123p123s111z55z",
        hand_index=0,
        han=1,
        fu=30,
        cost=1000,
        yaku_jp=["立直"],
        han_tip="1番30符 1000点 (包括立直)",
        tip="提示: 立直",
    )
    return GameState(
        game_id="test_game",
        created_at=time.time(),
        max_guess=8,
        hand=hand,
        users={},
    )


def test_valid_guess_consumes_attempt_and_appends_history():
    game = _make_game()
    user = "u1"

    ok, err = evaluate_guess(game=game, user_id=user, guess_str="123m123p123s111z55z")
    assert err is None
    assert ok is not None

    progress = game.users[user]
    assert progress.hit_count_valid == 1
    assert len(progress.history) == 1
    assert len(ok.colors_14) == 14
    assert ok.remain == 7


def test_invalid_format_does_not_consume_attempt_or_history_or_state():
    game = _make_game()
    user = "u1"

    ok, err = evaluate_guess(game=game, user_id=user, guess_str="abc???###")
    assert ok is None
    assert err is not None
    assert err.code == GuessErrorCode.FORMAT_ERROR

    # 非法输入不应写入用户状态
    assert user not in game.users


def test_not_winning_or_no_yaku_does_not_consume_attempt_or_history_or_state():
    game = _make_game()
    user = "u1"

    ok, err = evaluate_guess(game=game, user_id=user, guess_str="19m19p19s123m123p11z")
    assert ok is None
    assert err is not None
    assert err.code == GuessErrorCode.NOT_WINNING_HAND

    assert user not in game.users
