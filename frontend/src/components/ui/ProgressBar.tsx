interface ProgressBarProps {
  /** 0..1 */
  ratio: number;
  color?: string;
  trackClassName?: string;
  heightClassName?: string;
}

export default function ProgressBar({
  ratio,
  color = "var(--color-primary)",
  trackClassName = "bg-sand",
  heightClassName = "h-[7px]",
}: ProgressBarProps) {
  const width = Math.round(Math.min(Math.max(ratio, 0), 1) * 100);
  return (
    <div className={`${heightClassName} overflow-hidden rounded-full ${trackClassName}`}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${width}%`, background: color }}
      />
    </div>
  );
}
