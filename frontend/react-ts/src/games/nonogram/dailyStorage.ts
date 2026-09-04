import type { DailyPuzzle } from "../../services/nonogramDailyApi";
import { createGame, isSolved } from "./game";
import type { CellColor, CellState, DrawColor, DrawMode } from "./types";

export type DailySave = {
  version: 1;
  signature: string;
  board: CellState[][];
  colors: CellColor[][];
  elapsedMs: number;
  drawMode: DrawMode;
  drawColor: DrawColor;
  finished: boolean;
};
const PREFIX = "mahjong-games:nonogram:daily:v1:";
const colors: DrawColor[] = ["black", "red", "yellow", "blue", "green"];
const states: CellState[] = ["unknown", "filled", "marked"];

export function loadDailySave(daily: DailyPuzzle): DailySave {
  const signature = JSON.stringify([daily.puzzle.rowClues, daily.puzzle.columnClues]);
  const fresh = createGame(daily.puzzle);
  const initial: DailySave = {
    version: 1, signature, board: fresh.board, colors: fresh.colors, elapsedMs: 0,
    drawMode: "filled", drawColor: "black", finished: false,
  };
  try {
    const raw = localStorage.getItem(PREFIX + daily.id);
    if (!raw) return initial;
    const saved = JSON.parse(raw) as DailySave;
    const size = daily.puzzle.size;
    if (saved.version !== 1 || saved.signature !== signature || !Array.isArray(saved.board)
      || saved.board.length !== size || !saved.board.every(row => Array.isArray(row) && row.length === size && row.every(cell => states.includes(cell)))
      || !Number.isFinite(saved.elapsedMs) || saved.elapsedMs < 0) return initial;
    return {
      ...initial,
      board: saved.board,
      colors: saved.board.map((row, r) => row.map((cell, c) => {
        if (cell === "unknown") return null;
        const color = saved.colors?.[r]?.[c];
        return color && colors.includes(color) ? color : "black";
      })),
      elapsedMs: saved.elapsedMs,
      drawColor: colors.includes(saved.drawColor) ? saved.drawColor : "black",
      drawMode: saved.drawMode === "marked" ? "marked" : "filled",
      finished: isSolved(saved.board, daily.puzzle.solution),
    };
  } catch { return initial; }
}

export function saveDailyProgress(id: string, save: DailySave) {
  try { localStorage.setItem(PREFIX + id, JSON.stringify(save)); } catch { /* Storage may be disabled. */ }
}

export function dailyStatus(id: string): "未开始" | "进行中" | "已完成" {
  try {
    const raw = localStorage.getItem(PREFIX + id);
    if (!raw) return "未开始";
    const saved = JSON.parse(raw) as DailySave;
    if (saved.version !== 1) return "未开始";
    if (saved.finished) return "已完成";
    return saved.elapsedMs > 0 || saved.board?.some(row => row.some(cell => cell !== "unknown")) ? "进行中" : "未开始";
  } catch { return "未开始"; }
}
