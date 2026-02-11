import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import { createGame as createHandleGame } from "../services/handleApi";
import { startLinkGame } from "../services/linkApi";
import { getOrCreateUserId, normalizeUserId } from "../utils/userId";

export default function ModeSelect() {
  const navigate = useNavigate();
  const defaultUserId = useMemo(() => getOrCreateUserId(), []);
  const [creatingHandle, setCreatingHandle] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);

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
              <div className="mode-tile-stack">
                <span className="mode-tile blue" />
                <span className="mode-tile orange" />
                <span className="mode-tile gray" />
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
              <div className="mode-link-icon">
                <span className="mode-link-tile" />
                <span className="mode-link-line" />
                <span className="mode-link-tile" />
              </div>
              <div className="mode-card-title">连连看</div>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}
