import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Modal, Space, Typography, message, Switch, Divider } from "antd";
import type { InputRef } from "antd";
import {
  CheckOutlined,
  DeleteOutlined,
  SendOutlined,
  RollbackOutlined,
  InfoCircleOutlined,
  RetweetOutlined,
  SettingOutlined,
} from "@ant-design/icons";

import { useThemeMode } from "../App";
import TileCell, { CellStatus } from "../components/TileCell";
import { TileId } from "../constants/tiles";
import { createGame, submitGuess, getState } from "../services/gameApi";
import type { GuessData, Hint, TileColor, GameStatusData } from "../types/api";

const COLS = 14;
const MAX_ROWS = 6;
const STORAGE_KEY = "mahjong-handle:lastGame:v2";

type Row = { tiles: string[]; colors: CellStatus[] };
type RuleMode = "normal" | "riichi";

type PersistedState = {
  v: 2;
  gameId: string;
  userId: string;
  rows: Row[];
  hint?: Hint;
  finish: boolean;
  win?: boolean;
  inputMode: "keyboard" | "text";
  ruleMode: RuleMode;

  gameCreatedAt?: number;
  lastGuessAt?: number;
  hitCountValid?: number;

  answerTiles14?: string[];
  answerStr?: string;
};

const TILE_KEYBOARD: TileId[] = [
  "1m","2m","3m","4m","5m","6m","7m","8m","9m",
  "1p","2p","3p","4p","5p","6p","7p","8p","9p",
  "1s","2s","3s","4s","5s","6s","7s","8s","9s",
  "1z","2z","3z","4z","5z","6z","7z",
];

function genUserId(): string {
  const anyCrypto = (globalThis as any).crypto;
  if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
  return `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function tilesToGuessString(tiles: string[]): string {
  return tiles.join("");
}

function mapColor(c: TileColor | undefined): CellStatus {
  if (c === "blue" || c === "orange" || c === "gray") return c;
  return "empty";
}

function buildTopText(hint?: Hint): string {
  const wind = hint?.windTip?.trim();
  const tsumo = hint?.isTsumo?.trim();
  if (wind && tsumo) return `${wind} / ${tsumo}`;
  if (wind) return wind;
  if (tsumo) return tsumo;
  return " ";
}

function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function formatDurationMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
}

function computeDurationSec(createdAtSec: number | null, lastAtSec: number | null): number {
  if (createdAtSec == null || lastAtSec == null) return 0;
  return Math.max(0, lastAtSec - createdAtSec);
}

function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || obj.v !== 2) return null;
    if (!obj.gameId || !obj.userId) return null;
    return obj as PersistedState;
  } catch {
    return null;
  }
}

function savePersisted(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function clearPersisted() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default function Game() {
  const { themeMode, setThemeMode } = useThemeMode();
  const initOnceRef = useRef(false);

  const persisted0 = useMemo(() => loadPersisted(), []);

  const [ruleMode, setRuleMode] = useState<RuleMode>(persisted0?.ruleMode ?? "normal");
  const [inputMode, setInputMode] = useState<"keyboard" | "text">(persisted0?.inputMode ?? "keyboard");

  const [userId] = useState<string>(() => persisted0?.userId ?? genUserId());
  const [gameId, setGameId] = useState<string>(persisted0?.gameId ?? "");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [finish, setFinish] = useState<boolean>(persisted0?.finish ?? false);
  const [win, setWin] = useState<boolean>(persisted0?.win ?? false);

  const [hint, setHint] = useState<Hint | undefined>(persisted0?.hint);

  const [answerTiles14, setAnswerTiles14] = useState<string[] | null>(() => {
    const a = (persisted0 as any)?.answerTiles14;
    return Array.isArray(a) ? (a as string[]) : null;
  });

  const [currentTiles, setCurrentTiles] = useState<string[]>([]);
  const [textGuess, setTextGuess] = useState<string>("");
  const textInputRef = useRef<InputRef>(null);

  const [rows, setRows] = useState<Row[]>(persisted0?.rows ?? []);

  const [gameCreatedAt, setGameCreatedAt] = useState<number | null>(
    typeof persisted0?.gameCreatedAt === "number" ? persisted0.gameCreatedAt : null
  );
  const [lastGuessAt, setLastGuessAt] = useState<number | null>(
    typeof persisted0?.lastGuessAt === "number" ? persisted0.lastGuessAt : null
  );
  const [hitCountValid, setHitCountValid] = useState<number>(
    typeof persisted0?.hitCountValid === "number" ? persisted0.hitCountValid : (persisted0?.rows?.length ?? 0)
  );

  const [infoOpen, setInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);

  const [endSummaryOpen, setEndSummaryOpen] = useState(false);
  const anyDialogOpen = infoOpen || settingsOpen || modeOpen || endSummaryOpen;

  function persistSnapshot(next: Partial<PersistedState>) {
    const snapshot: PersistedState = {
      v: 2,
      gameId: next.gameId ?? gameId,
      userId: next.userId ?? userId,
      rows: next.rows ?? rows,
      hint: next.hint ?? hint,
      finish: next.finish ?? finish,
      win: next.win ?? win,
      inputMode: next.inputMode ?? inputMode,
      ruleMode: next.ruleMode ?? ruleMode,
      gameCreatedAt: typeof next.gameCreatedAt === "number" ? next.gameCreatedAt : (gameCreatedAt ?? undefined),
      lastGuessAt: typeof next.lastGuessAt === "number" ? next.lastGuessAt : (lastGuessAt ?? undefined),
      hitCountValid: typeof next.hitCountValid === "number" ? next.hitCountValid : hitCountValid,
      answerTiles14: Array.isArray((next as any).answerTiles14)
        ? ((next as any).answerTiles14 as string[])
        : (answerTiles14 ?? undefined),
      answerStr: typeof (next as any).answerStr === "string" ? (next as any).answerStr : undefined,
    };
    savePersisted(snapshot);
  }

  function rowsFromStatus(status: GameStatusData): Row[] {
    const history = (status as any)?.history ?? status.history ?? [];
    return history.slice(0, MAX_ROWS).map((h: any) => ({
      tiles: h.guessTiles14 ?? [],
      colors: (h.colors14 ?? []).map(mapColor),
    }));
  }

  function showEndSummary(opts: { win: boolean; hitCountValid: number; durationSec: number; answerTiles14?: string[] }) {
    const isDark = themeMode === "dark";

    const titleNode = (
      <span style={{ color: isDark ? "rgba(255,255,255,0.92)" : undefined }}>
        {opts.win ? "本局结束：你猜对了" : "本局结束：次数用尽"}
      </span>
    );

    // 这里保留 styles 以增强一致性，但“白边框”的根治靠 styles.css 覆盖 .ant-modal-content
    const darkStyles = isDark
      ? {
          content: {
            background: "#0b1220",
            color: "rgba(255,255,255,0.88)",
            border: "1px solid #0b1220",
            boxShadow: "0 10px 30px rgba(0,0,0,0.75)",
          },
          header: {
            background: "#0b1220",
            borderBottom: "1px solid #0b1220",
          },
          body: {
            background: "#0b1220",
            color: "rgba(255,255,255,0.88)",
          },
          footer: {
            background: "#0b1220",
            borderTop: "1px solid #0b1220",
          },
        }
      : undefined;

    setEndSummaryOpen(true);

    Modal.info({
      // ✅ 关键：给 Confirm 弹窗一个稳定的 hook class，便于 CSS 覆盖“外层白边框”
      wrapClassName: isDark ? "mh-end-modal mh-end-modal-dark" : "mh-end-modal",
      className: isDark ? "mh-end-modal mh-end-modal-dark" : "mh-end-modal",

      title: titleNode,
      okText: "知道了",
      styles: darkStyles as any,

      onOk: () => setEndSummaryOpen(false),
      onCancel: () => setEndSummaryOpen(false),
      afterClose: () => setEndSummaryOpen(false),

      content: (
        <div className={isDark ? "app-page-dark" : "app-page-light"} style={{ lineHeight: 1.9 }}>
          <div>合法提交次数：<b>{opts.hitCountValid}</b></div>
          <div>游玩时间：<b>{formatDurationMMSS(opts.durationSec)}</b></div>

          {!opts.win && Array.isArray(opts.answerTiles14) && opts.answerTiles14.length === COLS && (
            <>
              <div style={{ marginTop: 12 }}>正确答案：</div>

              {/* ✅ 居中：外层 flex 居中，内层 grid 固定 7 列 */}
              <div className="mh-answer-wrap">
                <div className="mh-answer-grid">
                  {opts.answerTiles14.map((t, i) => (
                    <div key={i} className="board-cell">
                      <TileCell tile={t} status="empty" themeMode={themeMode} size={40} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ),
    });
  }

  async function restoreFromBackend(saved: PersistedState) {
    const status = await getState(saved.gameId, saved.userId);
    const restoredRows = rowsFromStatus(status);

    const statusAny = status as any;

    const gameCreatedAtNext =
      typeof statusAny?.createdAt === "number"
        ? statusAny.createdAt
        : (typeof saved.gameCreatedAt === "number" ? saved.gameCreatedAt : null);

    const hitCountValidNext =
      typeof statusAny?.hitCountValid === "number"
        ? statusAny.hitCountValid
        : restoredRows.length;

    const historyAny = (statusAny?.history ?? []) as any[];
    const lastGuessAtNext =
      historyAny.length > 0 && typeof historyAny[historyAny.length - 1]?.createdAt === "number"
        ? historyAny[historyAny.length - 1].createdAt
        : (typeof saved.lastGuessAt === "number" ? saved.lastGuessAt : null);

    setGameId(statusAny.gameId || saved.gameId);
    setRows(restoredRows);
    setHint(statusAny.hint);
    setFinish(!!statusAny.finish);
    setWin(!!statusAny.win);

    const restoredAnswerTiles14 = Array.isArray(statusAny.answerTiles14) ? (statusAny.answerTiles14 as string[]) : null;
    if (!!statusAny.finish && !statusAny.win && restoredAnswerTiles14?.length === COLS) {
      setAnswerTiles14(restoredAnswerTiles14);
    } else {
      setAnswerTiles14(null);
    }

    setGameCreatedAt(gameCreatedAtNext);
    setLastGuessAt(lastGuessAtNext);
    setHitCountValid(hitCountValidNext);

    setCurrentTiles([]);

    persistSnapshot({
      gameId: statusAny.gameId || saved.gameId,
      rows: restoredRows,
      hint: statusAny.hint,
      finish: !!statusAny.finish,
      win: !!statusAny.win,
      gameCreatedAt: gameCreatedAtNext ?? undefined,
      lastGuessAt: lastGuessAtNext ?? undefined,
      hitCountValid: hitCountValidNext,
      answerTiles14: (!!statusAny.finish && !statusAny.win && restoredAnswerTiles14?.length === COLS) ? restoredAnswerTiles14 : undefined,
      answerStr: typeof statusAny.answerStr === "string" ? statusAny.answerStr : undefined,
    });
  }

  async function startNewGame() {
    try {
      setLoading(true);

      setRows([]);
      setCurrentTiles([]);
      setTextGuess("");
      setFinish(false);
      setWin(false);
      setHint(undefined);
      setAnswerTiles14(null);

      setGameCreatedAt(null);
      setLastGuessAt(null);
      setHitCountValid(0);

      const res = await createGame({ userId });
      const resAny = res as any;

      setGameId(resAny.gameId);
      setHint(resAny.hint);

      const createdAt = typeof resAny?.createdAt === "number" ? resAny.createdAt : null;
      setGameCreatedAt(createdAt);

      savePersisted({
        v: 2,
        gameId: resAny.gameId,
        userId,
        rows: [],
        hint: resAny.hint,
        finish: false,
        win: false,
        inputMode,
        ruleMode,
        gameCreatedAt: createdAt ?? undefined,
        lastGuessAt: undefined,
        hitCountValid: 0,
        answerTiles14: undefined,
        answerStr: undefined,
      });
    } catch (e: any) {
      message.error(e.message || "创建对局失败");
    } finally {
      setLoading(false);
    }
  }

  async function initOnMount() {
    const saved = loadPersisted();

    if (saved?.gameId && saved?.userId) {
      setGameId(saved.gameId);
      setRows(saved.rows ?? []);
      setHint(saved.hint);
      setFinish(saved.finish ?? false);
      setWin(saved.win ?? false);
      setInputMode(saved.inputMode ?? "keyboard");
      setRuleMode(saved.ruleMode ?? "normal");

      setAnswerTiles14(Array.isArray((saved as any).answerTiles14) ? ((saved as any).answerTiles14 as string[]) : null);

      setGameCreatedAt(typeof saved.gameCreatedAt === "number" ? saved.gameCreatedAt : null);
      setLastGuessAt(typeof saved.lastGuessAt === "number" ? saved.lastGuessAt : null);
      setHitCountValid(typeof saved.hitCountValid === "number" ? saved.hitCountValid : (saved.rows?.length ?? 0));

      setCurrentTiles([]);

      try {
        await restoreFromBackend(saved);
        return;
      } catch {
        return;
      }
    }

    await startNewGame();
  }

  useEffect(() => {
    if (initOnceRef.current) return;
    initOnceRef.current = true;
    initOnMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushTile = useCallback((tile: string) => {
    if (finish) return;
    setCurrentTiles((prev) => {
      if (prev.length >= COLS) return prev;
      return [...prev, tile];
    });
  }, [finish]);

  const popTile = useCallback(() => {
    if (finish) return;
    setCurrentTiles((prev) => (prev.length ? prev.slice(0, prev.length - 1) : prev));
  }, [finish]);

  const clearTiles = useCallback(() => {
    setCurrentTiles([]);
  }, []);

  function applyGuessResult(res: GuessData) {
    const resAny = res as any;

    const tiles = resAny.guessTiles14 ?? [];
    const colors = (resAny.colors14 ?? []).map(mapColor);

    const nextFinish = !!resAny.finish;
    const nextWin = !!resAny.win;
    const nextHint = resAny.hint;

    const answerTiles14Next = Array.isArray(resAny.answerTiles14) ? (resAny.answerTiles14 as string[]) : null;
    const answerStrNext = typeof resAny.answerStr === "string" ? (resAny.answerStr as string) : undefined;

    const lastGuessAtNext =
      typeof resAny?.createdAt === "number" ? resAny.createdAt : (Date.now() / 1000);
    const hitCountValidNext =
      typeof resAny?.hitCountValid === "number" ? resAny.hitCountValid : (hitCountValid + 1);
    const gameCreatedAtNext =
      typeof resAny?.gameCreatedAt === "number" ? resAny.gameCreatedAt : gameCreatedAt;

    setRows((prev) => {
      const nextRows = [...prev, { tiles, colors }].slice(0, MAX_ROWS);

      savePersisted({
        v: 2,
        gameId,
        userId,
        rows: nextRows,
        hint: nextHint,
        finish: nextFinish,
        win: nextWin,
        inputMode,
        ruleMode,
        gameCreatedAt: (gameCreatedAtNext ?? undefined),
        lastGuessAt: lastGuessAtNext,
        hitCountValid: hitCountValidNext,
        answerTiles14: (nextFinish && !nextWin && answerTiles14Next?.length === COLS) ? answerTiles14Next : undefined,
        answerStr: (nextFinish && !nextWin && answerStrNext) ? answerStrNext : undefined,
      });

      return nextRows;
    });

    setHint(nextHint);
    setFinish(nextFinish);
    setWin(nextWin);

    if (nextFinish && !nextWin && answerTiles14Next?.length === COLS) {
      setAnswerTiles14(answerTiles14Next);
    } else {
      setAnswerTiles14(null);
    }

    setCurrentTiles([]);

    setGameCreatedAt(gameCreatedAtNext ?? null);
    setLastGuessAt(lastGuessAtNext);
    setHitCountValid(hitCountValidNext);

    if (!finish && nextFinish) {
      const durationSec = computeDurationSec(gameCreatedAtNext ?? null, lastGuessAtNext ?? null);
      showEndSummary({
        win: nextWin,
        hitCountValid: hitCountValidNext,
        durationSec,
        answerTiles14: (!nextWin ? (answerTiles14Next ?? undefined) : undefined),
      });
    }
  }

  const onSubmitGuessFromKeyboard = useCallback(async () => {
    if (!gameId) return;
    if (finish) return;
    if (submitting) return;

    if (currentTiles.length !== COLS) {
      message.warning(`需要输入 ${COLS} 张牌后才能提交`);
      return;
    }
    if (rows.length >= MAX_ROWS) {
      message.warning("已达到最大行数");
      return;
    }

    try {
      setSubmitting(true);
      const guess = tilesToGuessString(currentTiles);
      const res = await submitGuess(gameId, { userId, guess });
      applyGuessResult(res);
    } catch (e: any) {
      message.error(e.message || "提交失败");
    } finally {
      setSubmitting(false);
    }
  }, [gameId, finish, submitting, currentTiles, rows.length, userId]);

  const onSubmitGuessFromText = useCallback(async () => {
    if (!gameId) return;
    if (finish) return;
    if (submitting) return;

    const g = textGuess.trim();
    if (!g) {
      message.warning("请输入猜测字符串");
      return;
    }
    if (rows.length >= MAX_ROWS) {
      message.warning("已达到最大行数");
      return;
    }

    try {
      setSubmitting(true);
      const res = await submitGuess(gameId, { userId, guess: g });
      applyGuessResult(res);
      setTextGuess("");
    } catch (e: any) {
      message.error(e.message || "提交失败");
    } finally {
      setSubmitting(false);
    }
  }, [gameId, finish, submitting, textGuess, rows.length, userId]);

  useEffect(() => {
    if (inputMode !== "keyboard") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (infoOpen || settingsOpen || modeOpen || endSummaryOpen) return;
      if (loading || submitting || finish) return;

      const target = e.target as any;
      const isEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (isEditable) return;

      if (e.key === "Enter") {
        e.preventDefault();
        void onSubmitGuessFromKeyboard();
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        popTile();
        return;
      }
      if (e.key === "Delete") {
        e.preventDefault();
        clearTiles();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inputMode, infoOpen, settingsOpen, modeOpen, endSummaryOpen, loading, submitting, finish, onSubmitGuessFromKeyboard, popTile, clearTiles]);

  const onNewGame = useCallback(async () => {
    clearPersisted();
    await startNewGame();
  }, []);

  function onToggleDarkMode(checked: boolean) {
    setThemeMode(checked ? "dark" : "light");
  }

  function onToggleStringInput(checked: boolean) {
    const next = checked ? "text" : "keyboard";
    setInputMode(next);
    persistSnapshot({ inputMode: next });

    if (next === "text") {
      setCurrentTiles([]);
      setTimeout(() => textInputRef.current?.focus(), 0);
    }
  }

  const onChangeRuleMode = useCallback(async (next: RuleMode) => {
    if (next === ruleMode) {
      setModeOpen(false);
      return;
    }
    setRuleMode(next);
    persistSnapshot({ ruleMode: next });

    await startNewGame();

    setModeOpen(false);
    message.success(next === "normal" ? "已切换：普通麻将" : "已切换：立直麻将");
  }, [ruleMode]);

  const boardRows: Row[] = useMemo(() => {
    const filled: Row[] = [];
    for (let i = 0; i < MAX_ROWS; i++) {
      if (i < rows.length) filled.push(rows[i]);
      else if (i === rows.length) filled.push({ tiles: currentTiles, colors: [] });
      else filled.push({ tiles: [], colors: [] });
    }
    return filled;
  }, [rows, currentTiles]);

  const topText = buildTopText(hint);

  const pickFrameColor = themeMode === "dark" ? "#ffffff" : "#000000";
  const cellRadius = 10;

  return (
    <div className="game-root">
      <div
        className="game-top-actions"
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          left: "auto",
          zIndex: anyDialogOpen ? 1 : 9999,
          pointerEvents: anyDialogOpen ? "none" : "auto",
          opacity: anyDialogOpen ? 0.35 : 1,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Space size={6}>
          <Button
            type="text"
            className="top-icon-btn"
            icon={<InfoCircleOutlined />}
            disabled={anyDialogOpen}
            onClick={() => {
              if (anyDialogOpen) return;
              setSettingsOpen(false);
              setModeOpen(false);
              setInfoOpen(true);
            }}
          />
          <Button
            type="text"
            className="top-icon-btn"
            icon={<RetweetOutlined />}
            disabled={anyDialogOpen}
            onClick={() => {
              if (anyDialogOpen) return;
              setInfoOpen(false);
              setSettingsOpen(false);
              setModeOpen(true);
            }}
          />
          <Button
            type="text"
            className="top-icon-btn"
            icon={<SettingOutlined />}
            disabled={anyDialogOpen}
            onClick={() => {
              if (anyDialogOpen) return;
              setInfoOpen(false);
              setModeOpen(false);
              setSettingsOpen(true);
            }}
          />
        </Space>
      </div>

      <div className="game-info">
        {ruleMode === "riichi" ? (
          <>
            <Typography.Text className="game-info-text">{topText}</Typography.Text>
            <div className="game-subinfo">
              <div>{hint?.yakuTip ? `役：${hint.yakuTip}` : "\u00A0"}</div>
              <div>{hint?.hanTip ? hint.hanTip : "\u00A0"}</div>
            </div>
          </>
        ) : (
          <>
            <Typography.Text className="game-info-text">{" "}</Typography.Text>
            <div className="game-subinfo">
              <div>{"\u00A0"}</div>
              <div>{"\u00A0"}</div>
            </div>
          </>
        )}

        <div style={{ marginTop: 10 }}>
          <Space>
            <Button onClick={onNewGame} disabled={loading || submitting}>新开一局</Button>
          </Space>
        </div>
      </div>

      <div className="board">
        {boardRows.map((row, rIdx) => {
          const isEditableRow = inputMode === "keyboard" && !finish && rIdx === rows.length;

          return (
            <div className="board-row" key={rIdx}>
              {Array.from({ length: COLS }).map((_, cIdx) => {
                const tile = row.tiles[cIdx] ?? "";
                const status: CellStatus = row.colors[cIdx] ?? "empty";
                const isLast = cIdx === COLS - 1;

                const shouldShowPickFrame =
                  isEditableRow &&
                  cIdx < COLS - 1 &&
                  cIdx < currentTiles.length;

                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    className={`board-cell ${isLast ? "board-cell-last" : ""}`}
                    style={{
                      position: "relative",
                      borderRadius: cellRadius,
                    }}
                  >
                    {shouldShowPickFrame && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          border: `2px solid ${pickFrameColor}`,
                          borderRadius: "inherit",
                          pointerEvents: "none",
                          boxSizing: "border-box",
                          zIndex: 2,
                        }}
                      />
                    )}

                    <TileCell tile={tile} status={status} themeMode={themeMode} size={40} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="input-area">
        <div className="input-main">
          {inputMode === "keyboard" ? (
            <div className="tile-keyboard">
              <div className="tile-keyboard-grid">
                {TILE_KEYBOARD.map((t) => (
                  <button
                    key={t}
                    className="tile-btn"
                    onClick={() => pushTile(t)}
                    disabled={loading || finish || currentTiles.length >= COLS}
                    type="button"
                  >
                    <TileCell tile={t} status="empty" themeMode={themeMode} size={36} />
                  </button>
                ))}
              </div>

              <div className="keyboard-actions">
                <Space>
                  <Button
                    icon={<SendOutlined />}
                    type="primary"
                    onClick={onSubmitGuessFromKeyboard}
                    loading={submitting}
                    disabled={loading || finish}
                  >
                    提交
                  </Button>
                  <Button icon={<RollbackOutlined />} onClick={popTile} disabled={submitting || loading || finish}>
                    删除
                  </Button>
                  <Button icon={<DeleteOutlined />} onClick={clearTiles} disabled={submitting || loading || finish}>
                    清空
                  </Button>
                </Space>
              </div>
            </div>
          ) : (
            <div className="text-input-bar">
              <Input
                ref={textInputRef}
                value={textGuess}
                onChange={(e) => setTextGuess(e.target.value)}
                placeholder="输入猜测字符串，如（123m456p789s11555z）"
                className="mono"
                onPressEnter={onSubmitGuessFromText}
                disabled={loading || finish}
              />
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={onSubmitGuessFromText}
                loading={submitting}
                disabled={loading || finish}
              >
                确定
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal title="游戏简介" open={infoOpen} onCancel={() => setInfoOpen(false)} footer={null}>
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          本游戏为“猜手牌”（14 张牌）的 Wordle 类玩法。每次输入一手牌，系统会对每一张牌给出判色反馈。
        </Typography.Paragraph>

        <Divider style={{ margin: "12px 0" }} />

        <Typography.Title level={5} style={{ marginTop: 0 }}>判色规则</Typography.Title>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li><b>蓝色</b>：该位置的牌完全正确（牌种 + 位置都正确）。</li>
            <li><b>橙色</b>：该牌存在于答案中，但位置不正确。</li>
            <li><b>灰色</b>：答案中不存在该牌，或你输入的该牌数量超过答案中的可用数量。</li>
          </ul>
        </Typography.Paragraph>

        <Divider style={{ margin: "12px 0" }} />

        <Typography.Title level={5} style={{ marginTop: 0 }}>文字输入说明</Typography.Title>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          文字输入模式下，请在输入框中直接输入 14 张牌的字符串编码，例如：123m456p789s11555z。
          其中 m/p/s/z 分别表示万/筒/索/字，1-7z 分别对应 东南西北白发中。
          输入不符合格式时，会提示错误且不消耗猜测次数。
        </Typography.Paragraph>

      </Modal>

      <Modal title="模式转换" open={modeOpen} onCancel={() => setModeOpen(false)} footer={null}>
        <Typography.Paragraph style={{ marginBottom: 12 }}>
          选择玩法模式（默认：普通麻将）：
        </Typography.Paragraph>
        <Space>
          <Button type={ruleMode === "normal" ? "primary" : "default"} onClick={() => void onChangeRuleMode("normal")}>
            普通麻将
          </Button>
          <Button type={ruleMode === "riichi" ? "primary" : "default"} onClick={() => void onChangeRuleMode("riichi")}>
            立直麻将
          </Button>
        </Space>
      </Modal>

      <Modal title="设置" open={settingsOpen} onCancel={() => setSettingsOpen(false)} footer={null}>
        <div className="settings-list">
          <div className="settings-item">
            <div className="settings-text">
              <div className="settings-title">深色模式</div>
              <div className="settings-desc">切换深色和浅色主题</div>
            </div>
            <Switch checked={themeMode === "dark"} onChange={(checked) => onToggleDarkMode(checked)} />
          </div>

          <div className="settings-divider" />

          <div className="settings-item">
            <div className="settings-text">
              <div className="settings-title">字符串手牌输入</div>
              <div className="settings-desc">使用一行文本输入手牌（替代点选）</div>
            </div>
            <Switch checked={inputMode === "text"} onChange={(checked) => onToggleStringInput(checked)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
