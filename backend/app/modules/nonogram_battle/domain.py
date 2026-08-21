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


def _logical_difficulty_score(row_clues: List[List[int]], column_clues: List[List[int]]) -> Optional[int]:
    size = len(row_clues)
    grid: List[List[Optional[bool]]] = [[None] * size for _ in range(size)]
    rows = [_patterns(size, clue) for clue in row_clues]
    columns = [_patterns(size, clue) for clue in column_clues]
    rounds = 0
    initial_forced = 0

    def matches(pattern: List[bool], known: List[Optional[bool]]) -> bool:
        return all(value is None or pattern[index] == value for index, value in enumerate(known))

    while True:
        deduced = 0
        for row in range(size):
            valid = [pattern for pattern in rows[row] if matches(pattern, grid[row])]
            if not valid:
                return None
            rows[row] = valid
            for column in range(size):
                value = valid[0][column]
                if grid[row][column] is None and all(pattern[column] == value for pattern in valid):
                    grid[row][column] = value
                    deduced += 1
        for column in range(size):
            known = [grid[row][column] for row in range(size)]
            valid = [pattern for pattern in columns[column] if matches(pattern, known)]
            if not valid:
                return None
            columns[column] = valid
            for row in range(size):
                value = valid[0][row]
                if grid[row][column] is None and all(pattern[row] == value for pattern in valid):
                    grid[row][column] = value
                    deduced += 1
        if not deduced:
            break
        rounds += 1
        if rounds == 1:
            initial_forced = deduced

    if any(cell is None for line in grid for cell in line):
        return None
    all_clues = row_clues + column_clues
    values = [value for clues in all_clues for value in clues if value > 0]
    short_ratio = sum(value <= 2 for value in values) / max(1, len(values))
    multi_ratio = sum(len([value for value in clues if value > 0]) >= 3 for clues in all_clues) / max(1, len(all_clues))
    initial_ratio = initial_forced / max(1, size * size)
    return round((1 - initial_ratio) * 45 + min(rounds, 6) / 6 * 20 + short_ratio * 20 + multi_ratio * 15)


def _random_solution(size: int, difficulty: str) -> List[List[bool]]:
    density = random.uniform(0.52, 0.66) if difficulty == "easy" else random.uniform(0.42, 0.56)
    solution = [[random.random() < density for _ in range(size)] for _ in range(size)]
    passes = 2 if difficulty == "easy" else 1 if difficulty == "normal" else 0
    for _ in range(passes):
        for row in range(size):
            for column in range(size):
                neighbors = sum(
                    bool(solution[r][c])
                    for r, c in ((row - 1, column), (row + 1, column), (row, column - 1), (row, column + 1))
                    if 0 <= r < size and 0 <= c < size
                )
                if neighbors >= 3 and random.random() < 0.35:
                    solution[row][column] = True
    return solution


def _large_board_solution(size: int, difficulty: str) -> List[List[bool]]:
    def filled(row: int, column: int) -> bool:
        if difficulty == "easy":
            return column <= row
        if difficulty == "normal":
            return column <= row // 2 or column >= size - 1 - row // 3
        return (column <= row) != (column >= size - 1 - row // 2)

    solution = [[filled(row, column) for column in range(size)] for row in range(size)]
    if random.random() < 0.5:
        solution = [list(reversed(row)) for row in solution]
    if random.random() < 0.5:
        solution.reverse()
    if random.random() < 0.5:
        solution = [[solution[column][row] for column in range(size)] for row in range(size)]
    return solution


def generate_puzzle(size: int, difficulty: str = "normal") -> tuple[List[List[bool]], List[List[int]], List[List[int]]]:
    # Large fully-random grids can produce huge pattern domains. Monotone
    # silhouettes are uniquely determined and remain fast at 25x25.
    if size > 15:
        solution = _large_board_solution(size, difficulty)
        rows, columns = solution_clues(solution)
        return solution, rows, columns
    ranges = {"easy": (0, 54, 38), "normal": (55, 71, 63), "hard": (72, 100, 82)}
    low, high, target = ranges.get(difficulty, ranges["normal"])
    closest: Optional[tuple[int, List[List[bool]], List[List[int]], List[List[int]]]] = None
    for _ in range(240):
        solution = _random_solution(size, difficulty)
        filled = sum(sum(1 for cell in row if cell) for row in solution)
        if filled < size or filled > size * size - size:
            continue
        rows, columns = solution_clues(solution)
        if count_solutions(rows, columns) != 1:
            continue
        score = _logical_difficulty_score(rows, columns)
        if score is None:
            continue
        distance = abs(score - target)
        if closest is None or distance < closest[0]:
            closest = (distance, solution, rows, columns)
        if low <= score <= high:
            return solution, rows, columns

    if closest is not None:
        return closest[1], closest[2], closest[3]

    solution = [[column <= row for column in range(size)] for row in range(size)]
    rows, columns = solution_clues(solution)
    return solution, rows, columns


def _empty_board(size: int) -> List[List[str]]:
    return [["unknown"] * size for _ in range(size)]


def create_match(user_id: str, size: int, difficulty: str = "normal") -> Dict[str, Any]:
    solution, row_clues, column_clues = generate_puzzle(size, difficulty)
    return {
        "matchId": uuid.uuid4().hex[:10],
        "createdAt": time.time(),
        "startedAt": None,
        "finishedAt": None,
        "status": "waiting",
        "size": size,
        "difficulty": difficulty,
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
    return all(
        (board[row][column] == "filled") == solution[row][column]
        for row in range(len(solution))
        for column in range(len(solution))
    )


def apply_move(state: Dict[str, Any], user_id: str, row: int, column: int, cell_state: str) -> Dict[str, Any]:
    if state["status"] != "playing":
        raise ValueError("MATCH_NOT_PLAYING")
    player = state["players"].get(user_id)
    if player is None:
        raise ValueError("USER_NOT_IN_MATCH")
    if player.get("finishedAt"):
        raise ValueError("PLAYER_ALREADY_FINISHED")
    size = state["size"]
    if row < 0 or column < 0 or row >= size or column >= size:
        raise ValueError("CELL_OUT_OF_RANGE")
    player["board"][row][column] = cell_state
    if _is_solved(player["board"], state["solution"]):
        now = time.time()
        player["finishedAt"] = now
        if state.get("winnerUserId") is None:
            state["winnerUserId"] = user_id
        if all(entry.get("finishedAt") for entry in state["players"].values()):
            state["status"] = "finished"
            state["finishedAt"] = now
    return state


def clear_board(state: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    if state["status"] != "playing":
        raise ValueError("MATCH_NOT_PLAYING")
    player = state["players"].get(user_id)
    if player is None:
        raise ValueError("USER_NOT_IN_MATCH")
    if player.get("finishedAt"):
        raise ValueError("PLAYER_ALREADY_FINISHED")
    player["board"] = _empty_board(state["size"])
    return state


def _progress(player: Optional[Dict[str, Any]], solution: List[List[bool]]) -> int:
    if not player:
        return 0
    total = len(solution) * len(solution) or 1
    answered = sum(cell != "unknown" for row in player["board"] for cell in row)
    return min(100, round(answered / total * 100))


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
        "difficulty": state.get("difficulty", "normal"),
        "rowClues": state["rowClues"],
        "columnClues": state["columnClues"],
        "startedAt": state["startedAt"],
        "winnerUserId": state["winnerUserId"],
        "my": {"userId": user_id, "board": me["board"], "progress": _progress(me, state["solution"]), "finished": bool(me.get("finishedAt"))},
        "opponent": {"userId": opponent_id, "progress": _progress(opponent, state["solution"]), "finished": bool(opponent.get("finishedAt"))} if opponent_id else None,
    }
