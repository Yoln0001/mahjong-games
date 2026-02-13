import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { message, Modal, Switch } from "antd";
import { InfoCircleOutlined, SettingOutlined } from "@ant-design/icons";

import TileCell from "../components/TileCell";
import { useThemeMode, useThemeStyle } from "../App";
import { getOrCreateUserId, normalizeUserId } from "../utils/userId";
import {
    getLinkStatus,
    pickLinkTile,
    resetLinkGame,
    startLinkGame,
} from "../services/linkApi";
import type {
    LinkPickData,
    LinkStartData,
    LinkStatusData,
} from "../types/api";

// 列数固定为 17（8x17）
const COLS = 17;
const ROWS = 8;
const LINK_STORAGE_KEY = "mahjong-link:lastGame:v1";

type GameState = {
    columns: string[][];
    topTiles: Array<string | null>;
    columnCounts: number[];
    tempSlots: string[];
    tempLimit: number;
    remainTiles: number;
    finish: boolean;
    win: boolean;
    failReason?: string | null;
    createdAt?: number | null;
};

const emptyState: GameState = {
    columns: [],
    topTiles: [],
    columnCounts: [],
    tempSlots: [],
    tempLimit: 7,
    remainTiles: 0,
    finish: false,
    win: false,
    failReason: null,
    createdAt: null,
};

function pad2(n: number): string {
    return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function formatDurationMMSS(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds || 0));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${pad2(mm)}:${pad2(ss)}`;
}

function normalizeState(
    data: LinkStartData | LinkPickData | LinkStatusData,
    prev?: GameState
): GameState {
    // 统一把后端返回的 data 转成页面状态
    return {
        columns: data.columns ?? prev?.columns ?? [],
        topTiles: data.topTiles ?? prev?.topTiles ?? [],
        columnCounts: data.columnCounts ?? prev?.columnCounts ?? [],
        tempSlots: data.tempSlots ?? prev?.tempSlots ?? [],
        tempLimit: data.tempLimit ?? prev?.tempLimit ?? 7,
        remainTiles: data.remainTiles ?? prev?.remainTiles ?? 0,
        finish: typeof data.finish === "boolean" ? data.finish : !!prev?.finish,
        win: typeof data.win === "boolean" ? data.win : !!prev?.win,
        failReason: data.failReason ?? prev?.failReason ?? null,
        createdAt: typeof data.createdAt === "number" ? data.createdAt : (prev?.createdAt ?? null),
    };
}

export default function Link() {
    const { themeMode } = useThemeMode();
    const { themeStyle } = useThemeStyle();
    const navigate = useNavigate();
    const params = useParams<{ gameId: string }>();
    const [searchParams] = useSearchParams();

    const routeGameId = normalizeUserId(params.gameId) ?? "";
    const routeUserId = normalizeUserId(searchParams.get("userId"));
    const userId = routeUserId ?? getOrCreateUserId();

    const [gameId, setGameId] = useState<string>(routeGameId);
    const [state, setState] = useState<GameState>(emptyState);
    const [loading, setLoading] = useState(false);
    const [picking, setPicking] = useState(false);
    const [hoverTile, setHoverTile] = useState<string | null>(null);
    const [ruleOpen, setRuleOpen] = useState(false);
    const [assistOpen, setAssistOpen] = useState(false);
    const [tileHintEnabled, setTileHintEnabled] = useState(true);
    const [endOpen, setEndOpen] = useState(false);
    const [endDurationSec, setEndDurationSec] = useState<number>(0);

    const lastFinishRef = useRef<boolean>(false);

    // 统一更新本地状态
    const applyState = useCallback((data: LinkStartData | LinkPickData | LinkStatusData) => {
        setState((prev) => normalizeState(data, prev));
    }, []);

    // Persist last link game for resume
    useEffect(() => {
        if (!gameId) return;
        try {
            localStorage.setItem(
                LINK_STORAGE_KEY,
                JSON.stringify({ gameId, userId, finish: state.finish })
            );
        } catch {
            // ignore
        }
    }, [gameId, userId, state.finish]);

    // 拉取状态（进入页面或路由变化）
    useEffect(() => {
        if (!routeGameId) {
            navigate("/", { replace: true });
            return;
        }

        setGameId(routeGameId);

        void (async () => {
            try {
                setLoading(true);
                const res = await getLinkStatus(routeGameId, userId);
                applyState(res);
            } catch (e: any) {
                message.error(e?.message || "获取状态失败");
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeGameId]);

    // 游戏结束时弹窗提示
    useEffect(() => {
        if (!state.finish || lastFinishRef.current) return;
        lastFinishRef.current = true;
        const createdAt = typeof state.createdAt === "number" ? state.createdAt : null;
        const nowSec = Date.now() / 1000;
        setEndDurationSec(createdAt ? Math.max(0, Math.floor(nowSec - createdAt)) : 0);
        setEndOpen(true);
    }, [state.finish]);

    // 关闭提示功能时，立即清掉当前高亮，避免残留状态
    useEffect(() => {
        if (!tileHintEnabled) {
            setHoverTile(null);
        }
    }, [tileHintEnabled]);

    // 开始新局
    const onStartNew = useCallback(async () => {
        try {
            setLoading(true);
            const res = await startLinkGame({ userId });
            applyState(res);
            setGameId(res.gameId);
            lastFinishRef.current = false;
            setEndOpen(false);
            setEndDurationSec(0);

            // 同步 URL
            navigate(`/link/${encodeURIComponent(res.gameId)}?userId=${encodeURIComponent(userId)}`, {
                replace: true,
            });
        } catch (e: any) {
            message.error(e?.message || "创建新局失败");
        } finally {
            setLoading(false);
        }
    }, [applyState, navigate, userId]);

    // 重开当前局
    const onReset = useCallback(async () => {
        if (!gameId) return;
        try {
            setLoading(true);
            const res = await resetLinkGame(gameId, { userId });
            const newId = res.gameId;
            const status = await getLinkStatus(newId, userId);
            applyState(status);
            setGameId(newId);
            lastFinishRef.current = false;
            setEndOpen(false);
            setEndDurationSec(0);

            navigate(`/link/${encodeURIComponent(newId)}?userId=${encodeURIComponent(userId)}`, {
                replace: true,
            });
        } catch (e: any) {
            message.error(e?.message || "重开失败");
        } finally {
            setLoading(false);
        }
    }, [applyState, gameId, navigate, userId]);

    // 选择列取牌
    const onPickColumn = useCallback(
        async (column: number) => {
            if (!gameId) return;
            if (loading || picking || state.finish) return;
            if (column < 0 || column >= COLS) return;

            try {
                setPicking(true);
                const res = await pickLinkTile(gameId, { userId, column });
                applyState(res);
            } catch (e: any) {
                message.error(e?.message || "取牌失败");
            } finally {
                setPicking(false);
            }
        },
        [applyState, gameId, loading, picking, state.finish, userId]
    );

    const topTiles = useMemo(() => {
        // 若后端未返回 topTiles，就从 columns 兜底推导
        if (state.topTiles?.length === COLS) return state.topTiles;
        return Array.from({ length: COLS }).map((_, i) => {
            const col = state.columns?.[i] ?? [];
            return col.length ? col[col.length - 1] : null;
        });
    }, [state.columns, state.topTiles]);

    const columnCounts = useMemo(() => {
        if (state.columnCounts?.length === COLS) return state.columnCounts;
        return Array.from({ length: COLS }).map((_, i) => state.columns?.[i]?.length ?? 0);
    }, [state.columnCounts, state.columns]);

    const gridRows = useMemo(() => {
        // 渲染为 8 行 17 列：从顶部行开始显示
        return Array.from({ length: ROWS }, (_, r) => ROWS - 1 - r);
    }, []);

    const displayLimit = Math.max(state.tempLimit - 1, 1);
    const displayTempSlots = state.tempSlots.slice(0, displayLimit);

    return (
        <div className="game-root">
            <div className="modern-shell">
                <div className="modern-top">
                    <div className="modern-actions center">
                        <button className="modern-btn primary" type="button" onClick={onStartNew} disabled={loading}>
                            新开一局
                        </button>
                        <button className="modern-btn" type="button" onClick={() => navigate("/", { replace: false })}>
                            返回主页
                        </button>
                    </div>
                </div>
                <div className="modern-actions center" style={{ marginTop: 8 }}>
                    <button className="modern-btn" type="button" onClick={() => setRuleOpen(true)}>
                        <InfoCircleOutlined style={{ marginRight: 6 }} />
                        规则介绍
                    </button>
                    <button className="modern-btn" type="button" onClick={() => setAssistOpen(true)}>
                        <SettingOutlined style={{ marginRight: 6 }} />
                        辅助功能
                    </button>
                </div>

                <div className="modern-grid">
                    <div className="modern-panel board-panel">
                        <div className="modern-board">
                        {gridRows.map((rIdx) =>
                            Array.from({ length: COLS }).map((_, cIdx) => {
                                const col = state.columns?.[cIdx] ?? [];
                                const tile = col[rIdx] ?? "";
                                const isTop = col.length > 0 && rIdx === col.length - 1;
                                const disabled = !isTop || state.finish || loading || picking;
                                const shouldHighlight = tileHintEnabled && !!hoverTile && tile === hoverTile;
                                const highlightStyle = shouldHighlight
                                    ? { background: "rgba(22, 119, 255, 0.16)" }
                                    : undefined;
                                const borderStyle = tile
                                    ? {
                                        boxShadow:
                                            "0 0 0 2px rgba(0, 0, 0, 0.75), 0 2px 8px rgba(12, 17, 22, 0.12)",
                                    }
                                    : undefined;

                                return (
                                    <div
                                        key={`${rIdx}-${cIdx}`}
                                        className="link-tile-wrap"
                                        onClick={() => (isTop ? onPickColumn(cIdx) : undefined)}
                                        onMouseEnter={() => {
                                            if (tileHintEnabled) setHoverTile(tile || null);
                                        }}
                                        onMouseLeave={() => setHoverTile(null)}
                                        style={{
                                            width: 44,
                                            height: 60,
                                        border: "none",
                                        padding: 0,
                                        background: "transparent",
                                        cursor: disabled ? "default" : "pointer",
                                        outline: "none",
                                        borderRadius: 10,
                                        ...(borderStyle ?? {}),
                                    }}
                                        aria-label={`col-${cIdx}-row-${rIdx}`}
                                    >
                                        <TileCell
                                            tile={tile}
                                            status="empty"
                                            themeMode={themeMode}
                                            size={38}
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                padding: 0,
                                                border: "none",
                                                boxShadow: "none",
                                                borderRadius: 10,
                                                ...(highlightStyle ?? {}),
                                            }}
                                        />
                                    </div>
                                );
                            })
                        )}
                        </div>
                    </div>

                    <div className="modern-panel slot-panel">
                        <h3 style={{ marginTop: 0 }}>暂存区</h3>
                        <div className="modern-slot">
                            {displayTempSlots.map((t, i) => (
                                <div
                                    key={`${t}-${i}`}
                                    className="link-tile-wrap"
                                    onMouseEnter={() => {
                                        if (tileHintEnabled) setHoverTile(t);
                                    }}
                                    onMouseLeave={() => setHoverTile(null)}
                                        style={{
                                            width: 44,
                                            height: 60,
                                        borderRadius: 10,
                                        boxShadow:
                                            "0 0 0 2px rgba(0, 0, 0, 0.75), 0 2px 8px rgba(12, 17, 22, 0.12)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background:
                                            tileHintEnabled && hoverTile === t
                                                ? "rgba(22, 119, 255, 0.16)"
                                                : "#fff",
                                    }}
                                >
                                    <TileCell
                                        tile={t}
                                        status="empty"
                                        themeMode={themeMode}
                                        size={38}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            padding: 0,
                                            border: "none",
                                            boxShadow: "none",
                                            borderRadius: 10,
                                            ...(tileHintEnabled && hoverTile === t
                                                ? { background: "rgba(22, 119, 255, 0.16)" }
                                                : undefined),
                                        }}
                                    />
                                </div>
                            ))}
                            {Array.from({ length: Math.max(displayLimit - displayTempSlots.length, 0) }).map((_, i) => (
                                <div key={`empty-${i}`} className="modern-tile slot-empty" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <Modal
                title="连连看规则介绍"
                open={ruleOpen}
                onCancel={() => setRuleOpen(false)}
                footer={null}
                className={`theme-modal theme-${themeStyle}`}
            >
                <div style={{ lineHeight: 1.7 }}>
                    <ul style={{ margin: 0, paddingLeft: 18, listStyleType: "circle" }}>
                        <li>场上共有 136 张牌，摆成 8 行 17 列。</li>
                        <li>每一列只能拿最上面那一张牌。</li>
                        <li>拿到的牌放进暂存区；如果放入的牌和暂存区里已有的牌一样，就会立刻消掉这一对。</li>
                        <li>暂存区最多放 6 张牌，放满之后，放入的下一张牌没有和已有的牌消除就算失败。</li>
                        <li>所有牌都消完就算胜利。</li>
                    </ul>
                </div>
            </Modal>

            <Modal
                title="辅助功能"
                open={assistOpen}
                onCancel={() => setAssistOpen(false)}
                footer={null}
                className={`theme-modal theme-${themeStyle}`}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                        <div style={{ fontWeight: 600 }}>手牌提示</div>
                        <div style={{ opacity: 0.72, fontSize: 13, marginTop: 4 }}>相同手牌高亮显示</div>
                    </div>
                    <Switch checked={tileHintEnabled} onChange={setTileHintEnabled} />
                </div>
            </Modal>

            <Modal
                title={state.win ? "游戏结束：恭喜获胜！" : "游戏结束：挑战失败。"}
                open={endOpen}
                onCancel={() => setEndOpen(false)}
                closable={false}
                footer={
                    <div style={{ display: "flex", justifyContent: "center" }}>
                        <button className="modern-btn primary" type="button" onClick={() => setEndOpen(false)}>
                            关闭
                        </button>
                    </div>
                }
                className="mh-end-modal"
            >
                <div style={{ lineHeight: 1.9 }}>
                    <div>游戏用时：<b>{formatDurationMMSS(endDurationSec)}</b></div>
                    <div>剩余牌数：<b>{state.remainTiles}</b></div>
                </div>
            </Modal>
        </div>
    );
}
