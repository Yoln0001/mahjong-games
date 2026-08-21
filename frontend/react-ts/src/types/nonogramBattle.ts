import type { CellState, NonogramDifficulty } from "../games/nonogram/types";

export type NonogramBattleStatus = "waiting" | "playing" | "finished";

export type NonogramBattleData = {
  matchId: string;
  status: NonogramBattleStatus;
  size: number;
  difficulty: NonogramDifficulty;
  rowClues: number[][];
  columnClues: number[][];
  startedAt: number | null;
  winnerUserId: string | null;
  my: { userId: string; board: CellState[][]; progress: number; finished: boolean };
  opponent: { userId: string; progress: number; finished: boolean } | null;
};
