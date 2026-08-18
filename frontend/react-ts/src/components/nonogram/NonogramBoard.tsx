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
  const maxRowClues = Math.max(...puzzle.rowClues.map((clues) => clues.length));
  const maxColumnClues = Math.max(...puzzle.columnClues.map((clues) => clues.length));

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
      } as React.CSSProperties}
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
          />
        )))}
      </div>
    </div>
  );
}
