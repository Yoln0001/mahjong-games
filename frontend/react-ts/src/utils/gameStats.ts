export type GameType = "handle" | "link";

type StatsBucket = {
    played: number;
    wins: number;
    bestWinSec: number | null;
};

type StatsStoreV2 = {
    v: 2;
    totalByGame: Record<GameType, StatsBucket>;
    recorded: Record<string, 1>;
};

export type GameStatsSnapshot = {
    total: StatsBucket;
};

const STATS_KEY = "mahjong:stats:v1";

const emptyBucket = (): StatsBucket => ({
    played: 0,
    wins: 0,
    bestWinSec: null,
});

const emptyStore = (): StatsStoreV2 => ({
    v: 2,
    totalByGame: {
        handle: emptyBucket(),
        link: emptyBucket(),
    },
    recorded: {},
});

function normalizeBucket(raw: any): StatsBucket {
    const played = Number(raw?.played ?? 0);
    const wins = Number(raw?.wins ?? 0);
    const bestRaw = raw?.bestWinSec;
    const bestWinSec =
        typeof bestRaw === "number" && Number.isFinite(bestRaw) && bestRaw >= 0 ? bestRaw : null;
    return {
        played: played > 0 ? Math.floor(played) : 0,
        wins: wins > 0 ? Math.floor(wins) : 0,
        bestWinSec,
    };
}

function loadStore(): StatsStoreV2 {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return emptyStore();

        const parsed = JSON.parse(raw) as any;
        // 旧结构（跨游戏混算）直接丢弃，避免污染新统计。
        if (!parsed || parsed.v !== 2) return emptyStore();

        const recordedRaw = parsed.recorded && typeof parsed.recorded === "object" ? parsed.recorded : {};
        const recorded: Record<string, 1> = {};
        for (const k of Object.keys(recordedRaw)) recorded[k] = 1;

        return {
            v: 2,
            totalByGame: {
                handle: normalizeBucket(parsed.totalByGame?.handle),
                link: normalizeBucket(parsed.totalByGame?.link),
            },
            recorded,
        };
    } catch {
        return emptyStore();
    }
}

function saveStore(store: StatsStoreV2): void {
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(store));
    } catch {
        // ignore
    }
}

function applyResult(bucket: StatsBucket, win: boolean, durationSec: number): StatsBucket {
    const next: StatsBucket = {
        played: bucket.played + 1,
        wins: bucket.wins + (win ? 1 : 0),
        bestWinSec: bucket.bestWinSec,
    };
    if (win) {
        const sec = Math.max(0, Math.floor(durationSec));
        if (next.bestWinSec == null || sec < next.bestWinSec) {
            next.bestWinSec = sec;
        }
    }
    return next;
}

export function recordGameFinished(params: {
    gameType: GameType;
    gameId: string;
    win: boolean;
    durationSec: number;
}): void {
    const gameId = String(params.gameId || "").trim();
    if (!gameId) return;

    const store = loadStore();
    const dedupeKey = `${params.gameType}:${gameId}`;
    if (store.recorded[dedupeKey]) return;

    const current = store.totalByGame[params.gameType] ?? emptyBucket();
    store.totalByGame[params.gameType] = applyResult(current, params.win, params.durationSec);
    store.recorded[dedupeKey] = 1;
    saveStore(store);
}

export function readGameStats(gameType: GameType): GameStatsSnapshot {
    const store = loadStore();
    return {
        total: store.totalByGame[gameType] ?? emptyBucket(),
    };
}

export function calcWinRate(played: number, wins: number): string {
    if (!played) return "0%";
    return `${((wins / played) * 100).toFixed(1)}%`;
}

export function formatBestSec(bestWinSec: number | null): string {
    if (bestWinSec == null) return "--";
    const s = Math.max(0, Math.floor(bestWinSec));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
