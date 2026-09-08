"""Isolated local daily API for browser integration tests (no production Redis)."""
import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / "backend"))
os.environ["GAME_REPO"] = "memory"
os.environ["NONOGRAM_DAILY_DB_PATH"] = str(root / "test-artifacts" / "daily-test.sqlite3")
from fastapi import FastAPI
from app.modules.nonogram_daily.api import router
from app.modules.nonogram_share.api import router as share_router
from app.modules.nonogram_daily.worker import daily_lifespan
import uvicorn

app = FastAPI(lifespan=daily_lifespan)
app.include_router(router, prefix="/api/nonogram-daily")
app.include_router(share_router, prefix="/api/nonogram-share")
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8105)
