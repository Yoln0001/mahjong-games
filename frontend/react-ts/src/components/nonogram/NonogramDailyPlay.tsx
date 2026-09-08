import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "antd";
import NonogramBoard from "./NonogramBoard";
import NonogramToolbar from "./NonogramToolbar";
import { isSolved } from "../../games/nonogram/game";
import { loadDailySave, saveDailyProgress } from "../../games/nonogram/dailyStorage";
import type { DailySave } from "../../games/nonogram/dailyStorage";
import type { DrawMode } from "../../games/nonogram/types";
import type { DailyPuzzle } from "../../services/nonogramDailyApi";

type Props = { daily: DailyPuzzle; paused: boolean; onStatus: () => void; onChoose: () => void; metaLabel?: string; newLabel?: string };
const LABELS = { easy: "简单", normal: "普通", hard: "困难", expert: "极难" };
function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
}

export default function NonogramDailyPlay({ daily, paused, onStatus, onChoose, metaLabel, newLabel = "选择其他题目" }: Props) {
  const [save, setSave] = useState(() => loadDailySave(daily));
  const latest = useRef(save);
  const running = useRef<{ start: number; base: number } | null>(null);
  const [hidden, setHidden] = useState(document.hidden);
  const [resultOpen, setResultOpen] = useState(false);
  const disabled = paused || hidden || save.finished;

  const elapsedNow = useCallback(() => running.current
    ? running.current.base + Math.max(0, Date.now() - running.current.start)
    : latest.current.elapsedMs, []);
  const commit = useCallback((next: DailySave) => {
    latest.current = next;
    setSave(next);
    saveDailyProgress(daily.id, next);
    onStatus();
  }, [daily.id, onStatus]);

  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    const persist = () => saveDailyProgress(daily.id, { ...latest.current, elapsedMs: elapsedNow() });
    window.addEventListener("pagehide", persist);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", persist);
    };
  }, [daily.id, elapsedNow]);

  useEffect(() => {
    if (disabled) return;
    running.current = { start: Date.now(), base: latest.current.elapsedMs };
    const timer = window.setInterval(() => commit({ ...latest.current, elapsedMs: elapsedNow() }), 1000);
    return () => {
      window.clearInterval(timer);
      const elapsedMs = elapsedNow();
      running.current = null;
      latest.current = { ...latest.current, elapsedMs };
      saveDailyProgress(daily.id, latest.current);
    };
  }, [commit, daily.id, disabled, elapsedNow]);

  const paint = (row: number, column: number, mode: DrawMode) => {
    if (disabled) return;
    const current = latest.current;
    const board = current.board.map(line => [...line]);
    const colors = current.colors.map(line => [...line]);
    const state = board[row]![column] === "unknown" ? mode : "unknown";
    board[row]![column] = state;
    colors[row]![column] = state === "unknown" ? null : current.drawColor;
    const finished = isSolved(board, daily.puzzle.solution);
    commit({ ...current, board, colors, finished, elapsedMs: elapsedNow() });
    if (finished) setResultOpen(true);
  };
  const clearColor = () => {
    if (disabled) return;
    const current = latest.current;
    commit({
      ...current,
      board: current.board.map((row, r) => row.map((cell, c) => current.colors[r]?.[c] === current.drawColor ? "unknown" : cell)),
      colors: current.colors.map(row => row.map(color => color === current.drawColor ? null : color)),
      elapsedMs: elapsedNow(),
    });
  };

  useEffect(() => {
    window.render_game_to_text = () => JSON.stringify({
      mode: save.finished ? "completed" : "playing", dailyId: daily.id, date: daily.date,
      coordinateSystem: "zero-based row and column from top-left",
      size: daily.puzzle.size, difficulty: daily.puzzle.difficulty, elapsedSeconds: Math.floor(save.elapsedMs / 1000),
      rowClues: daily.puzzle.rowClues, columnClues: daily.puzzle.columnClues,
      board: save.board.map(row => row.map(cell => cell === "filled" ? "#" : cell === "marked" ? "x" : ".").join("")),
      colors: save.colors, drawColor: save.drawColor, drawMode: save.drawMode,
    });
    window.advanceTime = (ms) => {
      const elapsedMs = elapsedNow() + Math.max(0, ms);
      if (running.current) running.current = { start: Date.now(), base: elapsedMs };
      commit({ ...latest.current, elapsedMs });
    };
    return () => { delete window.render_game_to_text; delete window.advanceTime; };
  }, [commit, daily, elapsedNow, save]);

  return (
    <section className="nonogram-play-area" aria-busy={paused}>
      <div className="nonogram-meta">
        <span>{metaLabel ?? `${daily.date} · ${LABELS[daily.puzzle.difficulty]} · ${daily.puzzle.size} × ${daily.puzzle.size}`}</span>
        <strong>{formatTime(save.elapsedMs)}</strong>
      </div>
      {save.finished && <p className="daily-completed" role="status">✓ 本题已完成，换一道继续挑战吧！</p>}
      <div className="daily-board-scroll">
        <NonogramBoard puzzle={daily.puzzle} board={save.board} colors={save.colors}
          drawMode={save.drawMode} disabled={disabled} onPaint={paint} />
      </div>
      <NonogramToolbar mode={save.drawMode} color={save.drawColor}
        onModeChange={drawMode => commit({ ...latest.current, drawMode })}
        onColorChange={drawColor => commit({ ...latest.current, drawColor })}
        onClear={clearColor} onNew={onChoose} newLabel={newLabel} />
      <p className="nonogram-help">每题独立保存进度和颜色；切换题目、离开页面或切到后台时暂停计时。</p>
      <Modal open={resultOpen} footer={null} onCancel={() => setResultOpen(false)} centered>
        <div className="nonogram-result">
          <h2>每日挑战完成！</h2><p>用时 {formatTime(save.elapsedMs)}</p>
          <button type="button" onClick={() => { setResultOpen(false); onChoose(); }}>选择其他题目</button>
          <button type="button" className="result-close" onClick={() => setResultOpen(false)}>查看棋盘</button>
        </div>
      </Modal>
    </section>
  );
}
