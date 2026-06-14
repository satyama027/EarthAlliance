import { Fragment } from 'react';
import { Box, Group, Text, Tooltip } from '@mantine/core';
import { SOURCE_COLORS } from '../theme.js';

/** The six emission sources, keyed exactly as on the engine `Region`. */
export const EMISSION_SOURCES = [
  'electricity', 'transport', 'aviationShipping', 'industry', 'agriculture', 'landUse',
] as const;
export type EmissionSource = (typeof EMISSION_SOURCES)[number];

export type SourceValues = Record<EmissionSource, number>;

const LABEL: Record<EmissionSource, string> = {
  electricity: 'Electricity',
  transport: 'Transport',
  aviationShipping: 'Aviation & Shipping',
  industry: 'Industry',
  agriculture: 'Agriculture',
  landUse: 'Land-use',
};

// Hover copy: what the source is + how it moves in the model (the user asked for this).
const TOOLTIP: Record<EmissionSource, string> = {
  electricity: 'Electricity & heat — power generation. Derived as power demand × grid intensity. Clean the grid or cut demand to lower it.',
  transport: 'Road transport — scales with GDP. Cut by EVs (which raise power demand), public transit, and fuel-efficiency standards.',
  aviationShipping: 'Aviation & shipping — hard to abate: cannot fall below a floor even at full policy. Cut by sustainable fuels and a flight/freight levy.',
  industry: 'Industry — steel, cement, chemicals (energy + process). Scales with GDP. Cut by electrification, green steel, CCS, circular economy.',
  agriculture: 'Agriculture — livestock methane & fertilizer N₂O. Scales with population. Cut by organic/precision farming and diet shift.',
  landUse: 'Land-use & forestry — deforestation vs. forest sink. Reforestation / anti-deforestation can drive it negative (a carbon sink).',
};

const colorFor = (key: EmissionSource, value: number): string =>
  value < 0 ? SOURCE_COLORS.sink : SOURCE_COLORS[key];

/**
 * Emissions-by-source stacked bar + legend. Sources are ordered by size (descending). The one
 * source that can go negative (`landUse` after reforestation) renders as a dashed-teal **sink**
 * segment left of a zero divider; positives stack to its right. Each legend label carries a
 * tooltip explaining the source.
 */
export function EmissionsBySource({ sources, precision = 2 }: { sources: SourceValues; precision?: number }) {
  const entries = EMISSION_SOURCES.map((key) => ({ key, label: LABEL[key], value: sources[key] }));
  const positives = entries.filter((e) => e.value > 0).sort((a, b) => b.value - a.value);
  const sink = entries.find((e) => e.value < 0);
  const sumPos = positives.reduce((s, e) => s + e.value, 0) || 1;
  const sinkMag = sink ? -sink.value : 0;
  const gross = sumPos + sinkMag;
  const legend = sink ? [...positives, sink] : positives;
  const fmt = (v: number) => v.toFixed(precision);

  return (
    <Box>
      <Box style={{ display: 'flex', height: 18, borderRadius: 4, overflow: 'hidden', background: 'var(--mantine-color-dark-8)' }}>
        {sinkMag > 0 && (
          <Box style={{ width: `${(sinkMag / gross) * 100}%`, height: '100%', background: SOURCE_COLORS.sink, border: '1px dashed var(--mantine-color-earth-3)', boxSizing: 'border-box' }} />
        )}
        {sinkMag > 0 && <Box style={{ width: 1, height: '100%', background: 'var(--mantine-color-dimmed)' }} />}
        {positives.map((e) => (
          <Box key={e.key} style={{ width: `${(e.value / gross) * 100}%`, height: '100%', background: colorFor(e.key, e.value) }} />
        ))}
      </Box>
      <Box style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '4px 10px', marginTop: 8 }}>
        {legend.map((e) => {
          const pct = e.value > 0 ? Math.round((e.value / sumPos) * 100) : null;
          const negative = e.value < 0;
          return (
            <Fragment key={e.key}>
              <Tooltip multiline w={250} withArrow label={TOOLTIP[e.key]} events={{ hover: true, focus: true, touch: true }}>
                <Group gap={7} wrap="nowrap" style={{ cursor: 'help' }}>
                  <Box style={{ width: 10, height: 10, borderRadius: 2, background: colorFor(e.key, e.value), flex: 'none' }} />
                  <Text size="xs" style={{ borderBottom: '1px dotted var(--mantine-color-dimmed)' }}>{e.label}</Text>
                </Group>
              </Tooltip>
              <Text size="xs" fw={600} ta="right" c={negative ? 'teal.4' : undefined} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {negative ? '−' : ''}{fmt(Math.abs(e.value))}
              </Text>
              <Text size="xs" c="dimmed" ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {pct !== null ? `${pct}%` : 'sink'}
              </Text>
            </Fragment>
          );
        })}
      </Box>
    </Box>
  );
}
