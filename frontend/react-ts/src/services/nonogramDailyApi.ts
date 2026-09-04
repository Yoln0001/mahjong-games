import { api } from "./api";
import type { NonogramDifficulty, NonogramPuzzle } from "../games/nonogram/types";

export type DailyEntry = { id: string; size: number; difficulty: NonogramDifficulty; ready: boolean };
export type DailyCatalog = { date: string; timeZone: string; refreshAt: string; entries: DailyEntry[] };
export type DailyPuzzle = { id: string; date: string; puzzle: NonogramPuzzle };

export async function getDailyCatalog(): Promise<DailyCatalog> {
  return (await api.get<{ data: DailyCatalog }>("/api/nonogram-daily/catalog")).data.data;
}

export async function getDailyPuzzle(date: string, entry: DailyEntry): Promise<DailyPuzzle> {
  return (await api.get<{ data: DailyPuzzle }>("/api/nonogram-daily/puzzle", {
    params: { date, size: entry.size, difficulty: entry.difficulty },
  })).data.data;
}
