import { solutionToClues } from "./clues";
import { countSolutions } from "./solver";
import type { NonogramPuzzle } from "./types";

function randomSolution(size: number): boolean[][] {
  const density = 0.42 + Math.random() * 0.14;
  const solution = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => Math.random() < density),
  );

  // A little smoothing creates readable clusters instead of pure visual noise.
  for (let pass = 0; pass < 1; pass += 1) {
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

export function generatePuzzle(requestedSize: number): NonogramPuzzle {
  const size = Math.max(5, Math.min(15, Math.round(requestedSize)));
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const solution = randomSolution(size);
    const filled = solution.flat().filter(Boolean).length;
    if (filled < size || filled > size * size - size) continue;
    const { rowClues, columnClues } = solutionToClues(solution);
    if (countSolutions(rowClues, columnClues, 2) === 1) {
      return { size, solution, rowClues, columnClues };
    }
  }

  // A symmetric fallback is quick to verify and avoids leaving the UI stuck.
  const solution = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) =>
      row === column || row + column === size - 1 || row === Math.floor(size / 2),
    ),
  );
  const { rowClues, columnClues } = solutionToClues(solution);
  return { size, solution, rowClues, columnClues };
}
