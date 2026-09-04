"""Bounded failed-literal proofs; trial branches never make nested guesses."""
from time import monotonic


def analyze_expert(row_clues, column_clues, deadline=None):
    deadline = deadline if deadline is not None else monotonic() + 0.15
    size = len(row_clues)
    full = (1 << size) - 1
    stats = dict(solved=False, logicalSolved=False, eliminations=0, probes=0, exhausted=False)

    def check():
        if monotonic() >= deadline:
            raise TimeoutError()

    def patterns(raw):
        clues = [n for n in raw if n > 0]
        result = []

        def place(index, start, mask):
            check()
            if len(result) >= 20000:
                raise TimeoutError()
            if index == len(clues):
                result.append(mask)
                return
            length = clues[index]
            remaining = sum(clues[index + 1:]) + len(clues) - index - 1
            for pos in range(start, size - length - remaining + 1):
                place(index + 1, pos + length + 1, mask | (((1 << length) - 1) << pos))
        place(0, 0, 0)
        return result

    def propagate(rows, columns):
        changed = True
        while changed:
            changed = False
            for lines, cross in ((rows, columns), (columns, rows)):
                for line, domain in enumerate(lines):
                    check()
                    if not domain:
                        return False
                    yes, any_mask = full, 0
                    for mask in domain:
                        yes &= mask
                        any_mask |= mask
                    no = full ^ any_mask
                    for cell in range(size):
                        if not ((yes | no) & (1 << cell)):
                            continue
                        value = bool(yes & (1 << cell))
                        old = cross[cell]
                        new = [mask for mask in old if bool(mask & (1 << line)) == value]
                        if not new:
                            return False
                        if len(new) != len(old):
                            cross[cell] = new
                            changed = True
        return True

    try:
        rows, columns = list(map(patterns, row_clues)), list(map(patterns, column_clues))
        if not propagate(rows, columns):
            return stats
        stats["logicalSolved"] = all(len(line) == 1 for line in rows)
        if stats["logicalSolved"]:
            stats["solved"] = True
            return stats
        while not all(len(line) == 1 for line in rows):
            cells = []
            for row, domain in enumerate(rows):
                yes, any_mask = full, 0
                for mask in domain:
                    yes &= mask
                    any_mask |= mask
                for column in range(size):
                    if (any_mask ^ yes) & (1 << column):
                        cells.append((len(domain) + len(columns[column]), row, column))
            cells.sort()
            progress = False
            for _, row, column in cells:
                for value in (False, True):
                    check()
                    stats["probes"] += 1
                    if stats["probes"] > 800:
                        raise TimeoutError()
                    trial_rows, trial_columns = rows[:], columns[:]
                    trial_rows[row] = [mask for mask in rows[row] if bool(mask & (1 << column)) == value]
                    if not propagate(trial_rows, trial_columns):
                        rows[row] = [mask for mask in rows[row] if bool(mask & (1 << column)) != value]
                        stats["eliminations"] += 1
                        if not propagate(rows, columns):
                            return stats
                        progress = True
                        break
                if progress:
                    break
            if not progress:
                return stats
        # Every committed decision was forced by contradiction. Completing the
        # grid with only such decisions is a uniqueness proof, not a guessed solve.
        stats["solved"] = True
    except TimeoutError:
        stats["exhausted"] = True
    return stats
