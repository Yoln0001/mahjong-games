/**
 * 灏嗙墝鐮佽浆鎹负 Unicode 楹诲皢鐗屽瓧绗?
 *
 * 鐗岀爜绾﹀畾锛?
 * - 鏁扮墝锛?m-9m锛堜竾锛夈€?p-9p锛堢瓛锛夈€?s-9s锛堢储锛?
 * - 瀛楃墝锛?z=涓?2z=鍗?3z=瑗?4z=鍖?5z=鐧?6z=鍙?7z=涓?
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
         * - 1m..9m: U+1F007..U+1F00F (馃€?.馃€?
         * - 1s..9s: U+1F010..U+1F018 (馃€?.馃€?
         * - 1p..9p: U+1F019..U+1F021 (馃€?.馃€?
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
         * 1z=涓?馃€€ U+1F000
         * 2z=鍗?馃€?U+1F001
         * 3z=瑗?馃€?U+1F002
         * 4z=鍖?馃€?U+1F003
         * 5z=鐧?馃€?U+1F006
         * 6z=鍙?馃€?U+1F005
         * 7z=涓?馃€?U+1F004
         */
        const map: Record<number, number> = {
            1: 0x1f000, // 馃€€ East
            2: 0x1f001, // 馃€?South
            3: 0x1f002, // 馃€?West
            4: 0x1f003, // 馃€?North
            5: 0x1f006, // 馃€?White
            6: 0x1f005, // 馃€?Green (鐧?
            7: 0x1f004, // 馃€?Red (涓?
        };

        return String.fromCodePoint(map[n] ?? 0x2753); // 鉂?
    }

    // fallback
    return "锟?;
}

/**
 * 鍙€夛細鎶婁竴涓茬墝鐮佽В鏋愭垚鏁扮粍锛堟瀬绠€鐗堬級
 * 渚嬶細"1m 2m 3m 4p 5p 6p 7s 8s 9s 1z 2z 3z 4z 5z"
 */
export function parseTileCodes(input: string): string[] {
    return input
        .trim()
        .split(/\s+/)
        .filter(Boolean);
}
