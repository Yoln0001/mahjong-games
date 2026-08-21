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


class CreateReq(BaseModel):
    userId: str = Field(..., min_length=1)
    size: int = Field(10, ge=5, le=25)
    difficulty: Literal["easy", "normal", "hard"] = "normal"


class JoinReq(BaseModel):
    userId: str = Field(..., min_length=1)


class MoveReq(BaseModel):
    userId: str = Field(..., min_length=1)
    row: int = Field(..., ge=0, le=14)
    column: int = Field(..., ge=0, le=14)
    state: Literal["unknown", "filled", "marked"]
