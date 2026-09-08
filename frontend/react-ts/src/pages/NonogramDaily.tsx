import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import NonogramDailyPlay from "../components/nonogram/NonogramDailyPlay";
import NonogramShareButton from "../components/nonogram/NonogramShareButton";
import { dailyStatus } from "../games/nonogram/dailyStorage";
import { getDailyCatalog, getDailyPuzzle } from "../services/nonogramDailyApi";
import type { DailyCatalog, DailyEntry, DailyPuzzle } from "../services/nonogramDailyApi";
import "../styles/nonogram.css";

const LABELS = { easy: "简单", normal: "普通", hard: "困难", expert: "极难" };
const SELECTED_KEY = "mahjong-games:nonogram:daily:selected:v1";

export default function NonogramDaily() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<DailyCatalog | null>(null);
  const [active, setActive] = useState<DailyPuzzle | null>(null);
  const [pending, setPending] = useState<DailyEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [, setRevision] = useState(0);
  const requestId = useRef(0);
  const awaitingInitial = useRef(true);
  const invalidateRequests = useCallback(() => { requestId.current++; }, []);
  const updateStatus = useCallback(() => setRevision(value => value + 1), []);
  const choose = useCallback(() => document.getElementById("daily-picker")?.scrollIntoView({ behavior: "smooth", block: "start" }), []);

  const load = useCallback(async (list: DailyCatalog, entry: DailyEntry) => {
    if (!entry.ready) return;
    awaitingInitial.current = false;
    const request = ++requestId.current;
    setPending(entry);
    setLoading(true);
    setError("");
    try {
      const puzzle = await getDailyPuzzle(list.date, entry);
      if (request !== requestId.current) return;
      setActive(puzzle);
      try { localStorage.setItem(SELECTED_KEY, JSON.stringify({ date: list.date, id: entry.id })); } catch { /* Optional persistence. */ }
    } catch (cause) {
      if (request === requestId.current) setError(cause instanceof Error ? cause.message : "加载失败，请重试。");
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const refresh = async (initial = false) => {
      try {
        const list = await getDailyCatalog();
        if (!alive) return;
        setCatalog(list);
        setCatalogError("");
        if (initial || awaitingInitial.current) {
          let selected = list.entries[0];
          try {
            const remembered = JSON.parse(localStorage.getItem(SELECTED_KEY) || "null");
            if (remembered?.date === list.date) selected = list.entries.find(entry => entry.id === remembered.id) ?? selected;
          } catch { /* Ignore invalid remembered selection. */ }
          if (selected?.ready) void load(list, selected);
        }
      } catch {
        if (alive) setCatalogError("每日题目列表暂时无法加载，请检查网络或稍后刷新。");
      }
    };
    void refresh(true);
    const onVisible = () => { if (!document.hidden) void refresh(); };
    const timer = window.setInterval(onVisible, 10000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      invalidateRequests();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [invalidateRequests, load]);

  const statuses = new Map(catalog?.entries.map(entry => [entry.id, dailyStatus(entry.id)]));
  const completed = [...statuses.values()].filter(status => status === "已完成").length;
  return (
    <main className="nonogram-page">
      <section className="nonogram-heading">
        <div><p className="nonogram-eyebrow">DAILY NONOGRAM</p><h1>每日一题</h1></div>
        <div className="nonogram-mode-links">
          <button className="nonogram-battle-entry" type="button" onClick={() => navigate("/nonogram")}>随机模式</button>
          {active && <NonogramShareButton puzzle={active.puzzle} disabled={loading} />}
        </div>
      </section>
      {catalogError && <p className="daily-error" role="alert">{catalogError}<button type="button" onClick={() => window.location.reload()}>刷新</button></p>}
      {catalog ? (
        <section className="daily-picker" id="daily-picker" aria-label="每日题目选择">
          <div className="daily-picker-heading"><strong>{catalog.date}</strong><span>北京时间 0 点更新 · 已完成 {completed}/{catalog.entries.length}</span></div>
            <div className="daily-picker-row" role="group" aria-label="每日挑战">
              {catalog.entries.map(entry => (
                <button type="button" key={entry.id}
                  disabled={!entry.ready}
                  className={active?.id === entry.id ? "active" : ""}
                  aria-pressed={active?.id === entry.id}
                  aria-label={LABELS[entry.difficulty] + " " + entry.size + "×" + entry.size + " " + statuses.get(entry.id)}
                  onClick={() => { if (active?.id !== entry.id || loading) void load(catalog, entry); }}>
                  <strong>{LABELS[entry.difficulty]} · {entry.size}×{entry.size}</strong><small>{!entry.ready ? "题库准备中" : loading && pending?.id === entry.id ? "读取中…" : statuses.get(entry.id)}</small>
                </button>
              ))}
            </div>
          {catalog.entries.some(entry => !entry.ready) && <p role="status">后台正在补齐题库，就绪后自动开放；你也可以先玩已就绪的题目。</p>}
        </section>
      ) : !catalogError && <p role="status">正在加载每日题目列表…</p>}
      {loading && <p className="daily-loading" role="status">正在读取题目…</p>}
      {error && <p className="daily-error" role="alert">{error}
        <button type="button" onClick={() => {
          if (catalog && pending) {
            const entry = catalog.entries.find(item => item.size === pending.size && item.difficulty === pending.difficulty);
            if (entry) void load(catalog, entry);
          }
        }}>重试</button>
      </p>}
      {active && catalog && active.date !== catalog.date && <p className="daily-loading">新一天的题目已更新。你仍可完成 {active.date} 的这道题，或在上方选择今天的题目。</p>}
      {active && <NonogramDailyPlay key={active.id} daily={active} paused={loading} onStatus={updateStatus} onChoose={choose} />}
    </main>
  );
}
