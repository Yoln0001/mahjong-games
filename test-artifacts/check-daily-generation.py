import json
import time
from urllib.request import urlopen
from urllib.parse import urlencode
from urllib.error import HTTPError

BASE = "http://127.0.0.1:8105/api/nonogram-daily"


def read(path):
    with urlopen(BASE + path, timeout=30) as response:
        return json.load(response)["data"]


listing = read("/catalog")
for entry in listing["entries"]:
    path = "/puzzle?" + urlencode({"date": listing["date"], "size": entry["size"], "difficulty": entry["difficulty"]})
    start = time.monotonic()
    for attempt in range(3):
        try:
            result = read(path)
            break
        except HTTPError as error:
            if error.code != 409 or attempt == 2:
                raise
    assert result["id"] == entry["id"]
    puzzle = result["puzzle"]
    assert len(puzzle["solution"]) == entry["size"]
    assert all(len(row) == entry["size"] for row in puzzle["solution"])
    assert read(path) == result
    print(f'{entry["difficulty"]} {entry["size"]}: published, cached, {time.monotonic() - start:.2f}s', flush=True)
