from app.modules.nonogram_battle.domain import apply_move, create_match, join_match, line_clues, status_payload


def test_line_clues():
    assert line_clues([False, True, True, False, True]) == [2, 1]
    assert line_clues([False, False]) == [0]


def test_match_starts_when_second_player_joins():
    state = create_match("p1", 5)
    assert state["status"] == "waiting"
    join_match(state, "p2")
    assert state["status"] == "playing"
    assert status_payload(state, "p1")["opponent"]["userId"] == "p2"


def _complete_board(state, user_id):
    for row in range(state["size"]):
        for column in range(state["size"]):
            if state["solution"][row][column]:
                apply_move(state, user_id, row, column, "filled")


def test_progress_counts_filled_and_marked_cells():
    state = create_match("p1", 5)
    join_match(state, "p2")
    apply_move(state, "p1", 0, 0, "filled")
    first = status_payload(state, "p1")["my"]["progress"]
    apply_move(state, "p1", 0, 1, "marked")
    second = status_payload(state, "p1")["my"]["progress"]
    assert first == 4
    assert second == 8


def test_first_solved_board_wins_but_second_player_can_continue():
    state = create_match("p1", 5)
    join_match(state, "p2")
    _complete_board(state, "p1")
    assert state["status"] == "playing"
    assert state["winnerUserId"] == "p1"
    assert status_payload(state, "p1")["my"]["finished"] is True
    assert status_payload(state, "p1")["my"]["progress"] < 100
    assert status_payload(state, "p2")["opponent"]["finished"] is True

    _complete_board(state, "p2")
    assert state["status"] == "finished"
    assert state["winnerUserId"] == "p1"
