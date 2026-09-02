import type { CellColor, CellState, DrawMode } from "../../games/nonogram/types";

type Props = {
  row: number;
  column: number;
  state: CellState;
  color: CellColor;
  majorColumn: boolean;
  majorRow: boolean;
  onDrawStart: (row: number, column: number, mode: DrawMode) => void;
};

export default function NonogramCell({ row, column, state, color, majorColumn, majorRow, onDrawStart }: Props) {
  return (
    <button
      className={`nonogram-cell is-${state} paint-${color ?? "black"}${majorColumn ? " is-major-column" : ""}${majorRow ? " is-major-row" : ""}`}
      type="button"
      data-row={row}
      data-column={column}
      aria-label={`第 ${row + 1} 行，第 ${column + 1} 列：${state}`}
      onClick={() => onDrawStart(row, column, "filled")}
      onContextMenu={(event) => {
        event.preventDefault();
        onDrawStart(row, column, "marked");
      }}
    >
      {state === "marked" ? <span aria-hidden="true">×</span> : null}
    </button>
  );
}
