import { useCallback, useEffect, useMemo, useState } from "react";
import { message } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import NonogramBoard from "../components/nonogram/NonogramBoard";
import NonogramToolbar from "../components/nonogram/NonogramToolbar";
import NonogramSizePicker from "../components/nonogram/NonogramSizePicker";
import type { CellColor, CellState, DrawColor, DrawMode, NonogramDifficulty, NonogramPuzzle } from "../games/nonogram/types";
import { createNonogramBattle, getNonogramBattleStatus, joinNonogramBattle, moveNonogramBattle } from "../services/nonogramBattleApi";
import type { NonogramBattleData } from "../types/nonogramBattle";
import { getOrCreateUserId } from "../utils/userId";
import "../styles/nonogram.css";

function extractMatchId(value: string): string {
  const input = value.trim();
  if (!input) return "";
  try {
    const url = new URL(input);
    const parts = url.pathname.split("/").filter(Boolean);
    const battleIndex = parts.findIndex((part, index) => part === "battle" && parts[index - 1] === "nonogram");
    if (battleIndex >= 0 && parts[battleIndex + 1]) return decodeURIComponent(parts[battleIndex + 1]);
  } catch {
    // A plain room id is expected to fail URL parsing.
  }
  const pathMatch = input.match(/(?:^|\/)nonogram\/battle\/([^/?#]+)/i);
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);
  return input.replace(/^\/+|\/+$/g, "");
}

export default function NonogramBattle() {
  const navigate = useNavigate();
  const params = useParams<{ matchId?: string }>();
  // Player identity must come from this browser. Never accept a userId copied
  // from the room owner's address bar, otherwise both sides become one player.
  const userId = useMemo(() => getOrCreateUserId(), []);
  const routeMatchId = params.matchId ?? "";
  const [size, setSize] = useState(10);
  const [difficulty, setDifficulty] = useState<NonogramDifficulty>("normal");
  const [joinId, setJoinId] = useState("");
  const [data, setData] = useState<NonogramBattleData | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>("filled");
  const [drawColor, setDrawColor] = useState<DrawColor>("black");
  const [colors, setColors] = useState<CellColor[][]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadOrJoin = useCallback(async (matchId: string) => {
    try {
      setLoading(true);
      setLoadError("");
      try {
        setData(await getNonogramBattleStatus(matchId, userId));
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "USER_NOT_IN_MATCH") throw error;
        setData(await joinNonogramBattle(matchId, userId));
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "进入房间失败";
      setLoadError(text);
      message.error(text);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (routeMatchId) void loadOrJoin(routeMatchId);
  }, [loadOrJoin, routeMatchId]);

  useEffect(() => {
    if (!routeMatchId || !data || data.status === "finished") return;
    const timer = window.setInterval(() => {
      void getNonogramBattleStatus(routeMatchId, userId).then(setData).catch(() => undefined);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [data, routeMatchId, userId]);

  async function createRoom() {
    try {
      setLoading(true);
      const next = await createNonogramBattle(userId, size, difficulty);
      setData(next);
      navigate(`/nonogram/battle/${next.matchId}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "创建房间失败");
    } finally {
      setLoading(false);
    }
  }

  function enterRoom() {
    const id = extractMatchId(joinId);
    if (!id) return;
    navigate(`/nonogram/battle/${encodeURIComponent(id)}`);
  }

  const puzzle = useMemo<NonogramPuzzle | null>(() => data ? ({
    size: data.size,
    rowClues: data.rowClues,
    columnClues: data.columnClues,
    difficulty: data.difficulty,
    solution: Array.from({ length: data.size }, () => Array<boolean>(data.size).fill(false)),
  }) : null, [data]);
  const activeMatchId = data?.matchId;
  const activeSize = data?.size;

  useEffect(() => {
    if (!activeMatchId || !activeSize) return;
    setColors(Array.from({ length: activeSize }, () => Array<CellColor>(activeSize).fill(null)));
  }, [activeMatchId, activeSize]);

  const paint = useCallback((row: number, column: number, mode: DrawMode) => {
    if (!data || data.status !== "playing" || data.my.finished) return;
    const previous = data.my.board[row]?.[column] ?? "unknown";
    const next: CellState = previous === "unknown" ? mode : "unknown";
    setColors((current) => current.map((line, r) => line.map((color, c) => r === row && c === column ? (next === "unknown" ? null : drawColor) : color)));
    setData((current) => current ? ({ ...current, my: { ...current.my, board: current.my.board.map((line, r) => line.map((cell, c) => r === row && c === column ? next : cell)) } }) : current);
    void moveNonogramBattle(data.matchId, userId, row, column, next)
      .then(setData)
      .catch((error) => message.error(error instanceof Error ? error.message : "落子失败"));
  }, [data, drawColor, userId]);

  const clearMyBoard = useCallback(async () => {
    if (!data || data.status !== "playing" || data.my.finished) return;
    const targets = colors.flatMap((line, row) => line.flatMap((color, column) =>
      color === drawColor ? [{ row, column }] : [],
    ));
    if (targets.length === 0) return;

    setLoading(true);
    setColors((current) => current.map((line) => line.map((color) => color === drawColor ? null : color)));
    setData((current) => current ? ({
      ...current,
      my: {
        ...current.my,
        board: current.my.board.map((line, row) => line.map((cell, column) =>
          colors[row]?.[column] === drawColor ? "unknown" : cell,
        )),
      },
    }) : current);
    try {
      let latest = data;
      for (const target of targets) {
        latest = await moveNonogramBattle(data.matchId, userId, target.row, target.column, "unknown");
      }
      setData(latest);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "清空当前颜色失败");
      void getNonogramBattleStatus(data.matchId, userId).then(setData).catch(() => undefined);
    } finally {
      setLoading(false);
    }
  }, [colors, data, drawColor, userId]);

  if (!routeMatchId) {
    return (
      <main className="nonogram-page nonogram-battle-page">
        <section className="nonogram-heading"><div><p className="nonogram-eyebrow">ONLINE BATTLE</p><h1>数织双人对战</h1><p>邀请一位朋友，同时挑战同一道题。</p></div></section>
        <section className="nonogram-battle-lobby">
          <div className="nonogram-lobby-card">
            <span className="lobby-number">01</span><h2>创建房间</h2><p>选择棋盘尺寸，生成一场新的对战。</p>
            <NonogramSizePicker value={size} onChange={setSize} />
            <div className="nonogram-difficulty lobby-difficulty" role="group" aria-label="题目难度">
              {(["easy", "normal", "hard", "expert"] as NonogramDifficulty[]).map((value) => (
                <button key={value} type="button" className={difficulty === value ? "active" : ""} onClick={() => setDifficulty(value)}>
                  {{ easy: "简单", normal: "普通", hard: "困难", expert: "极难" }[value]}
                </button>
              ))}
            </div>
            <button type="button" disabled={loading} onClick={() => void createRoom()}>{loading ? "生成中…" : "创建对战"}</button>
          </div>
          <div className="nonogram-lobby-card">
            <span className="lobby-number">02</span><h2>加入房间</h2><p>输入朋友发给你的房间号。</p>
            <div className="lobby-controls"><input className="room-input" value={joinId} onChange={(event) => setJoinId(event.target.value)} placeholder="房间号" onKeyDown={(event) => { if (event.key === "Enter") enterRoom(); }} /></div>
            <button type="button" disabled={loading || !joinId.trim()} onClick={enterRoom}>加入对战</button>
          </div>
        </section>
      </main>
    );
  }

  if (!data || !puzzle) return (
    <main className="nonogram-page">
      <div className="nonogram-loading">
        {loadError ? (
          <><h2>无法进入房间</h2><p>{loadError === "MATCH_NOT_FOUND" || loadError === "Not Found" ? "房间不存在或已经过期。" : loadError}</p><button type="button" onClick={() => navigate("/nonogram/battle", { replace: true })}>返回对战大厅</button></>
        ) : "正在进入房间…"}
      </div>
    </main>
  );

  const won = data.winnerUserId === userId;
  return (
    <main className="nonogram-page nonogram-battle-page">
      <section className="nonogram-battle-bar">
        <div><span>房间</span><strong>{data.matchId}</strong><button type="button" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/nonogram/battle/${data.matchId}`).then(() => message.success("邀请链接已复制"))}>复制邀请链接</button></div>
        <div className="battle-progress"><span>你 {data.my.progress}%</span><div><i style={{ width: `${data.my.progress}%` }} /></div></div>
        <div className="battle-progress opponent"><span>对手 {data.opponent?.progress ?? 0}%</span><div><i style={{ width: `${data.opponent?.progress ?? 0}%` }} /></div></div>
      </section>

      {data.status === "waiting" ? (
        <section className="nonogram-waiting"><div className="waiting-pulse" /><h2>等待对手加入</h2><p>复制邀请链接发给朋友，对手进入后自动开始。</p></section>
      ) : (
        <section className="nonogram-play-area">
          {data.status === "playing" && data.my.finished && (
            <div className="nonogram-battle-result won"><strong>你已完成</strong><span>等待对手完成棋盘。</span></div>
          )}
          {data.status === "playing" && !data.my.finished && data.opponent?.finished && (
            <div className="nonogram-battle-result lost"><strong>对手已经完成</strong><span>游戏仍在继续，完成你的棋盘吧。</span></div>
          )}
          {data.status === "finished" && <div className={`nonogram-battle-result ${won ? "won" : "lost"}`}><strong>{won ? "你赢了！" : "对手先完成"}</strong><span>{won ? "漂亮的推理。" : "再来一局一定能赢。"}</span></div>}
          <NonogramBoard puzzle={puzzle} board={data.my.board} colors={colors} drawMode={drawMode} disabled={loading || data.status !== "playing" || data.my.finished} onPaint={paint} />
          <NonogramToolbar mode={drawMode} color={drawColor} onModeChange={setDrawMode} onColorChange={setDrawColor} onClear={clearMyBoard} onNew={() => navigate("/nonogram/battle")} />
          <p className="nonogram-help">填色或标记都会增加进度；点击行列数字可标记该段已完成。双方全部完成后对局结束。</p>
        </section>
      )}
    </main>
  );
}
