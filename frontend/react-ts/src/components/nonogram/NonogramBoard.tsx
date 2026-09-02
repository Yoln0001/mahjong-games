import { useEffect, useMemo, useState } from "react";
import type { CellColor, CellState, DrawMode, NonogramPuzzle } from "../../games/nonogram/types";
import NonogramCell from "./NonogramCell";
import NonogramClues from "./NonogramClues";

type Props = {
  puzzle: NonogramPuzzle;
  board: CellState[][];
  colors: CellColor[][];
  drawMode: DrawMode;
  disabled?: boolean;
  onPaint: (row: number, column: number, mode: DrawMode) => void;
};

export default function NonogramBoard({ puzzle, board, colors, drawMode, disabled, onPaint }: Props) {
  const maxRowClues = Math.max(...puzzle.rowClues.map((clues) => clues.length));
  const maxColumnClues = Math.max(...puzzle.columnClues.map((clues) => clues.length));
  const cellMax = puzzle.size <= 10 ? 44 : puzzle.size <= 15 ? 38 : puzzle.size <= 20 ? 32 : 27;
  const puzzleSignature = useMemo(
    () => JSON.stringify([puzzle.size, puzzle.rowClues, puzzle.columnClues]),
    [puzzle.columnClues, puzzle.rowClues, puzzle.size],
  );
  const [completedClues, setCompletedClues] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setCompletedClues(new Set());
  }, [puzzleSignature]);

  function toggleClue(direction: "row" | "column", lineIndex: number, clueIndex: number) {
    const key = `${direction}-${lineIndex}-${clueIndex}`;
    setCompletedClues((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function completedFor(direction: "row" | "column", lineIndex: number) {
    const result = new Set<number>();
    const count = direction === "row" ? puzzle.rowClues[lineIndex]?.length : puzzle.columnClues[lineIndex]?.length;
    for (let index = 0; index < (count ?? 0); index += 1) {
      if (completedClues.has(`${direction}-${lineIndex}-${index}`)) result.add(index);
    }
    return result;
  }

  function start(row: number, column: number, pointerMode: DrawMode) {
    if (disabled) return;
    onPaint(row, column, pointerMode === "marked" ? "marked" : drawMode);
  }

  return (
    <div
      className="nonogram-board-wrap"
      style={{
        "--nonogram-size": puzzle.size,
        "--row-clues": maxRowClues,
        "--column-clues": maxColumnClues,
        "--cell-max": `${cellMax}px`,
      } as React.CSSProperties}
    >
      <div className="nonogram-corner" aria-hidden="true" />
      <div className="nonogram-column-clues">
        {puzzle.columnClues.map((clues, index) => (
          <NonogramClues
            key={index}
            clues={clues}
            direction="column"
            lineIndex={index}
            completed={completedFor("column", index)}
            onToggle={(clueIndex) => toggleClue("column", index, clueIndex)}
          />
        ))}
      </div>
      <div className="nonogram-row-clues">
        {puzzle.rowClues.map((clues, index) => (
          <NonogramClues
            key={index}
            clues={clues}
            direction="row"
            lineIndex={index}
            completed={completedFor("row", index)}
            onToggle={(clueIndex) => toggleClue("row", index, clueIndex)}
          />
        ))}
      </div>
      <div className="nonogram-grid" role="grid" aria-label={`${puzzle.size} × ${puzzle.size} 数织棋盘`}>
        {board.map((row, rowIndex) => row.map((state, columnIndex) => (
          <NonogramCell
            key={`${rowIndex}-${columnIndex}`}
            row={rowIndex}
            column={columnIndex}
            state={state}
            color={colors[rowIndex]?.[columnIndex] ?? null}
            majorColumn={puzzle.size >= 10 && columnIndex > 0 && columnIndex % 5 === 0}
            majorRow={puzzle.size >= 10 && rowIndex > 0 && rowIndex % 5 === 0}
            onDrawStart={start}
          />
        )))}
      </div>
    </div>
  );
}
