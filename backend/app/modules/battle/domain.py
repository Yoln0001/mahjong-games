from __future__ import annotations

import random
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.modules.handle.domain import evaluate_guess, new_game
from app.modules.handle.repo import game_from_dict, game_to_dict

ModeType = str

_HANDLE_HANDS_PATH = Path(__file__).resolve().parent.parent / "handle" / "assets" / "hands.txt"
_WIND_MAP = {1: "东", 2: "南", 3: "西", 4: "北"}


def _wind_tip(round_wind: int, seat_wind: int) -> str:
    seat = _WIND_MAP.get(seat_wind, "未知")
    rnd = _WIND_MAP.get(round_wind, "未知")
    return f"自风：{seat}，场风：{rnd}"


def _is_tsumo_text(is_tsumo: bool) -> str:
    return "自摸" if is_tsumo else "荣和"


def _strip_tip_prefix(tip: str) -> str:
    if not tip:
        return ""
    return tip[3:] if tip.startswith("役种：") else tip


def _build_hint(*, tip: str, han_tip: str, round_wind: int, seat_wind: int, tsumo: bool) -> Dict[str, str]:
    return {
        "yakuTip": _strip_tip_prefix(tip),
        "hanTip": han_tip or "",
        "windTip": _wind_tip(round_wind, seat_wind),
        "isTsumo": _is_tsumo_text(tsumo),
    }


def _hint_from_game(game: Any) -> Dict[str, str]:
    hand = getattr(game, "hand", None)
    if hand is None:
        return {"yakuTip": "", "hanTip": "", "windTip": "", "isTsumo": ""}
    return _build_hint(
        tip=getattr(hand, "tip", "") or "",
        han_tip=getattr(hand, "han_tip", "") or "",
        round_wind=int(getattr(hand, "round_wind", 1)),
        seat_wind=int(getattr(hand, "seat_wind", 1)),
        tsumo=bool(getattr(hand, "tsumo", False)),
    )


def _current_game_created_at(progress: Dict[str, Any]) -> Optional[float]:
    current_game = progress.get("currentGame")
    if not isinstance(current_game, dict):
        return None
    raw = current_game.get("created_at", current_game.get("createdAt"))
    if raw is None:
        return None
    try:
        return float(raw)
    except Exception:
        return None


def _load_hands_count() -> int:
    if not _HANDLE_HANDS_PATH.exists():
        raise RuntimeError(f"hands file not found: {_HANDLE_HANDS_PATH.as_posix()}")
    with _HANDLE_HANDS_PATH.open("r", encoding="utf-8") as f:
        lines = [ln.strip() for ln in f.readlines() if ln.strip()]
    if not lines:
        raise RuntimeError("hands file is empty")
    return len(lines)


def _pick_hand_indices(question_count: int, total_hands: int) -> List[int]:
    if question_count <= total_hands:
        return random.sample(range(total_hands), question_count)
    return [random.randint(0, total_hands - 1) for _ in range(question_count)]


def _new_player_progress(*, mode: ModeType, hand_index: int, max_guess: int) -> Dict[str, Any]:
    game = new_game(hand_index=hand_index, max_guess=max_guess, rule_mode=mode)  # type: ignore[arg-type]
    return {
        "joinedAt": time.time(),
        "finished": False,
        "finishedAt": None,
        "currentQuestion": 0,
        "questionScores": [],
        "totalScore": 0,
        "currentGame": game_to_dict(game),
        "currentHint": _hint_from_game(game),
    }


def _refresh_match_status(state: Dict[str, Any]) -> None:
    players = state.get("players", {})
    player_ids = list(players.keys())
    if len(player_ids) < 2:
        state["status"] = "waiting"
        state["winnerUserId"] = None
        return

    p1 = players[player_ids[0]]
    p2 = players[player_ids[1]]
    both_finished = bool(p1.get("finished")) and bool(p2.get("finished"))
    state["status"] = "finished" if both_finished else "playing"

    if not both_finished:
        state["winnerUserId"] = None
        return

    s1 = int(p1.get("totalScore", 0))
    s2 = int(p2.get("totalScore", 0))
    if s1 == s2:
        state["winnerUserId"] = None
        state["isDraw"] = True
    elif s1 > s2:
        state["winnerUserId"] = player_ids[0]
        state["isDraw"] = False
    else:
        state["winnerUserId"] = player_ids[1]
        state["isDraw"] = False


def create_battle(
    *,
    creator_user_id: str,
    mode: ModeType,
    question_count: int,
    max_guess: int = 6,
) -> Dict[str, Any]:
    total_hands = _load_hands_count()
    indices = _pick_hand_indices(question_count, total_hands)

    state = {
        "matchId": uuid.uuid4().hex,
        "createdAt": time.time(),
        "mode": mode,
        "questionCount": question_count,
        "maxGuess": max_guess,
        "questionHandIndices": indices,
        "status": "waiting",
        "winnerUserId": None,
        "isDraw": False,
        "players": {
            creator_user_id: _new_player_progress(mode=mode, hand_index=indices[0], max_guess=max_guess),
        },
    }
    return state


def join_battle(state: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    players = state.setdefault("players", {})
    if user_id in players:
        return state
    if len(players) >= 2:
        raise ValueError("MATCH_FULL")

    indices: List[int] = state["questionHandIndices"]
    players[user_id] = _new_player_progress(
        mode=state["mode"],
        hand_index=indices[0],
        max_guess=int(state.get("maxGuess", 6)),
    )
    _refresh_match_status(state)
    return state


def submit_guess(state: Dict[str, Any], user_id: str, guess: str) -> Dict[str, Any]:
    players = state.get("players", {})
    if user_id not in players:
        raise ValueError("USER_NOT_IN_MATCH")

    progress = players[user_id]
    if progress.get("finished"):
        raise ValueError("PLAYER_FINISHED")

    current_game_dict = progress.get("currentGame")
    if not current_game_dict:
        raise ValueError("QUESTION_NOT_READY")

    game = game_from_dict(current_game_dict)
    ok, err = evaluate_guess(game=game, user_id=user_id, guess_str=guess)
    if err is not None:
        raise ValueError(err.code.value)

    assert ok is not None
    progress["currentGame"] = game_to_dict(game)

    question_index = int(progress.get("currentQuestion", 0))
    question_finished = bool(ok.finish)

    if question_finished:
        q_score = int(ok.score or 0)
        scores: List[int] = progress.setdefault("questionScores", [])
        scores.append(q_score)
        progress["totalScore"] = int(progress.get("totalScore", 0)) + q_score

        next_question = question_index + 1
        progress["currentQuestion"] = next_question

        if next_question >= int(state["questionCount"]):
            progress["finished"] = True
            progress["finishedAt"] = time.time()
            progress["currentGame"] = None
            progress["currentHint"] = None
        else:
            next_hand_index = state["questionHandIndices"][next_question]
            next_game = new_game(
                hand_index=next_hand_index,
                max_guess=int(state.get("maxGuess", 6)),
                rule_mode=state["mode"],  # type: ignore[arg-type]
            )
            progress["currentGame"] = game_to_dict(next_game)
            progress["currentHint"] = _hint_from_game(next_game)
    else:
        progress["currentHint"] = _build_hint(
            tip=ok.tip,
            han_tip=ok.han_tip,
            round_wind=int(getattr(game.hand, "round_wind", 1)),
            seat_wind=int(getattr(game.hand, "seat_wind", 1)),
            tsumo=bool(getattr(game.hand, "tsumo", False)),
        )

    _refresh_match_status(state)

    return {
        "questionIndex": question_index,
        "questionFinished": question_finished,
        "totalScore": int(progress.get("totalScore", 0)),
        "finish": bool(progress.get("finished", False)),
        "guess": {
            "guessTiles14": ok.guess_tiles_14,
            "colors14": ok.colors_14,
            "remain": ok.remain,
            "finish": ok.finish,
            "win": ok.win,
            "createdAt": ok.created_at,
            "score": ok.score,
            "hint": progress.get("currentHint"),
        },
    }


def enter_battle(state: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    players = state.get("players", {})
    if user_id not in players:
        raise ValueError("USER_NOT_IN_MATCH")

    progress = players[user_id]
    if progress.get("finished"):
        return state

    current_question = int(progress.get("currentQuestion", 0))
    question_count = int(state.get("questionCount", 0))
    if current_question >= question_count:
        return state

    current_game_dict = progress.get("currentGame")
    if not current_game_dict:
        return state

    game = game_from_dict(current_game_dict)
    game_users = getattr(game, "users", {}) or {}
    user_progress = game_users.get(user_id)
    hit_count_valid = int(getattr(user_progress, "hit_count_valid", 0) or 0) if user_progress else 0

    # Only reset the first-question timer when the player has not submitted any valid guess yet.
    if current_question == 0 and hit_count_valid == 0:
        hand_index = state["questionHandIndices"][0]
        next_game = new_game(
            hand_index=hand_index,
            max_guess=int(state.get("maxGuess", 6)),
            rule_mode=state.get("mode", "normal"),  # type: ignore[arg-type]
        )
        progress["currentGame"] = game_to_dict(next_game)
        progress["currentHint"] = _hint_from_game(next_game)

    progress["enteredAt"] = time.time()
    return state


def to_status_payload(state: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    players = state.get("players", {})
    me = players.get(user_id)
    if not me:
        raise ValueError("USER_NOT_IN_MATCH")

    opp_id = next((pid for pid in players.keys() if pid != user_id), None)
    opp = players.get(opp_id) if opp_id else None
    me_created_at = _current_game_created_at(me)
    opp_created_at = _current_game_created_at(opp or {})

    return {
        "matchId": state["matchId"],
        "status": state.get("status", "waiting"),
        "mode": state.get("mode", "normal"),
        "questionCount": int(state.get("questionCount", 0)),
        "maxGuess": int(state.get("maxGuess", 6)),
        "my": {
            "userId": user_id,
            "currentQuestion": int(me.get("currentQuestion", 0)),
            "totalScore": int(me.get("totalScore", 0)),
            "finished": bool(me.get("finished", False)),
            "questionScores": me.get("questionScores", []),
            "currentHint": me.get("currentHint"),
            "currentGameCreatedAt": me_created_at,
        },
        "opponent": {
            "userId": opp_id,
            "currentQuestion": int((opp or {}).get("currentQuestion", 0)),
            "totalScore": int((opp or {}).get("totalScore", 0)),
            "finished": bool((opp or {}).get("finished", False)),
            "questionScores": (opp or {}).get("questionScores", []),
            "currentHint": (opp or {}).get("currentHint"),
            "currentGameCreatedAt": opp_created_at,
        } if opp_id else None,
    }


def to_result_payload(state: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    players = state.get("players", {})
    if user_id not in players:
        raise ValueError("USER_NOT_IN_MATCH")

    if state.get("status") != "finished":
        raise ValueError("MATCH_NOT_FINISHED")

    return {
        "matchId": state["matchId"],
        "mode": state.get("mode", "normal"),
        "questionCount": int(state.get("questionCount", 0)),
        "winnerUserId": state.get("winnerUserId"),
        "isDraw": bool(state.get("isDraw", False)),
        "players": [
            {
                "userId": pid,
                "totalScore": int(p.get("totalScore", 0)),
                "finishedAt": p.get("finishedAt"),
                "questionScores": p.get("questionScores", []),
            }
            for pid, p in players.items()
        ],
    }
