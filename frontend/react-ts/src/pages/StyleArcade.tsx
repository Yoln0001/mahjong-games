import React from "react";

export default function StyleArcade() {
    return (
        <div className="arcade-root">
            <style>{`
                :root {
                    --arcade-bg: #0a0a12;
                    --arcade-neon: #36f9ff;
                    --arcade-pink: #ff4fd8;
                    --arcade-green: #7cff6b;
                    --arcade-yellow: #ffe45e;
                    --arcade-panel: rgba(18, 18, 34, 0.9);
                }

                .arcade-root {
                    min-height: 100vh;
                    background:
                        radial-gradient(800px 500px at 20% 20%, rgba(54, 249, 255, 0.18), transparent 60%),
                        radial-gradient(900px 600px at 80% 70%, rgba(255, 79, 216, 0.15), transparent 60%),
                        repeating-linear-gradient(0deg, rgba(255,255,255,0.03), rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px),
                        var(--arcade-bg);
                    color: #f6f6ff;
                    font-family: "Press Start 2P", "JetBrains Mono", "Noto Sans SC", monospace;
                    padding: 26px 20px 40px;
                }

                .arcade-shell {
                    max-width: 1150px;
                    margin: 0 auto;
                    display: grid;
                    gap: 16px;
                }

                .arcade-title {
                    font-size: 20px;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    margin: 0;
                }

                .arcade-sub {
                    font-size: 11px;
                    color: rgba(246,246,255,0.7);
                }

                .arcade-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .arcade-btn {
                    border: 2px solid var(--arcade-neon);
                    background: transparent;
                    color: var(--arcade-neon);
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 10px;
                    cursor: pointer;
                    box-shadow: 0 0 12px rgba(54, 249, 255, 0.4);
                }

                .arcade-btn.pink {
                    border-color: var(--arcade-pink);
                    color: var(--arcade-pink);
                    box-shadow: 0 0 12px rgba(255, 79, 216, 0.4);
                }

                .arcade-grid {
                    display: grid;
                    grid-template-columns: 1.2fr 0.8fr;
                    gap: 16px;
                }

                .arcade-panel {
                    background: var(--arcade-panel);
                    border: 2px solid rgba(54, 249, 255, 0.5);
                    border-radius: 14px;
                    padding: 14px;
                    box-shadow: 0 0 18px rgba(54, 249, 255, 0.3);
                }

                .arcade-board {
                    display: grid;
                    grid-template-columns: repeat(17, 38px);
                    gap: 5px;
                    justify-content: center;
                }

                .arcade-tile {
                    width: 38px;
                    height: 54px;
                    border-radius: 8px;
                    background: #101420;
                    border: 1px solid rgba(255,255,255,0.2);
                    box-shadow: inset 0 0 8px rgba(54, 249, 255, 0.2);
                }

                .arcade-slot {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                @media (max-width: 980px) {
                    .arcade-grid {
                        grid-template-columns: 1fr;
                    }
                    .arcade-board {
                        grid-template-columns: repeat(17, minmax(26px, 1fr));
                    }
                    .arcade-tile {
                        width: 100%;
                    }
                }
            `}</style>

            <div className="arcade-shell">
                <div className="arcade-bar">
                    <div>
                        <h1 className="arcade-title">Link Arcade</h1>
                        <div className="arcade-sub">Retro neon · 8x17 grid · chain the pairs</div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <button className="arcade-btn">Continue</button>
                        <button className="arcade-btn pink">New Game</button>
                    </div>
                </div>

                <div className="arcade-grid">
                    <div className="arcade-panel">
                        <div className="arcade-board">
                            {Array.from({ length: 8 * 17 }).map((_, i) => (
                                <div key={i} className="arcade-tile" />
                            ))}
                        </div>
                    </div>
                    <div className="arcade-panel">
                        <h3 style={{ marginTop: 0, fontSize: 12 }}>Temp Slots</h3>
                        <div className="arcade-slot">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <div key={i} className="arcade-tile" />
                            ))}
                        </div>
                        <div style={{ marginTop: 16 }}>
                            <button className="arcade-btn" style={{ width: "100%" }}>Reset</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
