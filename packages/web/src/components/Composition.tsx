import type { ReactNode } from 'react';
import { Box, Group, Text, UnstyledButton } from '@mantine/core';
import { fmtNum } from '../game/metricTree.js';

export interface CompositionItem {
  id: string;
  label: string;
  value: number;
  color: string;
  /** Has further composition to drill into (shows a ›); otherwise a trend leaf (shows a 📈). */
  drillable: boolean;
  /** Ledger mode only: money in (+) or out (−). */
  flow?: 'in' | 'out';
}

interface CompositionProps {
  items: CompositionItem[];
  /** 'sum' = proportional stacked bar (emissions); 'ledger' = signed rows + Net (income). */
  mode: 'sum' | 'ledger';
  unit: string;
  net?: number;
  onDrill(id: string): void;
}

function Affordance({ drillable }: { drillable: boolean }) {
  return (
    <Text span c="dimmed" style={{ fontSize: drillable ? 13 : 11, width: 16, textAlign: 'center' }}>
      {drillable ? '›' : '📈'}
    </Text>
  );
}

/** One clickable drill row shared by both modes. */
function Row({ item, right, onDrill }: { item: CompositionItem; right: ReactNode; onDrill(id: string): void }) {
  return (
    <UnstyledButton
      onClick={() => onDrill(item.id)}
      style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 10, alignItems: 'center', padding: '6px', borderRadius: 4 }}
      data-drill-row
    >
      <Box style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flex: 'none' }} />
      <Text size="sm">{item.label}</Text>
      {right}
      <Affordance drillable={item.drillable} />
    </UnstyledButton>
  );
}

/**
 * "Contribution of each part" renderer. In `sum` mode it draws a proportional stacked bar over rows
 * showing each part's value + share (emissions → sectors, electricity → fuels). In `ledger` mode it
 * lists signed money rows and a Net total (income). Every row is clickable — a › drills into further
 * composition, a 📈 opens that part's trend. The one visual for all composition levels.
 */
export function Composition({ items, mode, unit, net, onDrill }: CompositionProps) {
  const dollar = unit.startsWith('$');

  if (mode === 'ledger') {
    return (
      <Box>
        <Box style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map((item) => {
            const out = item.flow === 'out';
            return (
              <Row
                key={item.id} item={item} onDrill={onDrill}
                right={
                  <Group gap={0} justify="flex-end">
                    <Text size="sm" fw={600} c={out ? 'red.4' : 'teal.4'} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {out ? '−' : '+'}${Math.round(item.value).toLocaleString()}
                    </Text>
                  </Group>
                }
              />
            );
          })}
        </Box>
        <Group justify="space-between" mt={8} pt={9} style={{ borderTop: '1px solid var(--mantine-color-dark-4)' }}>
          <Text fw={700} tt="uppercase" style={{ fontSize: 13, letterSpacing: '.05em' }}>Net</Text>
          <Text fw={700} style={{ fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
            ${Math.round(net ?? 0).toLocaleString()}<Text span c="dimmed" fw={600} style={{ fontSize: 11, marginLeft: 2 }}>/turn</Text>
          </Text>
        </Group>
      </Box>
    );
  }

  // sum mode. `total` is the positive sum, so positives read as a share of gross emissions; a
  // negative item (e.g. a land-use carbon sink) is shown as a signed "sink" row, never a bogus %.
  const total = items.reduce((s, it) => s + Math.max(0, it.value), 0) || 1;
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const fmtMag = (v: number) => (Math.abs(v) >= 1 ? fmtNum(Math.abs(v)) : Math.abs(v).toFixed(2));
  return (
    <Box>
      <Box style={{ display: 'flex', height: 18, borderRadius: 4, overflow: 'hidden', background: 'var(--mantine-color-dark-8)' }}>
        {sorted.map((it) => (
          <Box key={it.id} data-seg style={{ width: `${(Math.max(0, it.value) / total) * 100}%`, height: '100%', background: it.color }} />
        ))}
      </Box>
      <Box mt={9} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sorted.map((it) => {
          const sink = it.value < 0;
          return (
            <Row
              key={it.id} item={it} onDrill={onDrill}
              right={
                <Group gap={10} justify="flex-end" wrap="nowrap">
                  <Text size="xs" ta="right" c={sink ? 'teal.4' : 'dimmed'} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {sink ? '−' : dollar ? '$' : ''}{sink ? fmtMag(it.value) : fmtNum(it.value)}
                  </Text>
                  <Text size="sm" fw={600} ta="right" c={sink ? 'dimmed' : undefined} style={{ fontVariantNumeric: 'tabular-nums', minWidth: 34 }}>
                    {sink ? 'sink' : `${Math.round((it.value / total) * 100)}%`}
                  </Text>
                </Group>
              }
            />
          );
        })}
      </Box>
    </Box>
  );
}
