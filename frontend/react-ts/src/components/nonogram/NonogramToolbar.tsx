import { Modal } from "antd";
import type { DrawColor, DrawMode } from "../../games/nonogram/types";

type Props = {
  mode: DrawMode;
  color: DrawColor;
  onModeChange: (mode: DrawMode) => void;
  onColorChange: (color: DrawColor) => void;
  onClear: () => void | Promise<void>;
  onNew: () => void;
  newLabel?: string;
};

const COLORS: Array<{ value: DrawColor; label: string }> = [
  { value: "black", label: "黑色" },
  { value: "red", label: "红色" },
  { value: "yellow", label: "黄色" },
  { value: "blue", label: "蓝色" },
  { value: "green", label: "绿色" },
];

const COLOR_LABELS: Record<DrawColor, string> = {
  black: "黑色",
  red: "红色",
  yellow: "黄色",
  blue: "蓝色",
  green: "绿色",
};

export default function NonogramToolbar({ mode, color, onModeChange, onColorChange, onClear, onNew, newLabel = "新游戏" }: Props) {
  function confirmClear() {
    Modal.confirm({
      title: `确认清空${COLOR_LABELS[color]}内容？`,
      content: `棋盘上所有${COLOR_LABELS[color]}方块和叉都会被删除，其他颜色不受影响。`,
      okText: "清空当前颜色",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: onClear,
    });
  }

  function confirmNewGame() {
    if (newLabel !== "新游戏") {
      onNew();
      return;
    }
    Modal.confirm({
      title: "确认开始新游戏？",
      content: "当前题目的作答进度将被替换，且无法恢复。",
      okText: "开始新游戏",
      cancelText: "继续当前题目",
      okButtonProps: { danger: true },
      onOk: onNew,
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
      <button type="button" className="nonogram-subtle-btn" onClick={confirmClear}>清空当前颜色</button>
      <button type="button" className="nonogram-new-btn" onClick={confirmNewGame}>{newLabel}</button>
    </div>
  );
}
