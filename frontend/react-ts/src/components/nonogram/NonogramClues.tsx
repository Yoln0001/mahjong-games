type Props = {
  clues: number[];
  direction: "row" | "column";
};

export default function NonogramClues({ clues, direction }: Props) {
  return (
    <div className={`nonogram-clues nonogram-clues-${direction}`}>
      {clues.map((clue, index) => <span key={`${clue}-${index}`}>{clue}</span>)}
    </div>
  );
}
