import { Group, Paper, Stack, Text, Title } from '@mantine/core';
import { Sparkline } from './Sparkline.js';
import { temperatureColor } from '../scene/metricColor.js';
import type { ClimatePoint } from '../game/useGame.js';

interface DashboardProps {
  temperature: number;
  co2: number;
  annualEmissions: number;
  history: ClimatePoint[];
}

export function Dashboard({ temperature, co2, annualEmissions, history }: DashboardProps) {
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
        <Sparkline values={history.map((h) => h.temperature)} width={240} height={40} />
      </Stack>
    </Paper>
  );
}
