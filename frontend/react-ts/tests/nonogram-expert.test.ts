import assert from "node:assert/strict";
import { generatePuzzle } from "../src/games/nonogram/generator";
import { analyzeExpertDifficulty } from "../src/games/nonogram/expertSolver";
import { analyzeLogicalDifficulty, countSolutions } from "../src/games/nonogram/solver";
import { isSolved, createGame } from "../src/games/nonogram/game";

let seed = 17;
const originalRandom = Math.random;
Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
try {
  for (const size of [5, 10, 15, 20, 25]) {
    const started = performance.now();
    const puzzle = generatePuzzle(size, "expert");
    const stats = analyzeExpertDifficulty(puzzle.rowClues, puzzle.columnClues, performance.now() + 3000);
    assert.equal(stats.solved, true);
    assert.equal(stats.logicalSolved, false);
    assert.equal(analyzeLogicalDifficulty(puzzle.rowClues, puzzle.columnClues).logicalSolved, false);
    assert.ok(stats.eliminations > 0);
    assert.equal(stats.exhausted, false);
    assert.equal(puzzle.difficulty, "expert");
    if (size <= 10) assert.equal(countSolutions(puzzle.rowClues, puzzle.columnClues), 1);
    const game = createGame(puzzle);
    const board = puzzle.solution.map((row) => row.map((cell) => cell ? "filled" as const : "unknown" as const));
    assert.equal(isSolved(board, puzzle.solution), true);
    assert.equal(game.colors.length, size);
    console.log(size, Math.round(performance.now() - started), stats);
  }
  assert.equal(analyzeExpertDifficulty([[1], [1]], [[1], [1]]).solved, false);
  assert.equal(analyzeExpertDifficulty([[2], [2]], [[2], [2]]).logicalSolved, true);
  const timeout = analyzeExpertDifficulty([[1], [1]], [[1], [1]], performance.now() - 1);
  assert.equal(timeout.exhausted, true);
  assert.equal(timeout.solved, false);
  Math.random = () => 0.99;
  assert.throws(() => generatePuzzle(5, "expert"), /极难/);
  console.log("Expert solver, uniqueness, completion and no-fallback checks passed.");
} finally {
  Math.random = originalRandom;
}
