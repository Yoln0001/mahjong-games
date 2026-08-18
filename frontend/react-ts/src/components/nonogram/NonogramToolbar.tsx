import type { DrawMode } from "../../games/nonogram/types";

type Props = {
  mode: DrawMode;
  onModeChange: (mode: DrawMode) => void;
  onClear: () => void;
  onNew: () => void;
};

export default function NonogramToolbar({ mode, onModeChange, onClear, onNew }: Props) {
  return (
    <div className="nonogram-toolbar" aria-label="游戏工具">
      <div className="nonogram-mode-switch">
        <button className={mode === "filled" ? "active" : ""} type="button" onClick={() => onModeChange("filled")}>
          <span className="mode-symbol filled" aria-hidden="true" />填色
        </button>
        <button className={mode === "marked" ? "active" : ""} type="button" onClick={() => onModeChange("marked")}>
          <span className="mode-symbol marked" aria-hidden="true">×</span>标记
        </button>
      </div>
      <button type="button" className="nonogram-subtle-btn" onClick={onClear}>清空</button>
      <button type="button" className="nonogram-new-btn" onClick={onNew}>新游戏</button>
    </div>
  );
}
