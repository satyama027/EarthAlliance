import { useEffect } from 'react';
import {
  ActionIcon, Badge, Box, Button, Divider, Group, Overlay, Paper, Progress,
  ScrollArea, Stack, Text,
} from '@mantine/core';
import { motion } from 'framer-motion';
import { CATEGORY_COLOR } from '../theme.js';
import type { CardVM } from '../game/policyView.js';
import { effectLines, fundingBlurb, cardAction, type EffectLine } from '../game/policyDetails.js';

const CATEGORY_ICON: Record<string, string> = {
  energy: '⚡', industry: '🏭', land: '🌳', social: '🤝', frontier: '🚀',
};
const FUND_LABEL = { 'one-time': 'One-time', recurring: 'Recurring', buildout: 'Buildout' } as const;
const FUND_COLOR = { 'one-time': 'gray', recurring: 'teal', buildout: 'earth' } as const;

const DIR = {
  good: { glyph: '▲', color: 'earth.3' },
  bad: { glyph: '▼', color: 'red.4' },
  neutral: { glyph: '—', color: 'dimmed' },
} as const;

interface PolicyDetailOverlayProps {
  /** The card to inspect; `null` closes the overlay. */
  vm: CardVM | null;
  regionName: string;
  onPrimary(vm: CardVM): void;
  onClose(): void;
}

function costLabel(vm: CardVM): string {
  if (vm.state === 'permanent') return 'Paid — one-time';
  if (vm.state === 'built' || vm.state === 'frozen') return '$0 / turn';
  const amt = Math.round(vm.moneyCharge);
  return vm.perTurn ? `$${amt} / turn` : `$${amt} once`;
}

function EffectRow({ line }: { line: EffectLine }) {
  const d = DIR[line.direction];
  return (
    <Group gap={9} align="flex-start" wrap="nowrap">
      <Text c={d.color} fw={700} style={{ width: 14, textAlign: 'center', flex: '0 0 14px' }}>{d.glyph}</Text>
      <Text size="sm" lh={1.4}>
        <Text span fw={600}>{line.label}</Text> {line.magnitude}
        <Text span c="dimmed" size="xs"> · {line.scope}</Text>
        {line.note && <Badge size="xs" color="earth" variant="light" ml={6}>{line.note}</Badge>}
      </Text>
    </Group>
  );
}

/**
 * Larger, read-only detail window for one policy card, opened by a single click / Enter. Shows the
 * full description, a per-effect breakdown, cost/funding, lifespan, and an action button that runs
 * the same enact/stop action as a double-click or drag. Follows the `DataOverlay` pattern (dark
 * backdrop, centered surface, framer-motion fade + rise; closes on ✕, Escape, or a backdrop click).
 */
export function PolicyDetailOverlay({ vm, regionName, onPrimary, onClose }: PolicyDetailOverlayProps) {
  useEffect(() => {
    if (!vm) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [vm, onClose]);

  if (!vm) return null;

  const { policy } = vm;
  const action = cardAction(vm, regionName);
  const lines = effectLines(policy);
  const showBar = policy.funding === 'buildout' && vm.capacity !== undefined;
  const pctInstalled = Math.round((vm.capacity ?? 0) * 100);

  return (
    <Overlay color="#000" backgroundOpacity={0.85} fixed zIndex={1100} onClick={onClose}>
      <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'relative', width: 520, maxWidth: '100%' }}
        >
          <ActionIcon
            aria-label="Close" variant="subtle" color="gray" size="md"
            onClick={onClose}
            style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
          >
            ✕
          </ActionIcon>

          <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
            {/* Big category art-band header */}
            <Box style={{
              background: CATEGORY_COLOR[policy.category], height: 80,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44,
            }}>
              {CATEGORY_ICON[policy.category] ?? '•'}
            </Box>

            <ScrollArea.Autosize mah="70vh">
              <Stack gap="md" p="lg">
                <Group gap={10} align="center">
                  <Text fw={700} size="xl">{policy.name}</Text>
                  <Badge color={FUND_COLOR[policy.funding]} variant="light">{FUND_LABEL[policy.funding]}</Badge>
                </Group>

                <Text size="sm" lh={1.5}>{policy.description}</Text>

                <Box>
                  <Text size="xs" fw={600} tt="uppercase" c="earth.7" mb={6} style={{ letterSpacing: '.06em' }}>
                    What it does
                  </Text>
                  <Stack gap={7}>
                    {lines.map((line, i) => <EffectRow key={i} line={line} />)}
                  </Stack>
                </Box>

                <Divider />

                <Box>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Cost</Text>
                    <Text size="sm" fw={700}>{costLabel(vm)}</Text>
                  </Group>
                  <Text size="xs" c="dimmed" mt={2} lh={1.4}>{fundingBlurb(policy.funding)}</Text>
                </Box>

                {policy.funding === 'recurring' && (
                  <Group gap={8} p="xs" style={{ background: 'var(--mantine-color-earth-light)', borderRadius: 6 }}>
                    <Text c="earth.3">♾︎</Text>
                    <Text size="xs" c="earth.3">Runs every turn until you stop it — there is no fixed end.</Text>
                  </Group>
                )}

                {showBar && (
                  <Box>
                    <Group justify="space-between" mb={4}>
                      <Text size="xs" c="dimmed">Installed capacity</Text>
                      <Text size="xs" fw={700}>{pctInstalled}%</Text>
                    </Group>
                    <Progress value={pctInstalled} size="sm" color={vm.state === 'frozen' ? 'gray' : 'earth'} />
                  </Box>
                )}
              </Stack>
            </ScrollArea.Autosize>

            {/* Footer action — same effect as double-click / drag. */}
            <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-dark-4)' }}>
              <Group gap="sm" align="center">
                <Button
                  flex={1}
                  color={action.kind === 'danger' ? 'red' : 'earth'}
                  variant={action.kind === 'danger' ? 'light' : 'filled'}
                  disabled={action.disabled}
                  onClick={() => { onPrimary(vm); onClose(); }}
                >
                  {action.label}
                </Button>
                <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                  {action.disabled ? action.reason : 'Or double-click / drag the card.'}
                </Text>
              </Group>
            </Box>
          </Paper>
        </motion.div>
      </Box>
    </Overlay>
  );
}
