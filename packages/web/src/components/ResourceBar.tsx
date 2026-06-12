import { Group, Paper, Text, Badge, Stack } from '@mantine/core';

interface ResourceBarProps {
  year: number;
  turn: number;
  politicalCapital: number;
  money: number;
  /** This turn's staged spend (PC + money). Subtracted so the bar shows what is REMAINING. */
  costNow?: { politicalCapital: number; money: number };
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export function ResourceBar({ year, turn, politicalCapital, money, costNow }: ResourceBarProps) {
  const pcLeft = politicalCapital - (costNow?.politicalCapital ?? 0);
  const moneyLeft = money - (costNow?.money ?? 0);
  const over = pcLeft < 0 || moneyLeft < 0;

  return (
    <Paper p="sm" withBorder>
      <Stack gap={over ? 6 : 0}>
        <Group justify="space-between">
          <Text fw={700}>Year {year} · Turn {turn}</Text>
          <Group>
            <Badge color={pcLeft < 0 ? 'red' : 'grape'} size="lg">Political Capital: {fmt(pcLeft)}</Badge>
            <Badge color={moneyLeft < 0 ? 'red' : 'teal'} size="lg">Money: {fmt(moneyLeft)}</Badge>
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
