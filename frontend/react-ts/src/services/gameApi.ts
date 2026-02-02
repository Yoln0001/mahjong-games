import { api } from "./api";
import type {
    ApiResponse,
    CreateGameResponse,
    GuessData,
    GuessReq,
    GameStatusData,
    HealthResponse,
    ResetReq,
    StartReq,
    StartGameData,
} from "../types/api";

/**
 * 可配置 API 前缀：
 * - 如果后端 include_router(prefix="/api")：用默认 "/api"
 * - 如果后端无前缀：在 .env.local 设置 VITE_API_PREFIX=
 */
const API_PREFIX = (import.meta as any).env?.VITE_API_PREFIX ?? "/api";

function assertApiOk<T>(payload: ApiResponse<T>): T {
    if (!payload || typeof payload !== "object") {
        throw new Error("后端响应不是合法的 ApiResponse");
    }
    if (!payload.ok) {
        const msg = payload.error?.message || payload.error?.code || "请求失败";
        throw new Error(msg);
    }
    if (payload.data == null) {
        throw new Error("后端响应 ok=true 但 data 为空");
    }
    return payload.data;
}

/**
 * 创建对局：POST {prefix}/game/start
 * 注意：后端不会返回 userId，userId 必须由前端生成并保存。:contentReference[oaicite:8]{index=8}
 */
export async function createGame(req: StartReq): Promise<CreateGameResponse> {
    const resp = await api.post<ApiResponse<StartGameData>>(
        `${API_PREFIX}/game/start`,
        req
    );

    const data = assertApiOk(resp.data);

    return {
        ...data,
        userId: req.userId,
    };
}

/**
 * 获取状态：GET {prefix}/game/{gameId}/status?userId=... :contentReference[oaicite:9]{index=9}
 */
export async function getState(
    gameId: string,
    userId: string
): Promise<GameStatusData> {
    const resp = await api.get<ApiResponse<GameStatusData>>(
        `${API_PREFIX}/game/${encodeURIComponent(gameId)}/status`,
        { params: { userId } }
    );
    return assertApiOk(resp.data);
}

/**
 * 提交猜测：POST {prefix}/game/{gameId}/guess body={userId, guess} :contentReference[oaicite:10]{index=10}
 */
export async function submitGuess(
    gameId: string,
    payload: GuessReq
): Promise<GuessData> {
    const resp = await api.post<ApiResponse<GuessData>>(
        `${API_PREFIX}/game/${encodeURIComponent(gameId)}/guess`,
        payload
    );
    return assertApiOk(resp.data);
}

/**
 * 重置对局：POST {prefix}/game/{gameId}/reset :contentReference[oaicite:11]{index=11}
 */
export async function resetGame(
    gameId: string,
    payload: ResetReq
): Promise<StartGameData> {
    const resp = await api.post<ApiResponse<StartGameData>>(
        `${API_PREFIX}/game/${encodeURIComponent(gameId)}/reset`,
        payload
    );
    return assertApiOk(resp.data);
}

/**
 * 健康检查（如果后端实现了 /health）
 */
export async function health(): Promise<HealthResponse> {
    const resp = await api.get<ApiResponse<HealthResponse>>(`${API_PREFIX}/health`);
    // health 的实现不在你提供的 game.py 中，这里做兼容：既支持 ApiResponse 包装，也支持直接返回
    const payload = resp.data as any;
    if (payload && typeof payload === "object" && "ok" in payload && "data" in payload) {
        return assertApiOk(payload);
    }
    return payload as HealthResponse;
}
