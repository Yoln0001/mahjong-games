type Props = {
  clues: number[];
  direction: "row" | "column";
  lineIndex: number;
  completed: Set<number>;
  onToggle: (clueIndex: number) => void;
};

export default function NonogramClues({ clues, direction, lineIndex, completed, onToggle }: Props) {
  const lineName = direction === "row" ? `第 ${lineIndex + 1} 行` : `第 ${lineIndex + 1} 列`;
  return (
    <div className={`nonogram-clues nonogram-clues-${direction}`}>
      {clues.map((clue, index) => {
        const isCompleted = completed.has(index);
        return (
          <button
            key={`${clue}-${index}`}
            type="button"
            className={`nonogram-clue-number${isCompleted ? " is-completed" : ""}`}
            aria-label={`${lineName}第 ${index + 1} 个线索 ${clue}，${isCompleted ? "已完成" : "未完成"}`}
            aria-pressed={isCompleted}
            onClick={() => onToggle(index)}
          >
            {clue}
          </button>
        );
      })}
    </div>
  );
}
