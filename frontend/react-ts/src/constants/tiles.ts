/**
 * 全站唯一的麻将牌定义与映射模块
 *
 * 数据层：tileId（推荐）或 unicode（兼容）
 * 视图层：svgFilename（集中式映射）
 *
 * 你的字牌约定：
 * 1z=东,2z=南,3z=西,4z=北,5z=白,6z=发,7z=中
 */

export type Suit = "m" | "p" | "s" | "z";
export type TileId =
    | `${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}${"m" | "p" | "s"}`
    | `${1 | 2 | 3 | 4 | 5 | 6 | 7}z`;

export type ThemeMode = "light" | "dark";

/**
 * tileId -> SVG 文件名（集中式映射）
 * 你只需要维护这一份。
 *
 * 如果你的 SVG 文件名不同：
 * - 改这里即可，全站生效
 */
export const TILE_ID_TO_SVG: Record<TileId, string> = (() => {
    const map: Partial<Record<TileId, string>> = {};

    // 数牌：万/筒/索
    for (let i = 1 as const; i <= 9; i = (i + 1) as any) {
        map[`${i}m` as TileId] = `Man${i}.svg`;
        map[`${i}p` as TileId] = `Pin${i}.svg`;
        map[`${i}s` as TileId] = `Sou${i}.svg`;
    }

    // 字牌：东南西北白发中（按你的定义）
    map["1z"] = "Ton.svg";   // 东
    map["2z"] = "Nan.svg";   // 南
    map["3z"] = "Shaa.svg";  // 西（有的素材叫 Sha.svg 或 Shaa.svg）
    map["4z"] = "Pei.svg";   // 北
    map["5z"] = "Haku.svg";  // 白
    map["6z"] = "Hatsu.svg"; // 发
    map["7z"] = "Chun.svg";  // 中

    return map as Record<TileId, string>;
})();

/**
 * tileId -> Unicode Mahjong Tile
 * 用于兼容：你若在数据层存 Unicode，也能反向找到 tileId。
 */
export function tileIdToUnicode(tileId: TileId): string {
    const mps = tileId.match(/^([1-9])([mps])$/);
    if (mps) {
        const n = parseInt(mps[1], 10);
        const suit = mps[2];

        // Unicode Mahjong Tiles:
        // 1m..9m: U+1F007..U+1F00F (🀇..🀏)
        // 1s..9s: U+1F010..U+1F018 (🀐..🀘)
        // 1p..9p: U+1F019..U+1F021 (🀙..🀡)
        const base =
            suit === "m" ? 0x1f007 :
                suit === "s" ? 0x1f010 :
                    0x1f019; // p
        return String.fromCodePoint(base + (n - 1));
    }

    const hz = tileId.match(/^([1-7])z$/);
    if (hz) {
        const n = parseInt(hz[1], 10);
        // 你的字牌：东南西北白发中
        const map: Record<number, number> = {
            1: 0x1f000, // 🀀 东
            2: 0x1f001, // 🀁 南
            3: 0x1f002, // 🀂 西
            4: 0x1f003, // 🀃 北
            5: 0x1f006, // 🀆 白
            6: 0x1f005, // 🀅 发
            7: 0x1f004, // 🀄 中
        };
        return String.fromCodePoint(map[n] ?? 0x2753);
    }

    return "�";
}

/**
 * Unicode Mahjong Tile -> tileId
 * 如果传入不是麻将牌字符，返回 null。
 */
export function unicodeToTileId(ch: string): TileId | null {
    if (!ch) return null;
    const cp = ch.codePointAt(0);
    if (!cp) return null;

    // 万：🀇(1F007) .. 🀏(1F00F)
    if (cp >= 0x1f007 && cp <= 0x1f00f) {
        const n = cp - 0x1f007 + 1;
        return `${n}m` as TileId;
    }

    // 索：🀐(1F010) .. 🀘(1F018)
    if (cp >= 0x1f010 && cp <= 0x1f018) {
        const n = cp - 0x1f010 + 1;
        return `${n}s` as TileId;
    }

    // 筒：🀙(1F019) .. 🀡(1F021)
    if (cp >= 0x1f019 && cp <= 0x1f021) {
        const n = cp - 0x1f019 + 1;
        return `${n}p` as TileId;
    }

    // 字牌（按你的定义）
    const honorMap: Record<number, TileId> = {
        0x1f000: "1z", // 东
        0x1f001: "2z", // 南
        0x1f002: "3z", // 西
        0x1f003: "4z", // 北
        0x1f006: "5z", // 白
        0x1f005: "6z", // 发
        0x1f004: "7z", // 中
    };
    if (honorMap[cp]) return honorMap[cp];

    return null;
}

/**
 * 尝试把任意输入（tileId 或 Unicode）规范化为 tileId
 */
export function normalizeToTileId(input: string): TileId | null {
    const s = input.trim();
    if (!s) return null;

    // tileId 格式
    if (/^([1-9][mps]|[1-7]z)$/.test(s)) {
        return s as TileId;
    }

    // Unicode
    const byUnicode = unicodeToTileId(s);
    if (byUnicode) return byUnicode;

    return null;
}

/**
 * 根据主题模式与 tileId 计算 SVG URL
 * 要求你的静态资源位于：
 * public/tiles/{light|dark}/{svgFilename}
 */
export function tileIdToSvgUrl(tileId: TileId, mode: ThemeMode): string {
    const filename = TILE_ID_TO_SVG[tileId];
    return `/tiles/${mode}/${filename}`;
}
