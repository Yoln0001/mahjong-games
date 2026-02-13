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
    AnswerData,
} from "../types/api";

/**
 * 全局 API 基础前缀（通常用于后端 include_router(prefix="/api") 的场景）
 * - 默认 "/api"
 * - 目前后端就是用的这种形式
 */
const API_PREFIX: string = (import.meta as any).env?.VITE_API_PREFIX ?? "/api";

/**
 * 业务模块前缀（建议后端分别挂载）
 * - handle：/handle
 *
 */
const HANDLE_PREFIX: string = (import.meta as any).env?.VITE_HANDLE_PREFIX ?? "/handle";

/** 安全拼接路径，避免出现重复 / 或缺少 / */
function joinPath(...parts: string[]): string {
    const cleaned = parts
        .filter((p) => p != null && p !== "")
        .map((p, idx) => {
            // 保留第一个 part 的可能空字符串（用于 modulePrefix 为空）
            let s = String(p);
            if (idx === 0) {
                // 首段：去掉末尾 /
                s = s.replace(/\/+$/g, "");
            } else {
                // 中间段：去掉首尾 /
                s = s.replace(/^\/+|\/+$/g, "");
            }
            return s;
        })
        .filter((p) => p !== "");

    // 特殊：如果全为空，返回空字符串
    if (cleaned.length === 0) return "";

    const result = cleaned.join("/");
    // 确保以 / 开头（除非 result 本身就是空）
    return result.startsWith("/") ? result : `/${result}`;
}

/**
 * 构造最终请求路径：
 * - API_PREFIX（例如 /api）
 * - modulePrefix（例如 /handle；若传 "" 则表示无模块前缀）
 * - path（例如 /start）
 */
function buildUrl(modulePrefix: string, path: string): string {
    return joinPath(API_PREFIX, modulePrefix, path);
}

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
 * 创建对局：POST {API_PREFIX}{HANDLE_PREFIX}/start
 * 注意：后端不会返回 userId，userId 必须由前端生成并保存。
 */
export async function createGame(req: StartReq): Promise<CreateGameResponse> {
    const resp = await api.post<ApiResponse<StartGameData>>(
        buildUrl(HANDLE_PREFIX, "/start"),
        req
    );

    const data = assertApiOk(resp.data);

    return {
        ...data,
        userId: req.userId,
    };
}

/**
 * 获取状态：GET {API_PREFIX}{HANDLE_PREFIX}/{gameId}/status?userId=...
 */
export async function getState(
    gameId: string,
    userId: string
): Promise<GameStatusData> {
    const resp = await api.get<ApiResponse<GameStatusData>>(
        buildUrl(HANDLE_PREFIX, `/${encodeURIComponent(gameId)}/status`),
        { params: { userId } }
    );
    return assertApiOk(resp.data);
}

/**
 * 提交猜测：POST {API_PREFIX}{HANDLE_PREFIX}/{gameId}/guess body={userId, guess}
 */
export async function submitGuess(
    gameId: string,
    payload: GuessReq
): Promise<GuessData & { score?: number }> {
    const resp = await api.post<ApiResponse<GuessData>>(
        buildUrl(HANDLE_PREFIX, `/${encodeURIComponent(gameId)}/guess`),
        payload
    );
    // 后端在 finish=true 时会额外返回 score（结算得分）。
    return assertApiOk(resp.data) as GuessData & { score?: number };
}

/**
 * 重置对局：POST {API_PREFIX}{HANDLE_PREFIX}/{gameId}/reset
 */
export async function resetGame(
    gameId: string,
    payload: ResetReq
): Promise<StartGameData> {
    const resp = await api.post<ApiResponse<StartGameData>>(
        buildUrl(HANDLE_PREFIX, `/${encodeURIComponent(gameId)}/reset`),
        payload
    );
    return assertApiOk(resp.data);
}

/**
 * 获取答案：GET {API_PREFIX}{HANDLE_PREFIX}/{gameId}/answer?userId=...
 */
export async function getAnswer(
    gameId: string,
    userId: string
): Promise<AnswerData> {
    const resp = await api.get<ApiResponse<AnswerData>>(
        buildUrl(HANDLE_PREFIX, `/${encodeURIComponent(gameId)}/answer`),
        { params: { userId } }
    );
    return assertApiOk(resp.data);
}

/**
 * 健康检查：GET {API_PREFIX}/health
 */
export async function health(): Promise<HealthResponse> {
    const resp = await api.get<ApiResponse<HealthResponse>>(buildUrl("", "/health"));
    // health 的实现可能既支持 ApiResponse 包装，也支持直接返回
    const payload = resp.data as any;
    if (payload && typeof payload === "object" && "ok" in payload && "data" in payload) {
        return assertApiOk(payload);
    }
    return payload as HealthResponse;
}

/** 导出前缀，便于调试 */
export const __prefixes = {
    API_PREFIX,
    HANDLE_PREFIX,
};
