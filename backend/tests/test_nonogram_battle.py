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


def test_first_solved_board_wins():
    state = create_match("p1", 5)
    join_match(state, "p2")
    for row in range(5):
        for column in range(5):
            if state["solution"][row][column]:
                apply_move(state, "p1", row, column, "filled")
    assert state["status"] == "finished"
    assert state["winnerUserId"] == "p1"
