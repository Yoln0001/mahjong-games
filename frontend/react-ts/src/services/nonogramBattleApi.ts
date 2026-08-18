import { api } from "./api";
import type { ApiResponse } from "../types/api";
import type { CellState } from "../games/nonogram/types";
import type { NonogramBattleData } from "../types/nonogramBattle";

const PREFIX = "/api/nonogram-battle";

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.ok || response.data == null) throw new Error(response.error?.message || "请求失败");
  return response.data;
}

export async function createNonogramBattle(userId: string, size: number) {
  return unwrap((await api.post<ApiResponse<NonogramBattleData>>(`${PREFIX}/create`, { userId, size })).data);
}

export async function joinNonogramBattle(matchId: string, userId: string) {
  return unwrap((await api.post<ApiResponse<NonogramBattleData>>(`${PREFIX}/${encodeURIComponent(matchId)}/join`, { userId })).data);
}

export async function getNonogramBattleStatus(matchId: string, userId: string) {
  return unwrap((await api.get<ApiResponse<NonogramBattleData>>(`${PREFIX}/${encodeURIComponent(matchId)}/status`, { params: { userId } })).data);
}

export async function moveNonogramBattle(matchId: string, userId: string, row: number, column: number, state: CellState) {
  return unwrap((await api.post<ApiResponse<NonogramBattleData>>(`${PREFIX}/${encodeURIComponent(matchId)}/move`, { userId, row, column, state })).data);
}

export async function clearNonogramBattle(matchId: string, userId: string) {
  return unwrap((await api.post<ApiResponse<NonogramBattleData>>(`${PREFIX}/${encodeURIComponent(matchId)}/clear`, { userId })).data);
}
