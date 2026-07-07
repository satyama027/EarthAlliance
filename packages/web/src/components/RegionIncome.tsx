import { Box, Divider, Group, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import type { RegionBudget } from '../game/regionBudget.js';

const MINUS = '−'; // U+2212, matches the rest of the UI
const money = (n: number) => Math.round(n).toLocaleString('en-US');

/** A plain ledger row: label left, signed amount right. */
function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Group justify="space-between" gap={6} wrap="nowrap">
      <Text size="xs">{label}</Text>
      <Text size="xs" fw={600} c={color} style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Text>
    </Group>
  );
}

/**
 * The per-region **Income** breakdown for the region drill-down (RegionPanel): GDP tax income + the
 * Carbon Tax's contribution − policy upkeep = net cash flow this turn. The Carbon Tax row is
 * highlighted (earth accent + fill) and only shown when the tax is active in the region — surfacing
 * its contribution is the point of the section. Money in is teal, out is red. See the approved
 * proposal docs/design/proposals/2026-07-06-region-income/.
 */
export function RegionIncome({ budget, carbonTaxNote = 'shrinks as this region decarbonises' }: {
  budget: RegionBudget; carbonTaxNote?: string;
}) {
  const taxes: ReactNode = (
    <Box
      style={{
        background: 'var(--mantine-color-dark-6)',
        borderLeft: '2px solid var(--mantine-color-earth-5)',
        borderRadius: 4, padding: '4px 8px', marginInline: -6,
      }}
    >
      <Group justify="space-between" gap={6} wrap="nowrap">
        <Text size="xs" fw={600}>Carbon tax</Text>
        <Text size="xs" fw={600} c="teal.4" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {`+$${money(budget.carbonTax)}`}
        </Text>
      </Group>
      <Text c="dimmed" style={{ fontSize: 10.5 }}>{carbonTaxNote}</Text>
    </Box>
  );

  return (
    <>
      <Divider my={4} />
      <Text size="xs" c="earth.7" tt="uppercase" fw={600}>Income</Text>
      <Box mt={6} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <Row label="Tax (GDP)" value={`+$${money(budget.taxIncome)}`} color="teal.4" />
        {budget.carbonTax !== 0 && taxes}
        <Row label="Policy upkeep" value={budget.upkeep > 0 ? `${MINUS}$${money(budget.upkeep)}` : '$0'} color="red.4" />
        <Group
          justify="space-between" mt={2} pt={8}
          style={{ borderTop: '1px solid var(--mantine-color-dark-4)' }}
        >
          <Text size="sm" fw={700} tt="uppercase">Net</Text>
          <Text size="sm" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {`$${money(budget.net)}`}<Text span size="xs" c="dimmed" ml={2}>/turn</Text>
          </Text>
        </Group>
      </Box>
    </>
  );
}
