import { Divider, Group, Paper, Stack, Text, Title } from '@mantine/core';
import type { Region, TurnDiagnostics } from '@earth-alliance/engine';
import { Sparkline } from './Sparkline.js';
import { EmissionsBySource } from './EmissionsBySource.js';
import { GenerationMix } from './GenerationMix.js';
import { RegionLevers } from './RegionLevers.js';
import { RegionIncome } from './RegionIncome.js';
import { CapLabel, MetricBar } from './panelBits.js';
import { temperatureColor } from '../scene/metricColor.js';
import { planetAggregate } from '../game/planetAggregate.js';
import type { ClimatePoint } from '../game/useGame.js';

interface DashboardProps {
  temperature: number;
  co2: number;
  annualEmissions: number;
  regions: Region[];
  history: ClimatePoint[];
  /** Last turn's diagnostics for the summed planet income (turn-0 projection when null). */
  diagnostics?: TurnDiagnostics | null;
}

/**
 * The planet drill-down (DataOverlay, planet view). A superset of a region's panel: the climate-native
 * block (warming / CO₂ / emissions / temperature sparkline) plus planet-level equivalents of every
 * region section — emissions by source, generation mix, energy & land levers, income, and the five
 * quality bars — all from `planetAggregate` (see it for the aggregation rules), so the two drill-downs
 * read identically. Reuses the same components as RegionPanel; no emissions logic is duplicated.
 */
export function Dashboard({ temperature, co2, annualEmissions, regions, history, diagnostics = null }: DashboardProps) {
  const p = planetAggregate(regions, diagnostics);
  const popM = (p.population / 1e6).toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <Paper p="sm" withBorder>
      <Stack gap="xs">
        <Title order={4}>Planet</Title>
        <Text size="sm" c="dimmed">
          pop {popM}M · GDP/capita ${Math.round(p.gdpPerCapita).toLocaleString()}
        </Text>

        <Group justify="space-between">
          <Text>Warming</Text>
          <Text fw={700} c={temperatureColor(temperature)}>+{temperature.toFixed(2)} °C</Text>
        </Group>
        <Group justify="space-between"><Text>CO₂</Text><Text fw={700}>{co2.toFixed(0)} ppm</Text></Group>
        <Group justify="space-between"><Text>Emissions</Text><Text fw={700}>{annualEmissions.toFixed(1)} Gt/yr</Text></Group>

        <CapLabel>Emissions by source</CapLabel>
        <EmissionsBySource sources={p.sources} precision={1} />

        <Divider my={4} />
        <CapLabel>Generation mix</CapLabel>
        <GenerationMix mix={p.generationMix} intensity={p.gridCarbonIntensity} />

        <Divider my={4} />
        <CapLabel>Energy &amp; land levers</CapLabel>
        <RegionLevers
          gridIntensity={p.gridCarbonIntensity}
          storage={p.energyStorageCapacity}
          cropYield={p.agriculturalProductivity}
          powerDemand={p.electricityDemand}
        />

        <RegionIncome budget={p.budget} carbonTaxNote="shrinks as the planet decarbonises" />

        <Divider my={4} />
        <MetricBar label="Public support" value={p.publicSupport} />
        <MetricBar label="Equity" value={p.equityIndex} />
        <MetricBar label="Biodiversity" value={p.biodiversityIndex} />
        <MetricBar label="Water" value={p.waterAvailability} />
        <MetricBar label="Land" value={p.landAvailability} />

        <Sparkline values={history.map((h) => h.temperature)} width={240} height={40} />
      </Stack>
    </Paper>
  );
}
