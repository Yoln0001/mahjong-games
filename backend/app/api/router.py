# _*_ coding : utf-8 _*_
# @Time : 2026/1/24 21:45
# @Author : Yoln
# @File : router
# @Project : mahjong-handle-web
from __future__ import annotations

from fastapi import APIRouter

from app.modules.handle.api import router as handle_router
from app.modules.link.api import router as link_router
from .health import router as health_router

router = APIRouter()

router.include_router(health_router, prefix="/health", tags=["health"])
router.include_router(handle_router, prefix="/handle", tags=["handle"])
router.include_router(link_router, prefix="/link", tags=["link"])
