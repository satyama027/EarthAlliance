import { useEffect } from 'react';
import { ActionIcon, Box, Button, Group, Overlay, Paper, Text, Title } from '@mantine/core';
import { motion } from 'framer-motion';
import { Z_LAYERS } from '../theme.js';
import { CHANGE_TONE_COLOR } from '../game/metricTree.js';
import type { MetricDelta, TurnReport } from '../game/turnReport.js';

interface EndOfTurnReportProps {
  opened: boolean;
  onClose(): void;
  /** The summary of the turn that just elapsed. Null before any turn has been played. */
  report: TurnReport | null;
}

/** One metric row: icon + label on the left, new value + a colored Δ chip on the right. */
function MetricRow({ metric, last }: { metric: MetricDelta; last: boolean }) {
  return (
    <Group
      justify="space-between" wrap="nowrap"
      style={{ padding: '10px 0', borderBottom: last ? 'none' : '1px solid #2b2d31' }}
    >
      <Group gap={10} wrap="nowrap">
        <Text component="span" style={{ width: 22, textAlign: 'center', fontSize: 15, lineHeight: 1 }}>{metric.icon}</Text>
        <Text size="sm">{metric.label}</Text>
      </Group>
      <Group gap={12} wrap="nowrap">
        <Text fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
          <Text component="span">{metric.valueText}</Text>
          <Text component="span" c="dimmed" style={{ fontSize: 10, fontWeight: 600, marginLeft: 3 }}>{metric.unit}</Text>
        </Text>
        <Text
          fw={700} size="xs" c={CHANGE_TONE_COLOR[metric.change.tone]}
          style={{ minWidth: 56, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
        >
          {metric.change.arrow} {metric.change.label}
        </Text>
      </Group>
    </Group>
  );
}

/**
 * The end-of-turn report — a blocking, dismissable modal shown right after End Turn, summarising how
 * the five headline planet metrics changed over the turn that just elapsed. Reuses the `DataOverlay`
 * overlay pattern (dark backdrop, centered framer-motion window; closes on Continue / ✕ / Escape /
 * backdrop). Each row shows the new value + a colored Δ chip, using the shared `changeSince` /
 * `CHANGE_TONE_COLOR` vocabulary so good/bad/flat coloring matches the Turn Log and trend graphs.
 */
export function EndOfTurnReport({ opened, onClose, report }: EndOfTurnReportProps) {
  useEffect(() => {
    if (!opened) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opened, onClose]);

  if (!opened || !report) return null;

  return (
    <Overlay color="#000" backgroundOpacity={0.85} fixed zIndex={Z_LAYERS.overlay} onClick={onClose}>
      <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
        {/* stopPropagation so clicks inside the window don't fall through to the backdrop. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'relative', width: 380, maxWidth: '100%' }}
        >
          <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
            <ActionIcon
              aria-label="Close" variant="subtle" color="gray" size="md"
              onClick={onClose}
              style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
            >
              ✕
            </ActionIcon>

            <Box px="md" pt="md" pb="xs">
              <Title order={3} style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.2px', lineHeight: 1.1 }}>
                End of Turn
              </Title>
              <Text size="sm" c="dimmed" style={{ marginTop: 4 }}>
                Turn {report.turn} · {report.prevYear} → {report.year}
              </Text>
            </Box>

            <Box px="md">
              {report.metrics.map((m, i) => (
                <MetricRow key={m.key} metric={m} last={i === report.metrics.length - 1} />
              ))}
            </Box>

            <Box px="md" pt="sm" pb="md">
              <Button fullWidth onClick={onClose}>Continue</Button>
            </Box>
          </Paper>
        </motion.div>
      </Box>
    </Overlay>
  );
}
