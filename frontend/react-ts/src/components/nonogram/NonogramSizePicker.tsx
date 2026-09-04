type Props = {
  value: number;
  onChange: (value: number) => void;
};

export default function NonogramSizePicker({ value, onChange }: Props) {
  return (
    <div className="nonogram-size-picker" role="group" aria-label="棋盘大小">
      <output aria-live="polite">{value} × {value}</output>
      <div className="nonogram-size-arrows">
        <button type="button" aria-label="增大棋盘" disabled={value >= 25}
          onClick={() => onChange(Math.min(25, (Math.floor(value / 5) + 1) * 5))}>▲</button>
        <button type="button" aria-label="缩小棋盘" disabled={value <= 5}
          onClick={() => onChange(Math.max(5, (Math.ceil(value / 5) - 1) * 5))}>▼</button>
      </div>
    </div>
  );
}
