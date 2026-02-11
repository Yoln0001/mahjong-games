# _*_ coding : utf-8 _*_
# @Time : 2026/2/6
# @Author : Yoln
# @File : validate_hands
# @Project : mahjong-handle-web
from __future__ import annotations

import argparse
import os
from collections import Counter


# 34 种牌面定义
TILE_TYPES = [
    *[f"{i}m" for i in range(1, 10)],
    *[f"{i}p" for i in range(1, 10)],
    *[f"{i}s" for i in range(1, 10)],
    *[f"{i}z" for i in range(1, 8)],
]
# 每种牌必须出现 4 次；总长度 272
EXPECTED_COUNTS = {t: 4 for t in TILE_TYPES}
EXPECTED_LINE_LEN = 136 * 2


def parse_line(line: str) -> list[str]:
    """将一行题库字符串拆成 2 字符一组的牌面数组。"""
    if len(line) % 2 != 0:
        raise ValueError("line length must be even")
    return [line[i:i+2] for i in range(0, len(line), 2)]


def validate_line(line: str, line_no: int) -> list[str]:
    """校验单行：长度、每种牌数量、非法牌面。"""
    errors: list[str] = []
    if len(line) != EXPECTED_LINE_LEN:
        errors.append(f"line {line_no}: length {len(line)} != {EXPECTED_LINE_LEN}")
        return errors

    tiles = parse_line(line)
    counts = Counter(tiles)

    for t in TILE_TYPES:
        if counts.get(t, 0) != 4:
            errors.append(f"line {line_no}: tile {t} count {counts.get(t, 0)} != 4")
    # 检查非法牌面
    for t in counts.keys():
        if t not in EXPECTED_COUNTS:
            errors.append(f"line {line_no}: invalid tile token {t}")

    return errors


def main() -> None:
    """CLI 入口：批量校验题库文件。"""
    parser = argparse.ArgumentParser(description="Validate link hands dataset.")
    # 默认读取 link/assets/hands.txt
    default_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "assets", "hands.txt")
    )
    parser.add_argument(
        "--path",
        type=str,
        default=default_path,
        help="hands file path",
    )
    args = parser.parse_args()

    if not os.path.exists(args.path):
        raise SystemExit(f"file not found: {args.path}")

    total = 0
    bad = 0
    errors: list[str] = []

    with open(args.path, "r", encoding="utf-8") as f:
        for idx, raw in enumerate(f, 1):
            line = raw.strip()
            if not line:
                continue
            total += 1
            errs = validate_line(line, idx)
            if errs:
                bad += 1
                errors.extend(errs)

    if errors:
        print("INVALID")
        for e in errors:
            print(e)
    else:
        print("OK")
    print(f"lines={total} bad={bad}")


if __name__ == "__main__":
    main()
