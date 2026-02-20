import { api } from "./api";
import type {
    ApiResponse,
    BattleCreateData,
    BattleCreateReq,
    BattleJoinReq,
    BattleResultData,
    BattleStatusData,
    BattleSubmitData,
    BattleSubmitReq,
} from "../types/api";

const API_PREFIX: string = (import.meta as any).env?.VITE_API_PREFIX ?? "/api";
const BATTLE_PREFIX: string = (import.meta as any).env?.VITE_BATTLE_PREFIX ?? "/battle";

function joinPath(...parts: string[]): string {
    const cleaned = parts
        .filter((p) => p != null && p !== "")
        .map((p, idx) => {
            let s = String(p);
            if (idx === 0) s = s.replace(/\/+$/g, "");
            else s = s.replace(/^\/+|\/+$/g, "");
            return s;
        })
        .filter((p) => p !== "");
    if (!cleaned.length) return "";
    const result = cleaned.join("/");
    return result.startsWith("/") ? result : `/${result}`;
}

function buildUrl(path: string): string {
    return joinPath(API_PREFIX, BATTLE_PREFIX, path);
}

function assertApiOk<T>(payload: ApiResponse<T>): T {
    if (!payload || typeof payload !== "object") throw new Error("后端响应不是合法的 ApiResponse");
    if (!payload.ok) throw new Error(payload.error?.message || payload.error?.code || "请求失败");
    if (payload.data == null) throw new Error("后端响应 ok=true 但 data 为空");
    return payload.data;
}

export async function createBattle(payload: BattleCreateReq): Promise<BattleCreateData> {
    const resp = await api.post<ApiResponse<BattleCreateData>>(buildUrl("/create"), payload);
    return assertApiOk(resp.data);
}

export async function joinBattle(matchId: string, payload: BattleJoinReq): Promise<BattleStatusData> {
    const resp = await api.post<ApiResponse<BattleStatusData>>(
        buildUrl(`/${encodeURIComponent(matchId)}/join`),
        payload
    );
    return assertApiOk(resp.data);
}

export async function enterBattle(matchId: string, payload: BattleJoinReq): Promise<BattleStatusData> {
    const resp = await api.post<ApiResponse<BattleStatusData>>(
        buildUrl(`/${encodeURIComponent(matchId)}/enter`),
        payload
    );
    return assertApiOk(resp.data);
}

export async function getBattleStatus(matchId: string, userId: string): Promise<BattleStatusData> {
    const resp = await api.get<ApiResponse<BattleStatusData>>(
        buildUrl(`/${encodeURIComponent(matchId)}/status`),
        { params: { userId } }
    );
    return assertApiOk(resp.data);
}

export async function submitBattleGuess(matchId: string, payload: BattleSubmitReq): Promise<BattleSubmitData> {
    const resp = await api.post<ApiResponse<BattleSubmitData>>(
        buildUrl(`/${encodeURIComponent(matchId)}/submit`),
        payload
    );
    return assertApiOk(resp.data);
}

export async function getBattleResult(matchId: string, userId: string): Promise<BattleResultData> {
    const resp = await api.get<ApiResponse<BattleResultData>>(
        buildUrl(`/${encodeURIComponent(matchId)}/result`),
        { params: { userId } }
    );
    return assertApiOk(resp.data);
}
