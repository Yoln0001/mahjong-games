from __future__ import annotations

from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field


class ApiError(BaseModel):
    code: str
    message: str
    detail: Optional[Dict[str, Any]] = None


class ApiResponse(BaseModel):
    ok: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[ApiError] = None


class CreateBattleReq(BaseModel):
    userId: str = Field(..., min_length=1)
    mode: Literal["normal", "riichi", "guobiao"] = "normal"
    questionCount: int = Field(5, ge=1, le=50)
    maxGuess: int = Field(6, ge=1, le=20)


class JoinBattleReq(BaseModel):
    userId: str = Field(..., min_length=1)


class EnterBattleReq(BaseModel):
    userId: str = Field(..., min_length=1)


class SubmitBattleReq(BaseModel):
    userId: str = Field(..., min_length=1)
    guess: str = Field(..., min_length=1)
