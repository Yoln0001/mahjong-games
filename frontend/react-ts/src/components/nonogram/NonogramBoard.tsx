import { useRef } from "react";
import type { CellState, DrawMode, NonogramPuzzle } from "../../games/nonogram/types";
import NonogramCell from "./NonogramCell";
import NonogramClues from "./NonogramClues";

type Props = {
  puzzle: NonogramPuzzle;
  board: CellState[][];
  drawMode: DrawMode;
  disabled?: boolean;
  onPaint: (row: number, column: number, mode: DrawMode) => void;
};

export default function NonogramBoard({ puzzle, board, drawMode, disabled, onPaint }: Props) {
  const activeMode = useRef<DrawMode>(drawMode);
  const visited = useRef(new Set<string>());
  const maxRowClues = Math.max(...puzzle.rowClues.map((clues) => clues.length));
  const maxColumnClues = Math.max(...puzzle.columnClues.map((clues) => clues.length));

  function start(row: number, column: number, pointerMode: DrawMode) {
    if (disabled) return;
    activeMode.current = pointerMode === "marked" ? "marked" : drawMode;
    visited.current = new Set([`${row}:${column}`]);
    onPaint(row, column, activeMode.current);
  }

  function enter(row: number, column: number) {
    if (disabled) return;
    const key = `${row}:${column}`;
    if (visited.current.has(key)) return;
    visited.current.add(key);
    onPaint(row, column, activeMode.current);
  }

  return (
    <div
      className="nonogram-board-wrap"
      style={{
        "--nonogram-size": puzzle.size,
        "--row-clues": maxRowClues,
        "--column-clues": maxColumnClues,
      } as React.CSSProperties}
      onPointerUp={() => { visited.current.clear(); }}
      onPointerLeave={() => { visited.current.clear(); }}
    >
      <div className="nonogram-corner" aria-hidden="true" />
      <div className="nonogram-column-clues">
        {puzzle.columnClues.map((clues, index) => (
          <NonogramClues key={index} clues={clues} direction="column" />
        ))}
      </div>
      <div className="nonogram-row-clues">
        {puzzle.rowClues.map((clues, index) => (
          <NonogramClues key={index} clues={clues} direction="row" />
        ))}
      </div>
      <div className="nonogram-grid" role="grid" aria-label={`${puzzle.size} × ${puzzle.size} 数织棋盘`}>
        {board.map((row, rowIndex) => row.map((state, columnIndex) => (
          <NonogramCell
            key={`${rowIndex}-${columnIndex}`}
            row={rowIndex}
            column={columnIndex}
            state={state}
            majorColumn={puzzle.size >= 10 && columnIndex > 0 && columnIndex % 5 === 0}
            majorRow={puzzle.size >= 10 && rowIndex > 0 && rowIndex % 5 === 0}
            onDrawStart={start}
            onDrawEnter={enter}
          />
        )))}
      </div>
    </div>
  );
}
