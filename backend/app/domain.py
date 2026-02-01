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
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Optional, Tuple, Literal

from mahjong.tile import TilesConverter as TC
from mahjong.hand_calculating.hand import HandCalculator
from mahjong.hand_calculating.hand_config import HandConfig


# -------------------------
# 与 handler.py 保持一致的映射与工具
# -------------------------

class TileAsciiMap(Enum):
    """
    中文麻将字符到英文麻将字符的映射表
    """
    万 = "m"
    筒 = "p"
    索 = "s"
    东 = "1z"
    南 = "2z"
    西 = "3z"
    北 = "4z"
    白 = "5z"
    发 = "6z"
    中 = "7z"


# 中文麻将字符表
TileMap = ["万", "筒", "索", "东", "南", "西", "北", "白", "发", "中"]


def format_hand_msg(msg: str) -> str:
    """
    把输入中的中文牌名转换为 mpszh / 数字形式。
    """
    hand = ""
    for w in msg:
        # 如果输入的字符中包含在“中文麻将字符表”中，那么根据映射规则转换为英文，方便程序后续判断
        if w in TileMap:
            hand += TileAsciiMap[w].value
        else:
            hand += w

    # “倒数第3位是数字则交换”特殊处理
    # 目的是兼容某些输入顺序（例如把分隔符位置纠正）
    if len(hand) >= 3 and hand[:-2][-1].isdigit():
        hand = hand[:-2] + hand[-1] + hand[-2:]
    return hand


def format_split_hand(hand_13: str) -> List[str]:
    """
    把 13 张（不含最后和牌）拆成 ['1m','2m',...] 形式。
    逻辑与 handler.py: HandGuess.format_split_hand 保持一致。
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


Color = Literal["blue", "orange", "gray"]


def handle_colors(answer_tiles_14: List[str], guess_tiles_14: List[str]) -> List[Color]:
    """
    14 张一起判色：先蓝后黄，修复重复牌。
    与 handler.py 中的“=== 判色 ===”保持一致。
    """
    remain = defaultdict(int)
    for t in answer_tiles_14:
        remain[t] += 1

    colors: List[Optional[Color]] = [None] * 14

    # 第一轮：位置完全正确 -> 蓝
    for i in range(14):
        if guess_tiles_14[i] == answer_tiles_14[i] and remain[guess_tiles_14[i]] > 0:
            colors[i] = "blue"
            remain[guess_tiles_14[i]] -= 1

    # 第二轮：存在但位置不对 -> 黄，否则灰
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


# -------------------------
# 业务数据结构（JSON 可序列化）
# -------------------------

@dataclass
class HandResultData:
    """
    对应 handler.py 里的 HandResult，但这里只保留 Web 需要的字段（可 JSON 化）。
    """
    tiles_ascii_13: List[str]  # 13 张手牌（拆分后）
    win_tile: str  # 第 14 张和牌（例如 '5z'）
    tsumo: bool  # 是否自摸
    round_wind: int  # 场风: 1=东 2=南 3=西 4=北
    seat_wind: int  # 自风: 1=东 2=南 3=西 4=北
    wind_raw: str  # 原始风码(两位数字字符串)，例如"23"
    raw_14: str  # 14 张 one-line string（用于 debug/答案）
    hand_index: int

    # 答案的番/符/点/役提示（直接从 mahjong 库 result 计算得来）
    han: int
    fu: int
    cost: int  # main+additional
    yaku_jp: List[str]  # 答案役种（日文名/库内字段）
    han_tip: str  # 与 handler 输出一致风格的文本提示
    tip: str  # “提示: ...” 役提示文本


@dataclass
class GuessEntry:
    guess_tiles_14: List[str]
    colors_14: List[Color]
    created_at: float = field(default_factory=time.time)


@dataclass
class UserProgress:
    hit_count_valid: int = 0  # 仅“合法提交”计数
    history: List[GuessEntry] = field(default_factory=list)
    finished: bool = False
    win: bool = False


@dataclass
class GameState:
    game_id: str
    created_at: float
    max_guess: int
    hand: HandResultData
    users: Dict[str, UserProgress] = field(default_factory=dict)


# -------------------------
# 抽题：复用 handler.py 的 hands.txt 题库逻辑
# -------------------------

_ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"

_WIND_NAME = {1: "东", 2: "南", 3: "西", 4: "北"}


def _parse_hand_line(line: str) -> tuple[str, bool, str, int, int]:
    """解析题库一行 hands.txt。

    题库行格式与 mahjong-handle 一致（示例）：
        2m3m4m...8s8s+7s+23
        7m7m7m...7z7z7z7p+23

    约定：
    - 末尾为 '+<两位风码>'，例如 '+23'。
      * 第 1 位 = 场风 round wind (1=东,2=南,3=西,4=北)
      * 第 2 位 = 自风 seat wind  (1=东,2=南,3=西,4=北)
    - 是否自摸由 index=26 处是否为 '+' 决定（与 mahjong-handle 的 isTsumo 判定一致）：
      * line[26] != '+' => 自摸 (tsumo=True)
      * line[26] == '+' => 荣和 (tsumo=False)

    返回： (hand_core, tsumo, win_tile, round_wind, seat_wind)
    - hand_core: 去掉末尾 '+风码' 后的主体字符串（仍可能包含一个 '+' 作为分隔）
    - win_tile: 14 张中的第 14 张（两字符，如 '7s'）
    """
    line = (line or "").strip()
    if len(line) < 3 or line[-3] != '+' or not line[-2:].isdigit():
        raise ValueError(f"题库行格式不合法：{line}")

    wind_raw = line[-2:]
    round_wind = int(wind_raw[0])
    seat_wind = int(wind_raw[1])

    hand_core = line[:-3]  # 去掉 '+风码'

    # 与 mahjong-handle 一致：如果第 27 个字符是 '+', 则不是自摸
    # 这里的 26 是 0-based 索引
    if len(hand_core) < 28:
        raise ValueError(f"题库行主体过短：{line}")

    tsumo = hand_core[26] != '+'

    # 和牌（第14张）位置：
    # - 自摸：主体中没有分隔 '+'，第14张从 index=26 开始
    # - 荣和：主体中多一个 '+', 第14张从 index=27 开始
    win_tile = hand_core[26:28] if tsumo else hand_core[27:29]

    return hand_core, tsumo, win_tile, round_wind, seat_wind


def _make_hand_config(*, is_tsumo: bool, round_wind: int, seat_wind: int) -> HandConfig:
    """构造 HandConfig：

    - 基础：立直 = True，自摸按题库
    - 若 mahjong 库支持 seat_wind / prevalent_wind，则一并传入，用于役牌（场风/自风）判定。

    说明：不同版本的 mahjong 库参数名可能不同；此处做了降级兼容：
    - 能传就传
    - 不能传（TypeError）就只保留 is_riichi/is_tsumo
    """
    kwargs = {"is_riichi": True, "is_tsumo": is_tsumo}

    # 尝试映射风向常量（若存在）
    try:
        from mahjong.constants import EAST, SOUTH, WEST, NORTH

        wind_const = {1: EAST, 2: SOUTH, 3: WEST, 4: NORTH}
        kwargs["prevalent_wind"] = wind_const.get(round_wind)
        kwargs["seat_wind"] = wind_const.get(seat_wind)
    except Exception:
        # 不影响基础番数计算；只是可能无法判定场风/自风役牌
        pass

    # 尝试按完整 kwargs 构造；失败则降级
    try:
        return HandConfig(**{k: v for k, v in kwargs.items() if v is not None})
    except TypeError:
        return HandConfig(is_riichi=True, is_tsumo=is_tsumo)


def get_hand(hand_index: Optional[int] = None) -> HandResultData:
    """
    基于 handler.py:get_hand() 的抽题方式：
    - 从 assets/hands.txt 读一行
    - 解析自摸 '+' 与最后和牌
    - 用 HandCalculator 计算答案的番/符/点/役提示
    """
    calculator = HandCalculator()
    hands_path = _ASSETS_DIR / "hands.txt"
    hand_list = linecache.getlines(hands_path.as_posix())
    if not hand_list:
        raise RuntimeError(f"题库为空或不存在：{hands_path.as_posix()}")

    idx = hand_index if hand_index is not None else random.randint(0, len(hand_list) - 1)
    line = hand_list[idx].strip()

    # 解析 hands.txt（携带场风/自风 + 自摸/荣和信息）
    hand_core, tsumo, last_tile, round_wind, seat_wind = _parse_hand_line(line)
    wind_raw = line[-2:]

    # 14 张纯牌串（去掉用于编码的 '+'）
    raw_14 = hand_core.replace("+", "")
    tiles_14 = TC.one_line_string_to_136_array(raw_14)
    win_tile_136 = TC.one_line_string_to_136_array(last_tile)[0]

    result = calculator.estimate_hand_value(
        tiles_14,
        win_tile_136,
        config=_make_hand_config(is_tsumo=tsumo, round_wind=round_wind, seat_wind=seat_wind),
    )

    # 13 张（用于 Wordle 判色与前端展示）
    tiles_ascii_13 = format_split_hand(hand_core[:26])

    # 役提示：与 handler 一致过滤 yaku_id 0,1 并 reverse
    yaku = [x for x in result.yaku if x.yaku_id not in [0, 1]]
    yaku.reverse()
    yaku_jp = [x.japanese for x in yaku]
    tip = "提示: " + " ".join(yaku_jp)

    han = int(result.han or 0)
    fu = int(result.fu or 0)
    cost = int(result.cost["main"] + result.cost["additional"])
    tsumo_tip = ",自摸" if tsumo else ""
    # han_tip = f"{han}番{fu}符 {cost}点 (包括立直{tsumo_tip})"
    han_tip = f"{han}番{fu}符 (包括立直{tsumo_tip})"

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
    created_at: float  # ✅ 新增：本次合法提交时间戳（秒）

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
    """
    返回 (ok, err)。
    约束：
    - err != None 表示“非法提交”：不扣次数、不写 history、不写入用户状态
    - ok != None 表示“合法提交”：才计次数、写 history、更新 finished/win
    """
    progress = game.users.get(user_id)
    existed = progress is not None
    if progress is None:
        progress = UserProgress()

    if existed and progress.finished:
        return None, GuessErr(GuessErrorCode.GAME_FINISHED, "本局已结束，无法继续提交")

    msg = (guess_str or "").strip().replace(" ", "")
    if re.search(rf"[^\dmpszh{''.join(TileMap)}]", msg):
        return None, GuessErr(GuessErrorCode.FORMAT_ERROR, "输入包含非法字符", {"input": guess_str})
    if len(msg) < 10:
        return None, GuessErr(GuessErrorCode.FORMAT_ERROR, "输入过短，无法解析为手牌", {"input": guess_str})

    msg_hand = format_hand_msg(msg)
    msg_win_tile = msg_hand[-2:]

    try:
        msg_tiles_14 = TC.one_line_string_to_136_array(msg_hand)
    except Exception as e:
        return None, GuessErr(GuessErrorCode.FORMAT_ERROR, "解析失败，请检查输入格式", {"error": str(e)})

    if len(msg_tiles_14) != 14:
        return None, GuessErr(GuessErrorCode.COUNT_ERROR, "不是 14 张牌", {"count": len(msg_tiles_14)})

    # 校验“这手牌本身是否能和牌且有役”
    try:
        win_tile_136 = TC.one_line_string_to_136_array(msg_win_tile)[0]
        calculator = HandCalculator()
        res = calculator.estimate_hand_value(
            msg_tiles_14,
            win_tile_136,
            config=_make_hand_config(
                is_tsumo=game.hand.tsumo,
                round_wind=game.hand.round_wind,
                seat_wind=game.hand.seat_wind,
            ),
        )
    except Exception as e:
        return None, GuessErr(GuessErrorCode.FORMAT_ERROR, "算番失败，请检查输入是否为合法牌组", {"error": str(e)})

    if res.han is None:
        return None, GuessErr(GuessErrorCode.NOT_WINNING_HAND, "不符合规范和牌型")
    if int(res.han) == 0:
        return None, GuessErr(GuessErrorCode.NO_YAKU, "手牌无役")

    # 到这里才算“合法提交”：开始落状态
    if not existed:
        game.users[user_id] = progress

    progress.hit_count_valid += 1

    current_tiles_13 = format_split_hand(msg_hand[:-2])
    guess_tiles_14_ascii = current_tiles_13 + [msg_win_tile]

    answer_tiles_14 = game.hand.tiles_ascii_13 + [game.hand.win_tile]
    colors = handle_colors(answer_tiles_14, guess_tiles_14_ascii)

    win = (guess_tiles_14_ascii == answer_tiles_14)
    remain = game.max_guess - progress.hit_count_valid

    finish = win or (remain <= 0)

    entry = GuessEntry(guess_tiles_14=guess_tiles_14_ascii, colors_14=colors)
    progress.history.append(entry)
    progress.finished = finish
    progress.win = win

    return GuessOk(
        colors_14=colors,
        guess_tiles_14=guess_tiles_14_ascii,
        remain=max(remain, 0),
        finish=finish,
        win=win,
        tip=game.hand.tip,
        han_tip=game.hand.han_tip,
        created_at=entry.created_at,  # ✅ 新增
    ), None


def new_game(*, hand_index: Optional[int] = None, max_guess: int = 8) -> GameState:
    hand = get_hand(hand_index=hand_index)
    return GameState(
        game_id=uuid.uuid4().hex,
        created_at=time.time(),
        max_guess=max_guess,
        hand=hand,
        users={},
    )
