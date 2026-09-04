import logging
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Response
from .service import DailyNotReady, DailyService, create_repo

router = APIRouter()
service = DailyService(create_repo())
log = logging.getLogger("mahjong.daily")


@router.get("/catalog")
def get_catalog(response: Response):
    response.headers["Cache-Control"] = "no-store"
    try:
        return {"ok": True, "data": service.get_catalog()}
    except Exception as exc:
        log.exception("Unable to read daily catalog")
        raise HTTPException(status_code=503, detail="每日题库暂时不可用，请稍后重试。") from exc


@router.get("/puzzle")
def get_puzzle(
    response: Response,
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    size: int = Query(15, ge=5, le=25, multiple_of=5),
    difficulty: Literal["hard", "expert"] = "hard",
):
    response.headers["Cache-Control"] = "no-store"
    try:
        return {"ok": True, "data": service.get_puzzle(date, size, difficulty)}
    except DailyNotReady as exc:
        raise HTTPException(status_code=503, detail=str(exc), headers={"Retry-After": "10"}) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        log.exception("Unable to load daily puzzle")
        raise HTTPException(status_code=503, detail="每日题目暂时无法加载，请稍后重试。") from exc
