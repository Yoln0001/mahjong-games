import React, { createContext, useMemo, useState, useContext, useEffect } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import type { ThemeConfig } from "antd";
import Game from "./pages/Game";
import { ThemeMode } from "./constants/tiles";

type ThemeModeCtx = {
    themeMode: ThemeMode;
    setThemeMode: (m: ThemeMode) => void;
};

const ThemeModeContext = createContext<ThemeModeCtx | null>(null);

export function useThemeMode() {
    const ctx = useContext(ThemeModeContext);
    if (!ctx) throw new Error("useThemeMode must be used within ThemeModeContext provider");
    return ctx;
}

const UI_STORAGE_KEY = "mahjong-handle:ui:v1";

function loadThemeMode(): ThemeMode {
    try {
        const raw = localStorage.getItem(UI_STORAGE_KEY);
        if (!raw) return "light";
        const obj = JSON.parse(raw);
        return obj?.themeMode === "dark" ? "dark" : "light";
    } catch {
        return "light";
    }
}

function saveThemeMode(themeMode: ThemeMode) {
    try {
        localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({ themeMode }));
    } catch {
        // ignore
    }
}

export default function App() {
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());

    useEffect(() => {
        saveThemeMode(themeMode);
    }, [themeMode]);

    const themeConfig: ThemeConfig = useMemo(() => {
        return {
            algorithm:
                themeMode === "dark"
                    ? antdTheme.darkAlgorithm
                    : antdTheme.defaultAlgorithm,
        };
    }, [themeMode]);

    return (
        <ThemeModeContext.Provider value={{ themeMode, setThemeMode }}>
            <ConfigProvider theme={themeConfig}>
                <div className={`app-page ${themeMode === "dark" ? "app-page-dark" : "app-page-light"}`}>
                    <Game />
                </div>
            </ConfigProvider>
        </ThemeModeContext.Provider>
    );
}
