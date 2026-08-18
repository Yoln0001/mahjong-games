import type { CellState, DrawMode } from "../../games/nonogram/types";

type Props = {
  row: number;
  column: number;
  state: CellState;
  majorColumn: boolean;
  majorRow: boolean;
  onDrawStart: (row: number, column: number, mode: DrawMode) => void;
};

export default function NonogramCell({ row, column, state, majorColumn, majorRow, onDrawStart }: Props) {
  return (
    <button
      className={`nonogram-cell is-${state}${majorColumn ? " is-major-column" : ""}${majorRow ? " is-major-row" : ""}`}
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
