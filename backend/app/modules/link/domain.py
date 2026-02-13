# _*_ coding : utf-8 _*_
# @Time : 2026/2/5 21:55
# @Author : Yoln
# @File : domain
# @Project : mahjong-handle-web
from __future__ import annotations

import os
import random
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

# 基本常量：8 行 17 列，共 136 张
ROWS = 8
COLS = 17
TOTAL_TILES = ROWS * COLS

# 默认临时格子容量（后续可由题库分析结果覆盖）
DEFAULT_TEMP_LIMIT = 7

# 题库文件路径（相对本模块）
_HANDS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "assets", "hands.txt"))

_hands_cache: Optional[List[str]] = None


def _load_hands() -> List[str]:
    """加载题库文件，按需缓存到内存。"""
    global _hands_cache
    if _hands_cache is not None:
        return _hands_cache

    if not os.path.exists(_HANDS_PATH):
        raise FileNotFoundError(f"hands file not found: {_HANDS_PATH}")

    with open(_HANDS_PATH, "r", encoding="utf-8") as f:
        lines = [ln.strip() for ln in f.readlines() if ln.strip()]

    _hands_cache = lines
    return _hands_cache


def _parse_hand_line(line: str) -> List[str]:
    """将一行题库字符串拆成 136 张牌（每张 2 字符）。"""
    if len(line) != TOTAL_TILES * 2:
        raise ValueError(f"hand line length invalid: {len(line)}")
    return [line[i:i + 2] for i in range(0, len(line), 2)]


def _tiles_to_columns(tiles: List[str]) -> List[List[str]]:
    """将 136 张牌按 8x17 的行列放入 17 个栈。

    约定：行 0 为底部，行 7 为顶部；每列栈顶在列表末尾。
    """
    if len(tiles) != TOTAL_TILES:
        raise ValueError(f"tiles length invalid: {len(tiles)}")

    columns: List[List[str]] = [[] for _ in range(COLS)]
    idx = 0
    for r in range(ROWS):
        for c in range(COLS):
            columns[c].append(tiles[idx])
            idx += 1
    return columns


def _top_tiles(columns: List[List[str]]) -> List[Optional[str]]:
    """返回每列的栈顶牌（空列为 None）。"""
    return [col[-1] if col else None for col in columns]


def _column_counts(columns: List[List[str]]) -> List[int]:
    """返回每列剩余牌数量。"""
    return [len(col) for col in columns]


def _remain_tiles(columns: List[List[str]], temp_slots: List[str]) -> int:
    """统计当前剩余牌总数（列中 + 临时格子）。"""
    return sum(len(c) for c in columns) + len(temp_slots)


def _ensure_temp_tracking(state: Dict[str, Any]) -> Tuple[List[str], List[int], List[int]]:
    """确保暂存区的来源列/序号跟踪数组存在且长度对齐。"""
    temp_slots: List[str] = state.setdefault("tempSlots", [])
    origins: List[int] = state.setdefault("tempSlotOrigins", [])
    seqs: List[int] = state.setdefault("tempSlotSeqs", [])

    # 兼容旧局面：补齐缺失跟踪信息。-1/0 表示未知来源、不可撤回。
    if len(origins) < len(temp_slots):
        origins.extend([-1] * (len(temp_slots) - len(origins)))
    elif len(origins) > len(temp_slots):
        del origins[len(temp_slots):]

    if len(seqs) < len(temp_slots):
        seqs.extend([0] * (len(temp_slots) - len(seqs)))
    elif len(seqs) > len(temp_slots):
        del seqs[len(temp_slots):]

    return temp_slots, origins, seqs


def _can_undo(state: Dict[str, Any]) -> bool:
    """计算当前是否允许撤回。"""
    if state.get("finish"):
        return False
    temp_slots: List[str] = state.get("tempSlots", [])
    if not temp_slots:
        return False
    temp_slot_seqs: List[int] = state.get("tempSlotSeqs", [])
    if len(temp_slot_seqs) != len(temp_slots):
        return False
    last_elim_seq = int(state.get("lastElimSeq", 0))
    # 只允许撤回“最近一次消除之后”放入暂存区的牌。
    if temp_slot_seqs[-1] <= last_elim_seq:
        return False
    if state.get("undoUnlimited", False):
        return True
    return int(state.get("undoBudget", 0)) > 0


def create_game(
    *,
    hand_index: Optional[int] = None,
    temp_limit: Optional[int] = None,
    undo_unlimited: Optional[bool] = None,
) -> Dict[str, Any]:
    """创建新游戏状态。"""
    hands = _load_hands()
    if not hands:
        raise ValueError("hands file is empty")

    if hand_index is not None:
        if hand_index < 0 or hand_index >= len(hands):
            raise ValueError("hand_index out of range")
        line = hands[hand_index]
    else:
        line = random.choice(hands)

    tiles = _parse_hand_line(line)
    columns = _tiles_to_columns(tiles)

    limit = temp_limit if (temp_limit and temp_limit > 0) else DEFAULT_TEMP_LIMIT

    return {
        "gameId": uuid.uuid4().hex,
        "createdAt": time.time(),
        "columns": columns,
        "tempSlots": [],
        "tempSlotOrigins": [],
        "tempSlotSeqs": [],
        "tempLimit": limit,
        "undoUnlimited": bool(undo_unlimited) if undo_unlimited is not None else False,
        "undoBudget": 0,
        "pickSeq": 0,
        "lastElimSeq": 0,
        "finish": False,
        "win": False,
        "failReason": None,
    }


def pick_tile(state: Dict[str, Any], column: int) -> Dict[str, Any]:
    """从指定列栈顶取牌，并按规则放入临时格子与消除。"""
    if state.get("finish"):
        raise ValueError("GAME_FINISHED")

    if column < 0 or column >= COLS:
        raise ValueError("COLUMN_OUT_OF_RANGE")

    columns: List[List[str]] = state["columns"]
    if not columns[column]:
        raise ValueError("COLUMN_EMPTY")

    tile = columns[column].pop()

    temp_slots, temp_slot_origins, temp_slot_seqs = _ensure_temp_tracking(state)
    pick_seq = int(state.get("pickSeq", 0)) + 1
    state["pickSeq"] = pick_seq
    temp_slots.append(tile)
    temp_slot_origins.append(column)
    temp_slot_seqs.append(pick_seq)

    removed: Optional[Dict[str, Any]] = None
    # 检测新牌是否能与已有牌消除（一对）
    for i in range(len(temp_slots) - 1):
        if temp_slots[i] == tile:
            temp_slots.pop(i)
            temp_slots.pop(-1)
            temp_slot_origins.pop(i)
            temp_slot_origins.pop(-1)
            temp_slot_seqs.pop(i)
            temp_slot_seqs.pop(-1)
            removed = {"tile": tile, "count": 2}
            state["lastElimSeq"] = pick_seq
            break

    # 失败条件：临时格子满且全不同
    temp_limit = int(state.get("tempLimit", DEFAULT_TEMP_LIMIT))
    if len(temp_slots) == temp_limit and len(set(temp_slots)) == temp_limit:
        state["finish"] = True
        state["win"] = False
        state["failReason"] = "SLOTS_FULL_DISTINCT"

    # 成功条件：所有牌都消除
    remain = _remain_tiles(columns, temp_slots)
    if remain == 0:
        state["finish"] = True
        state["win"] = True
        state["failReason"] = None

    # 默认每一步只能撤回一次；若开启无限撤回，则不受此预算限制
    state["undoBudget"] = 1

    return {
        "picked": {"column": column, "tile": tile},
        "removed": removed,
        "columns": columns,
        "topTiles": _top_tiles(columns),
        "columnCounts": _column_counts(columns),
        "tempSlots": temp_slots,
        "tempLimit": temp_limit,
        "remainTiles": remain,
        "finish": state["finish"],
        "win": state["win"],
        "failReason": state.get("failReason"),
        "undoUnlimited": bool(state.get("undoUnlimited", False)),
        "canUndo": _can_undo(state),
    }


def undo_tile(state: Dict[str, Any], slot_index: int) -> Dict[str, Any]:
    """将暂存区指定位置的牌返还到原列顶部。"""
    if state.get("finish"):
        raise ValueError("GAME_FINISHED")

    temp_slots, temp_slot_origins, temp_slot_seqs = _ensure_temp_tracking(state)

    if slot_index < 0 or slot_index >= len(temp_slots):
        raise ValueError("SLOT_INDEX_OUT_OF_RANGE")
    if len(temp_slot_origins) != len(temp_slots) or len(temp_slot_seqs) != len(temp_slots):
        raise ValueError("UNDO_SOURCE_UNKNOWN")

    # 不允许撤回到最近一次消除之前，避免通过撤回改变牌堆结构。
    last_elim_seq = int(state.get("lastElimSeq", 0))
    if temp_slot_seqs[slot_index] <= last_elim_seq:
        raise ValueError("UNDO_BLOCKED_BY_ELIMINATION")

    if not state.get("undoUnlimited", False):
        if int(state.get("undoBudget", 0)) <= 0:
            raise ValueError("UNDO_NOT_ALLOWED")
        state["undoBudget"] = 0

    tile = temp_slots.pop(slot_index)
    origin_column = temp_slot_origins.pop(slot_index)
    temp_slot_seqs.pop(slot_index)

    if origin_column < 0 or origin_column >= COLS:
        raise ValueError("UNDO_SOURCE_UNKNOWN")

    columns: List[List[str]] = state["columns"]
    columns[origin_column].append(tile)

    remain = _remain_tiles(columns, temp_slots)
    return {
        "undone": {"slotIndex": slot_index, "tile": tile, "column": origin_column},
        "columns": columns,
        "topTiles": _top_tiles(columns),
        "columnCounts": _column_counts(columns),
        "tempSlots": temp_slots,
        "tempLimit": int(state.get("tempLimit", DEFAULT_TEMP_LIMIT)),
        "remainTiles": remain,
        "finish": state.get("finish", False),
        "win": state.get("win", False),
        "failReason": state.get("failReason"),
        "undoUnlimited": bool(state.get("undoUnlimited", False)),
        "canUndo": _can_undo(state),
    }


def set_assist_options(state: Dict[str, Any], undo_unlimited: Optional[bool]) -> Dict[str, Any]:
    """更新辅助功能配置。"""
    if undo_unlimited is not None:
        state["undoUnlimited"] = bool(undo_unlimited)
        if not state["undoUnlimited"] and int(state.get("undoBudget", 0)) > 1:
            state["undoBudget"] = 1
    return to_status_payload(state)


def to_status_payload(state: Dict[str, Any]) -> Dict[str, Any]:
    """构造 status 接口返回数据。"""
    columns: List[List[str]] = state["columns"]
    temp_slots: List[str] = state["tempSlots"]
    temp_limit = int(state.get("tempLimit", DEFAULT_TEMP_LIMIT))
    remain = _remain_tiles(columns, temp_slots)

    return {
        "gameId": state["gameId"],
        "createdAt": state["createdAt"],
        "columns": columns,
        "topTiles": _top_tiles(columns),
        "columnCounts": _column_counts(columns),
        "tempSlots": temp_slots,
        "tempLimit": temp_limit,
        "remainTiles": remain,
        "finish": state.get("finish", False),
        "win": state.get("win", False),
        "failReason": state.get("failReason"),
        "undoUnlimited": bool(state.get("undoUnlimited", False)),
        "canUndo": _can_undo(state),
    }
