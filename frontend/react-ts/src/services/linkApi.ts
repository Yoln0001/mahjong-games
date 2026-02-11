import { api } from "./api";
import type {
    ApiResponse,
    LinkPickData,
    LinkPickReq,
    LinkResetData,
    LinkResetReq,
    LinkStartData,
    LinkStartReq,
    LinkStatusData,
} from "../types/api";

/**
 * API 基础前缀（默认 /api，可通过 VITE_API_PREFIX 覆盖）
 */
const API_PREFIX: string = (import.meta as any).env?.VITE_API_PREFIX ?? "/api";

/**
 * link 模块前缀（默认 /link，可通过 VITE_LINK_PREFIX 覆盖）
 */
const LINK_PREFIX: string = (import.meta as any).env?.VITE_LINK_PREFIX ?? "/link";

/** 安全拼接路径，避免出现重复 / 或缺少 / */
function joinPath(...parts: string[]): string {
    const cleaned = parts
        .filter((p) => p != null && p !== "")
        .map((p, idx) => {
            let s = String(p);
            if (idx === 0) {
                s = s.replace(/\/+$/g, "");
            } else {
                s = s.replace(/^\/+|\/+$/g, "");
            }
            return s;
        })
        .filter((p) => p !== "");

    if (cleaned.length === 0) return "";
    const result = cleaned.join("/");
    return result.startsWith("/") ? result : `/${result}`;
}

/** 构造最终请求路径：{API_PREFIX}{LINK_PREFIX}{path} */
function buildUrl(path: string): string {
    return joinPath(API_PREFIX, LINK_PREFIX, path);
}

/** 统一处理 ApiResponse，抛出可读错误 */
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

/** 开始新局：POST {API_PREFIX}{LINK_PREFIX}/start */
export async function startLinkGame(req: LinkStartReq): Promise<LinkStartData> {
    const resp = await api.post<ApiResponse<LinkStartData>>(buildUrl("/start"), req);
    return assertApiOk(resp.data);
}

/** 从指定列取栈顶牌：POST {API_PREFIX}{LINK_PREFIX}/{gameId}/pick */
export async function pickLinkTile(
    gameId: string,
    payload: LinkPickReq
): Promise<LinkPickData> {
    const resp = await api.post<ApiResponse<LinkPickData>>(
        buildUrl(`/${encodeURIComponent(gameId)}/pick`),
        payload
    );
    return assertApiOk(resp.data);
}

/** 获取状态：GET {API_PREFIX}{LINK_PREFIX}/{gameId}/status?userId=... */
export async function getLinkStatus(
    gameId: string,
    userId: string
): Promise<LinkStatusData> {
    const resp = await api.get<ApiResponse<LinkStatusData>>(
        buildUrl(`/${encodeURIComponent(gameId)}/status`),
        { params: { userId } }
    );
    return assertApiOk(resp.data);
}

/** 重开：POST {API_PREFIX}{LINK_PREFIX}/{gameId}/reset */
export async function resetLinkGame(
    gameId: string,
    payload: LinkResetReq
): Promise<LinkResetData> {
    const resp = await api.post<ApiResponse<LinkResetData>>(
        buildUrl(`/${encodeURIComponent(gameId)}/reset`),
        payload
    );
    return assertApiOk(resp.data);
}

/** 导出前缀便于调试 */
export const __prefixes = {
    API_PREFIX,
    LINK_PREFIX,
};
