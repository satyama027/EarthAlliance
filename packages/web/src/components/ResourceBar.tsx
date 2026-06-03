import { Group, Paper, Text, Badge } from '@mantine/core';

interface ResourceBarProps {
  year: number;
  turn: number;
  politicalCapital: number;
  money: number;
}

export function ResourceBar({ year, turn, politicalCapital, money }: ResourceBarProps) {
  return (
    <Paper p="sm" withBorder>
      <Group justify="space-between">
        <Text fw={700}>Year {year} · Turn {turn}</Text>
        <Group>
          <Badge color="grape" size="lg">Political Capital: {Math.round(politicalCapital)}</Badge>
          <Badge color="teal" size="lg">Money: {Math.round(money)}</Badge>
        </Group>
      </Group>
    </Paper>
  );
}
