# _*_ coding : utf-8 _*_
# @Time : 2026/2/5 21:55
# @Author : Yoln
# @File : schemas
# @Project : mahjong-handle-web
from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ApiError(BaseModel):
    """统一错误结构。"""

    code: str
    message: str
    detail: Optional[Dict[str, Any]] = None


class ApiResponse(BaseModel):
    """统一响应结构。"""

    ok: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[ApiError] = None


class StartReq(BaseModel):
    """开始新局请求参数。"""

    userId: str = Field(..., min_length=1)
    handIndex: Optional[int] = None
    tempLimit: Optional[int] = Field(None, ge=1, le=20)
    undoUnlimited: Optional[bool] = None


class PickReq(BaseModel):
    """选择一列并取栈顶牌。"""

    userId: str = Field(..., min_length=1)
    column: int = Field(..., ge=0, le=16)


class UndoReq(BaseModel):
    """从暂存区撤回一张牌。"""

    userId: str = Field(..., min_length=1)
    slotIndex: int = Field(..., ge=0, le=19)


class AssistReq(BaseModel):
    """更新辅助功能配置。"""

    userId: str = Field(..., min_length=1)
    undoUnlimited: Optional[bool] = None


class ResetReq(BaseModel):
    """重开请求参数。"""

    userId: str = Field(..., min_length=1)
    handIndex: Optional[int] = None
    tempLimit: Optional[int] = Field(None, ge=1, le=20)
    undoUnlimited: Optional[bool] = None
