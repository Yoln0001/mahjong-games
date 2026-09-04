import random
import time
import unittest
from unittest.mock import patch

from app.modules.nonogram_battle.domain import generate_puzzle, count_solutions, create_match, status_payload, solution_clues
from app.modules.nonogram_battle.expert import analyze_expert
from app.modules.nonogram_battle.schemas import CreateReq, MoveReq


class ExpertTests(unittest.TestCase):
    def test_generated_sizes(self):
        random.seed(17)
        for size in (5, 10, 15, 20, 25):
            with self.subTest(size=size):
                started = time.monotonic()
                solution, rows, columns = generate_puzzle(size, "expert")
                duration = time.monotonic() - started
                stats = analyze_expert(rows, columns, time.monotonic() + 3)
                print(size, round(duration, 3), stats, flush=True)
                self.assertTrue(stats["solved"])
                self.assertFalse(stats["logicalSolved"])
                self.assertFalse(stats["exhausted"])
                self.assertGreater(stats["eliminations"], 0)
                self.assertEqual(len(solution), size)
                if size <= 10:
                    self.assertEqual(count_solutions(rows, columns), 1)

    def test_easy_and_ambiguous_are_not_expert(self):
        self.assertTrue(analyze_expert([[2], [2]], [[2], [2]])["logicalSolved"])
        self.assertFalse(analyze_expert([[1], [1]], [[1], [1]])["solved"])
        self.assertFalse(analyze_expert([[2], [2]], [[0], [0]])["solved"])

    def test_timeout_does_not_certify_a_solution(self):
        stats = analyze_expert([[1], [1]], [[1], [1]], time.monotonic() - 1)
        self.assertTrue(stats["exhausted"])
        self.assertFalse(stats["solved"])

    def test_no_easy_fallback(self):
        with patch("app.modules.nonogram_battle.domain._random_solution", return_value=[[True] * 5 for _ in range(5)]):
            with self.assertRaisesRegex(ValueError, "极难"):
                generate_puzzle(5, "expert")

    def test_api_accepts_expert_and_large_board_moves(self):
        self.assertEqual(CreateReq(userId="test", size=25, difficulty="expert").difficulty, "expert")
        self.assertEqual(MoveReq(userId="test", row=24, column=24, state="filled").row, 24)

    def test_match_preserves_expert_label(self):
        solution = [[column <= row for column in range(5)] for row in range(5)]
        rows, columns = solution_clues(solution)
        with patch("app.modules.nonogram_battle.domain.generate_puzzle", return_value=(solution, rows, columns)) as generate:
            state = create_match("test", 5, "expert")
            generate.assert_called_once_with(5, "expert")
            self.assertEqual(status_payload(state, "test")["difficulty"], "expert")


if __name__ == "__main__":
    unittest.main()
