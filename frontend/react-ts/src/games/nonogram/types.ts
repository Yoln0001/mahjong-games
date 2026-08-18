export type CellState = "unknown" | "filled" | "marked";
export type DrawMode = "filled" | "marked";

export type NonogramPuzzle = {
  size: number;
  solution: boolean[][];
  rowClues: number[][];
  columnClues: number[][];
};

export type NonogramGame = {
  puzzle: NonogramPuzzle;
  board: CellState[][];
  startedAt: number;
  finishedAt: number | null;
  finished: boolean;
};
