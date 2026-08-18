import type { CellState, NonogramGame, NonogramPuzzle } from "./types";

export function createGame(puzzle: NonogramPuzzle): NonogramGame {
  return {
    puzzle,
    board: Array.from({ length: puzzle.size }, () =>
      Array<CellState>(puzzle.size).fill("unknown"),
    ),
    startedAt: Date.now(),
    finishedAt: null,
    finished: false,
  };
}

export function isSolved(board: CellState[][], solution: boolean[][]): boolean {
  return solution.every((row, rowIndex) => row.every((filled, columnIndex) =>
    (board[rowIndex]?.[columnIndex] === "filled") === filled,
  ));
}
