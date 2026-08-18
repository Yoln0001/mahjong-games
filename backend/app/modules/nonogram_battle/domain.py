from __future__ import annotations

import random
import time
import uuid
from typing import Any, Dict, List, Optional


def line_clues(line: List[bool]) -> List[int]:
    clues: List[int] = []
    run = 0
    for filled in line:
        if filled:
            run += 1
        elif run:
            clues.append(run)
            run = 0
    if run:
        clues.append(run)
    return clues or [0]


def solution_clues(solution: List[List[bool]]) -> tuple[List[List[int]], List[List[int]]]:
    size = len(solution)
    rows = [line_clues(row) for row in solution]
    columns = [line_clues([solution[row][column] for row in range(size)]) for column in range(size)]
    return rows, columns


def _patterns(length: int, raw_clues: List[int]) -> List[List[bool]]:
    clues = [value for value in raw_clues if value > 0]
    if not clues:
        return [[False] * length]
    result: List[List[bool]] = []

    def place(index: int, cursor: int, line: List[bool]) -> None:
        if index >= len(clues):
            result.append(line[:])
            return
        clue = clues[index]
        remaining = sum(clues[index + 1:]) + max(0, len(clues) - index - 1)
        latest = length - clue - remaining
        for start in range(cursor, latest + 1):
            next_line = line[:]
            for offset in range(clue):
                next_line[start + offset] = True
            place(index + 1, start + clue + 1, next_line)

    place(0, 0, [False] * length)
    return result


def count_solutions(row_clues: List[List[int]], column_clues: List[List[int]], limit: int = 2) -> int:
    size = len(row_clues)
    base_rows = [_patterns(size, clue) for clue in row_clues]
    base_columns = [_patterns(size, clue) for clue in column_clues]

    def matches(pattern: List[bool], known: List[Optional[bool]]) -> bool:
        return all(value is None or pattern[index] == value for index, value in enumerate(known))

    def search(grid: List[List[Optional[bool]]], rows: List[List[List[bool]]], columns: List[List[List[bool]]]) -> int:
        changed = True
        while changed:
            changed = False
            for row in range(size):
                valid = [pattern for pattern in rows[row] if matches(pattern, grid[row])]
                if not valid:
                    return 0
                rows[row] = valid
                for column in range(size):
                    value = valid[0][column]
                    if grid[row][column] is None and all(pattern[column] == value for pattern in valid):
                        grid[row][column] = value
                        changed = True
            for column in range(size):
                known = [grid[row][column] for row in range(size)]
                valid = [pattern for pattern in columns[column] if matches(pattern, known)]
                if not valid:
                    return 0
                columns[column] = valid
                for row in range(size):
                    value = valid[0][row]
                    if grid[row][column] is None and all(pattern[row] == value for pattern in valid):
                        grid[row][column] = value
                        changed = True

        target = next(((row, column) for row in range(size) for column in range(size) if grid[row][column] is None), None)
        if target is None:
            return 1
        row, column = target
        total = 0
        for value in (False, True):
            next_grid = [line[:] for line in grid]
            next_grid[row][column] = value
            total += search(next_grid, [[p[:] for p in domain] for domain in rows], [[p[:] for p in domain] for domain in columns])
            if total >= limit:
                return total
        return total

    return search([[None] * size for _ in range(size)], base_rows, base_columns)


def generate_puzzle(size: int) -> tuple[List[List[bool]], List[List[int]], List[List[int]]]:
    for _ in range(120):
        density = random.uniform(0.42, 0.56)
        solution = [[random.random() < density for _ in range(size)] for _ in range(size)]
        filled = sum(sum(1 for cell in row if cell) for row in solution)
        if filled < size or filled > size * size - size:
            continue
        rows, columns = solution_clues(solution)
        if count_solutions(rows, columns) == 1:
            return solution, rows, columns

    solution = [[row == column or row + column == size - 1 or row == size // 2 for column in range(size)] for row in range(size)]
    rows, columns = solution_clues(solution)
    return solution, rows, columns


def _empty_board(size: int) -> List[List[str]]:
    return [["unknown"] * size for _ in range(size)]


def create_match(user_id: str, size: int) -> Dict[str, Any]:
    solution, row_clues, column_clues = generate_puzzle(size)
    return {
        "matchId": uuid.uuid4().hex[:10],
        "createdAt": time.time(),
        "startedAt": None,
        "finishedAt": None,
        "status": "waiting",
        "size": size,
        "solution": solution,
        "rowClues": row_clues,
        "columnClues": column_clues,
        "winnerUserId": None,
        "players": {user_id: {"board": _empty_board(size), "finishedAt": None}},
    }


def join_match(state: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    players = state["players"]
    if user_id in players:
        return state
    if len(players) >= 2:
        raise ValueError("MATCH_FULL")
    if state["status"] != "waiting":
        raise ValueError("MATCH_STARTED")
    players[user_id] = {"board": _empty_board(state["size"]), "finishedAt": None}
    state["status"] = "playing"
    state["startedAt"] = time.time()
    return state


def _is_solved(board: List[List[str]], solution: List[List[bool]]) -> bool:
    return all((board[row][column] == "filled") == solution[row][column] for row in range(len(solution)) for column in range(len(solution)))


def apply_move(state: Dict[str, Any], user_id: str, row: int, column: int, cell_state: str) -> Dict[str, Any]:
    if state["status"] != "playing":
        raise ValueError("MATCH_NOT_PLAYING")
    player = state["players"].get(user_id)
    if player is None:
        raise ValueError("USER_NOT_IN_MATCH")
    size = state["size"]
    if row < 0 or column < 0 or row >= size or column >= size:
        raise ValueError("CELL_OUT_OF_RANGE")
    player["board"][row][column] = cell_state
    if _is_solved(player["board"], state["solution"]):
        now = time.time()
        player["finishedAt"] = now
        state["status"] = "finished"
        state["finishedAt"] = now
        state["winnerUserId"] = user_id
    return state


def clear_board(state: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    if state["status"] != "playing":
        raise ValueError("MATCH_NOT_PLAYING")
    player = state["players"].get(user_id)
    if player is None:
        raise ValueError("USER_NOT_IN_MATCH")
    player["board"] = _empty_board(state["size"])
    return state


def _progress(player: Optional[Dict[str, Any]], solution: List[List[bool]]) -> int:
    if not player:
        return 0
    total = sum(sum(1 for cell in row if cell) for row in solution) or 1
    correct = sum(1 for row in range(len(solution)) for column in range(len(solution)) if solution[row][column] and player["board"][row][column] == "filled")
    return min(99, round(correct / total * 100)) if not player.get("finishedAt") else 100


def status_payload(state: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    players = state["players"]
    me = players.get(user_id)
    if me is None:
        raise ValueError("USER_NOT_IN_MATCH")
    opponent_id = next((pid for pid in players if pid != user_id), None)
    opponent = players.get(opponent_id) if opponent_id else None
    return {
        "matchId": state["matchId"],
        "status": state["status"],
        "size": state["size"],
        "rowClues": state["rowClues"],
        "columnClues": state["columnClues"],
        "startedAt": state["startedAt"],
        "winnerUserId": state["winnerUserId"],
        "my": {"userId": user_id, "board": me["board"], "progress": _progress(me, state["solution"])},
        "opponent": {"userId": opponent_id, "progress": _progress(opponent, state["solution"])} if opponent_id else None,
    }
