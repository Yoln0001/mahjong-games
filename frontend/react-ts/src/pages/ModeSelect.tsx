import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import { createGame as createHandleGame } from "../services/handleApi";
import { startLinkGame } from "../services/linkApi";
import { getOrCreateUserId, normalizeUserId } from "../utils/userId";
import { useThemeStyle } from "../App";

export default function ModeSelect() {
  const navigate = useNavigate();
  const { themeStyle } = useThemeStyle();
  const defaultUserId = useMemo(() => getOrCreateUserId(), []);
  const [creatingHandle, setCreatingHandle] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [creatingBattle, setCreatingBattle] = useState(false);
  const isDarkTheme = themeStyle === "noir" || themeStyle === "arcade";
  const tileBase = `/tiles/${isDarkTheme ? "dark" : "light"}`;

  async function onCreateHandle() {
    try {
      setCreatingHandle(true);
      const uid = normalizeUserId(defaultUserId) ?? defaultUserId;
      const raw = localStorage.getItem("mahjong-handle:lastGame:v2");
      if (raw) {
        const saved = JSON.parse(raw) as any;
        const savedGameId = saved?.gameId;
        const savedUserId = saved?.userId;
        const savedFinish = !!saved?.finish;
        if (savedGameId && !savedFinish) {
          const resumeUserId = normalizeUserId(savedUserId) ?? uid;
          navigate(`/handle/${encodeURIComponent(savedGameId)}?userId=${encodeURIComponent(resumeUserId)}`);
          setCreatingHandle(false);
          return;
        }
      }

      const res = await createHandleGame({ userId: uid });
      navigate(`/handle/${encodeURIComponent(res.gameId)}?userId=${encodeURIComponent(uid)}`);
    } catch (e: any) {
      message.error(e?.message || "创建猜手牌失败");
    } finally {
      setCreatingHandle(false);
    }
  }

  async function onCreateLink() {
    try {
      setCreatingLink(true);
      const uid = normalizeUserId(defaultUserId) ?? defaultUserId;
      const raw = localStorage.getItem("mahjong-link:lastGame:v1");
      if (raw) {
        const saved = JSON.parse(raw) as any;
        const savedGameId = saved?.gameId;
        const savedUserId = saved?.userId;
        const savedFinish = !!saved?.finish;
        if (savedGameId && !savedFinish) {
          const resumeUserId = normalizeUserId(savedUserId) ?? uid;
          navigate(`/link/${encodeURIComponent(savedGameId)}?userId=${encodeURIComponent(resumeUserId)}`);
          setCreatingLink(false);
          return;
        }
      }

      const res = await startLinkGame({ userId: uid });
      navigate(`/link/${encodeURIComponent(res.gameId)}?userId=${encodeURIComponent(uid)}`);
    } catch (e: any) {
      message.error(e?.message || "创建连连看失败");
    } finally {
      setCreatingLink(false);
    }
  }

  function onCreateBattle() {
    try {
      setCreatingBattle(true);
      const uid = normalizeUserId(defaultUserId) ?? defaultUserId;
      navigate(`/battle?userId=${encodeURIComponent(uid)}`);
    } finally {
      setCreatingBattle(false);
    }
  }

  function onCreateNonogram() {
    navigate("/nonogram");
  }

  return (
    <div className="mode-root">
      <div className="mode-hero">
      </div>

      <div className="mode-grid">
        <div className="mode-card">
          <button
            type="button"
            className="mode-card-main"
            onClick={onCreateHandle}
            disabled={creatingHandle}
            aria-label="进入猜手牌"
          >
            <div className="mode-card-top">
              <div className="mode-game-preview mode-guess-preview" aria-hidden="true">
                <div className="mode-tile-fan">
                  {[["Man1.svg", "fan-1"], ["Pin3.svg", "fan-2"], ["Sou7.svg", "fan-3"], ["Chun.svg", "fan-4"], ["Haku.svg", "fan-5"]].map(([tile, className]) => (
                    <img key={tile} className={`mode-mahjong-tile ${className}`} src={`${tileBase}/${tile}`} alt="" />
                  ))}
                </div>
                <span className="mode-question-badge">?</span>
              </div>
              <div className="mode-card-title">猜手牌</div>
            </div>
          </button>

        </div>

        <div className="mode-card">
          <button
            type="button"
            className="mode-card-main"
            onClick={onCreateLink}
            disabled={creatingLink}
            aria-label="进入连连看"
          >
            <div className="mode-card-top">
              <div className="mode-game-preview mode-link-preview" aria-hidden="true">
                <div className="mode-link-route route-a" />
                <div className="mode-link-route route-b" />
                <span className="mode-link-dot dot-a" />
                <span className="mode-link-dot dot-b" />
                <img className="mode-mahjong-tile link-tile-a" src={`${tileBase}/Pin5.svg`} alt="" />
                <img className="mode-mahjong-tile link-tile-b" src={`${tileBase}/Pin5.svg`} alt="" />
                <img className="mode-mahjong-tile link-tile-c" src={`${tileBase}/Sou3.svg`} alt="" />
                <img className="mode-mahjong-tile link-tile-d" src={`${tileBase}/Sou3.svg`} alt="" />
              </div>
              <div className="mode-card-title">连连看</div>
            </div>
          </button>

        </div>

        <div className="mode-card">
          <button
            type="button"
            className="mode-card-main"
            onClick={onCreateBattle}
            disabled={creatingBattle}
            aria-label="进入猜手牌双人对战"
          >
            <div className="mode-card-top">
              <div className="mode-game-preview mode-battle-preview" aria-hidden="true">
                <div className="mode-battle-hand hand-left">
                  {["Man3.svg", "Pin7.svg", "Sou5.svg"].map((tile) => <img key={tile} className="mode-mahjong-tile" src={`${tileBase}/${tile}`} alt="" />)}
                </div>
                <span className="mode-vs-badge">VS</span>
                <div className="mode-battle-hand hand-right">
                  {["Chun.svg", "Pin2.svg", "Sou9.svg"].map((tile) => <img key={tile} className="mode-mahjong-tile" src={`${tileBase}/${tile}`} alt="" />)}
                </div>
              </div>
              <div className="mode-card-title">猜手牌双人对战</div>
            </div>
          </button>
        </div>

        <div className="mode-card">
          <button
            type="button"
            className="mode-card-main"
            onClick={onCreateNonogram}
            aria-label="进入数织"
          >
            <div className="mode-card-top">
              <div className="mode-nonogram-preview" aria-hidden="true">
                {Array.from({ length: 36 }, (_, index) => (
                  <span key={index} className={[7, 8, 10, 13, 15, 16, 19, 20, 22, 25, 26, 28].includes(index) ? "filled" : ""} />
                ))}
              </div>
              <div className="mode-card-title">数织</div>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
