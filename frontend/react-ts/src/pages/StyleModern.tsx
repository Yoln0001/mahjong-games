import React from "react";

export default function StyleModern() {
    return (
        <div className="modern-root">
            <style>{`
                :root {
                    --modern-bg: #f5f7f9;
                    --modern-panel: #ffffff;
                    --modern-ink: #0c1116;
                    --modern-ink-soft: rgba(12, 17, 22, 0.62);
                    --modern-accent: #0d6efd;
                    --modern-line: rgba(12, 17, 22, 0.08);
                    --modern-shadow: rgba(12, 17, 22, 0.08);
                }

                .modern-root {
                    min-height: 100vh;
                    background:
                        linear-gradient(180deg, rgba(13,110,253,0.05), transparent 30%),
                        var(--modern-bg);
                    color: var(--modern-ink);
                    font-family: "IBM Plex Sans", "Avenir", "Helvetica Neue", "PingFang SC", sans-serif;
                    padding: 28px 22px 48px;
                }

                .modern-shell {
                    max-width: 1180px;
                    margin: 0 auto;
                    display: grid;
                    gap: 18px;
                }

                .modern-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }

                .modern-title {
                    font-size: 30px;
                    margin: 0;
                    letter-spacing: 0.5px;
                }

                .modern-sub {
                    font-size: 13px;
                    color: var(--modern-ink-soft);
                }

                .modern-actions {
                    display: flex;
                    gap: 10px;
                }

                .modern-btn {
                    border: 1px solid var(--modern-line);
                    background: #fff;
                    border-radius: 10px;
                    padding: 10px 14px;
                    font-size: 13px;
                    cursor: pointer;
                }

                .modern-btn.primary {
                    background: var(--modern-accent);
                    color: #fff;
                    border-color: transparent;
                }

                .modern-grid {
                    display: grid;
                    grid-template-columns: 1.2fr 0.8fr;
                    gap: 18px;
                }

                .modern-panel {
                    background: var(--modern-panel);
                    border: 1px solid var(--modern-line);
                    border-radius: 16px;
                    padding: 16px;
                    box-shadow: 0 10px 24px var(--modern-shadow);
                }

                .modern-board {
                    display: grid;
                    grid-template-columns: repeat(17, 40px);
                    gap: 6px;
                    justify-content: center;
                }

                .modern-tile {
                    width: 40px;
                    height: 58px;
                    border-radius: 10px;
                    background: #fff;
                    border: 1px solid var(--modern-line);
                }

                .modern-stats {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                }

                .modern-stat {
                    border: 1px solid var(--modern-line);
                    border-radius: 12px;
                    padding: 10px;
                }

                .modern-stat h4 {
                    margin: 0 0 6px;
                    font-size: 12px;
                    color: var(--modern-ink-soft);
                }

                .modern-stat p {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                }

                .modern-slot {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                @media (max-width: 980px) {
                    .modern-grid {
                        grid-template-columns: 1fr;
                    }
                    .modern-board {
                        grid-template-columns: repeat(17, minmax(26px, 1fr));
                    }
                    .modern-tile {
                        width: 100%;
                    }
                }
            `}</style>

            <div className="modern-shell">
                <div className="modern-top">
                    <div>
                        <h1 className="modern-title">Link · Minimal</h1>
                        <div className="modern-sub">Modern, calm, structured. Focus on clarity.</div>
                    </div>
                    <div className="modern-actions">
                        <button className="modern-btn">Continue</button>
                        <button className="modern-btn primary">New Game</button>
                    </div>
                </div>

                <div className="modern-panel">
                    <div className="modern-stats">
                        <div className="modern-stat">
                            <h4>Temp Slots</h4>
                            <p>3 / 7</p>
                        </div>
                        <div className="modern-stat">
                            <h4>Remaining</h4>
                            <p>96</p>
                        </div>
                        <div className="modern-stat">
                            <h4>Status</h4>
                            <p>Active</p>
                        </div>
                    </div>
                </div>

                <div className="modern-grid">
                    <div className="modern-panel">
                        <div className="modern-board">
                            {Array.from({ length: 8 * 17 }).map((_, i) => (
                                <div key={i} className="modern-tile" />
                            ))}
                        </div>
                    </div>
                    <div className="modern-panel">
                        <h3 style={{ marginTop: 0 }}>Temp Slots</h3>
                        <div className="modern-slot">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <div key={i} className="modern-tile" />
                            ))}
                        </div>
                        <div style={{ marginTop: 16 }}>
                            <button className="modern-btn" style={{ width: "100%" }}>Reset</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
