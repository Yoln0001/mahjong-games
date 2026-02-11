import React from "react";

export default function StyleWafuu() {
    return (
        <div className="wafuu-root">
            <style>{`
                :root {
                    --wafuu-ink: #151515;
                    --wafuu-ink-soft: rgba(21, 21, 21, 0.72);
                    --wafuu-paper: #f6f1e8;
                    --wafuu-paper-deep: #efe7da;
                    --wafuu-red: #b31e1e;
                    --wafuu-indigo: #1b2a41;
                    --wafuu-gold: #c8a05a;
                    --wafuu-shadow: rgba(0, 0, 0, 0.18);
                }

                .wafuu-root {
                    min-height: 100vh;
                    color: var(--wafuu-ink);
                    background:
                        radial-gradient(1200px 700px at 70% 10%, rgba(200, 160, 90, 0.12), transparent 60%),
                        radial-gradient(900px 500px at 15% 80%, rgba(27, 42, 65, 0.10), transparent 60%),
                        repeating-linear-gradient(
                            0deg,
                            rgba(0,0,0,0.02),
                            rgba(0,0,0,0.02) 2px,
                            transparent 2px,
                            transparent 6px
                        ),
                        var(--wafuu-paper);
                    font-family: "Songti SC", "Noto Serif SC", "Source Han Serif SC", "STSong", serif;
                    padding: 32px 22px 48px;
                }

                .wafuu-shell {
                    max-width: 1100px;
                    margin: 0 auto;
                    display: grid;
                    gap: 20px;
                }

                .wafuu-hero {
                    display: grid;
                    grid-template-columns: 1.1fr 0.9fr;
                    gap: 18px;
                    background: linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.45));
                    border: 1px solid rgba(0,0,0,0.08);
                    border-radius: 18px;
                    padding: 24px;
                    box-shadow: 0 14px 30px var(--wafuu-shadow);
                }

                .wafuu-title {
                    font-size: 36px;
                    letter-spacing: 2px;
                    margin: 0 0 10px;
                }

                .wafuu-subtitle {
                    font-size: 15px;
                    color: var(--wafuu-ink-soft);
                    line-height: 1.8;
                    margin: 0 0 18px;
                }

                .wafuu-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 12px;
                    border-radius: 999px;
                    background: rgba(179, 30, 30, 0.10);
                    color: var(--wafuu-red);
                    font-weight: 600;
                    font-size: 12px;
                    letter-spacing: 1px;
                }

                .wafuu-cta {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .wafuu-btn {
                    border: 1px solid rgba(0,0,0,0.16);
                    background: #fff8ef;
                    padding: 10px 18px;
                    border-radius: 12px;
                    font-size: 14px;
                    cursor: pointer;
                    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.5);
                }

                .wafuu-btn.primary {
                    background: var(--wafuu-red);
                    color: #fff;
                    border-color: transparent;
                }

                .wafuu-panel {
                    background: rgba(255,255,255,0.7);
                    border-radius: 16px;
                    border: 1px solid rgba(0,0,0,0.08);
                    padding: 18px;
                }

                .wafuu-stats {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                }

                .wafuu-stat {
                    background: var(--wafuu-paper-deep);
                    border-radius: 14px;
                    padding: 14px;
                    border: 1px solid rgba(0,0,0,0.06);
                }

                .wafuu-stat h4 {
                    margin: 0 0 6px;
                    font-size: 13px;
                    color: var(--wafuu-ink-soft);
                }

                .wafuu-stat p {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 600;
                }

                .wafuu-grid {
                    display: grid;
                    grid-template-columns: 1.2fr 0.8fr;
                    gap: 18px;
                }

                .wafuu-board {
                    background: #fdf8f0;
                    border-radius: 18px;
                    border: 1px solid rgba(0,0,0,0.08);
                    padding: 16px;
                    display: grid;
                    grid-template-columns: repeat(17, 40px);
                    gap: 6px;
                    justify-content: center;
                }

                .wafuu-tile {
                    width: 40px;
                    height: 58px;
                    border-radius: 10px;
                    background: #fff;
                    border: 1px solid rgba(0,0,0,0.08);
                    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
                }

                .wafuu-side {
                    display: grid;
                    gap: 12px;
                }

                .wafuu-side h3 {
                    margin: 0 0 8px;
                    font-size: 16px;
                }

                .wafuu-slot {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .wafuu-slot .wafuu-tile {
                    background: #faf5ec;
                }

                .wafuu-footer {
                    text-align: center;
                    font-size: 12px;
                    color: var(--wafuu-ink-soft);
                }

                @media (max-width: 980px) {
                    .wafuu-hero, .wafuu-grid {
                        grid-template-columns: 1fr;
                    }
                    .wafuu-board {
                        grid-template-columns: repeat(17, minmax(26px, 1fr));
                    }
                    .wafuu-tile {
                        width: 100%;
                    }
                }
            `}</style>

            <div className="wafuu-shell">
                <section className="wafuu-hero">
                    <div>
                        <div className="wafuu-pill">和风沉浸 · Prototype</div>
                        <h1 className="wafuu-title">连连看 · 雪月花</h1>
                        <p className="wafuu-subtitle">
                            以宣纸与墨为基调，微光金线铺底。牌面保持清晰，界面收敛，
                            让注意力回到推理与节奏。
                        </p>
                        <div className="wafuu-cta">
                            <button className="wafuu-btn primary">开始新局</button>
                            <button className="wafuu-btn">继续上局</button>
                            <button className="wafuu-btn">玩法说明</button>
                        </div>
                    </div>
                    <div className="wafuu-panel">
                        <div className="wafuu-stats">
                            <div className="wafuu-stat">
                                <h4>临时格子</h4>
                                <p>2 / 7</p>
                            </div>
                            <div className="wafuu-stat">
                                <h4>剩余牌</h4>
                                <p>104</p>
                            </div>
                            <div className="wafuu-stat">
                                <h4>状态</h4>
                                <p>进行中</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="wafuu-grid">
                    <div className="wafuu-board" aria-label="board">
                        {Array.from({ length: 8 * 17 }).map((_, i) => (
                            <div key={i} className="wafuu-tile" />
                        ))}
                    </div>
                    <div className="wafuu-side">
                        <div className="wafuu-panel">
                            <h3>临时格子</h3>
                            <div className="wafuu-slot">
                                {Array.from({ length: 7 }).map((_, i) => (
                                    <div key={i} className="wafuu-tile" />
                                ))}
                            </div>
                        </div>
                        <div className="wafuu-panel">
                            <h3>操作</h3>
                            <div className="wafuu-cta">
                                <button className="wafuu-btn">撤销一步</button>
                                <button className="wafuu-btn">重开</button>
                                <button className="wafuu-btn">返回</button>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="wafuu-footer">Prototype: Wafuu Immersive Theme</div>
            </div>
        </div>
    );
}
