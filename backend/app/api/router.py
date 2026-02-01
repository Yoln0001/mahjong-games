# _*_ coding : utf-8 _*_
# @Time : 2026/1/24 21:45
# @Author : Yoln
# @File : router
# @Project : mahjong-handle-web
from __future__ import annotations

from fastapi import APIRouter

from .game import router as game_router
from .health import router as health_router

router = APIRouter()

# Split routers by business domain for maintainability.
router.include_router(health_router, tags=["health"])
router.include_router(game_router, tags=["game"])
