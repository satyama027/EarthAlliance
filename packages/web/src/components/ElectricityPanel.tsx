import { Box, Divider, Group, Stack, Text } from '@mantine/core';
import { GENERATION_SOURCE_IDS, type GenerationMix, type GenerationSource } from '@earth-alliance/engine';
import { GENERATION_COLORS } from '../theme.js';
import { changeSince, type ChangeChip, type ChangeTone } from '../game/metricTree.js';
import { latestReading, readingAt, type Entity } from '../game/metricSeries.js';
import type { ElectricityByFuel } from '../game/metricSeries.js';
import type { TurnRecord } from '../game/useGame.js';

/**
 * The custom drill-down view for the Electricity node. Two **separate** infographics, one concern each,
 * never mixed: a **generation donut** (share of power, sums to 100%, grouped Fossil vs Clean) on top,
 * and **converging emission streams** (stream width = a source's Gt CO₂/yr, merging to the electricity
 * total) below. Nuclear + the four renewables generate power but emit nothing — rendered as dashed,
 * zero-width streams labelled `0`. This makes the generation↔emissions decoupling legible: coal's
 * generation share can fall while its emissions (coal-dominated) still lag.
 */
interface ElectricityPanelProps {
  entity: Entity;
  log: TurnRecord[];
}

const LABEL: Record<GenerationSource, string> = {
  coal: 'Coal', gas: 'Gas', oil: 'Oil', nuclear: 'Nuclear',
  hydro: 'Hydro', wind: 'Wind', solar: 'Solar', geothermal: 'Geotherm',
};
const FOSSIL: GenerationSource[] = ['coal', 'gas', 'oil'];
const CLEAN: GenerationSource[] = ['nuclear', 'hydro', 'wind', 'solar', 'geothermal'];
const TONE_HEX: Record<ChangeTone, string> = { good: '#63e6be', bad: '#ff6b6b', flat: '#909296' };

const pct = (v: number) => Math.round(v * 100);
const fmtGt = (v: number) => (v >= 1 ? v.toFixed(1) : v.toFixed(2));
const emissionOf = (s: GenerationSource, fuel: ElectricityByFuel): number =>
  s === 'coal' ? fuel.coal : s === 'gas' ? fuel.gas : s === 'oil' ? fuel.oil : 0;

function SecLabel({ children, note }: { children: string; note: string }) {
  return (
    <Text tt="uppercase" fw={700} c="dimmed" style={{ fontSize: 10, letterSpacing: '.06em' }}>
      {children} <Text span c="dimmed" fw={400} tt="none" style={{ letterSpacing: 0 }}>{note}</Text>
    </Text>
  );
}

/** Generation donut (8 slices, fossils then clean) with the clean share in the hole. */
function Donut({ mix }: { mix: GenerationMix }) {
  const R = 42, C = 2 * Math.PI * R;
  let offset = 0;
  const segs = GENERATION_SOURCE_IDS.map((s) => {
    const len = mix[s] * C;
    const seg = { s, len, offset };
    offset -= len;
    return seg;
  });
  const clean = CLEAN.reduce((a, s) => a + mix[s], 0);
  return (
    <Box style={{ position: 'relative', width: 130, height: 130, flex: '0 0 auto' }}>
      <svg viewBox="0 0 120 120" width={130} height={130} role="img" aria-label="generation mix">
        <g transform="rotate(-90 60 60)" fill="none" strokeWidth={15}>
          {segs.map(({ s, len, offset: o }) => (
            <circle key={s} cx={60} cy={60} r={R} stroke={GENERATION_COLORS[s]}
              strokeDasharray={`${len.toFixed(2)} ${(C - len).toFixed(2)}`} strokeDashoffset={o.toFixed(2)} />
          ))}
        </g>
      </svg>
      <Box style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Text fw={800} style={{ fontSize: 21, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pct(clean)}%</Text>
        <Text c="dimmed" tt="uppercase" style={{ fontSize: 9.5, letterSpacing: '.06em', marginTop: 2 }}>clean</Text>
      </Box>
    </Box>
  );
}

/** Two grouped legend columns — Fossil vs Clean — each with a subtotal, sources largest-first. */
function GenLegend({ mix }: { mix: GenerationMix }) {
  const group = (sources: GenerationSource[]) => sources.filter((s) => mix[s] > 0).sort((a, b) => mix[b] - mix[a]);
  const subtotal = (sources: GenerationSource[]) => sources.reduce((a, s) => a + mix[s], 0);
  const col = (title: string, sources: GenerationSource[]) => (
    <Box>
      <Group justify="space-between" style={{ borderBottom: '1px solid var(--mantine-color-dark-4)', paddingBottom: 3, marginBottom: 5 }}>
        <Text tt="uppercase" fw={700} c="dimmed" style={{ fontSize: 10, letterSpacing: '.05em' }}>{title}</Text>
        <Text fw={700} style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{pct(subtotal(sources))}%</Text>
      </Group>
      <Stack gap={2}>
        {group(sources).map((s) => (
          <Group key={s} gap={7} wrap="nowrap">
            <Box style={{ width: 9, height: 9, borderRadius: 2, background: GENERATION_COLORS[s], flex: 'none' }} />
            <Text style={{ fontSize: 12, flex: 1 }}>{LABEL[s]}</Text>
            <Text fw={700} style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{pct(mix[s])}%</Text>
          </Group>
        ))}
      </Stack>
    </Box>
  );
  return (
    <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', flex: 1 }}>
      {col('Fossil', FOSSIL)}
      {col('Clean', CLEAN)}
    </Box>
  );
}

// Streams geometry (viewBox 0 0 470 300). Sources are evenly spaced on the left and flow into a pool
// on the right; an emitter's ribbon thickness is its share of the emitting total (× the pool height).
const SX = 148, CX = 270, NX = 360, NW = 15, HP = 54, POOL_TOP = 123, POOL_BOT = 177;

function Streams({ fuel, total, chip, firstYear }: { fuel: ElectricityByFuel; total: number; chip: ChangeChip; firstYear: number }) {
  const totalEmit = fuel.coal + fuel.gas + fuel.oil || 1;
  let cum = POOL_TOP;
  const rows = GENERATION_SOURCE_IDS.map((s, i) => {
    const anchorY = 45 + 33.5 * i;
    const e = emissionOf(s, fuel);
    const th = (e / totalEmit) * HP;
    const rTop = cum, rBot = cum + th;
    cum = rBot;
    return { s, anchorY, e, th, rTop, rBot, emits: FOSSIL.includes(s) };
  });
  const ribbon = (r: { anchorY: number; th: number; rTop: number; rBot: number }) =>
    `M${SX},${r.anchorY - r.th / 2} C${CX},${r.anchorY - r.th / 2} ${CX},${r.rTop} ${NX},${r.rTop} `
    + `L${NX},${r.rBot} C${CX},${r.rBot} ${CX},${r.anchorY + r.th / 2} ${SX},${r.anchorY + r.th / 2} Z`;
  const dashed = (r: { anchorY: number }) => `M${SX},${r.anchorY} C${CX},${r.anchorY} ${CX},${POOL_BOT} ${NX},${POOL_BOT}`;
  const gas = rows[1]!, oil = rows[2]!;

  return (
    <svg viewBox="0 0 470 300" width="100%" role="img" aria-label="electricity emissions by source"
      style={{ display: 'block', overflow: 'visible', marginTop: 8 }}>
      {/* streams */}
      {rows.map((r) => (r.emits
        ? <path key={r.s} d={ribbon(r)} fill={GENERATION_COLORS[r.s]} fillOpacity={0.92} />
        : <path key={r.s} d={dashed(r)} fill="none" stroke={GENERATION_COLORS[r.s]} strokeWidth={1.4} strokeDasharray="3 3" strokeOpacity={0.6} />
      ))}
      {/* pool / total node (coal fills it; gas + oil slices at the bottom) */}
      <rect x={NX} y={POOL_TOP} width={NW} height={HP} rx={4} fill={GENERATION_COLORS.coal} />
      <rect x={NX} y={gas.rTop} width={NW} height={gas.th} fill={GENERATION_COLORS.gas} />
      <rect x={NX} y={oil.rTop} width={NW} height={Math.max(oil.th, 0.6)} fill={GENERATION_COLORS.oil} />
      <text x={384} y={151} fill="#f1f3f5" fontSize={22} fontWeight={800} letterSpacing={-0.5}>= {total.toFixed(1)}</text>
      <text x={385} y={165} fill="#909296" fontSize={9.5}>Gt CO₂/yr</text>
      <text x={385} y={179} fill={TONE_HEX[chip.tone]} fontSize={10} fontWeight={700}>{chip.arrow} {chip.label} since {firstYear}</text>
      {/* source labels: dot + name + emission value at each stream origin */}
      {rows.map((r) => (
        <g key={r.s}>
          <rect x={6} y={r.anchorY - 4.5} width={9} height={9} rx={2} fill={GENERATION_COLORS[r.s]} />
          <text x={20} y={r.anchorY + 4} fill="#f1f3f5" fontSize={11.5}>{LABEL[r.s]}</text>
          {r.emits
            ? <text x={142} y={r.anchorY + 4} textAnchor="end" fill="#f1f3f5" fontSize={11.5} fontWeight={700}>{fmtGt(r.e)} <tspan fill="#909296" fontSize={9} fontWeight={400}>Gt</tspan></text>
            : <text x={142} y={r.anchorY + 4} textAnchor="end" fill="#63e6be" fontSize={11.5} fontWeight={700}>0</text>}
        </g>
      ))}
    </svg>
  );
}

export function ElectricityPanel({ entity, log }: ElectricityPanelProps) {
  const latest = latestReading(log, entity);
  const first = readingAt(entity, log[0]!);
  const total = latest.sources.electricity;
  const chip = changeSince(total - first.sources.electricity, false); // emissions: down is good
  return (
    <Stack gap="sm">
      <Box>
        <SecLabel note="— share of power · = 100%">Generation mix</SecLabel>
        <Group gap={16} align="center" mt={10} wrap="nowrap">
          <Donut mix={latest.generationMix} />
          <GenLegend mix={latest.generationMix} />
        </Group>
      </Box>
      <Divider />
      <Box>
        <SecLabel note="— stream width = Gt CO₂/yr">Electricity emissions</SecLabel>
        <Streams fuel={latest.electricityByFuel} total={total} chip={chip} firstYear={log[0]!.year} />
      </Box>
    </Stack>
  );
}
