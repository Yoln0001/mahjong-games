from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import battle_repo, log
from app.modules.battle.domain import (
    create_battle,
    join_battle,
    submit_guess,
    to_result_payload,
    to_status_payload,
)
from app.modules.battle.schemas import (
    ApiError,
    ApiResponse,
    CreateBattleReq,
    JoinBattleReq,
    SubmitBattleReq,
)

router = APIRouter()


@router.post("/create", response_model=ApiResponse)
def create(req: CreateBattleReq) -> ApiResponse:
    try:
        state = create_battle(
            creator_user_id=req.userId,
            mode=req.mode,
            question_count=req.questionCount,
            max_guess=req.maxGuess,
        )
    except Exception as e:
        return ApiResponse(ok=False, data=None, error=ApiError(code="CREATE_FAILED", message=str(e)))

    battle_repo.create(state)
    log.info("battle_create matchId=%s mode=%s questionCount=%s", state["matchId"], req.mode, req.questionCount)
    return ApiResponse(
        ok=True,
        data={
            "matchId": state["matchId"],
            "shareUrl": f"/battle/{state['matchId']}",
            **to_status_payload(state, req.userId),
        },
        error=None,
    )


@router.post("/{match_id}/join", response_model=ApiResponse)
def join(match_id: str, req: JoinBattleReq) -> ApiResponse:
    try:
        result = battle_repo.update(match_id, lambda s: join_battle(s, req.userId))
    except KeyError:
        return ApiResponse(ok=False, data=None, error=ApiError(code="MATCH_NOT_FOUND", message="matchId 不存在"))
    except ValueError as e:
        code = str(e)
        return ApiResponse(ok=False, data=None, error=ApiError(code=code, message=code))

    log.info("battle_join matchId=%s userId=%s", match_id, req.userId)
    return ApiResponse(ok=True, data=to_status_payload(result, req.userId), error=None)


@router.get("/{match_id}/status", response_model=ApiResponse)
def status(match_id: str, userId: str) -> ApiResponse:
    state = battle_repo.get(match_id)
    if not state:
        return ApiResponse(ok=False, data=None, error=ApiError(code="MATCH_NOT_FOUND", message="matchId 不存在"))
    try:
        payload = to_status_payload(state, userId)
    except ValueError as e:
        code = str(e)
        return ApiResponse(ok=False, data=None, error=ApiError(code=code, message=code))
    return ApiResponse(ok=True, data=payload, error=None)


@router.post("/{match_id}/submit", response_model=ApiResponse)
def submit(match_id: str, req: SubmitBattleReq) -> ApiResponse:
    try:
        result = battle_repo.update(match_id, lambda s: submit_guess(s, req.userId, req.guess))
    except KeyError:
        return ApiResponse(ok=False, data=None, error=ApiError(code="MATCH_NOT_FOUND", message="matchId 不存在"))
    except ValueError as e:
        code = str(e)
        return ApiResponse(ok=False, data=None, error=ApiError(code=code, message=code))

    log.info("battle_submit matchId=%s userId=%s", match_id, req.userId)
    return ApiResponse(ok=True, data=result, error=None)


@router.get("/{match_id}/result", response_model=ApiResponse)
def result(match_id: str, userId: str) -> ApiResponse:
    state = battle_repo.get(match_id)
    if not state:
        return ApiResponse(ok=False, data=None, error=ApiError(code="MATCH_NOT_FOUND", message="matchId 不存在"))
    try:
        payload = to_result_payload(state, userId)
    except ValueError as e:
        code = str(e)
        return ApiResponse(ok=False, data=None, error=ApiError(code=code, message=code))
    return ApiResponse(ok=True, data=payload, error=None)
