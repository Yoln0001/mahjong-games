export type CellState = "unknown" | "filled" | "marked";
export type DrawMode = "filled" | "marked";
export type NonogramDifficulty = "easy" | "normal" | "hard";

export type NonogramPuzzle = {
  size: number;
  solution: boolean[][];
  rowClues: number[][];
  columnClues: number[][];
  difficulty: NonogramDifficulty;
};

export type NonogramGame = {
  puzzle: NonogramPuzzle;
  board: CellState[][];
  startedAt: number;
  finishedAt: number | null;
  finished: boolean;
};
