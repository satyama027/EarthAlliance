import { Fragment } from 'react';
import { Box, Group, Text, Tooltip } from '@mantine/core';
import type { GenerationSource, Region } from '@earth-alliance/engine';
import { GENERATION_COLORS } from '../theme.js';

/** The three bands, in bar order, each listing its sources (also in bar order within the band). */
const BANDS: { name: string; accent: string; sources: GenerationSource[] }[] = [
  { name: 'Fossil', accent: GENERATION_COLORS.oil, sources: ['coal', 'gas', 'oil'] },
  { name: 'Nuclear', accent: GENERATION_COLORS.nuclear, sources: ['nuclear'] },
  { name: 'Renewable', accent: GENERATION_COLORS.hydro, sources: ['hydro', 'wind', 'solar', 'geothermal'] },
];

const LABEL: Record<GenerationSource, string> = {
  coal: 'Coal', gas: 'Gas', oil: 'Oil', nuclear: 'Nuclear',
  hydro: 'Hydro', wind: 'Wind', solar: 'Solar', geothermal: 'Geothermal',
};

// Hover copy: what the source is + how it moves in the model.
const TOOLTIP: Record<GenerationSource, string> = {
  coal: 'Coal — the dirtiest source (emission factor 1.0). Renewable & nuclear buildout retire it first.',
  gas: 'Natural gas — ~0.45× coal’s carbon per unit. Retired after coal.',
  oil: 'Oil-fired power — ~0.70× coal. Significant only in a few oil-rich grids.',
  nuclear: 'Nuclear — firm, zero-carbon baseload (but not “renewable”). Grown by Nuclear Buildout; not storage-gated.',
  hydro: 'Hydropower — renewable, zero-carbon. Geographically fixed (seeded, not policy-grown).',
  wind: 'Wind — renewable, intermittent. Grown by Renewable Subsidy (storage-gated).',
  solar: 'Solar — renewable, intermittent. Grown by Renewable Subsidy (storage-gated).',
  geothermal: 'Geothermal — renewable, firm. Seeded; matters in a few volcanic grids.',
};

const pct = (v: number) => Math.round(v * 100);

/** Sources of a band that have a non-zero share, ordered by size descending. */
function bandSources(mix: Region['generationMix'], sources: GenerationSource[]) {
  return sources.filter((s) => mix[s] > 0).sort((a, b) => mix[b] - mix[a]);
}

/**
 * Per-region electricity generation mix (RegionPanel). A derived grid-intensity gauge over a banded
 * stacked bar (fossil | nuclear | renewable, separated by 2px gaps) and a band-grouped legend with
 * subtotals. Mirrors the EmissionsBySource visual language. Grid intensity is DERIVED from the mix.
 */
export function GenerationMix({ region }: { region: Region }) {
  const mix = region.generationMix;
  const intensity = region.gridCarbonIntensity;

  return (
    <Box>
      {/* Derived grid-intensity readout + gauge */}
      <Box mb={10}>
        <Group justify="space-between" gap={6}>
          <Text size="xs" c="dimmed">Grid carbon intensity <Text span c="dimmed" opacity={0.7}>(derived)</Text></Text>
          <Text size="xs" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>{intensity.toFixed(2)}</Text>
        </Group>
        <Box style={{ position: 'relative', height: 6, borderRadius: 3, marginTop: 6,
          background: 'linear-gradient(90deg, #2f9e44 0%, #fab005 55%, #e03131 100%)' }}>
          <Box style={{ position: 'absolute', top: -3, left: `calc(${Math.min(1, Math.max(0, intensity)) * 100}% - 1px)`,
            width: 2, height: 12, background: '#fff', borderRadius: 1, boxShadow: '0 0 0 1px rgba(0,0,0,.6)' }} />
        </Box>
        <Group justify="space-between" mt={3}>
          <Text size="10px" c="dimmed">0 · clean</Text>
          <Text size="10px" c="dimmed">coal · 1.0</Text>
        </Group>
      </Box>

      {/* Banded stacked bar */}
      <Box style={{ display: 'flex', height: 18, borderRadius: 4, overflow: 'hidden', background: 'var(--mantine-color-dark-8)' }}>
        {BANDS.map((band, bi) => (
          <Fragment key={band.name}>
            {bi > 0 && <Box style={{ width: 2, height: '100%', background: 'var(--mantine-color-dark-8)', flex: 'none' }} />}
            {bandSources(mix, band.sources).map((s) => (
              <Box key={s} title={`${LABEL[s]} · ${pct(mix[s])}%`} style={{ width: `${mix[s] * 100}%`, height: '100%', background: GENERATION_COLORS[s] }} />
            ))}
          </Fragment>
        ))}
      </Box>

      {/* Band-grouped legend with subtotals */}
      <Box style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 10px', marginTop: 10 }}>
        {BANDS.map((band) => {
          const subtotal = band.sources.reduce((s, k) => s + mix[k], 0);
          return (
            <Fragment key={band.name}>
              <Box style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 6, paddingBottom: 2, borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
                <Group gap={6} wrap="nowrap">
                  <Box style={{ width: 8, height: 8, borderRadius: 2, background: band.accent, flex: 'none' }} />
                  <Text size="10px" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.06em' }}>{band.name}</Text>
                </Group>
                <Text size="11px" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>{pct(subtotal)}%</Text>
              </Box>
              {bandSources(mix, band.sources).map((s) => (
                <Fragment key={s}>
                  <Tooltip multiline w={250} withArrow label={TOOLTIP[s]} events={{ hover: true, focus: true, touch: true }}>
                    <Group gap={7} wrap="nowrap" style={{ cursor: 'help' }}>
                      <Box style={{ width: 10, height: 10, borderRadius: 2, background: GENERATION_COLORS[s], flex: 'none' }} />
                      <Text size="xs" style={{ borderBottom: '1px dotted var(--mantine-color-dimmed)' }}>{LABEL[s]}</Text>
                    </Group>
                  </Tooltip>
                  <Text size="xs" fw={600} ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>{pct(mix[s])}%</Text>
                </Fragment>
              ))}
            </Fragment>
          );
        })}
      </Box>
    </Box>
  );
}
