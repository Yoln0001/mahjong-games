import { solutionToClues } from "./clues";
import { analyzeLogicalDifficulty, countSolutions } from "./solver";
import type { NonogramDifficulty, NonogramPuzzle } from "./types";

function randomSolution(size: number, difficulty: NonogramDifficulty): boolean[][] {
  const density = difficulty === "easy"
    ? 0.52 + Math.random() * 0.14
    : 0.42 + Math.random() * 0.14;
  const solution = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => Math.random() < density),
  );

  // A little smoothing creates readable clusters instead of pure visual noise.
  const smoothingPasses = difficulty === "easy" ? 2 : difficulty === "normal" ? 1 : 0;
  for (let pass = 0; pass < smoothingPasses; pass += 1) {
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        const neighbors = [
          solution[row - 1]?.[column], solution[row + 1]?.[column],
          solution[row]?.[column - 1], solution[row]?.[column + 1],
        ].filter(Boolean).length;
        if (neighbors >= 3 && Math.random() < 0.35) solution[row]![column] = true;
      }
    }
  }
  return solution;
}

function scoreRange(difficulty: NonogramDifficulty) {
  if (difficulty === "easy") return { min: 0, max: 54, target: 38 };
  if (difficulty === "hard") return { min: 72, max: 100, target: 82 };
  return { min: 55, max: 71, target: 63 };
}

export function generatePuzzle(requestedSize: number, difficulty: NonogramDifficulty = "normal"): NonogramPuzzle {
  const size = Math.max(5, Math.min(15, Math.round(requestedSize)));
  const range = scoreRange(difficulty);
  let closest: { puzzle: NonogramPuzzle; distance: number } | null = null;
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const solution = randomSolution(size, difficulty);
    const filled = solution.flat().filter(Boolean).length;
    if (filled < size || filled > size * size - size) continue;
    const { rowClues, columnClues } = solutionToClues(solution);
    if (countSolutions(rowClues, columnClues, 2) !== 1) continue;
    const stats = analyzeLogicalDifficulty(rowClues, columnClues);
    if (!stats.logicalSolved) continue;
    const puzzle = { size, solution, rowClues, columnClues, difficulty };
    const distance = Math.abs(stats.score - range.target);
    if (!closest || distance < closest.distance) closest = { puzzle, distance };
    if (stats.score >= range.min && stats.score <= range.max) return puzzle;
  }

  if (closest) return closest.puzzle;

  // This structured fallback is uniquely solvable for the supported sizes.
  const solution = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => column <= row),
  );
  const { rowClues, columnClues } = solutionToClues(solution);
  return { size, solution, rowClues, columnClues, difficulty };
}
