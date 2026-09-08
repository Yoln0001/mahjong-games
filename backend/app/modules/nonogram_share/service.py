import hashlib
import json

from app.modules.nonogram_battle.domain import solution_clues


class ShareService:
    def __init__(self, repo):
        self.repo = repo

    @staticmethod
    def _canonical(puzzle):
        size = puzzle["size"]
        if size not in (5, 10, 15, 20, 25):
            raise ValueError("无效的棋盘尺寸。")
        solution = puzzle["solution"]
        if len(solution) != size or any(len(row) != size for row in solution):
            raise ValueError("无效的题目数据。")
        rows, columns = solution_clues(solution)
        if rows != puzzle["rowClues"] or columns != puzzle["columnClues"]:
            raise ValueError("题目线索与答案不一致。")
        return {
            "size": size,
            "difficulty": puzzle["difficulty"],
            "solution": solution,
            "rowClues": rows,
            "columnClues": columns,
        }

    def publish(self, puzzle):
        canonical = self._canonical(puzzle)
        encoded = json.dumps(canonical, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        share_id = hashlib.sha256(encoded.encode("utf-8")).hexdigest()[:20]
        payload = {"id": share_id, "puzzle": canonical}
        return self.repo.publish(f"nonogram-share:v1:{share_id}", payload)

    def get(self, share_id):
        return self.repo.get(f"nonogram-share:v1:{share_id}")
