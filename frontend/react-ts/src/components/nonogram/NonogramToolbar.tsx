import { Modal } from "antd";
import type { DrawColor, DrawMode } from "../../games/nonogram/types";

type Props = {
  mode: DrawMode;
  color: DrawColor;
  onModeChange: (mode: DrawMode) => void;
  onColorChange: (color: DrawColor) => void;
  onClear: () => void;
  onNew: () => void;
};

const COLORS: Array<{ value: DrawColor; label: string }> = [
  { value: "black", label: "黑色" },
  { value: "red", label: "红色" },
  { value: "yellow", label: "黄色" },
  { value: "blue", label: "蓝色" },
  { value: "green", label: "绿色" },
];

export default function NonogramToolbar({ mode, color, onModeChange, onColorChange, onClear, onNew }: Props) {
  function confirmClear() {
    Modal.confirm({
      title: "确认清空棋盘？",
      content: "当前的填色和标记都会被删除。",
      okText: "清空",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: onClear,
    });
  }

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
      <div className="nonogram-color-picker" role="group" aria-label="画笔颜色">
        {COLORS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`nonogram-color-swatch paint-${value}${color === value ? " active" : ""}`}
            aria-label={label}
            aria-pressed={color === value}
            title={label}
            onClick={() => onColorChange(value)}
          />
        ))}
      </div>
      <button type="button" className="nonogram-subtle-btn" onClick={confirmClear}>清空</button>
      <button type="button" className="nonogram-new-btn" onClick={onNew}>新游戏</button>
    </div>
  );
}
