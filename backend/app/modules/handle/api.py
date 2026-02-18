# _*_ coding : utf-8 _*_
# @Time : 2026/1/24 21:44
# @Author : Yoln
# @File : game
# @Project : mahjong-handle-web
from __future__ import annotations

from fastapi import APIRouter

from app.modules.handle.domain import UserProgress, evaluate_guess
from app.api.deps import log, handle_repo
from app.modules.handle.schemas import ApiError, ApiResponse, GuessReq, ResetReq, StartReq

router = APIRouter()

# -----------------------------
# Hint builders (aligned with domain.HandResultData)
# -----------------------------

_WIND_MAP = {1: "东", 2: "南", 3: "西", 4: "北"}


def _strip_tip_prefix(tip: str) -> str:
    """Strip '提示:' prefix and return the yaku name as-is (no mapping)."""
    if not tip:
        return ""
    for sep in ("提示:", "提示："):
        if tip.startswith(sep):
            return tip[len(sep):].strip()
    return tip.strip()


def _remove_tsumo_from_han_tip(han_tip: str) -> str:
    """Remove '自摸' from the '(包括...)' part of hanTip, keep others."""
    if not han_tip:
        return ""

    l = han_tip.find("(")
    r = han_tip.rfind(")")
    if l == -1 or r == -1 or r <= l:
        return han_tip.strip()

    main = han_tip[:l].strip()
    bracket = han_tip[l + 1:r].strip().replace("，", ",")
    if not bracket.startswith("包括"):
        return han_tip.strip()

    items = [x.strip() for x in bracket[len("包括"):].split(",") if x.strip()]
    items = [x for x in items if x != "自摸"]
    if not items:
        return main
    return f"{main} (包括{','.join(items)})"


def _wind_tip(round_wind: int, seat_wind: int) -> str:
    seat = _WIND_MAP.get(seat_wind, "未知")
    rnd = _WIND_MAP.get(round_wind, "未知")
    return f"自风：{seat}，场风：{rnd}"


def _is_tsumo_text(is_tsumo: bool) -> str:
    return "自摸" if is_tsumo else "荣和"


def _build_hint(*, tip: str, han_tip: str, round_wind: int, seat_wind: int, tsumo: bool) -> dict:
    """Build the hint payload expected by the frontend."""
    return {
        "yakuTip": _strip_tip_prefix(tip),
        "hanTip": _remove_tsumo_from_han_tip(han_tip),
        "windTip": _wind_tip(round_wind, seat_wind),
        "isTsumo": _is_tsumo_text(tsumo),
    }


def _build_answer_payload(game) -> dict:
    """Build answer payload for settlement modal.

    Only call this when the game is finished to avoid leaking the answer early.
    """
    hand = getattr(game, "hand", None)
    if hand is None:
        return {}

    tiles13 = list(getattr(hand, "tiles_ascii_13", []) or [])
    win_tile = getattr(hand, "win_tile", None)
    tiles14 = tiles13 + ([win_tile] if win_tile else [])
    tiles14 = [t for t in tiles14 if t]

    payload = {}
    if len(tiles14) == 14:
        payload["answerTiles14"] = tiles14

    raw14 = getattr(hand, "raw_14", None)
    if isinstance(raw14, str) and raw14.strip():
        payload["answerStr"] = raw14.strip()

    return payload


def _ensure_user(game, user_id: str) -> bool:
    """Ensure user progress exists.

    IMPORTANT: must be called inside ``repo.update`` so that state is written back.
    """
    game.users.setdefault(user_id, UserProgress())
    return True


# ✅ 改动：去掉 /game 前缀，由 app/api/router.py 统一加 prefix="/game"
@router.post("/start", response_model=ApiResponse)
def start_game(req: StartReq) -> ApiResponse:
    g = handle_repo.create(hand_index=req.handIndex, max_guess=req.maxGuess, rule_mode=req.ruleMode)

    _ensure_user(g, req.userId)
    handle_repo.save(g)

    log.info("game_start gameId=%s userId=%s maxGuess=%s", g.game_id, req.userId, g.max_guess)

    return ApiResponse(
        ok=True,
        data={
            "gameId": g.game_id,
            "maxGuess": g.max_guess,
            "createdAt": g.created_at,
            "ruleMode": g.rule_mode,
            "hint": _build_hint(
                tip=g.hand.tip,
                han_tip=g.hand.han_tip,
                round_wind=getattr(g.hand, "round_wind", 1),
                seat_wind=getattr(g.hand, "seat_wind", 1),
                tsumo=bool(getattr(g.hand, "tsumo", False)),
            ),
        },
        error=None,
    )


# ✅ 改动：去掉 /game 前缀
@router.post("/{game_id}/guess", response_model=ApiResponse)
def guess(game_id: str, req: GuessReq) -> ApiResponse:
    try:
        log.info("guess repo_type=%s prefix=%s", getattr(handle_repo, "repo_type", "N/A"), getattr(handle_repo, "_prefix", "N/A"))

        def updater(game):
            return evaluate_guess(game=game, user_id=req.userId, guess_str=req.guess)

        ok, err = handle_repo.update(game_id, updater)

    except KeyError:
        log.warning("guess_key_error gameId=%s userId=%s", game_id, req.userId)
        return ApiResponse(ok=False, data=None, error=ApiError(code="GAME_NOT_FOUND", message="gameId 不存在"))

    if err:
        log.info("guess_invalid gameId=%s userId=%s code=%s", game_id, req.userId, err.code.value)
        return ApiResponse(ok=False, data=None, error=ApiError(code=err.code.value, message=err.message, detail=err.detail))

    assert ok is not None

    g = handle_repo.get(game_id)
    p = g.users.get(req.userId) if g else None

    log.info(
        "guess_ok gameId=%s userId=%s remain=%s finish=%s win=%s score=%s",
        game_id, req.userId, ok.remain, ok.finish, ok.win, getattr(p, "score", None),
    )

    score_payload = {"score": ok.score} if ok.finish else {}

    return ApiResponse(
        ok=True,
        data={
            "guessTiles14": ok.guess_tiles_14,
            "colors14": ok.colors_14,
            "remain": ok.remain,
            "finish": ok.finish,
            "win": ok.win,
            "createdAt": ok.created_at,
            "hitCountValid": getattr(p, "hit_count_valid", None),
            "gameCreatedAt": getattr(g, "created_at", None),
            "hint": _build_hint(
                tip=ok.tip,
                han_tip=ok.han_tip,
                round_wind=getattr(getattr(g, "hand", None), "round_wind", 1),
                seat_wind=getattr(getattr(g, "hand", None), "seat_wind", 1),
                tsumo=bool(getattr(getattr(g, "hand", None), "tsumo", False)),
            ),
            **score_payload,
        },
        error=None,
    )


# ✅ 改动：去掉 /game 前缀
@router.get("/{game_id}/status", response_model=ApiResponse)
def status(game_id: str, userId: str) -> ApiResponse:
    g = handle_repo.get(game_id)
    if not g:
        return ApiResponse(ok=False, data=None, error=ApiError(code="GAME_NOT_FOUND", message="gameId 不存在"))

    p = g.users.get(userId)
    if not p:
        return ApiResponse(
            ok=True,
            data={
                "gameId": g.game_id,
                "maxGuess": g.max_guess,
                "createdAt": g.created_at,
                "ruleMode": g.rule_mode,
                "hitCountValid": 0,
                "remain": g.max_guess,
                "finish": False,
                "win": False,
                "history": [],
                "hint": _build_hint(
                    tip=g.hand.tip,
                    han_tip=g.hand.han_tip,
                    round_wind=getattr(g.hand, "round_wind", 1),
                    seat_wind=getattr(g.hand, "seat_wind", 1),
                    tsumo=bool(getattr(g.hand, "tsumo", False)),
                ),
            },
        )

    history = [{"guessTiles14": e.guess_tiles_14, "colors14": e.colors_14, "createdAt": e.created_at} for e in p.history]

    score_payload = {"score": p.score} if p.finished else {}

    return ApiResponse(
        ok=True,
        data={
            "gameId": g.game_id,
            "maxGuess": g.max_guess,
            "createdAt": g.created_at,
            "ruleMode": g.rule_mode,
            "hitCountValid": p.hit_count_valid,
            "remain": max(g.max_guess - p.hit_count_valid, 0),
            "finish": p.finished,
            "win": p.win,
            "history": history,
            "hint": _build_hint(
                tip=g.hand.tip,
                han_tip=g.hand.han_tip,
                round_wind=getattr(g.hand, "round_wind", 1),
                seat_wind=getattr(g.hand, "seat_wind", 1),
                tsumo=bool(getattr(g.hand, "tsumo", False)),
            ),
            **score_payload,
        },
    )


@router.get("/{game_id}/answer", response_model=ApiResponse)
def answer(game_id: str, userId: str) -> ApiResponse:
    """Return answer payload only after the game is finished."""
    g = handle_repo.get(game_id)
    if not g:
        return ApiResponse(ok=False, data=None, error=ApiError(code="GAME_NOT_FOUND", message="gameId 不存在"))

    p = g.users.get(userId)
    if not p:
        return ApiResponse(ok=False, data=None, error=ApiError(code="USER_NOT_FOUND", message="userId 不存在"))

    if not p.finished:
        return ApiResponse(ok=False, data=None, error=ApiError(code="GAME_NOT_FINISHED", message="本局未结束"))

    payload = _build_answer_payload(g)
    return ApiResponse(ok=True, data=payload, error=None)


# ✅ 改动：去掉 /game 前缀
@router.post("/{game_id}/reset", response_model=ApiResponse)
def reset(game_id: str, req: ResetReq) -> ApiResponse:
    handle_repo.delete(game_id)
    g = handle_repo.create(hand_index=req.handIndex, max_guess=req.maxGuess, rule_mode=req.ruleMode)

    handle_repo.update(g.game_id, lambda game: _ensure_user(game, req.userId))

    log.info("game_reset oldGameId=%s newGameId=%s userId=%s", game_id, g.game_id, req.userId)

    return ApiResponse(
        ok=True,
        data={"gameId": g.game_id, "maxGuess": g.max_guess, "createdAt": g.created_at, "ruleMode": g.rule_mode},
    )
