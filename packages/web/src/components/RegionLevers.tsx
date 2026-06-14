import { Box, Group, Text, Tooltip } from '@mantine/core';
import type { Region } from '@earth-alliance/engine';
import { SOURCE_COLORS } from '../theme.js';

function InfoTip({ label }: { label: string }) {
  return (
    <Tooltip multiline w={250} withArrow label={label} events={{ hover: true, focus: true, touch: true }}>
      <Box
        component="span"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 13, height: 13, borderRadius: '50%', fontSize: 9, lineHeight: 1, cursor: 'help',
          border: '1px solid var(--mantine-color-dimmed)', color: 'var(--mantine-color-dimmed)',
        }}
        aria-label={`info: ${label}`}
      >
        i
      </Box>
    </Tooltip>
  );
}

function Lever({ label, tip, value, barPct, barColor, subtext }: {
  label: string; tip: string; value: string; barPct?: number; barColor?: string; subtext?: string;
}) {
  return (
    <Box>
      <Group gap={4} c="dimmed"><Text size="xs">{label}</Text><InfoTip label={tip} /></Group>
      <Text fw={700} size="sm">{value}</Text>
      {barPct !== undefined ? (
        <Box style={{ height: 6, background: 'var(--mantine-color-dark-8)', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
          <Box style={{ width: `${Math.min(100, Math.max(0, barPct))}%`, height: '100%', background: barColor }} />
        </Box>
      ) : (
        subtext && <Text size="xs" c="dimmed" mt={2}>{subtext}</Text>
      )}
    </Box>
  );
}

/** The four coupling variables the new policies move, shown as a 2×2 grid with hover tooltips. */
export function RegionLevers({ region }: { region: Region }) {
  return (
    <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
      <Lever
        label="Grid intensity"
        tip="Grid intensity (0–1) — CO₂ per unit of electricity. 1 ≈ coal, 0 = clean. Power emissions = grid intensity × power demand. Lowered by renewables, nuclear & carbon pricing — the master lever for the power sector."
        value={region.gridCarbonIntensity.toFixed(2)}
        barPct={region.gridCarbonIntensity * 100}
        barColor={SOURCE_COLORS.electricity}
      />
      <Lever
        label="Storage built"
        tip="Grid storage (0–100%) — installed batteries. Until it's built, intermittent renewables deliver only ~60% of their benefit; at 100% they deliver all of it. Doesn't affect firm nuclear."
        value={`${Math.round(region.energyStorageCapacity * 100)}%`}
        barPct={region.energyStorageCapacity * 100}
        barColor="var(--mantine-color-earth-6)"
      />
      <Lever
        label="Crop yield"
        tip="Agricultural productivity (100 = baseline). Organic farming lowers it; precision ag raises it. Below 100, more land is needed per tonne — so it slowly erodes this region's land availability."
        value={`${Math.round(region.agriculturalProductivity)}`}
        barPct={region.agriculturalProductivity}
        barColor={SOURCE_COLORS.agriculture}
      />
      <Lever
        label="Power demand"
        tip="Electricity demand — total power drawn, grows with GDP. EVs & industrial electrification raise it — which only cuts emissions if the grid is clean (electricity = demand × grid intensity)."
        value={region.electricityDemand.toFixed(2)}
        subtext="grows with GDP"
      />
    </Box>
  );
}
