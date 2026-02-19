# _*_ coding : utf-8 _*_
# @Time : 2026/1/24 21:44
# @Author : Yoln
# @File : health
# @Project : mahjong-handle-web
from __future__ import annotations

from fastapi import APIRouter

from .deps import handle_repo, link_repo, battle_repo
from app.modules.handle.schemas import ApiResponse

router = APIRouter()


@router.get("/health", response_model=ApiResponse)
def health() -> ApiResponse:
    handle_ping = handle_repo.ping()
    link_ping = link_repo.ping()
    battle_ping = battle_repo.ping()
    return ApiResponse(
        ok=True,
        data={
            "status": "ok",
            "handleStorage": handle_repo.repo_type,
            "handleRedisPing": handle_ping if handle_repo.repo_type == "redis" else None,
            "linkStorage": link_repo.repo_type,
            "linkRedisPing": link_ping if link_repo.repo_type == "redis" else None,
            "battleStorage": battle_repo.repo_type,
            "battleRedisPing": battle_ping if battle_repo.repo_type == "redis" else None,
        },
        error=None,
    )
