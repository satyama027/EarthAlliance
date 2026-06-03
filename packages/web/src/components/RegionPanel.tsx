import { Paper, Stack, Text, Title, Progress, Group } from '@mantine/core';
import type { Region } from '@earth-alliance/engine';
import { metricColor } from '../scene/metricColor.js';

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Stack gap={2}>
      <Group justify="space-between"><Text size="sm">{label}</Text><Text size="sm" fw={600}>{Math.round(value)}</Text></Group>
      <Progress value={value} color={metricColor(value)} />
    </Stack>
  );
}

export function RegionPanel({ region }: { region: Region | null }) {
  if (!region) {
    return <Paper p="sm" withBorder><Text c="dimmed">Select a region on the globe.</Text></Paper>;
  }
  return (
    <Paper p="sm" withBorder>
      <Stack gap="xs">
        <Title order={4}>{region.name}</Title>
        <Text size="sm" c="dimmed">GDP/capita ${Math.round(region.gdpPerCapita).toLocaleString()} · pop {(region.population / 1e6).toFixed(0)}M</Text>
        <Metric label="Public support" value={region.publicSupport} />
        <Metric label="Equity" value={region.equityIndex} />
        <Metric label="Biodiversity" value={region.biodiversityIndex} />
        <Metric label="Water" value={region.waterAvailability} />
        <Metric label="Land" value={region.landAvailability} />
      </Stack>
    </Paper>
  );
}
