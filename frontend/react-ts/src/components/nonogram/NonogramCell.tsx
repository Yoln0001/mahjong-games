import type { CellState, DrawMode } from "../../games/nonogram/types";

type Props = {
  row: number;
  column: number;
  state: CellState;
  majorColumn: boolean;
  majorRow: boolean;
  onDrawStart: (row: number, column: number, mode: DrawMode) => void;
  onDrawEnter: (row: number, column: number) => void;
};

export default function NonogramCell({ row, column, state, majorColumn, majorRow, onDrawStart, onDrawEnter }: Props) {
  return (
    <button
      className={`nonogram-cell is-${state}${majorColumn ? " is-major-column" : ""}${majorRow ? " is-major-row" : ""}`}
      type="button"
      data-row={row}
      data-column={column}
      aria-label={`第 ${row + 1} 行，第 ${column + 1} 列：${state}`}
      onPointerDown={(event) => {
        onDrawStart(row, column, event.button === 2 ? "marked" : "filled");
      }}
      onPointerEnter={(event) => {
        if (event.buttons) onDrawEnter(row, column);
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {state === "marked" ? <span aria-hidden="true">×</span> : null}
    </button>
  );
}
