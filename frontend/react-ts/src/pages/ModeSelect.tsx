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
  const isDarkTheme = themeStyle === "noir" || themeStyle === "arcade";
  const handleImg = isDarkTheme ? "/picture/猜手牌dark.png" : "/picture/猜手牌light.png";
  const linkImg = isDarkTheme ? "/picture/连连看dark.png" : "/picture/连连看light.png";

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
              <img
                className="mode-card-image"
                src={handleImg}
                alt="猜手牌"
              />
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
              <img
                className="mode-card-image"
                src={linkImg}
                alt="连连看"
              />
              <div className="mode-card-title">连连看</div>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}
