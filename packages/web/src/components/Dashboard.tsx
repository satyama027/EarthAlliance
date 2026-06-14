import { Group, Paper, Stack, Text, Title } from '@mantine/core';
import type { Region } from '@earth-alliance/engine';
import { Sparkline } from './Sparkline.js';
import { EmissionsBySource, EMISSION_SOURCES, type SourceValues } from './EmissionsBySource.js';
import { temperatureColor } from '../scene/metricColor.js';
import type { ClimatePoint } from '../game/useGame.js';

interface DashboardProps {
  temperature: number;
  co2: number;
  annualEmissions: number;
  regions: Region[];
  history: ClimatePoint[];
}

/** Sum each emission source across all regions for the global breakdown. */
function globalSources(regions: Region[]): SourceValues {
  const totals = Object.fromEntries(EMISSION_SOURCES.map((k) => [k, 0])) as SourceValues;
  for (const r of regions) for (const k of EMISSION_SOURCES) totals[k] += r[k];
  return totals;
}

export function Dashboard({ temperature, co2, annualEmissions, regions, history }: DashboardProps) {
  return (
    <Paper p="sm" withBorder>
      <Stack gap="xs">
        <Title order={4}>Planet</Title>
        <Group justify="space-between">
          <Text>Warming</Text>
          <Text fw={700} c={temperatureColor(temperature)}>+{temperature.toFixed(2)} °C</Text>
        </Group>
        <Group justify="space-between"><Text>CO₂</Text><Text fw={700}>{co2.toFixed(0)} ppm</Text></Group>
        <Group justify="space-between"><Text>Emissions</Text><Text fw={700}>{annualEmissions.toFixed(1)} Gt/yr</Text></Group>
        <Text size="xs" c="earth.7" tt="uppercase" fw={600}>Emissions by source</Text>
        <EmissionsBySource sources={globalSources(regions)} precision={1} />
        <Sparkline values={history.map((h) => h.temperature)} width={240} height={40} />
      </Stack>
    </Paper>
  );
}
