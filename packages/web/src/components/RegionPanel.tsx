import { Paper, Stack, Text, Title, Divider } from '@mantine/core';
import type { Region } from '@earth-alliance/engine';
import { EmissionsBySource } from './EmissionsBySource.js';
import { GenerationMix } from './GenerationMix.js';
import { RegionLevers } from './RegionLevers.js';
import { RegionIncome } from './RegionIncome.js';
import { CapLabel, MetricBar } from './panelBits.js';
import type { RegionBudget } from '../game/regionBudget.js';

export function RegionPanel({ region, budget }: { region: Region | null; budget?: RegionBudget }) {
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
        <CapLabel>Generation mix</CapLabel>
        <GenerationMix mix={region.generationMix} intensity={region.gridCarbonIntensity} />

        <Divider my={4} />
        <CapLabel>Energy &amp; land levers</CapLabel>
        <RegionLevers
          gridIntensity={region.gridCarbonIntensity}
          storage={region.energyStorageCapacity}
          cropYield={region.agriculturalProductivity}
          powerDemand={region.electricityDemand}
        />

        {budget && <RegionIncome budget={budget} />}

        <Divider my={4} />
        <MetricBar label="Public support" value={region.publicSupport} />
        <MetricBar label="Equity" value={region.equityIndex} />
        <MetricBar label="Biodiversity" value={region.biodiversityIndex} />
        <MetricBar label="Water" value={region.waterAvailability} />
        <MetricBar label="Land" value={region.landAvailability} />
      </Stack>
    </Paper>
  );
}
