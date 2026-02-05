# _*_ coding : utf-8 _*_
# @Time : 2026/1/24 21:44
# @Author : Yoln
# @File : health
# @Project : mahjong-handle-web
from __future__ import annotations

from fastapi import APIRouter

from .deps import handle_repo, llk_repo
from app.modules.handle.schemas import ApiResponse

router = APIRouter()


@router.get("/health", response_model=ApiResponse)
def health() -> ApiResponse:
    handle_ping = handle_repo.ping()
    llk_ping = llk_repo.ping()
    return ApiResponse(
        ok=True,
        data={
            "status": "ok",
            "handleStorage": handle_repo.repo_type,
            "handleRedisPing": handle_ping if handle_repo.repo_type == "redis" else None,
            "llkStorage": llk_repo.repo_type,
            "llkRedisPing": llk_ping if llk_repo.repo_type == "redis" else None,
        },
        error=None,
    )
