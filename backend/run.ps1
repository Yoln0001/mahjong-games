$env:GAME_REPO="redis"
$env:REDIS_URL="redis://localhost:6379/0"
$env:GAME_TTL_SECONDS="3600"
$env:GAME_KEY_PREFIX="mh:v1:game:"
uvicorn app.main:app --reload --port 8000
