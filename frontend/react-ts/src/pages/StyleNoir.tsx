import React from "react";

export default function StyleNoir() {
    return (
        <div className="noir-root">
            <style>{`
                :root {
                    --noir-bg: #0c0e14;
                    --noir-panel: rgba(18, 22, 32, 0.92);
                    --noir-ink: #e8edf2;
                    --noir-ink-soft: rgba(232, 237, 242, 0.6);
                    --noir-line: rgba(232, 237, 242, 0.12);
                    --noir-accent: #9ad0ff;
                    --noir-shadow: rgba(0, 0, 0, 0.45);
                }

                .noir-root {
                    min-height: 100vh;
                    background:
                        radial-gradient(900px 500px at 20% 20%, rgba(154, 208, 255, 0.12), transparent 60%),
                        radial-gradient(800px 500px at 80% 70%, rgba(255, 255, 255, 0.08), transparent 60%),
                        linear-gradient(180deg, rgba(255,255,255,0.04), transparent 25%),
                        var(--noir-bg);
                    color: var(--noir-ink);
                    font-family: "Manrope", "SF Pro Display", "PingFang SC", sans-serif;
                    padding: 30px 22px 50px;
                }

                .noir-shell {
                    max-width: 1180px;
                    margin: 0 auto;
                    display: grid;
                    gap: 18px;
                }

                .noir-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                }

                .noir-title {
                    margin: 0;
                    font-size: 28px;
                    letter-spacing: 0.8px;
                }

                .noir-sub {
                    color: var(--noir-ink-soft);
                    font-size: 13px;
                }

                .noir-btn {
                    background: transparent;
                    color: var(--noir-ink);
                    border: 1px solid var(--noir-line);
                    border-radius: 12px;
                    padding: 10px 14px;
                    font-size: 13px;
                    cursor: pointer;
                }

                .noir-btn.primary {
                    background: var(--noir-accent);
                    color: #0c0e14;
                    border-color: transparent;
                }

                .noir-grid {
                    display: grid;
                    grid-template-columns: 1.25fr 0.75fr;
                    gap: 18px;
                }

                .noir-panel {
                    background: var(--noir-panel);
                    border: 1px solid var(--noir-line);
                    border-radius: 18px;
                    padding: 16px;
                    box-shadow: 0 16px 40px var(--noir-shadow);
                }

                .noir-board {
                    display: grid;
                    grid-template-columns: repeat(17, 40px);
                    gap: 6px;
                    justify-content: center;
                }

                .noir-tile {
                    width: 40px;
                    height: 58px;
                    border-radius: 10px;
                    background: rgba(255, 255, 255, 0.06);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    box-shadow: inset 0 0 10px rgba(0,0,0,0.35);
                }

                .noir-stat {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                }

                .noir-stat-card {
                    border: 1px solid var(--noir-line);
                    border-radius: 12px;
                    padding: 12px;
                }

                .noir-stat-card h4 {
                    margin: 0 0 6px;
                    font-size: 12px;
                    color: var(--noir-ink-soft);
                }

                .noir-stat-card p {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                }

                .noir-slot {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                @media (max-width: 980px) {
                    .noir-grid {
                        grid-template-columns: 1fr;
                    }
                    .noir-board {
                        grid-template-columns: repeat(17, minmax(26px, 1fr));
                    }
                    .noir-tile {
                        width: 100%;
                    }
                }
            `}</style>

            <div className="noir-shell">
                <div className="noir-header">
                    <div>
                        <h1 className="noir-title">Link · Noir</h1>
                        <div className="noir-sub">Dark luxury, low noise, high focus.</div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <button className="noir-btn">Continue</button>
                        <button className="noir-btn primary">New Game</button>
                    </div>
                </div>

                <div className="noir-panel">
                    <div className="noir-stat">
                        <div className="noir-stat-card">
                            <h4>Temp Slots</h4>
                            <p>2 / 7</p>
                        </div>
                        <div className="noir-stat-card">
                            <h4>Remaining</h4>
                            <p>88</p>
                        </div>
                        <div className="noir-stat-card">
                            <h4>Status</h4>
                            <p>Active</p>
                        </div>
                    </div>
                </div>

                <div className="noir-grid">
                    <div className="noir-panel">
                        <div className="noir-board">
                            {Array.from({ length: 8 * 17 }).map((_, i) => (
                                <div key={i} className="noir-tile" />
                            ))}
                        </div>
                    </div>
                    <div className="noir-panel">
                        <h3 style={{ marginTop: 0 }}>Temp Slots</h3>
                        <div className="noir-slot">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <div key={i} className="noir-tile" />
                            ))}
                        </div>
                        <div style={{ marginTop: 16 }}>
                            <button className="noir-btn" style={{ width: "100%" }}>Reset</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
