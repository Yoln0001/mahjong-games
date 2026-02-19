import React, { createContext, useMemo, useState, useContext, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { ConfigProvider, theme as antdTheme, Modal, Space, Button } from "antd";
import type { ThemeConfig } from "antd";
import { SkinOutlined } from "@ant-design/icons";

import ModeSelect from "./pages/ModeSelect";
import Handle from "./pages/Handle";
import Link from "./pages/Link";
import Battle from "./pages/Battle";
import StyleWafuu from "./pages/StyleWafuu";
import StyleModern from "./pages/StyleModern";
import StyleArcade from "./pages/StyleArcade";
import StyleNoir from "./pages/StyleNoir";
import type { ThemeMode } from "./constants/tiles";

type ThemeModeCtx = {
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
};

type ThemeStyle = "modern" | "noir" | "wafuu" | "arcade";

type ThemeStyleCtx = {
  themeStyle: ThemeStyle;
  setThemeStyle: (s: ThemeStyle) => void;
};

const ThemeModeContext = createContext<ThemeModeCtx | null>(null);
const ThemeStyleContext = createContext<ThemeStyleCtx | null>(null);

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error("useThemeMode must be used within ThemeModeContext provider");
  return ctx;
}

export function useThemeStyle() {
  const ctx = useContext(ThemeStyleContext);
  if (!ctx) throw new Error("useThemeStyle must be used within ThemeStyleContext provider");
  return ctx;
}

const UI_STORAGE_KEY = "mahjong-handle:ui:v1";
const STYLE_STORAGE_KEY = "mahjong-handle:style:v1";

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

function loadThemeStyle(): ThemeStyle {
  try {
    const raw = localStorage.getItem(STYLE_STORAGE_KEY);
    if (!raw) return "modern";
    const obj = JSON.parse(raw);
    if (obj?.themeStyle === "noir") return "noir";
    if (obj?.themeStyle === "wafuu") return "wafuu";
    if (obj?.themeStyle === "arcade") return "arcade";
    return "modern";
  } catch {
    return "modern";
  }
}

function saveThemeStyle(themeStyle: ThemeStyle) {
  try {
    localStorage.setItem(STYLE_STORAGE_KEY, JSON.stringify({ themeStyle }));
  } catch {
    // ignore
  }
}

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  const [themeStyle, setThemeStyle] = useState<ThemeStyle>(() => loadThemeStyle());
  const [styleOpen, setStyleOpen] = useState(false);

  useEffect(() => {
    saveThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    saveThemeStyle(themeStyle);
  }, [themeStyle]);

  const themeConfig: ThemeConfig = useMemo(() => {
    return {
      algorithm: themeMode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    };
  }, [themeMode]);

  return (
    <ThemeModeContext.Provider value={{ themeMode, setThemeMode }}>
      <ThemeStyleContext.Provider value={{ themeStyle, setThemeStyle }}>
        <ConfigProvider theme={themeConfig}>
          <div className={`app-page ${themeMode === "dark" ? "app-page-dark" : "app-page-light"} theme-${themeStyle}`}>
            <header className="site-header">
            <div className="site-brand">
              <div className="site-logo" aria-hidden="true" />
              <div className="site-name">逻辑推理</div>
            </div>
            <div className="site-actions">
              <button className="icon-btn" type="button" aria-label="Theme Switch" onClick={() => setStyleOpen(true)}>
                <SkinOutlined />
              </button>
            </div>
          </header>

          {/* Router outlet */}
          <Routes>
            <Route path="/" element={<ModeSelect />} />
            <Route path="/handle/:gameId" element={<Handle />} />
            <Route path="/link/:gameId" element={<Link />} />
            <Route path="/battle" element={<Battle />} />
            <Route path="/battle/:matchId" element={<Battle />} />
            <Route path="/style/wafuu" element={<StyleWafuu />} />
            <Route path="/style/modern" element={<StyleModern />} />
            <Route path="/style/arcade" element={<StyleArcade />} />
            <Route path="/style/noir" element={<StyleNoir />} />
          </Routes>

          <footer className="site-footer footer-center">
            <div className="footer-right">
              <a
                className="footer-link"
                href="https://github.com/Yoln0001/mahjong-games"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
              <span className="footer-dot">·</span>
              <a
                className="footer-link"
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noreferrer"
              >
                浙ICP备2026008941号-1
              </a>
            </div>
          </footer>
          </div>

          <Modal
          title="主题样式"
          open={styleOpen}
          onCancel={() => setStyleOpen(false)}
          footer={null}
          closable={false}
          className={`theme-modal theme-${themeStyle}`}
          >
          <Space direction="vertical" style={{ width: "100%" }}>
            <button
              className={`modern-btn primary theme-option ${themeStyle === "modern" ? "active" : ""}`}
              type="button"
              onClick={() => {
                setThemeStyle("modern");
                setStyleOpen(false);
              }}
            >
              现代极简
            </button>
            <button
              className={`modern-btn primary theme-option ${themeStyle === "noir" ? "active" : ""}`}
              type="button"
              onClick={() => {
                setThemeStyle("noir");
                setStyleOpen(false);
              }}
            >
              黑色电影
            </button>
            <button
              className={`modern-btn primary theme-option ${themeStyle === "wafuu" ? "active" : ""}`}
              type="button"
              onClick={() => {
                setThemeStyle("wafuu");
                setStyleOpen(false);
              }}
            >
              日系和风
            </button>
            <button
              className={`modern-btn primary theme-option ${themeStyle === "arcade" ? "active" : ""}`}
              type="button"
              onClick={() => {
                setThemeStyle("arcade");
                setStyleOpen(false);
              }}
            >
              复古街机
            </button>
          </Space>
          </Modal>
        </ConfigProvider>
      </ThemeStyleContext.Provider>
    </ThemeModeContext.Provider>
  );
}
