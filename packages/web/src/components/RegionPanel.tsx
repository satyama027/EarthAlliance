import { Paper, Stack, Text, Title, Progress, Group, Divider } from '@mantine/core';
import type { Region } from '@earth-alliance/engine';
import { metricColor } from '../scene/metricColor.js';
import { EmissionsBySource } from './EmissionsBySource.js';
import { RegionLevers } from './RegionLevers.js';

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Stack gap={2}>
      <Group justify="space-between"><Text size="sm">{label}</Text><Text size="sm" fw={600}>{Math.round(value)}</Text></Group>
      <Progress value={value} color={metricColor(value)} />
    </Stack>
  );
}

function CapLabel({ children }: { children: string }) {
  return <Text size="xs" c="earth.7" tt="uppercase" fw={600}>{children}</Text>;
}

export function RegionPanel({ region }: { region: Region | null }) {
  if (!region) {
    return <Paper p="sm" withBorder><Text c="dimmed">Select a region on the globe.</Text></Paper>;
  }
  return (
    <Paper p="sm" withBorder>
      <Stack gap="xs">
        <Title order={4}>{region.name}</Title>
        <Text size="sm" c="dimmed">
          GDP/capita ${Math.round(region.gdpPerCapita).toLocaleString()} · pop {(region.population / 1e6).toFixed(0)}M · {region.regionalEmissions.toFixed(2)} Gt/yr
        </Text>

        <CapLabel>Emissions by source</CapLabel>
        <EmissionsBySource sources={region} precision={2} />

        <Divider my={4} />
        <CapLabel>Energy &amp; land levers</CapLabel>
        <RegionLevers region={region} />

        <Divider my={4} />
        <Metric label="Public support" value={region.publicSupport} />
        <Metric label="Equity" value={region.equityIndex} />
        <Metric label="Biodiversity" value={region.biodiversityIndex} />
        <Metric label="Water" value={region.waterAvailability} />
        <Metric label="Land" value={region.landAvailability} />
      </Stack>
    </Paper>
  );
}
