// tests/nonogram-expert.test.ts
import assert from "node:assert/strict";

// src/games/nonogram/clues.ts
function lineToClues(line) {
  const clues = [];
  let run = 0;
  for (const filled of line) {
    if (filled) run += 1;
    else if (run > 0) {
      clues.push(run);
      run = 0;
    }
  }
  if (run > 0) clues.push(run);
  return clues.length ? clues : [0];
}
function solutionToClues(solution) {
  const size = solution.length;
  const rowClues = solution.map(lineToClues);
  const columnClues = Array.from(
    { length: size },
    (_, column) => lineToClues(solution.map((row) => row[column] ?? false))
  );
  return { rowClues, columnClues };
}

// src/games/nonogram/solver.ts
function createPatterns(length, rawClues) {
  const clues = rawClues.filter((value) => value > 0);
  if (!clues.length) return [Array(length).fill(false)];
  const patterns = [];
  function place(clueIndex, cursor, line) {
    if (clueIndex >= clues.length) {
      patterns.push([...line]);
      return;
    }
    const clue = clues[clueIndex] ?? 0;
    const remaining = clues.slice(clueIndex + 1).reduce((sum, n) => sum + n, 0) + Math.max(0, clues.length - clueIndex - 1);
    const latestStart = length - clue - remaining;
    for (let start = cursor; start <= latestStart; start += 1) {
      const next = [...line];
      for (let offset = 0; offset < clue; offset += 1) next[start + offset] = true;
      place(clueIndex + 1, start + clue + 1, next);
    }
  }
  place(0, 0, Array(length).fill(false));
  return patterns;
}
function patternMatches(pattern, known) {
  return pattern.every((value, index) => known[index] == null || known[index] === value);
}
function analyzeLogicalDifficulty(rowClues, columnClues) {
  const size = rowClues.length;
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const rows = rowClues.map((clue) => createPatterns(size, clue));
  const columns = columnClues.map((clue) => createPatterns(size, clue));
  let rounds = 0;
  let initialForcedCells = 0;
  while (true) {
    let deducedThisRound = 0;
    for (let row = 0; row < size; row += 1) {
      const valid = (rows[row] ?? []).filter((pattern) => patternMatches(pattern, grid[row] ?? []));
      if (!valid.length) return { logicalSolved: false, rounds, initialForcedCells, score: 100 };
      rows[row] = valid;
      for (let column = 0; column < size; column += 1) {
        const value = valid[0]?.[column] ?? false;
        if (grid[row]?.[column] == null && valid.every((pattern) => pattern[column] === value)) {
          grid[row][column] = value;
          deducedThisRound += 1;
        }
      }
    }
    for (let column = 0; column < size; column += 1) {
      const known = Array.from({ length: size }, (_, row) => grid[row]?.[column] ?? null);
      const valid = (columns[column] ?? []).filter((pattern) => patternMatches(pattern, known));
      if (!valid.length) return { logicalSolved: false, rounds, initialForcedCells, score: 100 };
      columns[column] = valid;
      for (let row = 0; row < size; row += 1) {
        const value = valid[0]?.[row] ?? false;
        if (grid[row]?.[column] == null && valid.every((pattern) => pattern[row] === value)) {
          grid[row][column] = value;
          deducedThisRound += 1;
        }
      }
    }
    if (!deducedThisRound) break;
    rounds += 1;
    if (rounds === 1) initialForcedCells = deducedThisRound;
  }
  const allClues = [...rowClues, ...columnClues];
  const values = allClues.flat().filter((value) => value > 0);
  const shortRatio = values.filter((value) => value <= 2).length / Math.max(1, values.length);
  const multiGroupRatio = allClues.filter((clues) => clues.filter((value) => value > 0).length >= 3).length / Math.max(1, allClues.length);
  const initialForcedRatio = initialForcedCells / Math.max(1, size * size);
  const logicalSolved = grid.every((line) => line.every((cell) => cell != null));
  const score = Math.round(
    (1 - initialForcedRatio) * 45 + Math.min(rounds, 6) / 6 * 20 + shortRatio * 20 + multiGroupRatio * 15
  );
  return { logicalSolved, rounds, initialForcedCells, score };
}
function countSolutions(rowClues, columnClues, limit = 2) {
  const size = rowClues.length;
  const baseRows = rowClues.map((clue) => createPatterns(size, clue));
  const baseColumns = columnClues.map((clue) => createPatterns(size, clue));
  function search(grid, rows, columns) {
    let changed = true;
    while (changed) {
      changed = false;
      for (let row = 0; row < size; row += 1) {
        const valid = (rows[row] ?? []).filter((p) => patternMatches(p, grid[row] ?? []));
        if (!valid.length) return 0;
        rows[row] = valid;
        for (let column = 0; column < size; column += 1) {
          const first = valid[0]?.[column] ?? false;
          if (valid.every((p) => p[column] === first) && grid[row]?.[column] == null) {
            grid[row][column] = first;
            changed = true;
          }
        }
      }
      for (let column = 0; column < size; column += 1) {
        const known = Array.from({ length: size }, (_, row) => grid[row]?.[column] ?? null);
        const valid = (columns[column] ?? []).filter((p) => patternMatches(p, known));
        if (!valid.length) return 0;
        columns[column] = valid;
        for (let row = 0; row < size; row += 1) {
          const first = valid[0]?.[row] ?? false;
          if (valid.every((p) => p[row] === first) && grid[row]?.[column] == null) {
            grid[row][column] = first;
            changed = true;
          }
        }
      }
    }
    let branchRow = -1;
    let branchColumn = -1;
    for (let row = 0; row < size && branchRow < 0; row += 1) {
      for (let column = 0; column < size; column += 1) {
        if (grid[row]?.[column] == null) {
          branchRow = row;
          branchColumn = column;
          break;
        }
      }
    }
    if (branchRow < 0) return 1;
    let total = 0;
    for (const value of [false, true]) {
      const nextGrid = grid.map((line) => [...line]);
      nextGrid[branchRow][branchColumn] = value;
      total += search(nextGrid, rows.map((p) => [...p]), columns.map((p) => [...p]));
      if (total >= limit) return total;
    }
    return total;
  }
  const empty = Array.from({ length: size }, () => Array(size).fill(null));
  return search(empty, baseRows, baseColumns);
}

// src/games/nonogram/expertSolver.ts
function analyzeExpertDifficulty(rowClues, columnClues, deadline = performance.now() + 150) {
  const size = rowClues.length;
  const full = (1 << size) - 1;
  const stats = { solved: false, logicalSolved: false, eliminations: 0, probes: 0, exhausted: false };
  const check = () => {
    if (performance.now() >= deadline) throw new Error("budget");
  };
  function patterns(raw) {
    const clues = raw.filter((n) => n > 0);
    const result = [];
    function place(index, start, mask) {
      check();
      if (result.length >= 2e4) throw new Error("budget");
      if (index === clues.length) {
        result.push(mask);
        return;
      }
      const length = clues[index];
      const remaining = clues.slice(index + 1).reduce((a, b) => a + b, 0) + clues.length - index - 1;
      for (let pos = start; pos <= size - length - remaining; pos++) {
        place(index + 1, pos + length + 1, mask | (1 << length) - 1 << pos);
      }
    }
    place(0, 0, 0);
    return result;
  }
  function propagate(state) {
    let changed = true;
    while (changed) {
      changed = false;
      for (let axis = 0; axis < 2; axis++) {
        const lines = axis === 0 ? state.rows : state.columns;
        const cross = axis === 0 ? state.columns : state.rows;
        for (let line = 0; line < size; line++) {
          check();
          const domain = lines[line];
          if (!domain.length) return false;
          let yes = full, any = 0;
          for (const mask of domain) {
            yes &= mask;
            any |= mask;
          }
          const no = full ^ any;
          for (let cell = 0; cell < size; cell++) {
            if (!((yes | no) & 1 << cell)) continue;
            const value = (yes & 1 << cell) !== 0;
            const old = cross[cell];
            const next = old.filter((mask) => Boolean(mask & 1 << line) === value);
            if (!next.length) return false;
            if (next.length !== old.length) {
              cross[cell] = next;
              changed = true;
            }
          }
        }
      }
    }
    return true;
  }
  try {
    const state = { rows: rowClues.map(patterns), columns: columnClues.map(patterns) };
    if (!propagate(state)) return stats;
    stats.logicalSolved = state.rows.every((line) => line.length === 1);
    if (stats.logicalSolved) {
      stats.solved = true;
      return stats;
    }
    while (!state.rows.every((line) => line.length === 1)) {
      let progress = false;
      const cells = [];
      for (let row = 0; row < size; row++) {
        let yes = full, any = 0;
        for (const mask of state.rows[row]) {
          yes &= mask;
          any |= mask;
        }
        for (let column = 0; column < size; column++) {
          if ((any ^ yes) & 1 << column) cells.push({ row, column, weight: state.rows[row].length + state.columns[column].length });
        }
      }
      cells.sort((a, b) => a.weight - b.weight);
      for (const { row, column } of cells) {
        for (const value of [false, true]) {
          check();
          if (++stats.probes > 800) throw new Error("budget");
          const trial = { rows: state.rows.slice(), columns: state.columns.slice() };
          trial.rows[row] = trial.rows[row].filter((mask) => Boolean(mask & 1 << column) === value);
          if (!propagate(trial)) {
            state.rows[row] = state.rows[row].filter((mask) => Boolean(mask & 1 << column) !== value);
            stats.eliminations++;
            if (!propagate(state)) return stats;
            progress = true;
            break;
          }
        }
        if (progress) break;
      }
      if (!progress) return stats;
    }
    stats.solved = true;
  } catch {
    stats.exhausted = true;
  }
  return stats;
}

// src/games/nonogram/generator.ts
function randomSolution(size, difficulty) {
  const density = difficulty === "easy" ? 0.52 + Math.random() * 0.14 : size > 15 ? 0.56 + Math.random() * 0.04 : 0.42 + Math.random() * 0.14;
  const solution = Array.from(
    { length: size },
    () => Array.from({ length: size }, () => Math.random() < density)
  );
  const smoothingPasses = difficulty === "easy" ? 2 : difficulty === "normal" ? 1 : 0;
  for (let pass = 0; pass < smoothingPasses; pass += 1) {
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        const neighbors = [
          solution[row - 1]?.[column],
          solution[row + 1]?.[column],
          solution[row]?.[column - 1],
          solution[row]?.[column + 1]
        ].filter(Boolean).length;
        if (neighbors >= 3 && Math.random() < 0.35) solution[row][column] = true;
      }
    }
  }
  return solution;
}
function scoreRange(difficulty) {
  if (difficulty === "easy") return { min: 0, max: 54, target: 38 };
  if (difficulty === "hard") return { min: 72, max: 100, target: 82 };
  return { min: 55, max: 71, target: 63 };
}
function generatePuzzle(requestedSize, difficulty = "normal") {
  const size = Math.max(5, Math.min(25, Math.round(requestedSize)));
  if (difficulty === "expert") {
    const deadline = performance.now() + 6e3;
    let best = null;
    for (let attempt = 0; attempt < 1e3 && performance.now() < deadline; attempt++) {
      const solution2 = randomSolution(size, difficulty);
      const { rowClues: rowClues2, columnClues: columnClues2 } = solutionToClues(solution2);
      const stats = analyzeExpertDifficulty(rowClues2, columnClues2, Math.min(deadline, performance.now() + 150));
      if (!stats.solved || stats.logicalSolved || stats.exhausted || !stats.eliminations) continue;
      const puzzle = { size, solution: solution2, rowClues: rowClues2, columnClues: columnClues2, difficulty };
      if (!best || stats.eliminations > best.eliminations) best = { puzzle, eliminations: stats.eliminations };
      if (stats.eliminations >= Math.max(2, Math.floor(size / 5))) return puzzle;
    }
    if (best) return best.puzzle;
    throw new Error("\u672A\u627E\u5230\u7B26\u5408\u6781\u96BE\u6807\u51C6\u7684\u9898\u76EE\uFF0C\u8BF7\u91CD\u65B0\u751F\u6210\u3002");
  }
  const range = scoreRange(difficulty);
  let closest = null;
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const solution2 = randomSolution(size, difficulty);
    const filled = solution2.flat().filter(Boolean).length;
    if (filled < size || filled > size * size - size) continue;
    const { rowClues: rowClues2, columnClues: columnClues2 } = solutionToClues(solution2);
    const stats = analyzeLogicalDifficulty(rowClues2, columnClues2);
    if (!stats.logicalSolved) continue;
    const puzzle = { size, solution: solution2, rowClues: rowClues2, columnClues: columnClues2, difficulty };
    const distance = Math.abs(stats.score - range.target);
    if (!closest || distance < closest.distance) closest = { puzzle, distance };
    if (stats.score >= range.min && stats.score <= range.max) return puzzle;
  }
  if (closest) return closest.puzzle;
  const solution = Array.from(
    { length: size },
    (_, row) => Array.from({ length: size }, (_2, column) => column <= row)
  );
  const { rowClues, columnClues } = solutionToClues(solution);
  return { size, solution, rowClues, columnClues, difficulty };
}

// src/games/nonogram/game.ts
function createGame(puzzle) {
  return {
    puzzle,
    board: Array.from(
      { length: puzzle.size },
      () => Array(puzzle.size).fill("unknown")
    ),
    colors: Array.from(
      { length: puzzle.size },
      () => Array(puzzle.size).fill(null)
    ),
    startedAt: Date.now(),
    finishedAt: null,
    finished: false
  };
}
function isSolved(board, solution) {
  return solution.every((row, rowIndex) => row.every(
    (filled, columnIndex) => board[rowIndex]?.[columnIndex] === "filled" === filled
  ));
}

// tests/nonogram-expert.test.ts
var seed = 17;
var originalRandom = Math.random;
Math.random = () => (seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296;
try {
  for (const size of [5, 10, 15, 20, 25]) {
    const started = performance.now();
    const puzzle = generatePuzzle(size, "expert");
    const stats = analyzeExpertDifficulty(puzzle.rowClues, puzzle.columnClues, performance.now() + 3e3);
    assert.equal(stats.solved, true);
    assert.equal(stats.logicalSolved, false);
    assert.equal(analyzeLogicalDifficulty(puzzle.rowClues, puzzle.columnClues).logicalSolved, false);
    assert.ok(stats.eliminations > 0);
    assert.equal(stats.exhausted, false);
    assert.equal(puzzle.difficulty, "expert");
    if (size <= 10) assert.equal(countSolutions(puzzle.rowClues, puzzle.columnClues), 1);
    const game = createGame(puzzle);
    const board = puzzle.solution.map((row) => row.map((cell) => cell ? "filled" : "unknown"));
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
