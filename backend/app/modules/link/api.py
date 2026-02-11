# _*_ coding : utf-8 _*_
# @Time : 2026/2/5 21:54
# @Author : Yoln
# @File : api
# @Project : mahjong-handle-web
from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import link_repo, log
from app.modules.link.domain import create_game, pick_tile, to_status_payload
from app.modules.link.schemas import ApiError, ApiResponse, PickReq, ResetReq, StartReq

router = APIRouter()


@router.post("/start", response_model=ApiResponse)
def start(req: StartReq) -> ApiResponse:
    """开始新局。"""
    try:
        state = create_game(hand_index=req.handIndex, temp_limit=req.tempLimit)
    except Exception as e:
        return ApiResponse(ok=False, data=None, error=ApiError(code="START_FAILED", message=str(e)))

    link_repo.create(state)
    log.info("link_start gameId=%s userId=%s tempLimit=%s", state["gameId"], req.userId, state["tempLimit"])

    return ApiResponse(
        ok=True,
        data=to_status_payload(state),
        error=None,
    )


@router.post("/{game_id}/pick", response_model=ApiResponse)
def pick(game_id: str, req: PickReq) -> ApiResponse:
    """从指定列栈顶取牌并更新状态。"""
    try:
        def updater(state):
            return pick_tile(state, req.column)

        result = link_repo.update(game_id, updater)
    except KeyError:
        return ApiResponse(ok=False, data=None, error=ApiError(code="GAME_NOT_FOUND", message="gameId 不存在"))
    except ValueError as e:
        code = str(e)
        return ApiResponse(ok=False, data=None, error=ApiError(code=code, message=code))

    log.info("link_pick gameId=%s userId=%s column=%s", game_id, req.userId, req.column)
    return ApiResponse(ok=True, data=result, error=None)


@router.get("/{game_id}/status", response_model=ApiResponse)
def status(game_id: str, userId: str) -> ApiResponse:
    """获取当前游戏状态。"""
    state = link_repo.get(game_id)
    if not state:
        return ApiResponse(ok=False, data=None, error=ApiError(code="GAME_NOT_FOUND", message="gameId 不存在"))

    return ApiResponse(ok=True, data=to_status_payload(state), error=None)


@router.post("/{game_id}/reset", response_model=ApiResponse)
def reset(game_id: str, req: ResetReq) -> ApiResponse:
    """重开游戏。"""
    link_repo.delete(game_id)
    state = create_game(hand_index=req.handIndex, temp_limit=req.tempLimit)
    link_repo.create(state)

    log.info("link_reset oldGameId=%s newGameId=%s userId=%s", game_id, state["gameId"], req.userId)
    return ApiResponse(ok=True, data={"gameId": state["gameId"], "createdAt": state["createdAt"]}, error=None)
