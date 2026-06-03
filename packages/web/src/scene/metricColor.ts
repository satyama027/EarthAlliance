function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** 0–100 index → red (bad/low) through yellow to green (good/high). */
export function metricColor(value: number): string {
  const t = clamp(value, 0, 100) / 100;
  const r = t < 0.5 ? 230 : Math.round(230 - (t - 0.5) * 2 * 180);
  const g = t < 0.5 ? Math.round(60 + t * 2 * 150) : 210;
  return rgbToHex(r, g, 60);
}

/** Temperature anomaly (°C) → cool blue (≈1.0) through red (≈4.0+). */
export function temperatureColor(anomaly: number): string {
  const t = clamp((anomaly - 1) / 3, 0, 1); // 1°C..4°C
  const r = Math.round(60 + t * 195);
  const b = Math.round(220 - t * 180);
  return rgbToHex(r, 80, b);
}
