import { changeSince, type ChangeChip } from './metricTree.js';
import { planetAggregate } from './planetAggregate.js';
import type { TurnRecord } from './useGame.js';

/** One metric's turn-over-turn change, ready to render as a report row. */
export interface MetricDelta {
  key: string;
  label: string;
  icon: string;                 // leading emoji, matching the ResourceBar style
  unit: string;                 // shown dimmed after the value, e.g. '°C', 'ppm', '$B'
  value: number;                // the new (end-of-turn) value
  valueText: string;            // pre-formatted headline (grouped / signed as appropriate)
  delta: number;                // value − previous value
  goodUp: boolean;              // is an increase good? (treasury, biodiversity)
  change: ChangeChip;           // shared ▲/▼/— chip (arrow + good/bad/flat tone), via changeSince
}

/** The end-of-turn summary: the five headline metrics of the turn that just elapsed. */
export interface TurnReport {
  turn: number;
  year: number;
  prevYear: number;
  metrics: MetricDelta[];
}

/** One planet-level metric definition — how to read it and how to display it. */
interface MetricSpec {
  key: string;
  label: string;
  icon: string;
  unit: string;
  goodUp: boolean;
  decimals: number;             // 0 → grouped integer; >0 → fixed decimals
  signed?: boolean;             // prefix '+' for positive values (temperature anomaly)
  read(rec: TurnRecord): number;
}

const planetBiodiversity = (rec: TurnRecord): number =>
  planetAggregate(rec.state.regions, rec.diagnostics).biodiversityIndex;

/** The five metrics, in display order. Biodiversity is a planet rollup; the rest are global. */
const SPECS: MetricSpec[] = [
  { key: 'temperature', label: 'Temperature', icon: '🌡', unit: '°C', goodUp: false, decimals: 2, signed: true,
    read: (r) => r.state.climate.temperatureAnomaly },
  { key: 'emissions', label: 'Emissions', icon: '💨', unit: 'Gt/yr', goodUp: false, decimals: 1,
    read: (r) => r.state.climate.annualEmissions },
  { key: 'co2', label: 'CO₂ concentration', icon: '🌫️', unit: 'ppm', goodUp: false, decimals: 0,
    read: (r) => r.state.climate.co2Concentration },
  { key: 'treasury', label: 'Treasury', icon: '💰', unit: '$B', goodUp: true, decimals: 0,
    read: (r) => r.state.resources.money },
  { key: 'biodiversity', label: 'Biodiversity', icon: '🦋', unit: '/100', goodUp: true, decimals: 1,
    read: planetBiodiversity },
];

/** Format a headline value: grouped integer at 0 decimals, else fixed; optional leading '+'. */
function formatValue(value: number, decimals: number, signed: boolean): string {
  const text = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString('en-US');
  return signed && value > 0 ? `+${text}` : text;
}

/**
 * Build the end-of-turn report by diffing the two most recent turn snapshots. Returns null when
 * there is no prior turn to compare against (only the baseline in the log). Pure — no engine call;
 * every delta is a diff of `turnLog` records, so it re-runs cheaply whenever the log grows.
 */
export function turnReport(log: TurnRecord[]): TurnReport | null {
  if (log.length < 2) return null;
  const cur = log[log.length - 1]!;
  const prev = log[log.length - 2]!;

  const metrics: MetricDelta[] = SPECS.map((spec) => {
    const value = spec.read(cur);
    const delta = value - spec.read(prev);
    return {
      key: spec.key,
      label: spec.label,
      icon: spec.icon,
      unit: spec.unit,
      value,
      valueText: formatValue(value, spec.decimals, spec.signed ?? false),
      delta,
      goodUp: spec.goodUp,
      change: changeSince(delta, spec.goodUp),
    };
  });

  return { turn: cur.turn, year: cur.year, prevYear: prev.year, metrics };
}
