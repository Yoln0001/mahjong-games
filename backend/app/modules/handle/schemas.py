# _*_ coding : utf-8 _*_
# @Time : 2026/1/24 21:43
# @Author : Yoln
# @File : schemas
# @Project : mahjong-handle-web
from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ApiError(BaseModel):
    code: str
    message: str
    detail: Optional[Dict[str, Any]] = None


class ApiResponse(BaseModel):
    ok: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[ApiError] = None


class StartReq(BaseModel):
    userId: str = Field(..., min_length=1)
    maxGuess: int = Field(6, ge=1, le=20)
    handIndex: Optional[int] = None


class GuessReq(BaseModel):
    userId: str = Field(..., min_length=1)
    guess: str = Field(..., min_length=1)


class ResetReq(BaseModel):
    userId: str = Field(..., min_length=1)
    handIndex: Optional[int] = None
    maxGuess: int = Field(6, ge=1, le=20)
