import { Box, SimpleGrid, Text, UnstyledButton } from '@mantine/core';
import { Sparkline } from './Sparkline.js';
import { metricColor } from '../scene/metricColor.js';
import {
  METRIC_TREE, nodeValue, nodeSeries, headlineParts,
  type Entity,
} from '../game/metricTree.js';
import type { TurnRecord } from '../game/useGame.js';

interface MetricGridProps {
  entity: Entity;
  log: TurnRecord[];
  onOpen(id: string): void;
}

/**
 * The drill-down's top level: a responsive grid of the six headline metric tiles (Emissions, Public
 * support, Income, Biodiversity, Water availability, Land availability). Each tile shows its current
 * value + a `Sparkline` mini-trend and opens that metric's drill-down when clicked.
 */
export function MetricGrid({ entity, log, onOpen }: MetricGridProps) {
  return (
    <SimpleGrid cols={2} spacing={10} verticalSpacing={10}>
      {METRIC_TREE.map((node) => {
        const value = nodeValue(node, entity, log);
        const color = node.color ?? metricColor(value);
        const { main, suffix } = headlineParts(value, node.unit);
        const series = nodeSeries(node, entity, log).map((p) => p.value);
        return (
          <UnstyledButton
            key={node.id}
            onClick={() => onOpen(node.id)}
            data-metric-tile
            style={{
              background: 'var(--mantine-color-dark-8)', border: '1px solid var(--mantine-color-dark-4)',
              borderRadius: 4, padding: '10px 11px', position: 'relative', overflow: 'hidden',
            }}
          >
            <Text span style={{ position: 'absolute', top: 8, right: 9, color: 'var(--mantine-color-dimmed)', fontSize: 12 }}>›</Text>
            <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Box style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              <Text size="xs" c="dimmed">{node.label}</Text>
            </Box>
            <Text fw={700} style={{ fontSize: 20, marginTop: 5, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {main}<Text span c="dimmed" fw={600} style={{ fontSize: 11, marginLeft: 3 }}>{suffix}</Text>
            </Text>
            <Box mt={8} style={{ height: 26 }}>
              <Sparkline values={series} width={150} height={26} color={color} />
            </Box>
          </UnstyledButton>
        );
      })}
    </SimpleGrid>
  );
}
