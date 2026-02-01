/**
 * 将牌码转换为 Unicode 麻将牌字符
 *
 * 牌码约定：
 * - 数牌：1m-9m（万）、1p-9p（筒）、1s-9s（索）
 * - 字牌：1z=东,2z=南,3z=西,4z=北,5z=白,6z=发,7z=中
 */
export function tileCodeToUnicode(code: string): string {
    const c = code.trim().toLowerCase();

    // number tiles: 1-9 + (m|p|s)
    const mps = c.match(/^([1-9])([mps])$/);
    if (mps) {
        const n = parseInt(mps[1], 10);
        const suit = mps[2];

        /**
         * Unicode Mahjong Tiles:
         * - 1m..9m: U+1F007..U+1F00F (🀇..🀏)
         * - 1s..9s: U+1F010..U+1F018 (🀐..🀘)
         * - 1p..9p: U+1F019..U+1F021 (🀙..🀡)
         */
        const base =
            suit === "m"
                ? 0x1f007
                : suit === "s"
                    ? 0x1f010
                    : 0x1f019; // suit === "p"
        return String.fromCodePoint(base + (n - 1));
    }

    // honors: 1-7 + z
    const hz = c.match(/^([1-7])z$/);
    if (hz) {
        const n = parseInt(hz[1], 10);

        /**
         * honors mapping (per your project):
         * 1z=东 🀀 U+1F000
         * 2z=南 🀁 U+1F001
         * 3z=西 🀂 U+1F002
         * 4z=北 🀃 U+1F003
         * 5z=白 🀆 U+1F006
         * 6z=发 🀅 U+1F005
         * 7z=中 🀄 U+1F004
         */
        const map: Record<number, number> = {
            1: 0x1f000, // 🀀 East
            2: 0x1f001, // 🀁 South
            3: 0x1f002, // 🀂 West
            4: 0x1f003, // 🀃 North
            5: 0x1f006, // 🀆 White
            6: 0x1f005, // 🀅 Green (發)
            7: 0x1f004, // 🀄 Red (中)
        };

        return String.fromCodePoint(map[n] ?? 0x2753); // ❓
    }

    // fallback
    return "�";
}

/**
 * 可选：把一串牌码解析成数组（极简版）
 * 例："1m 2m 3m 4p 5p 6p 7s 8s 9s 1z 2z 3z 4z 5z"
 */
export function parseTileCodes(input: string): string[] {
    return input
        .trim()
        .split(/\s+/)
        .filter(Boolean);
}
