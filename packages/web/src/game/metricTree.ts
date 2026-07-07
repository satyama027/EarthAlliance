import { SOURCE_COLORS, GENERATION_COLORS } from '../theme.js';
import {
  seriesFrom, latestReading,
  type Entity, type Reading, type TrendPoint,
} from './metricSeries.js';
import type { TurnRecord } from './useGame.js';

export type { Entity, TrendPoint } from './metricSeries.js';

/**
 * One node of the drill-down tree. Everything hangs off a single `read(reading) → number` accessor:
 * the node's **headline value** is `read` of the latest turn, and its **trend series** is `read`
 * mapped over every turn — so composition and trend share one source of truth. A `composition` node
 * shows its `children` as a contribution breakdown; a `trend` leaf shows its own value-vs-year line.
 */
export interface MetricNode {
  id: string;
  label: string;
  unit: string;                       // e.g. 'Gt CO₂/yr', '/100', '$/turn'
  kind: 'composition' | 'trend';
  read(r: Reading): number;
  children?: MetricNode[];
  /** Fixed swatch/line color. Index leaves omit it → colored by value via `metricColor`. */
  color?: string;
  /** Trend delta coloring: is an increase good? (support/biodiversity/water/land = true). */
  goodUp?: boolean;
  /** Composition style: proportional bar ('sum', default) or signed ledger ('ledger', income). */
  compose?: 'sum' | 'ledger';
  /** Income-ledger direction: money in (+) or out (−). */
  flow?: 'in' | 'out';
}

const GT = 'Gt CO₂/yr';
const INDEX = '/100';

const emissionLeaf = (id: string, label: string, color: string, read: (r: Reading) => number): MetricNode =>
  ({ id, label, unit: GT, kind: 'trend', color, goodUp: false, read });

export const METRIC_TREE: MetricNode[] = [
  {
    id: 'emissions', label: 'Emissions', unit: GT, kind: 'composition', color: SOURCE_COLORS.electricity,
    goodUp: false, read: (r) => r.regionalEmissions,
    children: [
      {
        id: 'electricity', label: 'Electricity', unit: GT, kind: 'composition', color: SOURCE_COLORS.electricity,
        goodUp: false, read: (r) => r.sources.electricity,
        children: [
          emissionLeaf('coal', 'Coal', GENERATION_COLORS.coal, (r) => r.electricityByFuel.coal),
          emissionLeaf('gas', 'Gas', GENERATION_COLORS.gas, (r) => r.electricityByFuel.gas),
          emissionLeaf('oil', 'Oil', GENERATION_COLORS.oil, (r) => r.electricityByFuel.oil),
        ],
      },
      emissionLeaf('transport', 'Transport', SOURCE_COLORS.transport, (r) => r.sources.transport),
      emissionLeaf('aviationShipping', 'Aviation & shipping', SOURCE_COLORS.aviationShipping, (r) => r.sources.aviationShipping),
      emissionLeaf('industry', 'Industry', SOURCE_COLORS.industry, (r) => r.sources.industry),
      emissionLeaf('agriculture', 'Agriculture', SOURCE_COLORS.agriculture, (r) => r.sources.agriculture),
      emissionLeaf('landUse', 'Land use', SOURCE_COLORS.landUse, (r) => r.sources.landUse),
    ],
  },
  { id: 'support', label: 'Public support', unit: INDEX, kind: 'trend', goodUp: true, read: (r) => r.publicSupport },
  {
    id: 'income', label: 'Income', unit: '$/turn', kind: 'composition', compose: 'ledger',
    color: GENERATION_COLORS.solar, goodUp: true, read: (r) => r.budget.net,
    children: [
      { id: 'tax', label: 'Tax (GDP)', unit: '$/turn', kind: 'trend', flow: 'in', goodUp: true, color: '#38d9a9', read: (r) => r.budget.taxIncome },
      { id: 'carbonTax', label: 'Carbon tax', unit: '$/turn', kind: 'trend', flow: 'in', goodUp: true, color: '#20c997', read: (r) => r.budget.carbonTax },
      { id: 'upkeep', label: 'Policy upkeep', unit: '$/turn', kind: 'trend', flow: 'out', goodUp: false, color: '#ff6b6b', read: (r) => r.budget.upkeep },
    ],
  },
  { id: 'biodiversity', label: 'Biodiversity', unit: INDEX, kind: 'trend', goodUp: true, read: (r) => r.biodiversityIndex },
  { id: 'water', label: 'Water availability', unit: INDEX, kind: 'trend', goodUp: true, read: (r) => r.waterAvailability },
  { id: 'land', label: 'Land availability', unit: INDEX, kind: 'trend', goodUp: true, read: (r) => r.landAvailability },
];

/** The six top-level metric ids, in display order. */
export function topLevelIds(): string[] {
  return METRIC_TREE.map((n) => n.id);
}

/** Walk the tree by id path. Returns null if any segment is unknown. */
export function findNode(path: string[]): MetricNode | null {
  let list: MetricNode[] = METRIC_TREE;
  let node: MetricNode | null = null;
  for (const id of path) {
    node = list.find((n) => n.id === id) ?? null;
    if (!node) return null;
    list = node.children ?? [];
  }
  return node;
}

/** Headline value of a node for an entity (the latest turn). */
export function nodeValue(node: MetricNode, entity: Entity, log: TurnRecord[]): number {
  return node.read(latestReading(log, entity));
}

/** Full value-vs-year series of a node for an entity. */
export function nodeSeries(node: MetricNode, entity: Entity, log: TurnRecord[]): TrendPoint[] {
  return seriesFrom(log, entity, node.read);
}

/** Format a scalar for display: thousands get a grouped integer, small values one decimal. */
export function fmtNum(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return Math.round(value).toLocaleString();
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

/** Split a value + unit into a `$`-aware headline: `{ main: '$8,004', suffix: '/turn' }`. */
export function headlineParts(value: number, unit: string): { main: string; suffix: string } {
  const dollar = unit.startsWith('$');
  return { main: `${dollar ? '$' : ''}${fmtNum(value)}`, suffix: dollar ? unit.slice(1) : unit };
}
