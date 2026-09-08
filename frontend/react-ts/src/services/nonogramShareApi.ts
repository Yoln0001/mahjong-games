import { api } from "./api";
import type { NonogramPuzzle } from "../games/nonogram/types";

export type SharedPuzzle = { id: string; puzzle: NonogramPuzzle };

export async function publishNonogram(puzzle: NonogramPuzzle): Promise<SharedPuzzle> {
  return (await api.post<{ data: SharedPuzzle }>("/api/nonogram-share", puzzle)).data.data;
}

export async function getSharedNonogram(id: string): Promise<SharedPuzzle> {
  return (await api.get<{ data: SharedPuzzle }>(`/api/nonogram-share/${id}`)).data.data;
}

export async function createShareLink(puzzle: NonogramPuzzle): Promise<string> {
  const shared = await publishNonogram(puzzle);
  const url = `${window.location.origin}/nonogram/share/${shared.id}`;
  return url;
}
