# _*_ coding : utf-8 _*_
# @Time : 2026/1/21 22:39
# @Author : Yoln
# @File : domain
# @Project : mahjong-handle-web
# backend/app/domain.py
from __future__ import annotations

import re
import uuid
import time
import random
import linecache
import math
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Optional, Tuple, Literal

from mahjong.tile import TilesConverter as TC
from mahjong.hand_calculating.hand import HandCalculator
from mahjong.hand_calculating.hand_config import HandConfig
from MahjongGB import MahjongFanCalculator

# -------------------------
# 计分规则（最终版）
# -------------------------

def calc_F(g: float) -> float:
    """
    F = exp(-0.3 * (g - 1))
    """
    return math.exp(-0.3 * (g - 1))


def calc_G(t: float) -> float:
    """
    G = 1 / (1 + 0.005 * max(0, t - 30))
    t: seconds
    """
    return 1.0 / (1.0 + 0.005 * max(0.0, t - 30.0))


def calc_score(*, g: int, t: float, win: bool) -> int:
    """
    score = int(1500 * (0.9 * F + 0.1 * G) * (0.6 + 0.4 * (F * G)) * H)

    - g: 合法提交次数（hit_count_valid）
    - t: 用时秒数（结算时刻 - game.created_at）
    - win: 是否胜利；失败直接为 0
    """
    H = 1.0 if win else 0.0
    if H == 0.0:
        return 0

    F = calc_F(float(g))
    G = calc_G(float(t))
    score = 1500.0 * (0.9 * F + 0.1 * G) * (0.6 + 0.4 * (F * G)) * H

    # 使用 int(...) 以保持向下取整语义
    return int(score)



# 役种罗马音到中文的映射表
YakuJapanese2ChineseMap = {
    "Aka Dora": "赤宝牌",
    "Chankan": "抢杠",
    "Chantai": "混全带幺九",
    "Chiitoitsu": "七对子",
    "Chinitsu": "清一色",
    "Dora": "宝牌",
    "Double Riichi": "两立直",
    "Haitei Raoyue": "海底捞月",
    "Honitsu": "混一色",
    "Honroutou": "混老头",
    "Houtei Raoyui": "河底捞鱼",
    "Iipeiko": "一杯口",
    "Ippatsu": "一发",
    "Ittsu": "一气通贯",
    "Junchan": "纯全带幺九",
    "Menzen Tsumo": "门前清自摸和",
    "Nagashi Mangan": "流局满贯",
    "Pinfu": "平和",
    "Renhou": "人和（非役满）",
    "Riichi": "立直",
    "Rinshan Kaihou": "岭上开花",
    "Ryanpeikou": "两杯口",
    "San Ankou": "三暗刻",
    "San Kantsu": "三杠子",
    "Sanshoku Doujun": "三色同顺",
    "Sanshoku Doukou": "三色同刻",
    "Shou Sangen": "小三元",
    "Tanyao": "断幺九",
    "Toitoi": "对对和",
    "Yakuhai (chun)": "役牌中",
    "Yakuhai (east)": "役牌东",
    "Yakuhai (haku)": "役牌白",
    "Yakuhai (hatsu)": "役牌发",
    "Yakuhai (north)": "役牌北",
    "Yakuhai (south)": "役牌南",
    "Yakuhai (west)": "役牌西",
    "Yakuhai (wind of place)": "自风役牌",
    "Yakuhai (wind of round)": "场风役牌",
    "Chiihou": "地和",
    "Chinroutou": "清老头",
    "Chuuren Poutou": "九莲宝灯",
    "Daburu Chuuren Poutou": "纯正九莲宝灯",
    "Dai Suushii": "大四喜",
    "Daisangen": "大三元",
    "Daisharin": "大数邻",
    "Kokushi Musou": "国士无双",
    "Kokushi Musou Juusanmen Matchi": "国士无双十三面",
    "Renhou (yakuman)": "人和（役满）",
    "Ryuuiisou": "绿一色",
    "Shousuushii": "小四喜",
    "Suu Ankou": "四暗刻",
    "Suu Ankou Tanki": "四暗刻单骑",
    "Suu Kantsu": "四杠子",
    "Tenhou": "天和",
    "Tsuu Iisou": "字一色"
}


def format_split_hand(hand_13: str) -> List[str]:
    """
    把 13 张（不含最后和牌）拆成 ['1m','2m',...] 形式。
    """
    split_start = 0
    result = ""
    for index, ch in enumerate(hand_13):
        if ch == "m":
            result += "m".join(hand_13[split_start:index]) + "m"
            split_start = index + 1
        if ch == "p":
            result += "p".join(hand_13[split_start:index]) + "p"
            split_start = index + 1
        if ch == "s":
            result += "s".join(hand_13[split_start:index]) + "s"
            split_start = index + 1
        if ch == "z" or ch == "h":
            result += "z".join(hand_13[split_start:index]) + "z"
            split_start = index + 1
    return [result[i * 2: i * 2 + 2] for i in range(int(len(result) / 2))]


def expand_compact_hand_tiles(hand_text: str) -> List[str]:
    """
    将紧凑编码展开为逐张牌编码。

    示例：
    123m456p789s11555z -> ['1m','2m','3m',...,'5z','5z','5z']
    """
    digits = ""
    tiles: List[str] = []

    for ch in hand_text:
        if ch.isdigit():
            digits += ch
            continue

        if ch not in ("m", "p", "s", "z"):
            raise ValueError("INVALID_CHAR")

        if not digits:
            raise ValueError("SUIT_WITHOUT_DIGIT")

        tiles.extend([f"{d}{ch}" for d in digits])
        digits = ""

    if digits:
        raise ValueError("TRAILING_DIGITS")

    return tiles


Color = Literal["blue", "orange", "gray"]
RuleMode = Literal["normal", "riichi", "guobiao"]


def handle_colors(answer_tiles_14: List[str], guess_tiles_14: List[str]) -> List[Color]:
    """
    14 张一起判色：先蓝后黄，修复重复牌。
    """
    remain = defaultdict(int)
    for t in answer_tiles_14:
        remain[t] += 1

    colors: List[Optional[Color]] = [None] * 14

    for i in range(14):
        if guess_tiles_14[i] == answer_tiles_14[i] and remain[guess_tiles_14[i]] > 0:
            colors[i] = "blue"
            remain[guess_tiles_14[i]] -= 1

    for i in range(14):
        if colors[i] is not None:
            continue
        t = guess_tiles_14[i]
        if remain.get(t, 0) > 0:
            colors[i] = "orange"
            remain[t] -= 1
        else:
            colors[i] = "gray"

    return [c for c in colors if c is not None]  # type: ignore


def _tile_to_gb_code(tile: str) -> str:
    """将内部牌编码（如 1m/5z）转换为 PyMahjongGB 牌编码。"""
    if len(tile) != 2 or not tile[0].isdigit():
        raise ValueError("INVALID_TILE")
    n = int(tile[0])
    s = tile[1]
    if s == "m":
        if 1 <= n <= 9:
            return f"W{n}"  # 万
        raise ValueError("INVALID_TILE")
    if s == "p":
        if 1 <= n <= 9:
            return f"B{n}"  # 筒
        raise ValueError("INVALID_TILE")
    if s == "s":
        if 1 <= n <= 9:
            return f"T{n}"  # 索
        raise ValueError("INVALID_TILE")
    if s == "z":
        if 1 <= n <= 4:
            return f"F{n}"  # 东南西北
        if 5 <= n <= 7:
            return f"J{n - 4}"  # 白发中
        raise ValueError("INVALID_TILE")
    raise ValueError("INVALID_TILE")


def _calc_guobiao_fans(
    *,
    tiles_14_ascii: List[str],
    tsumo: bool,
    round_wind: int,
    seat_wind: int,
) -> Tuple[int, List[str]]:
    """
    使用 PyMahjongGB 计算国标番种。
    返回：(总番数, 番种名列表)。
    """
    if MahjongFanCalculator is None:
        raise RuntimeError("GUOBIAO_LIB_NOT_INSTALLED")
    if len(tiles_14_ascii) != 14:
        raise ValueError("COUNT_ERROR")

    gb_tiles = tuple(_tile_to_gb_code(t) for t in tiles_14_ascii)
    hand = gb_tiles[:-1]
    win_tile = gb_tiles[-1]
    fans = MahjongFanCalculator(
        pack=(),
        hand=hand,
        winTile=win_tile,
        flowerCount=0,
        isSelfDrawn=bool(tsumo),
        is4thTile=False,
        isAboutKong=False,
        isWallLast=False,
        seatWind=max(0, int(seat_wind) - 1),
        prevalentWind=max(0, int(round_wind) - 1),
    )
    total_fan = int(sum(int(item[0]) for item in fans))
    fan_names = [str(item[1]) for item in fans]
    return total_fan, fan_names


# -------------------------
# 业务数据结构（JSON 可序列化）
# -------------------------

@dataclass
class HandResultData:
    tiles_ascii_13: List[str]
    win_tile: str
    tsumo: bool
    round_wind: int
    seat_wind: int
    wind_raw: str
    raw_14: str
    hand_index: int

    han: int
    fu: int
    cost: int
    yaku_jp: List[str]
    han_tip: str
    tip: str


@dataclass
class GuessEntry:
    guess_tiles_14: List[str]
    colors_14: List[Color]
    created_at: float = field(default_factory=time.time)


@dataclass
class UserProgress:
    hit_count_valid: int = 0
    history: List[GuessEntry] = field(default_factory=list)
    finished: bool = False
    win: bool = False

    # ✅ 新增：结算信息（用于 status 恢复）
    score: int = 0
    finished_at: Optional[float] = None


@dataclass
class GameState:
    game_id: str
    created_at: float
    max_guess: int
    rule_mode: RuleMode
    hand: HandResultData
    users: Dict[str, UserProgress] = field(default_factory=dict)


# -------------------------
# 抽题：复用 handler.py 的 hands.txt 题库逻辑
# -------------------------

_ASSETS_DIR = Path(__file__).resolve().parent / "assets"

_WIND_NAME = {1: "东", 2: "南", 3: "西", 4: "北"}


def _parse_hand_line(line: str) -> tuple[str, bool, str, int, int]:
    line = (line or "").strip()
    if len(line) < 3 or line[-3] != '+' or not line[-2:].isdigit():
        raise ValueError(f"题库行格式不合法：{line}")

    wind_raw = line[-2:]
    round_wind = int(wind_raw[0])
    seat_wind = int(wind_raw[1])

    hand_core = line[:-3]

    if len(hand_core) < 28:
        raise ValueError(f"题库行主体过短：{line}")

    tsumo = hand_core[26] != '+'
    win_tile = hand_core[26:28] if tsumo else hand_core[27:29]

    return hand_core, tsumo, win_tile, round_wind, seat_wind


def _make_hand_config(*, is_tsumo: bool, round_wind: int, seat_wind: int) -> HandConfig:
    kwargs = {"is_riichi": True, "is_tsumo": is_tsumo}

    try:
        from mahjong.constants import EAST, SOUTH, WEST, NORTH

        wind_const = {1: EAST, 2: SOUTH, 3: WEST, 4: NORTH}
        kwargs["prevalent_wind"] = wind_const.get(round_wind)
        kwargs["seat_wind"] = wind_const.get(seat_wind)
    except Exception:
        pass

    try:
        return HandConfig(**{k: v for k, v in kwargs.items() if v is not None})
    except TypeError:
        return HandConfig(is_riichi=True, is_tsumo=is_tsumo)


def get_hand(hand_index: Optional[int] = None, rule_mode: RuleMode = "normal") -> HandResultData:
    calculator = HandCalculator()
    hands_path = _ASSETS_DIR / "hands.txt"
    hand_list = linecache.getlines(hands_path.as_posix())
    if not hand_list:
        raise RuntimeError(f"题库为空或不存在：{hands_path.as_posix()}")

    idx = hand_index if hand_index is not None else random.randint(0, len(hand_list) - 1)
    line = hand_list[idx].strip()

    hand_core, tsumo, last_tile, round_wind, seat_wind = _parse_hand_line(line)
    wind_raw = line[-2:]

    raw_14 = hand_core.replace("+", "")
    tiles_14 = TC.one_line_string_to_136_array(raw_14)
    win_tile_136 = TC.one_line_string_to_136_array(last_tile)[0]

    result = calculator.estimate_hand_value(
        tiles_14,
        win_tile_136,
        config=_make_hand_config(is_tsumo=tsumo, round_wind=round_wind, seat_wind=seat_wind),
    )

    tiles_ascii_13 = format_split_hand(hand_core[:26])

    yaku = [x for x in result.yaku]
    yaku_jp = [YakuJapanese2ChineseMap.get(x.japanese, x.japanese) for x in yaku]
    han = int(result.han or 0)
    fu = int(result.fu or 0)
    cost = int(result.cost["main"] + result.cost["additional"])
    han_tip = f"{han}番{fu}符"
    tip = "提示: " + " ".join(yaku_jp)

    if rule_mode == "guobiao":
        tiles_14_ascii = tiles_ascii_13 + [last_tile]
        try:
            gb_total_fan, gb_fans = _calc_guobiao_fans(
                tiles_14_ascii=tiles_14_ascii,
                tsumo=tsumo,
                round_wind=round_wind,
                seat_wind=seat_wind,
            )
            if gb_fans:
                tip = "提示: " + " ".join(gb_fans)
            else:
                tip = "提示: "
            han_tip = f"{gb_total_fan}番"
            yaku_jp = gb_fans
            han = gb_total_fan
            fu = 0
        except RuntimeError as e:
            if str(e) == "GUOBIAO_LIB_NOT_INSTALLED":
                tip = "提示: 国标番种库未安装"
                han_tip = "0番"
                yaku_jp = []
                han = 0
                fu = 0
        except Exception:
            # 题库与规则不完全匹配时，保留已有提示，避免无法开局
            pass

    return HandResultData(
        tiles_ascii_13=tiles_ascii_13,
        win_tile=last_tile,
        tsumo=tsumo,
        round_wind=round_wind,
        seat_wind=seat_wind,
        wind_raw=wind_raw,
        raw_14=raw_14,
        hand_index=idx,
        han=han,
        fu=fu,
        cost=cost,
        yaku_jp=yaku_jp,
        han_tip=han_tip,
        tip=tip,
    )


# -------------------------
# 输入校验与提交逻辑（非法不扣次数）
# -------------------------

class GuessErrorCode(str, Enum):
    FORMAT_ERROR = "FORMAT_ERROR"
    COUNT_ERROR = "COUNT_ERROR"
    NOT_WINNING_HAND = "NOT_WINNING_HAND"
    NO_YAKU = "NO_YAKU"
    GAME_FINISHED = "GAME_FINISHED"


@dataclass
class GuessOk:
    colors_14: List[Color]
    guess_tiles_14: List[str]
    remain: int
    finish: bool
    win: bool
    tip: str
    han_tip: str
    created_at: float

    # ✅ 新增：若 finish=True，返回本局得分（失败=0）
    score: int = 0


@dataclass
class GuessErr:
    code: GuessErrorCode
    message: str
    detail: Optional[dict] = None


def evaluate_guess(
        *,
        game: GameState,
        user_id: str,
        guess_str: str,
) -> Tuple[Optional[GuessOk], Optional[GuessErr]]:
    progress = game.users.get(user_id)
    existed = progress is not None
    if progress is None:
        progress = UserProgress()

    if existed and progress.finished:
        return None, GuessErr(GuessErrorCode.GAME_FINISHED, "本局已结束，无法继续提交")

    guess_text = (guess_str or "").strip().replace(" ", "")
    # 仅允许数字 + m/p/s/z（不再支持中文牌名与 h 花色别名）
    if re.search(r"[^0-9mpsz]", guess_text):
        return None, GuessErr(GuessErrorCode.FORMAT_ERROR, "输入包含非法字符", {"input": guess_str})
    if len(guess_text) < 10:
        return None, GuessErr(GuessErrorCode.FORMAT_ERROR, "输入过短，无法解析为手牌", {"input": guess_str})

    guess_hand = guess_text

    try:
        guess_tiles_14_ascii = expand_compact_hand_tiles(guess_hand)
    except ValueError:
        return None, GuessErr(GuessErrorCode.FORMAT_ERROR, "解析失败，请检查输入格式", {"input": guess_str})

    if len(guess_tiles_14_ascii) != 14:
        return None, GuessErr(GuessErrorCode.COUNT_ERROR, "不是 14 张牌", {"count": len(guess_tiles_14_ascii)})

    guess_win_tile = guess_tiles_14_ascii[-1]

    try:
        guess_tiles_14 = TC.one_line_string_to_136_array(guess_hand)
    except Exception as e:
        return None, GuessErr(GuessErrorCode.FORMAT_ERROR, "解析失败，请检查输入格式", {"error": str(e)})

    if len(guess_tiles_14) != 14:
        return None, GuessErr(GuessErrorCode.COUNT_ERROR, "不是 14 张牌", {"count": len(guess_tiles_14)})

    try:
        if game.rule_mode == "guobiao":
            gb_total_fan, _ = _calc_guobiao_fans(
                tiles_14_ascii=guess_tiles_14_ascii,
                tsumo=game.hand.tsumo,
                round_wind=game.hand.round_wind,
                seat_wind=game.hand.seat_wind,
            )
            if gb_total_fan <= 0:
                return None, GuessErr(GuessErrorCode.NO_YAKU, "手牌无番")
        else:
            win_tile_136 = TC.one_line_string_to_136_array(guess_win_tile)[0]
            calculator = HandCalculator()
            res = calculator.estimate_hand_value(
                guess_tiles_14,
                win_tile_136,
                config=_make_hand_config(
                    is_tsumo=game.hand.tsumo,
                    round_wind=game.hand.round_wind,
                    seat_wind=game.hand.seat_wind,
                ),
            )
            if res.han is None:
                return None, GuessErr(GuessErrorCode.NOT_WINNING_HAND, "不符合规范和牌型")
            if int(res.han) == 0:
                return None, GuessErr(GuessErrorCode.NO_YAKU, "手牌无役")
    except Exception as e:
        if str(e) == "GUOBIAO_LIB_NOT_INSTALLED":
            return None, GuessErr(GuessErrorCode.FORMAT_ERROR, "国标番种库未安装")
        return None, GuessErr(GuessErrorCode.FORMAT_ERROR, "算番失败，请检查输入是否为合法牌组", {"error": str(e)})

    if not existed:
        game.users[user_id] = progress

    progress.hit_count_valid += 1

    answer_tiles_14 = game.hand.tiles_ascii_13 + [game.hand.win_tile]
    colors = handle_colors(answer_tiles_14, guess_tiles_14_ascii)

    win = (guess_tiles_14_ascii == answer_tiles_14)
    remain = game.max_guess - progress.hit_count_valid
    finish = win or (remain <= 0)

    entry = GuessEntry(guess_tiles_14=guess_tiles_14_ascii, colors_14=colors)
    progress.history.append(entry)
    progress.finished = finish
    progress.win = win

    # ✅ 结算：计算得分并固化到 progress，便于 status 恢复
    score = 0
    if finish:
        progress.finished_at = entry.created_at
        elapsed = max(0.0, float(entry.created_at - game.created_at))
        score = calc_score(g=progress.hit_count_valid, t=elapsed, win=win)
        progress.score = score

    return GuessOk(
        colors_14=colors,
        guess_tiles_14=guess_tiles_14_ascii,
        remain=max(remain, 0),
        finish=finish,
        win=win,
        tip=game.hand.tip,
        han_tip=game.hand.han_tip,
        created_at=entry.created_at,
        score=score,
    ), None


def new_game(*, hand_index: Optional[int] = None, max_guess: int = 6, rule_mode: RuleMode = "normal") -> GameState:
    hand = get_hand(hand_index=hand_index, rule_mode=rule_mode)
    return GameState(
        game_id=uuid.uuid4().hex,
        created_at=time.time(),
        max_guess=max_guess,
        rule_mode=rule_mode,
        hand=hand,
        users={},
    )
