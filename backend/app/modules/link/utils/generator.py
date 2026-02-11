# _*_ coding : utf-8 _*_
# @Time : 2026/2/5 21:55
# @Author : Yoln
# @File : generator
# @Project : mahjong-handle-web
from __future__ import annotations

import argparse
import os
import random
from typing import List


# 基本常量：34 种牌、每种 4 张，总计 136 张
TILE_TYPES = 34
TILES_PER_TYPE = 4
TOTAL_TILES = TILE_TYPES * TILES_PER_TYPE  # 136


def _id_to_tile(tile_id: int) -> str:
    """将 1..136 的编号映射到麻将牌字符（如 1m/2p/7z）。

    1-4   -> 1m
    5-8   -> 2m
    ...
    33-36 -> 9m
    37-40 -> 1p
    ...
    69-72 -> 9p
    73-76 -> 1s
    ...
    105-108 -> 9s
    109-112 -> 1z
    ...
    133-136 -> 7z
    """
    # 保护性校验，避免越界编号
    if tile_id < 1 or tile_id > TOTAL_TILES:
        raise ValueError(f"tile_id out of range: {tile_id}")

    # 计算所属牌种序号（0..33）
    type_idx = (tile_id - 1) // TILES_PER_TYPE  # 0..33
    if type_idx < 9:
        return f"{type_idx + 1}m"
    if type_idx < 18:
        return f"{type_idx - 8}p"
    if type_idx < 27:
        return f"{type_idx - 17}s"
    return f"{type_idx - 26}z"


def generate_hand_line(rng: random.Random) -> str:
    """生成单行题目：随机打乱 136 张牌并拼成 272 字符串。"""
    ids = list(range(1, TOTAL_TILES + 1))
    rng.shuffle(ids)
    tiles = [_id_to_tile(tid) for tid in ids]
    line = "".join(tiles)
    # 长度校验（每张牌 2 字符）
    if len(line) != TOTAL_TILES * 2:
        raise ValueError(f"invalid line length: {len(line)}")
    return line


def generate_hands(count: int, seed: int | None = None) -> List[str]:
    """生成多行题库内容，支持固定 seed 以便复现。"""
    rng = random.Random(seed)
    return [generate_hand_line(rng) for _ in range(count)]


def write_hands(path: str, count: int, seed: int | None = None) -> None:
    """将题库写入指定路径，一行一题。"""
    lines = generate_hands(count=count, seed=seed)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for i, line in enumerate(lines):
            if i:
                f.write("\n")
            f.write(line)


def main() -> None:
    """CLI 入口：生成并写入题库文件。"""
    parser = argparse.ArgumentParser(description="Generate link hands dataset.")
    parser.add_argument("--count", type=int, default=1000, help="number of hands (lines)")
    parser.add_argument("--seed", type=int, default=None, help="random seed")
    # 默认写入 link/assets/hands.txt
    default_out = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "assets", "hands.txt")
    )
    parser.add_argument(
        "--out",
        type=str,
        default=default_out,
        help="output file path",
    )
    args = parser.parse_args()

    write_hands(path=args.out, count=args.count, seed=args.seed)


if __name__ == "__main__":
    main()
