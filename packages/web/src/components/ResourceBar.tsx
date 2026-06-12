import { Group, Paper, Text, Badge, Stack } from '@mantine/core';

interface ResourceBarProps {
  year: number;
  turn: number;
  money: number;
  /** This turn's staged spend (money). Subtracted so the bar shows what is REMAINING. */
  costNow?: { money: number };
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export function ResourceBar({ year, turn, money, costNow }: ResourceBarProps) {
  const moneyLeft = money - (costNow?.money ?? 0);
  const over = moneyLeft < 0;

  return (
    <Paper p="sm" withBorder>
      <Stack gap={over ? 6 : 0}>
        <Group justify="space-between">
          <Text fw={700}>Year {year} · Turn {turn}</Text>
          <Group>
            <Badge color={over ? 'red' : 'teal'} size="lg" leftSection="💰">Money: {fmt(moneyLeft)}</Badge>
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
