import type { ReactNode } from 'react';
import { Box, Button, Group, Paper, Progress, Stack, Text } from '@mantine/core';
import type { Region } from '@earth-alliance/engine';
import { metricColor, temperatureColor } from '../scene/metricColor.js';
import { REGION_COLORS } from '../theme.js';

interface RegionInfoBoxProps {
  /** Selected region → its headline stats; `null` → the planet quick-stats. */
  region: Region | null;
  temperature: number;
  co2: number;
  annualEmissions: number;
  /** Opens the full emissions-data overlay (the 📊 drill-down). */
  onOpenData(): void;
}

/** A compact label + bold value pair. */
function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="md" fw={700} style={{ lineHeight: 1.15 }}>{children}</Text>
    </Stack>
  );
}

/** A dimmed unit suffix (e.g. "Gt/yr") trailing a value. */
function Unit({ children }: { children: ReactNode }) {
  return <Text span size="xs" c="dimmed" ml={2}>{children}</Text>;
}

/**
 * The compact info box beside the map. A single region click surfaces its headline numbers
 * (GDP/capita · emissions · public support); with no region selected it shows planet quick-stats
 * (warming · CO₂ · emissions). Either way a 📊 button opens the full `DataOverlay` via `onOpenData`
 * — no emissions logic is duplicated. Deliberately content-height so it reads as a glance-card, not
 * a column rivaling the map.
 */
export function RegionInfoBox({ region, temperature, co2, annualEmissions, onOpenData }: RegionInfoBoxProps) {
  if (!region) {
    return (
      <Paper p="sm" withBorder>
        <Stack gap="xs">
          <Text fw={700} size="sm">🌍 Planet</Text>
          <Stack gap={8}>
            <Stat label="Warming">
              <Text span inherit c={temperatureColor(temperature)}>+{temperature.toFixed(2)}</Text>
              <Unit>°C</Unit>
            </Stat>
            <Stat label="CO₂">{co2.toFixed(0)}<Unit>ppm</Unit></Stat>
            <Stat label="Emissions">{annualEmissions.toFixed(1)}<Unit>Gt/yr</Unit></Stat>
          </Stack>
          <Text size="xs" c="dimmed" fs="italic" ta="center" mt={2}>Click a region for its data</Text>
          <Button fullWidth color="earth" size="sm" leftSection="📊" onClick={onOpenData}>
            Full planet data
          </Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper p="sm" withBorder>
      <Stack gap="xs">
        <Box>
          <Group gap={7} wrap="nowrap">
            <Box w={10} h={10} style={{ borderRadius: 3, flex: '0 0 auto',
              background: REGION_COLORS[region.id] ?? 'var(--mantine-color-dimmed)' }} />
            <Text fw={700} size="sm">{region.name}</Text>
          </Group>
          <Text size="xs" c="dimmed" mt={1}>pop {(region.population / 1e6).toFixed(0)}M</Text>
        </Box>
        <Stack gap={8}>
          <Stat label="GDP per capita">${Math.round(region.gdpPerCapita).toLocaleString('en-US')}</Stat>
          <Stat label="Emissions">{region.regionalEmissions.toFixed(1)}<Unit>Gt/yr</Unit></Stat>
          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Public support</Text>
              <Text size="sm" fw={700}>{Math.round(region.publicSupport)}</Text>
            </Group>
            <Progress value={region.publicSupport} color={metricColor(region.publicSupport)} size="sm" />
          </Stack>
        </Stack>
        <Button fullWidth color="earth" size="sm" leftSection="📊" onClick={onOpenData}>
          Full region data
        </Button>
      </Stack>
    </Paper>
  );
}
