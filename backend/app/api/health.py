# _*_ coding : utf-8 _*_
# @Time : 2026/1/24 21:44
# @Author : Yoln
# @File : health
# @Project : mahjong-handle-web
from __future__ import annotations

from fastapi import APIRouter

from .deps import repo
from .schemas import ApiResponse

router = APIRouter()


@router.get("/health", response_model=ApiResponse)
def health() -> ApiResponse:
    ok_ping = repo.ping()
    return ApiResponse(
        ok=True,
        data={
            "status": "ok",
            "storage": repo.repo_type,
            "redisPing": ok_ping if repo.repo_type == "redis" else None,
        },
        error=None,
    )
