import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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

import { useThemeMode, useThemeStyle } from "../App";
import TileCell, { CellStatus } from "../components/TileCell";
import { TileId } from "../constants/tiles";
import { createGame, submitGuess, getState, getAnswer } from "../services/handleApi.ts";
import type { GuessData, Hint, TileColor, GameStatusData } from "../types/api";
import { getOrCreateUserId, normalizeUserId } from "../utils/userId";

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

  score?: number;

  answerTiles14?: string[];
  answerStr?: string;
};

type GuessDataWithScore = GuessData & { score?: number };

const TILE_KEYBOARD: TileId[] = [
  "1m","2m","3m","4m","5m","6m","7m","8m","9m",
  "1p","2p","3p","4p","5p","6p","7p","8p","9p",
  "1s","2s","3s","4s","5s","6s","7s","8s","9s",
  "1z","2z","3z","4z","5z","6z","7z",
];

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

export default function Handle() {
  const { themeMode, setThemeMode } = useThemeMode();
  const { themeStyle } = useThemeStyle();

  const navigate = useNavigate();
  const params = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();

  const routeGameId = normalizeUserId(params.gameId) ?? "";
  const routeUserId = normalizeUserId(searchParams.get("userId"));
  const unifiedUserId = routeUserId ?? getOrCreateUserId();

  // Persisted UI state (not overwriting route gameId)
  const persisted0 = useMemo(() => loadPersisted(), []);

  const [ruleMode, setRuleMode] = useState<RuleMode>(persisted0?.ruleMode ?? "normal");
  const [inputMode, setInputMode] = useState<"keyboard" | "text">(persisted0?.inputMode ?? "keyboard");

  const [userId] = useState<string>(() => unifiedUserId);

  const [gameId, setGameId] = useState<string>(() => routeGameId || persisted0?.gameId || "");

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

  const [score, setScore] = useState<number | null>(
    typeof (persisted0 as any)?.score === "number" ? ((persisted0 as any).score as number) : null
  );

  const [infoOpen, setInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [endSummaryOpen, setEndSummaryOpen] = useState(false);
  const [endSummaryPayload, setEndSummaryPayload] = useState<{
    win: boolean;
    hitCountValid: number;
    durationSec: number;
    score?: number;
    answerTiles14?: string[];
  } | null>(null);
  const anyDialogOpen = infoOpen || settingsOpen || modeOpen || endSummaryOpen;

  // If URL lacks userId, append it
  useEffect(() => {
    if (!routeGameId) return;
    if (routeUserId) return;
    navigate(`/handle/${encodeURIComponent(routeGameId)}?userId=${encodeURIComponent(unifiedUserId)}`, {
      replace: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeGameId]);

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
      score: typeof (next as any).score === "number" ? ((next as any).score as number) : (score ?? undefined),
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

  function showEndSummary(opts: { win: boolean; hitCountValid: number; durationSec: number; score?: number; answerTiles14?: string[] }) {
    setEndSummaryPayload(opts);
    setEndSummaryOpen(true);
  }

  async function restoreFromBackend(gameIdToLoad: string) {
    const status = await getState(gameIdToLoad, userId);
    const restoredRows = rowsFromStatus(status);

    const statusAny = status as any;

    const gameCreatedAtNext =
      typeof statusAny?.createdAt === "number"
        ? statusAny.createdAt
        : (typeof persisted0?.gameCreatedAt === "number" ? persisted0.gameCreatedAt : null);

    const hitCountValidNext =
      typeof statusAny?.hitCountValid === "number"
        ? statusAny.hitCountValid
        : restoredRows.length;

    const historyAny = (statusAny?.history ?? []) as any[];
    const lastGuessAtNext =
      historyAny.length > 0 && typeof historyAny[historyAny.length - 1]?.createdAt === "number"
        ? historyAny[historyAny.length - 1].createdAt
        : (typeof persisted0?.lastGuessAt === "number" ? persisted0.lastGuessAt : null);

    setGameId(statusAny.gameId || gameIdToLoad);
    setRows(restoredRows);
    setHint(statusAny.hint);
    setFinish(!!statusAny.finish);
    setWin(!!statusAny.win);

    setAnswerTiles14(null);

    setGameCreatedAt(gameCreatedAtNext);
    setLastGuessAt(lastGuessAtNext);
    setHitCountValid(hitCountValidNext);

    const scoreNext = typeof statusAny?.score === "number" ? statusAny.score : null;
    setScore(scoreNext);

    setCurrentTiles([]);

    persistSnapshot({
      gameId: statusAny.gameId || gameIdToLoad,
      userId,
      rows: restoredRows,
      hint: statusAny.hint,
      finish: !!statusAny.finish,
      win: !!statusAny.win,
      inputMode,
      ruleMode,
      gameCreatedAt: gameCreatedAtNext ?? undefined,
      lastGuessAt: lastGuessAtNext ?? undefined,
      hitCountValid: hitCountValidNext,
      score: scoreNext ?? undefined,
      answerTiles14: undefined,
      answerStr: undefined,
    });

    if (!!statusAny.finish && !statusAny.win) {
      try {
        const ans = await getAnswer(statusAny.gameId || gameIdToLoad, userId);
        const tiles = Array.isArray(ans.answerTiles14) ? ans.answerTiles14 : undefined;
        if (tiles && tiles.length === COLS) {
          setAnswerTiles14(tiles);
        }
      } catch {
        // ignore answer fetch failure
      }
    }
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
      setScore(null);

      const res = await createGame({ userId });
      const resAny = res as any;

      const newGameId = String(resAny.gameId || "");
      if (!newGameId) throw new Error("Backend did not return gameId");

      setGameId(newGameId);
      setHint(resAny.hint);

      const createdAt = typeof resAny?.createdAt === "number" ? resAny.createdAt : null;
      setGameCreatedAt(createdAt);

      savePersisted({
        v: 2,
        gameId: newGameId,
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
        score: undefined,
        answerTiles14: undefined,
        answerStr: undefined,
      });

      // Sync URL
      navigate(`/handle/${encodeURIComponent(newGameId)}?userId=${encodeURIComponent(userId)}`, { replace: true });
    } catch (e: any) {
      message.error(e?.message || "游戏创建失败");
    } finally {
      setLoading(false);
    }
  }

  // Restore by route gameId; if missing, go back
  const lastLoadedGameIdRef = useRef<string>("");

  useEffect(() => {
    if (!routeGameId) {
      navigate("/", { replace: true });
      return;
    }

    if (lastLoadedGameIdRef.current === routeGameId) return;
    lastLoadedGameIdRef.current = routeGameId;

    void (async () => {
      try {
        setLoading(true);
        await restoreFromBackend(routeGameId);
      } catch (e: any) {
        message.error(e?.message || "游戏恢复失败");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeGameId]);

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

  function applyGuessResult(res: GuessDataWithScore) {
    const resAny = res as any;

    const tiles = resAny.guessTiles14 ?? [];
    const colors = (resAny.colors14 ?? []).map(mapColor);

    const nextFinish = !!resAny.finish;
    const nextWin = !!resAny.win;
    const nextHint = resAny.hint;

    const scoreNext = typeof resAny?.score === "number" ? (resAny.score as number) : null;

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
        score: (nextFinish && typeof scoreNext === "number") ? scoreNext : undefined,
        answerTiles14: undefined,
        answerStr: undefined,
      });

      return nextRows;
    });

    setHint(nextHint);
    setFinish(nextFinish);
    setWin(nextWin);

    if (nextFinish && !nextWin) {
      setAnswerTiles14(null);
    } else {
      setAnswerTiles14(null);
    }

    setCurrentTiles([]);

    setGameCreatedAt(gameCreatedAtNext ?? null);
    setLastGuessAt(lastGuessAtNext);
    setHitCountValid(hitCountValidNext);

    if (nextFinish && typeof scoreNext === "number") {
      setScore(scoreNext);
    }

    if (!finish && nextFinish) {
      const durationSec = computeDurationSec(gameCreatedAtNext ?? null, lastGuessAtNext ?? null);
      showEndSummary({
        win: nextWin,
        hitCountValid: hitCountValidNext,
        durationSec,
        score: typeof scoreNext === "number" ? scoreNext : undefined,
        answerTiles14: undefined,
      });

      if (!nextWin && gameId) {
        void (async () => {
          try {
            const ans = await getAnswer(gameId, userId);
            const tiles = Array.isArray(ans.answerTiles14) ? ans.answerTiles14 : undefined;
            if (tiles && tiles.length === COLS) {
              setAnswerTiles14(tiles);
              setEndSummaryPayload((prev) => (prev ? { ...prev, answerTiles14: tiles } : prev));
            }
          } catch {
            // ignore answer fetch failure
          }
        })();
      }
    }
  }

  const onSubmitGuessFromKeyboard = useCallback(async () => {
    if (!gameId) return;
    if (finish) return;
    if (submitting) return;

    if (currentTiles.length !== COLS) {
      message.warning(`需要输入 ${COLS} 张牌才能提交`);
      return;
    }
    if (rows.length >= MAX_ROWS) {
      message.warning("最大行数限制");
      return;
    }

    try {
      setSubmitting(true);
      const guess = tilesToGuessString(currentTiles);
      const res = await submitGuess(gameId, { userId, guess });
      applyGuessResult(res);
    } catch (e: any) {
      message.error(e?.message || "提交失败");
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
      message.warning("请输入猜测的字符串");
      return;
    }
    if (rows.length >= MAX_ROWS) {
      message.warning("最大行数限制");
      return;
    }

    try {
      setSubmitting(true);
      const res = await submitGuess(gameId, { userId, guess: g });
      applyGuessResult(res);
      setTextGuess("");
    } catch (e: any) {
      message.error(e?.message || "提交失败");
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
    message.success(next === "normal" ? "已切换至：普通麻将" : "已切换至：立直麻将");
  }, [ruleMode]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const pickFrameColor = (themeStyle === "noir" || themeStyle === "arcade") ? "#ffffff" : "#000000";
  const cellRadius = 10;

  return (
    <div className="game-root">
      <div className="game-info">
        {ruleMode === "riichi" ? (
          <>
            <Typography.Text className="game-info-text">{topText}</Typography.Text>
            <div className="game-subinfo">
              <div>{hint?.yakuTip ? `役种: ${hint.yakuTip}` : "\u00A0"}</div>
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
            <button className="modern-btn primary" type="button" onClick={onNewGame} disabled={loading || submitting}>
              新开一局
            </button>
            <button
              className="modern-btn"
              type="button"
              onClick={() => navigate("/", { replace: false })}
              disabled={loading || submitting}
            >
              返回主页
            </button>
          </Space>
        </div>

        <div style={{ marginTop: 10 }}>
          <Space wrap>
            <button
              className="modern-btn"
              type="button"
              onClick={() => {
                if (anyDialogOpen) return;
                setModeOpen(false);
                setInfoOpen(true);
              }}
            >
              <InfoCircleOutlined style={{ marginRight: 6 }} />
              规则介绍
            </button>
            <button
              className="modern-btn"
              type="button"
              onClick={() => {
                if (anyDialogOpen) return;
                setInfoOpen(false);
                setModeOpen(true);
              }}
            >
              <RetweetOutlined style={{ marginRight: 6 }} />
              选择模式
            </button>
            <button
              className="modern-btn"
              type="button"
              onClick={() => onToggleStringInput(inputMode !== "text")}
            >
              <SettingOutlined style={{ marginRight: 6 }} />
              {inputMode === "text" ? "手牌输入" : "文字输入"}
            </button>
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
                  <button
                    className="modern-btn primary"
                    type="button"
                    onClick={onSubmitGuessFromKeyboard}
                    disabled={loading || finish || submitting}
                  >
                    <SendOutlined style={{ marginRight: 6 }} />
                    提交
                  </button>
                  <button
                    className="modern-btn"
                    type="button"
                    onClick={popTile}
                    disabled={submitting || loading || finish}
                  >
                    <RollbackOutlined style={{ marginRight: 6 }} />
                    删除
                  </button>
                  <button
                    className="modern-btn"
                    type="button"
                    onClick={clearTiles}
                    disabled={submitting || loading || finish}
                  >
                    <DeleteOutlined style={{ marginRight: 6 }} />
                    清空
                  </button>
                </Space>
              </div>
            </div>
          ) : (
            <div className="text-input-bar">
              <Input
                ref={textInputRef}
                value={textGuess}
                onChange={(e) => setTextGuess(e.target.value)}
                placeholder="请输入字符串，例如：123m456p789s11555z"
                className="mono modern-input"
                onPressEnter={onSubmitGuessFromText}
                disabled={loading || finish}
              />
              <button
                className="modern-btn primary"
                type="button"
                onClick={onSubmitGuessFromText}
                disabled={loading || finish || submitting}
              >
                <CheckOutlined style={{ marginRight: 6 }} />
                确认
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal
        title={<b>游戏简介</b>}
        open={infoOpen}
        onCancel={() => setInfoOpen(false)}
        footer={null}
        className={`theme-modal theme-${themeStyle}`}
      >
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          每局有一个隐藏答案，玩家最多进行 6 次猜测。每次提交 14 张牌后，系统给出判色反馈，帮助你逐步逼近正确答案。
          一共有 6 次猜测机会，每张牌判色均为蓝色则成功，6 次机会耗尽则失败。
        </Typography.Paragraph>

        <Divider style={{ margin: "12px 0" }} />

        <Typography.Title level={5} style={{ marginTop: 0 }}>判色规则</Typography.Title>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li><b>蓝色</b>：该位置的牌完全正确（牌种 + 位置都正确）。</li>
            <li><b>橙色</b>：该牌存在于答案中，但位置不正确。</li>
            <li><b>灰色</b>：答案中不存在该牌，或输入的该牌数量超过答案中的可用数量。</li>
          </ul>
        </Typography.Paragraph>

        <Divider style={{ margin: "12px 0" }} />

        <Typography.Title level={5} style={{ marginTop: 0 }}>文字输入说明</Typography.Title>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          文字输入模式下，请在输入框中直接输入 14 张牌的字符串编码，例如：123m456p789s11555z.
          其中 m/p/s/z 分别表示万/筒/索/字，1至7z 分别对应”东南西北白发中“。
          输入不符合格式时，会提示错误且不消耗猜测次数。
        </Typography.Paragraph>
      </Modal>

      <Modal
        title="模式切换"
        open={modeOpen}
        onCancel={() => setModeOpen(false)}
        footer={null}
        className={`theme-modal theme-${themeStyle}`}
      >
        <Typography.Paragraph style={{ marginBottom: 12 }}>
          选择模式
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

      <Modal
        title={endSummaryPayload?.win ? "游戏结束：恭喜获胜！" : "游戏结束：猜测次数用尽。"}
        open={endSummaryOpen}
        onCancel={() => setEndSummaryOpen(false)}
        closable={false}
        footer={
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button className="modern-btn primary" type="button" onClick={() => setEndSummaryOpen(false)}>
              关闭
            </button>
          </div>
        }
        className={`mh-end-modal theme-${themeStyle}`}
      >
        {endSummaryPayload && (
          <div className={`mh-end-modal-content theme-${themeStyle}`} style={{ lineHeight: 1.9 }}>
            <div>合法猜测次数：<b>{endSummaryPayload.hitCountValid}</b></div>
            <div>游戏用时：<b>{formatDurationMMSS(endSummaryPayload.durationSec)}</b></div>

            {!endSummaryPayload.win &&
              Array.isArray(endSummaryPayload.answerTiles14) &&
              endSummaryPayload.answerTiles14.length === COLS && (
                <>
                  <div style={{ marginTop: 12 }}>正确答案：</div>

                  <div className="mh-answer-wrap">
                    <div className="mh-answer-grid">
                      {endSummaryPayload.answerTiles14.map((t, i) => (
                        <div key={i} className={`board-cell ${i === COLS - 1 ? "board-cell-last" : ""}`}>
                          <TileCell tile={t} status="empty" themeMode={themeMode} size={40} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
          </div>
        )}
      </Modal>

      <Modal title="Settings" open={settingsOpen} onCancel={() => setSettingsOpen(false)} footer={null}>
        <div className="settings-list">
          <div className="settings-item">
            <div className="settings-text">
              <div className="settings-title">Dark Mode</div>
              <div className="settings-desc">Toggle light/dark theme</div>
            </div>
            <Switch checked={themeMode === "dark"} onChange={(checked) => onToggleDarkMode(checked)} />
          </div>

          <div className="settings-divider" />

          <div className="settings-item">
            <div className="settings-text">
              <div className="settings-title">Text Input Mode</div>
              <div className="settings-desc">Use one-line string input</div>
            </div>
            <Switch checked={inputMode === "text"} onChange={(checked) => onToggleStringInput(checked)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
