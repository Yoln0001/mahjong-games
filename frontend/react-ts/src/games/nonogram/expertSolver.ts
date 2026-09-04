// A failed-literal solver: trial branches use line deductions only (no recursion).
// Every committed cell follows from a contradiction, so a completed proof also
// certifies uniqueness. A timeout is never treated as a contradiction.
export type ExpertStats = {
  solved: boolean;
  logicalSolved: boolean;
  eliminations: number;
  probes: number;
  exhausted: boolean;
};
type Domains = { rows: number[][]; columns: number[][] };

export function analyzeExpertDifficulty(rowClues: number[][], columnClues: number[][], deadline = performance.now() + 150): ExpertStats {
  const size = rowClues.length;
  const full = (1 << size) - 1;
  const stats: ExpertStats = { solved: false, logicalSolved: false, eliminations: 0, probes: 0, exhausted: false };
  const check = () => { if (performance.now() >= deadline) throw new Error("budget"); };
  function patterns(raw: number[]) {
    const clues = raw.filter((n) => n > 0);
    const result: number[] = [];
    function place(index: number, start: number, mask: number) {
      check();
      if (result.length >= 20000) throw new Error("budget");
      if (index === clues.length) { result.push(mask); return; }
      const length = clues[index]!;
      const remaining = clues.slice(index + 1).reduce((a, b) => a + b, 0) + clues.length - index - 1;
      for (let pos = start; pos <= size - length - remaining; pos++) {
        place(index + 1, pos + length + 1, mask | (((1 << length) - 1) << pos));
      }
    }
    place(0, 0, 0);
    return result;
  }
  function propagate(state: Domains): boolean {
    let changed = true;
    while (changed) {
      changed = false;
      for (let axis = 0; axis < 2; axis++) {
        const lines = axis === 0 ? state.rows : state.columns;
        const cross = axis === 0 ? state.columns : state.rows;
        for (let line = 0; line < size; line++) {
          check();
          const domain = lines[line]!;
          if (!domain.length) return false;
          let yes = full, any = 0;
          for (const mask of domain) { yes &= mask; any |= mask; }
          const no = full ^ any;
          for (let cell = 0; cell < size; cell++) {
            if (!((yes | no) & (1 << cell))) continue;
            const value = (yes & (1 << cell)) !== 0;
            const old = cross[cell]!;
            const next = old.filter((mask) => Boolean(mask & (1 << line)) === value);
            if (!next.length) return false;
            if (next.length !== old.length) { cross[cell] = next; changed = true; }
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
    if (stats.logicalSolved) { stats.solved = true; return stats; }
    while (!state.rows.every((line) => line.length === 1)) {
      let progress = false;
      const cells: Array<{ row: number; column: number; weight: number }> = [];
      for (let row = 0; row < size; row++) {
        let yes = full, any = 0;
        for (const mask of state.rows[row]!) { yes &= mask; any |= mask; }
        for (let column = 0; column < size; column++) {
          if ((any ^ yes) & (1 << column)) cells.push({ row, column, weight: state.rows[row]!.length + state.columns[column]!.length });
        }
      }
      cells.sort((a, b) => a.weight - b.weight);
      for (const { row, column } of cells) {
        for (const value of [false, true]) {
          check();
          if (++stats.probes > 800) throw new Error("budget");
          const trial = { rows: state.rows.slice(), columns: state.columns.slice() };
          trial.rows[row] = trial.rows[row]!.filter((mask) => Boolean(mask & (1 << column)) === value);
          if (!propagate(trial)) {
            state.rows[row] = state.rows[row]!.filter((mask) => Boolean(mask & (1 << column)) !== value);
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
