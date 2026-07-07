import { Group, Progress, Stack, Text } from '@mantine/core';
import { metricColor } from '../scene/metricColor.js';

/** The earth-tinted uppercase section label shared by the Region and Planet drill-down panels. */
export function CapLabel({ children }: { children: string }) {
  return <Text size="xs" c="earth.7" tt="uppercase" fw={600}>{children}</Text>;
}

/** A 0–100 metric row: label + rounded value over a `metricColor` Progress bar. Shared by both panels. */
export function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <Stack gap={2}>
      <Group justify="space-between"><Text size="sm">{label}</Text><Text size="sm" fw={600}>{Math.round(value)}</Text></Group>
      <Progress value={value} color={metricColor(value)} />
    </Stack>
  );
}
