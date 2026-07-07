import { useState } from 'react';
import { Box, Group, Paper, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { MetricGrid } from './MetricGrid.js';
import { Composition, type CompositionItem } from './Composition.js';
import { MetricTrend } from './MetricTrend.js';
import { ElectricityPanel } from './ElectricityPanel.js';
import { metricColor } from '../scene/metricColor.js';
import { REGION_COLORS } from '../theme.js';
import { planetAggregate } from '../game/planetAggregate.js';
import {
  findNode, nodeValue, nodeSeries,
  type Entity, type MetricNode,
} from '../game/metricTree.js';
import type { TurnRecord } from '../game/useGame.js';

interface DrillDownPanelProps {
  entity: Entity;
  log: TurnRecord[];
}

/** Entity header title, region dot color, and summary subtitle from the latest turn. */
function entityMeta(entity: Entity, record: TurnRecord): { title: string; dot?: string; sub: string } {
  if (entity.kind === 'planet') {
    const p = planetAggregate(record.state.regions, record.diagnostics);
    const popM = (p.population / 1e6).toLocaleString(undefined, { maximumFractionDigits: 0 });
    return { title: 'Planet', sub: `pop ${popM}M · GDP/capita $${Math.round(p.gdpPerCapita).toLocaleString()}` };
  }
  const r = record.state.regions.find((x) => x.id === entity.id);
  if (!r) return { title: '—', sub: '' };
  return {
    title: r.name,
    dot: REGION_COLORS[r.id],
    sub: `GDP/capita $${Math.round(r.gdpPerCapita).toLocaleString()} · pop ${(r.population / 1e6).toFixed(0)}M · ${r.regionalEmissions.toFixed(2)} Gt/yr`,
  };
}

function Crumb({ label, onClick }: { label: string; onClick?: () => void }) {
  if (!onClick) return <Text span fw={700} c="var(--mantine-color-text)" style={{ fontSize: 12, padding: '2px 4px' }}>{label}</Text>;
  return (
    <UnstyledButton onClick={onClick} style={{ fontSize: 12, fontWeight: 600, color: 'var(--mantine-color-earth-3)', padding: '2px 4px', borderRadius: 4 }}>
      {label}
    </UnstyledButton>
  );
}

/**
 * The recursive drill-down inside the DataOverlay. Owns the breadcrumb `path` and, at each level,
 * renders either the top-level `MetricGrid`, a `Composition` (contribution breakdown), or a
 * `MetricTrend` (value-vs-year line) — chosen from the metric-tree node's `kind`/`compose`. The same
 * tree drives the planet and any region; only the readings differ.
 */
export function DrillDownPanel({ entity, log }: DrillDownPanelProps) {
  const [path, setPath] = useState<string[]>([]);
  const latest = log[log.length - 1]!;
  const { title, dot, sub } = entityMeta(entity, latest);
  const node = path.length ? findNode(path) : null;

  const renderNode = (n: MetricNode) => {
    if (n.kind === 'electricity') return <ElectricityPanel entity={entity} log={log} />;
    if (n.kind === 'composition') {
      const mode = n.compose ?? 'sum';
      const items: CompositionItem[] = (n.children ?? []).map((c) => {
        const value = nodeValue(c, entity, log);
        return { id: c.id, label: c.label, value, color: c.color ?? metricColor(value), drillable: c.kind !== 'trend', flow: c.flow };
      });
      return (
        <Composition
          items={items} mode={mode} unit={n.unit}
          net={mode === 'ledger' ? nodeValue(n, entity, log) : undefined}
          onDrill={(id) => setPath([...path, id])}
        />
      );
    }
    const points = nodeSeries(n, entity, log);
    const latestVal = points.length ? points[points.length - 1]!.value : 0;
    return <MetricTrend points={points} color={n.color ?? metricColor(latestVal)} unit={n.unit} goodUp={n.goodUp} />;
  };

  return (
    <Paper p="sm" withBorder>
      <Stack gap="xs">
        <Group gap={8} align="center">
          {dot && <Box style={{ width: 11, height: 11, borderRadius: 3, background: dot }} />}
          <Title order={4}>{title}</Title>
        </Group>
        {/* Summary line only at the overview — on drilled levels the breadcrumb + content stand alone. */}
        {path.length === 0 && <Text size="sm" c="dimmed">{sub}</Text>}

        {path.length > 0 && (
          <Group gap={4} align="center">
            <Crumb label="Overview" onClick={() => setPath([])} />
            {path.map((_, i) => {
              const crumbNode = findNode(path.slice(0, i + 1));
              const last = i === path.length - 1;
              return (
                <Group gap={4} key={i} align="center">
                  <Text span c="dimmed" style={{ fontSize: 12 }}>›</Text>
                  <Crumb label={crumbNode?.label ?? '—'} onClick={last ? undefined : () => setPath(path.slice(0, i + 1))} />
                </Group>
              );
            })}
          </Group>
        )}

        {node ? renderNode(node) : <MetricGrid entity={entity} log={log} onOpen={(id) => setPath([id])} />}
      </Stack>
    </Paper>
  );
}
