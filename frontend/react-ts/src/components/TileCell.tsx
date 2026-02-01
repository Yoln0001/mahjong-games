import React from "react";
import TileView from "./TileView";
import { ThemeMode } from "../constants/tiles";

export type CellStatus = "blue" | "orange" | "gray" | "empty";

export interface TileCellProps {
    tile: string;         // tileId 或 Unicode
    status: CellStatus;   // 后端判色：blue/orange/gray；空格：empty
    themeMode: ThemeMode;
    size?: number;
}

export default function TileCell({ tile, status, themeMode, size = 40 }: TileCellProps) {
    return (
        <div className={`tile-cell tile-cell-${status}`}>
            <TileView tile={tile} themeMode={themeMode} size={size} />
        </div>
    );
}
