import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Input, InputNumber, Modal, Select, Space, Typography, message } from "antd";
import {
    InfoCircleOutlined,
    RetweetOutlined,
    SettingOutlined,
    SendOutlined,
    RollbackOutlined,
    DeleteOutlined,
    CheckOutlined,
} from "@ant-design/icons";
import type { BattleCreateReq, BattleMode, BattleResultData, BattleStatusData } from "../types/api";
import { createBattle, getBattleResult, getBattleStatus, joinBattle, submitBattleGuess } from "../services/battleApi";
import { getOrCreateUserId, normalizeUserId } from "../utils/userId";
import TileCell from "../components/TileCell";
import type { TileId } from "../constants/tiles";
import { useThemeMode, useThemeStyle } from "../App";
import type { CellStatus } from "../components/TileCell";

const BATTLE_COLS = 14;
const TILE_KEYBOARD: TileId[] = [
    "1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m",
    "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p",
    "1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s",
    "1z", "2z", "3z", "4z", "5z", "6z", "7z",
];
type Row = { tiles: string[]; colors: CellStatus[] };
type RoundSummary = {
    questionNo: number;
    win: boolean;
    hitCountValid: number;
    score: number;
    totalScore: number;
};

function modeText(mode: BattleMode): string {
    if (mode === "riichi") return "立直麻将";
    if (mode === "guobiao") return "国标麻将";
    return "普通麻将";
}

function matchStatusText(status?: string): string {
    if (status === "waiting") return "等待对手";
    if (status === "playing") return "进行中";
    if (status === "finished") return "已结束";
    return "加载中";
}

function progressText(currentQuestion: number | undefined, questionCount: number | undefined, finished: boolean | undefined): string {
    const total = Math.max(1, Number(questionCount || 1));
    const current = Number(currentQuestion || 0);
    if (finished) return `${total}/${total}`;
    return `${Math.min(current + 1, total)}/${total}`;
}

export default function Battle() {
    const { themeMode } = useThemeMode();
    const { themeStyle } = useThemeStyle();
    const navigate = useNavigate();
    const params = useParams<{ matchId: string }>();
    const [searchParams] = useSearchParams();

    const routeMatchId = normalizeUserId(params.matchId) ?? "";
    const routeUserId = normalizeUserId(searchParams.get("userId"));
    const userId = routeUserId ?? getOrCreateUserId();

    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<BattleMode>("normal");
    const [questionCount, setQuestionCount] = useState<number>(1);
    const [maxGuess, setMaxGuess] = useState<number>(6);
    const [joinMatchIdInput, setJoinMatchIdInput] = useState("");
    const [statusData, setStatusData] = useState<BattleStatusData | null>(null);
    const [resultData, setResultData] = useState<BattleResultData | null>(null);
    const [guessInput, setGuessInput] = useState("");
    const [inputMode, setInputMode] = useState<"keyboard" | "text">("keyboard");
    const [currentTiles, setCurrentTiles] = useState<string[]>([]);
    const [rows, setRows] = useState<Row[]>([]);
    const [submitBusy, setSubmitBusy] = useState(false);
    const [shareUrl, setShareUrl] = useState("");
    const [ruleOpen, setRuleOpen] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);
    const [roundSummaryOpen, setRoundSummaryOpen] = useState(false);
    const [roundSummary, setRoundSummary] = useState<RoundSummary | null>(null);
    const [awaitingNextQuestion, setAwaitingNextQuestion] = useState(false);

    const matchId = routeMatchId || statusData?.matchId || "";
    const maxRows = statusData?.maxGuess ?? maxGuess;
    const myFinished = !!statusData?.my?.finished;
    const questionTotal = statusData?.questionCount ?? questionCount;
    const disableInputActions = submitBusy || myFinished || awaitingNextQuestion;

    const refreshStatus = useCallback(async () => {
        if (!matchId) return;
        const data = await getBattleStatus(matchId, userId);
        setStatusData(data);
    }, [matchId, userId]);

    const refreshResult = useCallback(async () => {
        if (!matchId) return;
        try {
            const data = await getBattleResult(matchId, userId);
            setResultData(data);
        } catch {
            // ignore until both players finish
        }
    }, [matchId, userId]);

    useEffect(() => {
        if (!routeMatchId) return;
        void (async () => {
            try {
                await joinBattle(routeMatchId, { userId });
            } catch (e: any) {
                if (!String(e?.message || "").includes("MATCH_FULL")) {
                    message.warning(e?.message || "加入对战失败");
                }
            }
            try {
                await refreshStatus();
            } catch (e: any) {
                message.error(e?.message || "读取对战状态失败");
            }
        })();
    }, [routeMatchId, refreshStatus, userId]);

    useEffect(() => {
        if (!matchId) return;
        const timer = setInterval(() => {
            void refreshStatus();
            void refreshResult();
        }, 2000);
        return () => clearInterval(timer);
    }, [matchId, refreshResult, refreshStatus]);

    async function onCreateBattle() {
        try {
            setLoading(true);
            const payload: BattleCreateReq = {
                userId,
                mode,
                questionCount,
                maxGuess,
            };
            const res = await createBattle(payload);
            setStatusData(res);
            const nextPath = `/battle/${encodeURIComponent(res.matchId)}?userId=${encodeURIComponent(userId)}`;
            navigate(nextPath, { replace: false });
            const absolute = res.shareUrl || `${window.location.origin}${nextPath}`;
            setShareUrl(absolute);
            message.success("对战已创建，分享链接给对手即可");
        } catch (e: any) {
            message.error(e?.message || "创建对战失败");
        } finally {
            setLoading(false);
        }
    }

    async function onJoinByInput() {
        const mid = (joinMatchIdInput || "").trim();
        if (!mid) {
            message.warning("请输入 matchId");
            return;
        }
        navigate(`/battle/${encodeURIComponent(mid)}?userId=${encodeURIComponent(userId)}`, { replace: false });
    }

    const pushTile = useCallback((tile: string) => {
        setCurrentTiles((prev) => {
            if (prev.length >= BATTLE_COLS) return prev;
            return [...prev, tile];
        });
    }, []);

    const popTile = useCallback(() => {
        setCurrentTiles((prev) => (prev.length ? prev.slice(0, prev.length - 1) : prev));
    }, []);

    const clearTiles = useCallback(() => {
        setCurrentTiles([]);
    }, []);

    async function onSubmitGuess() {
        if (!matchId || !statusData || myFinished) return;
        if (awaitingNextQuestion) {
            message.info("请先点击“下一题”");
            return;
        }
        const guess = inputMode === "keyboard" ? currentTiles.join("") : guessInput.trim();
        if (!guess) {
            message.warning("请输入猜测字符串");
            return;
        }
        if (inputMode === "keyboard" && currentTiles.length !== BATTLE_COLS) {
            message.warning(`需要输入 ${BATTLE_COLS} 张牌才能提交`);
            return;
        }
        try {
            setSubmitBusy(true);
            const res = await submitBattleGuess(matchId, { userId, guess });
            const currentRoundHit = rows.length + 1;
            setGuessInput("");
            setCurrentTiles([]);
            const nextRow: Row = {
                tiles: res.guess.guessTiles14 ?? [],
                colors: (res.guess.colors14 ?? []) as CellStatus[],
            };
            if (res.questionFinished) {
                setRows([]);
                setRoundSummary({
                    questionNo: (res.questionIndex ?? 0) + 1,
                    win: !!res.guess.win,
                    hitCountValid: currentRoundHit,
                    score: Number(res.guess.score ?? 0),
                    totalScore: Number(res.totalScore ?? 0),
                });
                setRoundSummaryOpen(true);
                setAwaitingNextQuestion(!res.finish);
            } else {
                setRows((prev) => [...prev, nextRow].slice(0, maxRows));
            }
            await refreshStatus();
            await refreshResult();
        } catch (e: any) {
            message.error(e?.message || "提交失败");
        } finally {
            setSubmitBusy(false);
        }
    }

    useEffect(() => {
        if (inputMode !== "keyboard") return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (ruleOpen || infoOpen || roundSummaryOpen) return;
            if (disableInputActions) return;

            const target = e.target as any;
            const isEditable =
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.isContentEditable);
            if (isEditable) return;

            if (e.key === "Enter") {
                e.preventDefault();
                void onSubmitGuess();
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
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [
        inputMode,
        ruleOpen,
        infoOpen,
        roundSummaryOpen,
        disableInputActions,
        popTile,
        clearTiles,
        onSubmitGuess,
    ]);

    const myRankText = useMemo(() => {
        if (!resultData) return "";
        if (resultData.isDraw) return "平局";
        return resultData.winnerUserId === userId ? "你获胜" : "你落败";
    }, [resultData, userId]);

    const boardRows: Row[] = useMemo(() => {
        if (!statusData) return [];
        const filled: Row[] = [];
        for (let i = 0; i < maxRows; i++) {
            if (i < rows.length) filled.push(rows[i]);
            else if (i === rows.length && !myFinished && inputMode === "keyboard") filled.push({ tiles: currentTiles, colors: [] });
            else filled.push({ tiles: [], colors: [] });
        }
        return filled;
    }, [statusData, maxRows, rows, myFinished, inputMode, currentTiles, awaitingNextQuestion]);
    const pickFrameColor = (themeStyle === "noir" || themeStyle === "arcade") ? "#ffffff" : "#000000";
    const cellRadius = 10;

    useEffect(() => {
        if (!matchId) return;
        if (shareUrl) return;
        setShareUrl(`${window.location.origin}/battle/${encodeURIComponent(matchId)}`);
    }, [matchId, shareUrl]);

    return (
        <div className="game-root">
            <div className="modern-shell">
                <div className="modern-top">
                    <div className="modern-actions center">
                        <button className="modern-btn" type="button" onClick={() => navigate("/", { replace: false })}>
                            返回主页
                        </button>
                    </div>
                </div>

                {!matchId && (
                    <div className="modern-panel">
                        <h3>创建双人对战</h3>
                        <Space direction="vertical" style={{ width: "100%" }}>
                            <div>
                                <div>模式</div>
                                <Select
                                    style={{ width: 220 }}
                                    value={mode}
                                    onChange={(v) => setMode(v)}
                                    options={[
                                        { label: "普通麻将", value: "normal" },
                                        { label: "立直麻将", value: "riichi" },
                                        { label: "国标麻将", value: "guobiao" },
                                    ]}
                                />
                            </div>
                            <div>
                                <div>题目数量</div>
                                <InputNumber min={1} max={50} value={questionCount} onChange={(v) => setQuestionCount(Number(v || 1))} />
                            </div>
                            <div>
                                <div>每题最大猜测次数</div>
                                <InputNumber min={1} max={20} value={maxGuess} onChange={(v) => setMaxGuess(Number(v || 6))} />
                            </div>
                            <button className="modern-btn primary" type="button" onClick={onCreateBattle} disabled={loading}>
                                创建对战
                            </button>
                        </Space>
                        <hr style={{ margin: "14px 0", opacity: 0.2 }} />
                        <h3>加入对战</h3>
                        <Space.Compact style={{ width: "100%" }}>
                            <Input
                                placeholder="输入 matchId"
                                value={joinMatchIdInput}
                                onChange={(e) => setJoinMatchIdInput(e.target.value)}
                            />
                            <button className="modern-btn" type="button" onClick={onJoinByInput}>
                                进入
                            </button>
                        </Space.Compact>
                    </div>
                )}

                {matchId && (
                    <>
                        <div className="game-info">
                            <Typography.Text className="game-info-text">
                                对战模式：{modeText((statusData?.mode as BattleMode) || mode)}
                            </Typography.Text>
                            <div className="game-subinfo">
                                <div>当前题目：{progressText(statusData?.my.currentQuestion, questionTotal, statusData?.my.finished)}</div>
                                <div>总分：我方 {statusData?.my.totalScore ?? 0} / 对方 {statusData?.opponent?.totalScore ?? 0}</div>
                            </div>
                            <div style={{ marginTop: 10 }}>
                                <Space wrap>
                                    <button className="modern-btn" type="button" onClick={() => setRuleOpen(true)}>
                                        <InfoCircleOutlined style={{ marginRight: 6 }} />
                                        规则介绍
                                    </button>
                                    <button className="modern-btn" type="button" onClick={() => setInfoOpen(true)}>
                                        <RetweetOutlined style={{ marginRight: 6 }} />
                                        对局信息
                                    </button>
                                    <button
                                        className="modern-btn"
                                        type="button"
                                        onClick={() => setInputMode(inputMode === "text" ? "keyboard" : "text")}
                                        disabled={disableInputActions}
                                    >
                                        <SettingOutlined style={{ marginRight: 6 }} />
                                        {inputMode === "text" ? "手牌输入" : "文字输入"}
                                    </button>
                                </Space>
                            </div>
                            {awaitingNextQuestion && (
                                <div style={{ marginTop: 10 }}>
                                    <button
                                        className="modern-btn primary"
                                        type="button"
                                        onClick={() => {
                                            setRows([]);
                                            setCurrentTiles([]);
                                            setGuessInput("");
                                            setAwaitingNextQuestion(false);
                                        }}
                                    >
                                        下一题
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="board">
                            {boardRows.map((row, rIdx) => {
                                const isEditableRow =
                                    inputMode === "keyboard" &&
                                    !myFinished &&
                                    !awaitingNextQuestion &&
                                    rIdx === rows.length;

                                return (
                                    <div className="board-row" key={rIdx}>
                                        {Array.from({ length: BATTLE_COLS }).map((_, cIdx) => {
                                            const tile = row.tiles[cIdx] ?? "";
                                            const status: CellStatus = row.colors[cIdx] ?? "empty";
                                            const isLast = cIdx === BATTLE_COLS - 1;

                                            const shouldShowPickFrame =
                                                isEditableRow &&
                                                cIdx < BATTLE_COLS - 1 &&
                                                cIdx < currentTiles.length;

                                            return (
                                                <div
                                                    key={`${rIdx}-${cIdx}`}
                                                    className={`board-cell ${isLast ? "board-cell-last" : ""}`}
                                                    style={{ position: "relative", borderRadius: cellRadius }}
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
                                {!myFinished ? (
                                    awaitingNextQuestion ? (
                                        <div style={{ marginTop: 10 }}>本题已结束，请点击“下一题”继续。</div>
                                    ) : (
                                    inputMode === "keyboard" ? (
                                        <div className="tile-keyboard">
                                            <div className="tile-keyboard-grid">
                                                {TILE_KEYBOARD.map((t) => (
                                                    <button
                                                        key={t}
                                                        className="tile-btn"
                                                        onClick={() => pushTile(t)}
                                                        disabled={disableInputActions || currentTiles.length >= BATTLE_COLS}
                                                        type="button"
                                                    >
                                                        <TileCell tile={t} status="empty" themeMode={themeMode} size={36} />
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="keyboard-actions">
                                                <Space>
                                                    <button className="modern-btn primary" type="button" onClick={onSubmitGuess} disabled={disableInputActions}>
                                                        <SendOutlined style={{ marginRight: 6 }} />
                                                        提交
                                                    </button>
                                                    <button className="modern-btn" type="button" onClick={popTile} disabled={disableInputActions}>
                                                        <RollbackOutlined style={{ marginRight: 6 }} />
                                                        删除
                                                    </button>
                                                    <button className="modern-btn" type="button" onClick={clearTiles} disabled={disableInputActions}>
                                                        <DeleteOutlined style={{ marginRight: 6 }} />
                                                        清空
                                                    </button>
                                                </Space>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-input-bar">
                                            <Input
                                                value={guessInput}
                                                onChange={(e) => setGuessInput(e.target.value)}
                                                placeholder="输入14张牌字符串，例如：123m456p789s11555z"
                                                className="mono modern-input"
                                                onPressEnter={() => void onSubmitGuess()}
                                                disabled={disableInputActions}
                                            />
                                            <button className="modern-btn primary" type="button" onClick={onSubmitGuess} disabled={disableInputActions}>
                                                <CheckOutlined style={{ marginRight: 6 }} />
                                                确认
                                            </button>
                                        </div>
                                    )
                                    )
                                ) : (
                                    <div style={{ marginTop: 10 }}>你已完成所有题目，等待对手结束...</div>
                                )}
                            </div>
                        </div>

                        {resultData && (
                            <div className="modern-panel">
                                <h4 style={{ marginBottom: 8 }}>对战结果：{myRankText}</h4>
                                {resultData.players.map((p) => (
                                    <div key={p.userId}>
                                        {p.userId === userId ? "你" : "对手"}：{p.totalScore} 分
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            <Modal
                title="双人对战规则"
                open={ruleOpen}
                onCancel={() => setRuleOpen(false)}
                footer={null}
                className={`theme-modal theme-${themeStyle}`}
            >
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
                    <li>创建房间后，把分享链接发给对手，双方做同一套题目。</li>
                    <li>每题规则与猜手牌一致，按颜色反馈继续猜测。</li>
                    <li>每题结束会结算得分，所有题目总分高者获胜。</li>
                    <li>若双方总分相同，则判定为平局。</li>
                </ul>
            </Modal>

            <Modal
                title="对局信息"
                open={infoOpen}
                onCancel={() => setInfoOpen(false)}
                footer={null}
                className={`theme-modal theme-${themeStyle}`}
            >
                <div style={{ lineHeight: 1.8, wordBreak: "break-all" }}>
                    <div>匹配ID：{matchId}</div>
                    <div>模式：{modeText((statusData?.mode as BattleMode) || mode)}</div>
                    <div>题目数量：{statusData?.questionCount ?? "-"}</div>
                    <div>状态：{matchStatusText(statusData?.status)}</div>
                    <div>分享链接：{shareUrl || (matchId ? `${window.location.origin}/battle/${encodeURIComponent(matchId)}` : "-")}</div>
                    <div>我方进度：{progressText(statusData?.my.currentQuestion, statusData?.questionCount, statusData?.my.finished)}</div>
                    <div>我方得分：{statusData?.my.totalScore ?? 0}</div>
                    <div>对方进度：{progressText(statusData?.opponent?.currentQuestion, statusData?.questionCount, statusData?.opponent?.finished)}</div>
                    <div>对方得分：{statusData?.opponent?.totalScore ?? 0}</div>
                </div>
            </Modal>

            <Modal
                title={roundSummary?.win ? "本题结束：猜中" : "本题结束：未猜中"}
                open={roundSummaryOpen}
                onCancel={() => setRoundSummaryOpen(false)}
                footer={
                    <div style={{ display: "flex", justifyContent: "center" }}>
                        <button className="modern-btn primary" type="button" onClick={() => setRoundSummaryOpen(false)}>
                            关闭
                        </button>
                    </div>
                }
                closable={false}
                className={`mh-end-modal theme-${themeStyle}`}
            >
                {roundSummary && (
                    <div className={`mh-end-modal-content theme-${themeStyle}`} style={{ lineHeight: 1.9 }}>
                        <div>题号：<b>第 {roundSummary.questionNo} 题</b></div>
                        <div>合法猜测次数：<b>{roundSummary.hitCountValid}</b></div>
                        <div>本题得分：<b>{roundSummary.score}</b></div>
                        <div>当前总分：<b>{roundSummary.totalScore}</b></div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
