export function lineToClues(line: readonly boolean[]): number[] {
  const clues: number[] = [];
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

export function solutionToClues(solution: boolean[][]) {
  const size = solution.length;
  const rowClues = solution.map(lineToClues);
  const columnClues = Array.from({ length: size }, (_, column) =>
    lineToClues(solution.map((row) => row[column] ?? false)),
  );
  return { rowClues, columnClues };
}
