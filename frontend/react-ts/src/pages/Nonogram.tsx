import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "antd";
import { useNavigate } from "react-router-dom";
import NonogramBoard from "../components/nonogram/NonogramBoard";
import NonogramToolbar from "../components/nonogram/NonogramToolbar";
import { createGame, isSolved } from "../games/nonogram/game";
import { generatePuzzle } from "../games/nonogram/generator";
import type { CellColor, CellState, DrawColor, DrawMode, NonogramDifficulty, NonogramGame } from "../games/nonogram/types";
import "../styles/nonogram.css";

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

const NONOGRAM_SAVE_KEY = "mahjong-games:nonogram:save:v1";

type NonogramSave = {
  version: 1;
  game: NonogramGame;
  elapsed: number;
  requestedSize: number;
  requestedDifficulty: NonogramDifficulty;
  drawMode: DrawMode;
  drawColor: DrawColor;
};

function isDifficulty(value: unknown): value is NonogramDifficulty {
  return value === "easy" || value === "normal" || value === "hard";
}

function isCellState(value: unknown): value is CellState {
  return value === "unknown" || value === "filled" || value === "marked";
}

function isDrawColor(value: unknown): value is DrawColor {
  return value === "black" || value === "red" || value === "yellow" || value === "blue" || value === "green";
}

function colorCode(color: CellColor): string {
  if (color === "black") return "k";
  if (color === "red") return "r";
  if (color === "yellow") return "y";
  if (color === "blue") return "b";
  if (color === "green") return "g";
  return ".";
}

function loadSavedGame(): NonogramSave | null {
  try {
    const raw = window.localStorage.getItem(NONOGRAM_SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<NonogramSave>;
    const game = saved.game as (NonogramGame & { colors?: CellColor[][] }) | undefined;
    const size = game?.puzzle?.size;
    if (
      saved.version !== 1
      || !game
      || !Number.isInteger(size)
      || size == null
      || size < 5
      || size > 25
      || !isDifficulty(game.puzzle.difficulty)
      || !Array.isArray(game.puzzle.solution)
      || game.puzzle.solution.length !== size
      || !game.puzzle.solution.every((row) => Array.isArray(row) && row.length === size && row.every((cell) => typeof cell === "boolean"))
      || !Array.isArray(game.board)
      || game.board.length !== size
      || !game.board.every((row) => Array.isArray(row) && row.length === size && row.every(isCellState))
      || !Number.isFinite(saved.elapsed)
    ) return null;

    const elapsed = Math.max(0, Math.floor(saved.elapsed ?? 0));
    const colors = Array.from({ length: size }, (_, row) =>
      Array.from({ length: size }, (_, column): CellColor => {
        if (game.board[row]?.[column] === "unknown") return null;
        const savedColor = game.colors?.[row]?.[column];
        return isDrawColor(savedColor) ? savedColor : "black";
      }),
    );
    return {
      version: 1,
      game: {
        ...game,
        colors,
        startedAt: game.finished ? game.startedAt : Date.now() - elapsed * 1000,
      },
      elapsed,
      requestedSize: Number.isInteger(saved.requestedSize) ? Math.max(5, Math.min(25, saved.requestedSize ?? size)) : size,
      requestedDifficulty: isDifficulty(saved.requestedDifficulty) ? saved.requestedDifficulty : game.puzzle.difficulty,
      drawMode: saved.drawMode === "marked" ? "marked" : "filled",
      drawColor: isDrawColor(saved.drawColor) ? saved.drawColor : "black",
    };
  } catch {
    return null;
  }
}

export default function Nonogram() {
  const navigate = useNavigate();
  const [restored] = useState(loadSavedGame);
  const [requestedSize, setRequestedSize] = useState(restored?.requestedSize ?? 10);
  const [requestedDifficulty, setRequestedDifficulty] = useState<NonogramDifficulty>(restored?.requestedDifficulty ?? "normal");
  const [game, setGame] = useState<NonogramGame>(() => restored?.game ?? createGame(generatePuzzle(10, "normal")));
  const [drawMode, setDrawMode] = useState<DrawMode>(restored?.drawMode ?? "filled");
  const [drawColor, setDrawColor] = useState<DrawColor>(restored?.drawColor ?? "black");
  const [elapsed, setElapsed] = useState(restored?.elapsed ?? 0);
  const [resultOpen, setResultOpen] = useState(restored?.game.finished ?? false);
  const [generating, setGenerating] = useState(false);

  const newGame = useCallback((size = requestedSize, difficulty = requestedDifficulty) => {
    setGenerating(true);
    window.setTimeout(() => {
      const next = createGame(generatePuzzle(size, difficulty));
      setGame(next);
      setElapsed(0);
      setResultOpen(false);
      setGenerating(false);
    }, 20);
  }, [requestedDifficulty, requestedSize]);

  const clearBoard = useCallback(() => {
    setGame((current) => ({
      ...current,
      board: Array.from({ length: current.puzzle.size }, () =>
        Array<CellState>(current.puzzle.size).fill("unknown"),
      ),
      colors: Array.from({ length: current.puzzle.size }, () =>
        Array<CellColor>(current.puzzle.size).fill(null),
      ),
      finished: false,
      finishedAt: null,
    }));
    setResultOpen(false);
  }, []);

  const paint = useCallback((row: number, column: number, mode: DrawMode) => {
    setGame((current) => {
      if (current.finished) return current;
      const board = current.board.map((line) => [...line]);
      const colors = current.colors.map((line) => [...line]);
      const previous = board[row]?.[column] ?? "unknown";
      const next: CellState = previous === "unknown" ? mode : "unknown";
      board[row]![column] = next;
      colors[row]![column] = next === "unknown" ? null : drawColor;
      const finished = isSolved(board, current.puzzle.solution);
      if (finished) window.setTimeout(() => setResultOpen(true), 120);
      return {
        ...current,
        board,
        colors,
        finished,
        finishedAt: finished ? Date.now() : null,
      };
    });
  }, [drawColor]);

  useEffect(() => {
    if (game.finished) return;
    const tick = () => setElapsed(Math.floor((Date.now() - game.startedAt) / 1000));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [game.finished, game.startedAt]);

  useEffect(() => {
    const saved: NonogramSave = {
      version: 1,
      game,
      elapsed,
      requestedSize,
      requestedDifficulty,
      drawMode,
      drawColor,
    };
    try {
      window.localStorage.setItem(NONOGRAM_SAVE_KEY, JSON.stringify(saved));
    } catch {
      // Browsers may disable storage in private mode; gameplay should continue.
    }
  }, [drawColor, drawMode, elapsed, game, requestedDifficulty, requestedSize]);

  const textState = useMemo(() => ({
    mode: game.finished ? "completed" : "playing",
    coordinateSystem: "row and column are zero-based from the top-left",
    size: game.puzzle.size,
    difficulty: game.puzzle.difficulty,
    drawMode,
    drawColor,
    elapsedSeconds: elapsed,
    rowClues: game.puzzle.rowClues,
    columnClues: game.puzzle.columnClues,
    board: game.board.map((row) => row.map((cell) => cell === "filled" ? "#" : cell === "marked" ? "x" : ".").join("")),
    colors: game.colors.map((row) => row.map(colorCode).join("")),
  }), [drawColor, drawMode, elapsed, game]);

  useEffect(() => {
    window.render_game_to_text = () => JSON.stringify(textState);
    window.advanceTime = (ms: number) => setElapsed((current) => current + Math.max(0, Math.floor(ms / 1000)));
    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [textState]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "f" || event.target instanceof HTMLInputElement) return;
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <main className="nonogram-page">
      <section className="nonogram-heading">
        <div>
          <p className="nonogram-eyebrow">NONOGRAM</p>
          <h1>数织</h1>
          <p>根据行列数字，找出隐藏的图案。</p>
        </div>
        <div className="nonogram-meta">
          <span>{game.puzzle.size} × {game.puzzle.size} · {{ easy: "简单", normal: "普通", hard: "困难" }[game.puzzle.difficulty]}</span>
          <strong>{formatTime(elapsed)}</strong>
        </div>
        <button className="nonogram-battle-entry" type="button" onClick={() => navigate("/nonogram/battle")}>双人对战</button>
      </section>

      <section className="nonogram-size-panel" aria-label="棋盘尺寸">
        <label htmlFor="nonogram-size">方格大小</label>
        <input
          id="nonogram-size"
          type="number"
          min={5}
          max={25}
          value={requestedSize}
          onChange={(event) => setRequestedSize(Math.max(5, Math.min(25, Number(event.target.value) || 5)))}
        />
        <span>× {requestedSize}</span>
        <div className="nonogram-difficulty" role="group" aria-label="题目难度">
          {(["easy", "normal", "hard"] as NonogramDifficulty[]).map((difficulty) => (
            <button
              key={difficulty}
              type="button"
              className={requestedDifficulty === difficulty ? "active" : ""}
              onClick={() => setRequestedDifficulty(difficulty)}
            >
              {{ easy: "简单", normal: "普通", hard: "困难" }[difficulty]}
            </button>
          ))}
        </div>
        <button type="button" disabled={generating} onClick={() => newGame()}>
          {generating ? "生成中…" : "生成随机题目"}
        </button>
      </section>

      <section className="nonogram-play-area" aria-busy={generating}>
        <NonogramBoard puzzle={game.puzzle} board={game.board} colors={game.colors} drawMode={drawMode} disabled={generating} onPaint={paint} />
        <NonogramToolbar mode={drawMode} color={drawColor} onModeChange={setDrawMode} onColorChange={setDrawColor} onClear={clearBoard} onNew={() => newGame()} />
        <p className="nonogram-help">点击格子填色，右键标记空格；点击行列数字可标记该段已完成。</p>
      </section>

      <Modal open={resultOpen} footer={null} closable={false} centered className="nonogram-result-modal">
        <div className="nonogram-result">
          <div className="nonogram-result-icon">✓</div>
          <h2>完成了！</h2>
          <p>{game.puzzle.size} × {game.puzzle.size} · 用时 {formatTime(elapsed)}</p>
          <button type="button" onClick={() => newGame()}>再来一题</button>
          <button type="button" className="result-close" onClick={() => setResultOpen(false)}>查看棋盘</button>
        </div>
      </Modal>
    </main>
  );
}
