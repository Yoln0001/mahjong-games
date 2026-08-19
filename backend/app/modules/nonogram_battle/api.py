from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import log, nonogram_battle_repo
from app.modules.nonogram_battle.domain import apply_move, clear_board, create_match, join_match, status_payload
from app.modules.nonogram_battle.schemas import ApiError, ApiResponse, CreateReq, JoinReq, MoveReq

router = APIRouter()


def error(code: str) -> ApiResponse:
    return ApiResponse(ok=False, data=None, error=ApiError(code=code, message=code))


@router.post("/create", response_model=ApiResponse)
def create(req: CreateReq) -> ApiResponse:
    try:
        state = create_match(req.userId, req.size, req.difficulty)
        nonogram_battle_repo.create(state)
        log.info("nonogram_battle_create matchId=%s size=%s", state["matchId"], req.size)
        return ApiResponse(ok=True, data=status_payload(state, req.userId), error=None)
    except Exception as exc:
        return error(str(exc) or "CREATE_FAILED")


@router.post("/{match_id}/join", response_model=ApiResponse)
def join(match_id: str, req: JoinReq) -> ApiResponse:
    try:
        state = nonogram_battle_repo.update(match_id, lambda current: join_match(current, req.userId))
        return ApiResponse(ok=True, data=status_payload(state, req.userId), error=None)
    except KeyError:
        return error("MATCH_NOT_FOUND")
    except ValueError as exc:
        return error(str(exc))


@router.get("/{match_id}/status", response_model=ApiResponse)
def status(match_id: str, userId: str) -> ApiResponse:
    state = nonogram_battle_repo.get(match_id)
    if state is None:
        return error("MATCH_NOT_FOUND")
    try:
        return ApiResponse(ok=True, data=status_payload(state, userId), error=None)
    except ValueError as exc:
        return error(str(exc))


@router.post("/{match_id}/move", response_model=ApiResponse)
def move(match_id: str, req: MoveReq) -> ApiResponse:
    try:
        state = nonogram_battle_repo.update(
            match_id,
            lambda current: apply_move(current, req.userId, req.row, req.column, req.state),
        )
        return ApiResponse(ok=True, data=status_payload(state, req.userId), error=None)
    except KeyError:
        return error("MATCH_NOT_FOUND")
    except ValueError as exc:
        return error(str(exc))


@router.post("/{match_id}/clear", response_model=ApiResponse)
def clear(match_id: str, req: JoinReq) -> ApiResponse:
    try:
        state = nonogram_battle_repo.update(match_id, lambda current: clear_board(current, req.userId))
        return ApiResponse(ok=True, data=status_payload(state, req.userId), error=None)
    except KeyError:
        return error("MATCH_NOT_FOUND")
    except ValueError as exc:
        return error(str(exc))
