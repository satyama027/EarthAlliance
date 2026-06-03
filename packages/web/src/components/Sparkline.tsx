interface SparklineProps {
  values: number[];
  width: number;
  height: number;
  color?: string;
}

export function Sparkline({ values, width, height, color = '#ff6b6b' }: SparklineProps) {
  if (values.length < 2) {
    return <svg width={width} height={height} role="img" aria-label="trend" />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} role="img" aria-label="trend">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}
