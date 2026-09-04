export type CellState = "unknown" | "filled" | "marked";
export type DrawMode = "filled" | "marked";
export type DrawColor = "black" | "red" | "yellow" | "blue" | "green";
export type CellColor = DrawColor | null;
export type NonogramDifficulty = "easy" | "normal" | "hard" | "expert";

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
  colors: CellColor[][];
  startedAt: number;
  finishedAt: number | null;
  finished: boolean;
};
