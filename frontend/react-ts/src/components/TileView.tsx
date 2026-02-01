import React, { useMemo } from "react";
import { normalizeToTileId, ThemeMode, tileIdToSvgUrl, tileIdToUnicode, TileId } from "../constants/tiles";

export type TileRenderMode = "svg" | "unicode"; // 将来你换 PNG/Canvas 也可在这里扩展

export interface TileViewProps {
    tile: string;                 // tileId（如 1m/7z）或 Unicode（如 🀄）
    themeMode: ThemeMode;         // light/dark
    size?: number;                // 牌宽（px）
    renderMode?: TileRenderMode;  // 默认 svg
    alt?: string;
    className?: string;
}

/**
 * TileView：全站唯一的牌面渲染出口
 * - 输入：tile（tileId 或 Unicode）
 * - 输出：SVG（默认）或 Unicode（fallback）
 */
export default function TileView(props: TileViewProps) {
    const {
        tile,
        themeMode,
        size = 40,
        renderMode = "svg",
        alt,
        className,
    } = props;

    const normalized = useMemo(() => normalizeToTileId(tile), [tile]);

    const unicode = useMemo(() => {
        if (!normalized) return tile; // 非麻将牌时直接返回原字符
        return tileIdToUnicode(normalized);
    }, [normalized, tile]);

    const svgUrl = useMemo(() => {
        if (!normalized) return null;
        return tileIdToSvgUrl(normalized as TileId, themeMode);
    }, [normalized, themeMode]);

    // 统一牌容器尺寸：建议高度略大于宽度
    const style: React.CSSProperties = {
        width: size,
        height: Math.round(size * 1.3),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
    };

    if (renderMode === "svg" && svgUrl) {
        return (
            <span className={className} style={style} title={normalized ?? tile}>
        <img
            src={svgUrl}
            alt={alt ?? normalized ?? tile}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            loading="lazy"
        />
      </span>
        );
    }

    // fallback：unicode（解决素材缺失或你临时不想带 SVG）
    return (
        <span className={className} style={style} title={normalized ?? tile}>
      <span className="tile-unicode">{unicode}</span>
    </span>
    );
}
