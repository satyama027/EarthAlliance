import { Box, Group, Text } from '@mantine/core';
import type { TrendPoint } from '../game/metricTree.js';
import { headlineParts, changeSince, CHANGE_TONE_COLOR } from '../game/metricTree.js';

interface MetricTrendProps {
  points: TrendPoint[];
  color: string;
  unit: string;
  /** Is an increase a good thing? Colors the change chip (green good / red bad). */
  goodUp?: boolean;
}

/** Evenly-spaced "nice" tick values covering [min, max] — steps rounded to 1/2/5 × 10ⁿ. */
function niceTicks(min: number, max: number, count = 4): number[] {
  const span = (max - min) || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(span / count)));
  const norm = span / count / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step * 1e-6; v += step) out.push(+v.toFixed(6));
  return out;
}

/** Format a Y-axis tick with just enough decimals for its step, so adjacent ticks never collapse. */
function formatTick(v: number, step: number): string {
  if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString();
  const dec = Math.max(0, Math.ceil(-Math.log10(step)));
  return v.toFixed(dec);
}

/** Compact per-turn value label: whole values plain, small ones to 1–2 dp. */
function fmtVal(v: number): string {
  const a = Math.abs(v);
  if (a >= 1000) return Math.round(v).toLocaleString();
  return a >= 10 ? v.toFixed(0) : a >= 1 ? v.toFixed(1) : v.toFixed(2);
}

/**
 * Which turns get *text* labels (value above the dot + year below). Dots and vertical gridlines are
 * drawn at every turn regardless; only the text thins so it never overlaps: everything for a short
 * series (≤ 8 turns — the full early-game read), else the first, the last, and every ~6th turn.
 */
function labelIndices(n: number): Set<number> {
  const set = new Set<number>();
  if (n <= 0) return set;
  if (n <= 8) { for (let i = 0; i < n; i++) set.add(i); return set; }
  const stepIdx = Math.ceil((n - 1) / 6);
  set.add(0); set.add(n - 1);
  for (let i = 0; i < n; i += stepIdx) set.add(i);
  return set;
}

const W = 400, H = 180, mL = 34, mR = 16, mT = 24, mB = 24;
const GRID_H = '#2b2d31';  // horizontal value gridlines
const GRID_V = '#212327';  // vertical per-turn gridlines (fainter — they are denser)

/**
 * A value-vs-year line graph — the drill-down leaf for a metric with no composition. Reads **turn by
 * turn**: a **dot at every turn**, a **value label at each turn** (thinned on long games), and a
 * **vertical gridline per turn year**, over horizontal value gridlines with the **Y axis baselined at
 * 0** (so a small change reads as small, not a cliff). The X axis always labels the first and last
 * year (edge-anchored, unclipped) plus a readable subset between. Series come from `turnLog`, so
 * history exists from turn 0 with no engine change.
 */
export function MetricTrend({ points, color, unit, goodUp = true }: MetricTrendProps) {
  const n = points.length;
  const latest = n ? points[n - 1]!.value : 0;
  const first = n ? points[0]!.value : 0;
  const chip = changeSince(latest - first, goodUp);
  const { main: headline, suffix } = headlineParts(latest, unit);

  const plotW = W - mL - mR, plotH = H - mT - mB;
  const vals = points.map((p) => p.value);
  const dataMin = n ? Math.min(...vals) : 0;
  const dataMax = n ? Math.max(...vals) : 1;
  // Baseline the domain at 0 (include negatives like a land-use sink) so the slope is honest.
  const yt = niceTicks(Math.min(0, dataMin), Math.max(0, dataMax));
  const yMin = yt[0]!, yMax = yt[yt.length - 1]!, ySpan = (yMax - yMin) || 1;
  const step = yt.length > 1 ? yt[1]! - yt[0]! : 1;
  const X = (i: number) => mL + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
  const Y = (v: number) => mT + (1 - (v - yMin) / ySpan) * plotH;
  const anchorFor = (i: number): 'start' | 'end' | 'middle' => (n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle');

  const linePts = points.map((p, i) => `${X(i).toFixed(1)},${Y(p.value).toFixed(1)}`).join(' ');
  const areaPts = `${mL},${(mT + plotH).toFixed(1)} ${linePts} ${(mL + plotW).toFixed(1)},${(mT + plotH).toFixed(1)}`;
  const li = n - 1;
  const labelled = labelIndices(n);

  return (
    <Box>
      <Group gap={8} align="baseline">
        <Text fw={700} style={{ fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>
          {headline}<Text span c="dimmed" fw={600} style={{ fontSize: 12, marginLeft: 3 }}>{suffix}</Text>
        </Text>
        {n > 1 && (
          <Text span fw={600} style={{ fontSize: 11.5 }} c={CHANGE_TONE_COLOR[chip.tone]}>
            {chip.arrow} {chip.label} since {points[0]!.year}
          </Text>
        )}
      </Group>

      <Box mt={10} p="6px 8px" style={{ background: 'var(--mantine-color-dark-8)', border: '1px solid var(--mantine-color-dark-4)', borderRadius: 4 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="trend over time" style={{ display: 'block' }}>
          {/* horizontal value gridlines + labels (Y baselined at 0) */}
          {yt.map((v) => {
            const y = Y(v);
            return (
              <g key={`y${v}`}>
                <line x1={mL} y1={y} x2={W - mR} y2={y} stroke={GRID_H} strokeWidth={1} />
                <text data-axis="y" x={mL - 6} y={y + 3} textAnchor="end" fill="var(--mantine-color-dimmed)" fontSize={9} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTick(v, step)}</text>
              </g>
            );
          })}
          {/* vertical gridline at EVERY turn */}
          {points.map((_, i) => (
            <line key={`v${i}`} x1={X(i)} y1={mT} x2={X(i)} y2={mT + plotH} stroke={GRID_V} strokeWidth={1} />
          ))}
          {/* baseline axis + thinned year labels */}
          <line x1={mL} y1={mT + plotH} x2={W - mR} y2={mT + plotH} stroke="var(--mantine-color-dark-4)" strokeWidth={1} />
          {points.map((p, i) => (labelled.has(i) ? (
            <g key={`x${i}`}>
              <line x1={X(i)} y1={mT + plotH} x2={X(i)} y2={mT + plotH + 4} stroke="var(--mantine-color-dark-4)" strokeWidth={1} />
              <text data-axis="x" x={X(i)} y={H - 6} textAnchor={anchorFor(i)} fill="var(--mantine-color-dimmed)" fontSize={9} style={{ fontVariantNumeric: 'tabular-nums' }}>{p.year}</text>
            </g>
          ) : null))}
          {/* area + line */}
          {n > 1 && <polygon points={areaPts} fill={color} opacity={0.1} />}
          {n > 1 && <polyline points={linePts} fill="none" stroke={color} strokeWidth={2} />}
          {/* dot at EVERY turn + thinned value labels above */}
          {points.map((p, i) => {
            const x = X(i), y = Y(p.value), last = i === li;
            return (
              <g key={`p${i}`}>
                <circle cx={x} cy={y} r={last ? 3.5 : 2.6} fill={color} stroke="var(--mantine-color-dark-8)" strokeWidth={last ? 2 : 1.5} />
                {labelled.has(i) && (
                  <text data-value x={x} y={y - 7} textAnchor={anchorFor(i)} fill="var(--mantine-color-text)" fontSize={9} fontWeight={600} style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtVal(p.value)}</text>
                )}
              </g>
            );
          })}
        </svg>
      </Box>
    </Box>
  );
}
