from typing import List, Literal

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from app.modules.nonogram_daily.service import create_repo
from .service import ShareService

router = APIRouter()
service = ShareService(create_repo())


class PuzzleReq(BaseModel):
    size: int = Field(ge=5, le=25, multiple_of=5)
    difficulty: Literal["easy", "normal", "hard", "expert"]
    solution: List[List[bool]]
    rowClues: List[List[int]]
    columnClues: List[List[int]]


@router.post("")
def publish(req: PuzzleReq, response: Response):
    response.headers["Cache-Control"] = "no-store"
    try:
        return {"ok": True, "data": service.publish(req.model_dump())}
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="暂时无法创建分享链接，请稍后重试。") from exc


@router.get("/{share_id}")
def get_share(share_id: str, response: Response):
    response.headers["Cache-Control"] = "public, max-age=86400"
    if len(share_id) != 20 or any(character not in "0123456789abcdef" for character in share_id):
        raise HTTPException(status_code=404, detail="分享题目不存在。")
    try:
        payload = service.get(share_id)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="暂时无法读取分享题目，请稍后重试。") from exc
    if payload is None:
        raise HTTPException(status_code=404, detail="分享题目不存在。")
    return {"ok": True, "data": payload}
