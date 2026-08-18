type Pattern = boolean[];

function createPatterns(length: number, rawClues: number[]): Pattern[] {
  const clues = rawClues.filter((value) => value > 0);
  if (!clues.length) return [Array<boolean>(length).fill(false)];
  const patterns: Pattern[] = [];

  function place(clueIndex: number, cursor: number, line: boolean[]) {
    if (clueIndex >= clues.length) {
      patterns.push([...line]);
      return;
    }
    const clue = clues[clueIndex] ?? 0;
    const remaining = clues.slice(clueIndex + 1).reduce((sum, n) => sum + n, 0)
      + Math.max(0, clues.length - clueIndex - 1);
    const latestStart = length - clue - remaining;
    for (let start = cursor; start <= latestStart; start += 1) {
      const next = [...line];
      for (let offset = 0; offset < clue; offset += 1) next[start + offset] = true;
      place(clueIndex + 1, start + clue + 1, next);
    }
  }

  place(0, 0, Array<boolean>(length).fill(false));
  return patterns;
}

function patternMatches(pattern: Pattern, known: Array<boolean | null>) {
  return pattern.every((value, index) => known[index] == null || known[index] === value);
}

export function countSolutions(rowClues: number[][], columnClues: number[][], limit = 2): number {
  const size = rowClues.length;
  const baseRows = rowClues.map((clue) => createPatterns(size, clue));
  const baseColumns = columnClues.map((clue) => createPatterns(size, clue));

  function search(
    grid: Array<Array<boolean | null>>,
    rows: Pattern[][],
    columns: Pattern[][],
  ): number {
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
            grid[row]![column] = first;
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
            grid[row]![column] = first;
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
      nextGrid[branchRow]![branchColumn] = value;
      total += search(nextGrid, rows.map((p) => [...p]), columns.map((p) => [...p]));
      if (total >= limit) return total;
    }
    return total;
  }

  const empty = Array.from({ length: size }, () => Array<boolean | null>(size).fill(null));
  return search(empty, baseRows, baseColumns);
}
