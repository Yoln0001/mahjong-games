import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import NonogramDailyPlay from "../components/nonogram/NonogramDailyPlay";
import NonogramShareButton from "../components/nonogram/NonogramShareButton";
import { getSharedNonogram } from "../services/nonogramShareApi";
import type { DailyPuzzle } from "../services/nonogramDailyApi";
import "../styles/nonogram.css";

const LABELS = { easy: "简单", normal: "普通", hard: "困难", expert: "极难" };

export default function NonogramShared() {
  const { shareId = "" } = useParams();
  const navigate = useNavigate();
  const [shared, setShared] = useState<DailyPuzzle | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    void getSharedNonogram(shareId).then(data => {
      if (alive) setShared({ id: `shared:${data.id}`, date: "", puzzle: data.puzzle });
    }).catch(cause => {
      if (alive) setError(cause instanceof Error ? cause.message : "分享题目加载失败");
    });
    return () => { alive = false; };
  }, [shareId]);
  return (
    <main className="nonogram-page">
      <section className="nonogram-heading">
        <div><p className="nonogram-eyebrow">SHARED NONOGRAM</p><h1>分享题目</h1></div>
        <div className="nonogram-mode-links">
          <button className="nonogram-battle-entry" type="button" onClick={() => navigate("/nonogram")}>随机模式</button>
          {shared && <NonogramShareButton puzzle={shared.puzzle} />}
        </div>
      </section>
      {!shared && !error && <p className="daily-loading" role="status">正在读取分享题目…</p>}
      {error && <p className="daily-error" role="alert">{error}<button type="button" onClick={() => navigate("/nonogram")}>返回随机模式</button></p>}
      {shared && <NonogramDailyPlay daily={shared} paused={false} onStatus={() => undefined}
        onChoose={() => navigate("/nonogram")} newLabel="返回随机模式"
        metaLabel={`${LABELS[shared.puzzle.difficulty]} · ${shared.puzzle.size} × ${shared.puzzle.size}`} />}
    </main>
  );
}
