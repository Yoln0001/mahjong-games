import React from "react";
import TileView from "./TileView";
import type { ThemeMode } from "../constants/tiles";

export type CellStatus = "blue" | "orange" | "gray" | "empty";

export interface TileCellProps {
    tile: string;         // tileId 或 Unicode
    status: CellStatus;   // 后端配色：blue/orange/gray；空格：empty
    themeMode: ThemeMode;
    size?: number;
    className?: string;   // 允许外部追加样式类
    style?: React.CSSProperties; // 允许外部传入内联样式
}

export default function TileCell({
    tile,
    status,
    themeMode,
    size = 40,
    className,
    style,
}: TileCellProps) {
    return (
        <div className={`tile-cell tile-cell-${status} ${className ?? ""}`.trim()} style={style}>
            <TileView tile={tile} themeMode={themeMode} size={size} />
        </div>
    );
}
