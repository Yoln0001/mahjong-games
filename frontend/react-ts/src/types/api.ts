export type GameRepoMode = "memory" | "redis";

/** 后端统一包装：ApiResponse */
export interface ApiError {
    code: string;
    message: string;
    detail?: any;
}

export interface ApiResponse<T> {
    ok: boolean;
    data: T | null;
    error?: ApiError | null;
}

/** 后端 hint 结构（按你最新返回） */
export interface Hint {
    yakuTip?: string;
    hanTip?: string;
    windTip?: string;
    isTsumo?: string;
}

/** /game/start 返回 data（如果你的后端 start 也返回这些字段，保留；没有就删掉不影响编译） */
export interface StartGameData {
    gameId: string;
    maxGuess: number;
    createdAt: string;
    hint?: Hint;
}

/** 前端使用的 createGame 返回：把 userId 一并带上（因为后端通常不返回 userId） */
export interface CreateGameResponse extends StartGameData {
    userId: string;
}

export type TileColor = "gray" | "orange" | "blue";

/** /game/{gameId}/guess 返回 data（按你最新返回） */
export interface GuessData {
    guessTiles14: string[]; // tileId
    colors14: TileColor[];  // gray/orange/blue
    remain: number;
    finish: boolean;
    win: boolean;
    hint?: Hint;

    /** ✅ 仅在 finish=true 时后端返回：用于失败结算弹框展示答案 */
    answerTiles14?: string[];
    /** ✅ 可选：后端若返回 answerStr（raw_14）可供前端复用解析逻辑 */
    answerStr?: string;
}

/** /game/{gameId}/status 返回 data（如果你后端有） */
export interface GameHistoryEntry {
    guessTiles14: string[];
    colors14: TileColor[];
    createdAt: string;
}

export interface GameStatusData {
    gameId: string;
    maxGuess: number;
    hitCountValid: number;
    remain: number;
    finish: boolean;
    win: boolean;
    history: GameHistoryEntry[];
    hint?: Hint;

    /** ✅ 仅在 finish=true 时后端返回：用于刷新/断线重连后仍能展示答案 */
    answerTiles14?: string[];
    /** ✅ 可选：同上 */
    answerStr?: string;
}

/** 请求体 */
export interface StartReq {
    userId: string;
    handIndex?: number;
    maxGuess?: number;
}

export interface GuessReq {
    userId: string;
    guess: string;
}

export interface ResetReq {
    userId: string;
    handIndex?: number;
    maxGuess?: number;
}

export interface HealthResponse {
    ok: boolean;
    repo?: GameRepoMode;
    redis?: {
        ok: boolean;
        detail?: string;
    };
}
