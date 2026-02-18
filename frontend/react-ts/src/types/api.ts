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
    ruleMode?: "normal" | "riichi" | "guobiao";
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
    ruleMode?: "normal" | "riichi" | "guobiao";
    hitCountValid: number;
    remain: number;
    finish: boolean;
    win: boolean;
    history: GameHistoryEntry[];
    hint?: Hint;
}

export interface AnswerData {
    answerTiles14?: string[];
    answerStr?: string;
}

/** 请求体 */
export interface StartReq {
    userId: string;
    handIndex?: number;
    maxGuess?: number;
    ruleMode?: "normal" | "riichi" | "guobiao";
}

export interface GuessReq {
    userId: string;
    guess: string;
}

export interface ResetReq {
    userId: string;
    handIndex?: number;
    maxGuess?: number;
    ruleMode?: "normal" | "riichi" | "guobiao";
}

export interface HealthResponse {
    ok: boolean;
    repo?: GameRepoMode;
    redis?: {
        ok: boolean;
        detail?: string;
    };
}

// ----------------------------
// Link (连连看) API types
// ----------------------------

/** /link/start 请求 */
export interface LinkStartReq {
    userId: string;
    handIndex?: number;
    tempLimit?: number;
    undoUnlimited?: boolean;
}

/** /link/start 返回 data */
export interface LinkStartData {
    gameId: string;
    createdAt: number;
    columns: string[][];
    topTiles: Array<string | null>;
    columnCounts: number[];
    tempSlots: string[];
    tempLimit: number;
    remainTiles: number;
    finish: boolean;
    win: boolean;
    failReason?: string | null;
    undoUnlimited?: boolean;
    canUndo?: boolean;
}

/** /link/{gameId}/pick 请求 */
export interface LinkPickReq {
    userId: string;
    column: number;
}

/** /link/{gameId}/pick 返回 data */
export interface LinkPickData {
    picked: { column: number; tile: string };
    removed: { tile: string; count: number } | null;
    columns: string[][];
    topTiles: Array<string | null>;
    columnCounts: number[];
    tempSlots: string[];
    tempLimit: number;
    remainTiles: number;
    finish: boolean;
    win: boolean;
    failReason?: string | null;
    undoUnlimited?: boolean;
    canUndo?: boolean;
}

/** /link/{gameId}/undo 请求 */
export interface LinkUndoReq {
    userId: string;
    slotIndex: number;
}

/** /link/{gameId}/undo 返回 data */
export interface LinkUndoData {
    undone: { slotIndex: number; tile: string; column: number };
    columns: string[][];
    topTiles: Array<string | null>;
    columnCounts: number[];
    tempSlots: string[];
    tempLimit: number;
    remainTiles: number;
    finish: boolean;
    win: boolean;
    failReason?: string | null;
    undoUnlimited?: boolean;
    canUndo?: boolean;
}

/** /link/{gameId}/status 返回 data */
export interface LinkStatusData {
    gameId: string;
    createdAt: number;
    columns: string[][];
    topTiles: Array<string | null>;
    columnCounts: number[];
    tempSlots: string[];
    tempLimit: number;
    remainTiles: number;
    finish: boolean;
    win: boolean;
    failReason?: string | null;
    undoUnlimited?: boolean;
    canUndo?: boolean;
}

/** /link/{gameId}/assist 请求 */
export interface LinkAssistReq {
    userId: string;
    undoUnlimited?: boolean;
}

/** /link/{gameId}/reset 请求 */
export interface LinkResetReq {
    userId: string;
    handIndex?: number;
    tempLimit?: number;
    undoUnlimited?: boolean;
}

/** /link/{gameId}/reset 返回 data */
export interface LinkResetData {
    gameId: string;
    createdAt: number;
}
