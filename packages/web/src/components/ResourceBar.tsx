import { ActionIcon, Group, Paper, Text, Badge, Stack } from '@mantine/core';
import { temperatureColor } from '../scene/metricColor.js';

interface ResourceBarProps {
  year: number;
  turn: number;
  money: number;
  /** This turn's staged spend (money). Subtracted so the bar shows what is REMAINING. */
  costNow?: { money: number };
  /** Opens the emissions-data overlay. */
  onOpenData?(): void;
  /** Headline climate stats shown inline (Variant A). Omitted in isolated unit tests. */
  temperature?: number;
  co2?: number;
  annualEmissions?: number;
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export function ResourceBar({
  year, turn, money, costNow, onOpenData, temperature, co2, annualEmissions,
}: ResourceBarProps) {
  const moneyLeft = money - (costNow?.money ?? 0);
  const over = moneyLeft < 0;
  const showClimate = temperature !== undefined && co2 !== undefined && annualEmissions !== undefined;

  return (
    <Paper p="sm" withBorder>
      <Stack gap={over ? 6 : 0}>
        <Group justify="space-between" wrap="nowrap">
          <Group gap="md" wrap="nowrap">
            <Text fw={700} style={{ whiteSpace: 'nowrap' }}>Year {year} · Turn {turn}</Text>
            {showClimate && (
              <Group gap="sm" wrap="nowrap" visibleFrom="sm">
                <Text size="sm" fw={700} c={temperatureColor(temperature)} style={{ whiteSpace: 'nowrap' }}>
                  🌡 +{temperature.toFixed(2)} °C
                </Text>
                <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
                  <Text span c="dimmed">CO₂ </Text><Text span fw={700}>{co2.toFixed(0)} ppm</Text>
                </Text>
                <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
                  <Text span c="dimmed">Emissions </Text><Text span fw={700}>{annualEmissions.toFixed(1)} Gt/yr</Text>
                </Text>
              </Group>
            )}
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Badge color={over ? 'red' : 'teal'} size="lg" leftSection="💰">Money: {fmt(moneyLeft)}</Badge>
            {onOpenData && (
              <ActionIcon aria-label="Emissions data" title="Emissions data"
                color="earth" variant="filled" size="lg" onClick={onOpenData}>
                📊
              </ActionIcon>
            )}
          </Group>
        </Group>
        {over && (
          <Text role="alert" c="red" size="xs" fw={600} ta="right">
            ⚠ over budget — remove a policy to End Turn
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
