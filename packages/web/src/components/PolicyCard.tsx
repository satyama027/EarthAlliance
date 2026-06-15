import { Card, Text, Badge, Box, Group, Progress } from '@mantine/core';
import { CATEGORY_COLOR } from '../theme.js';
import type { CardVM } from '../game/policyView.js';
import { durationLine } from '../game/policyDetails.js';

const CATEGORY_ICON: Record<string, string> = {
  energy: '⚡', industry: '🏭', land: '🌳', social: '🤝', frontier: '🚀',
};

const FUND_LABEL = { 'one-time': 'One-time', recurring: 'Recurring', buildout: 'Buildout' } as const;
const FUND_COLOR = { 'one-time': 'gray', recurring: 'teal', buildout: 'earth' } as const;

interface PolicyCardProps {
  vm: CardVM;
  onInspect(vm: CardVM): void;             // single click / Enter / Space → open the detail overlay
  onDragStart(vm: CardVM, e: React.PointerEvent): void;  // begins a pointer drag/tap (board resolves it)
  dragging?: boolean;                      // true while THIS card is the drag source
}

/** Is this card interactive (drag / click / keyboard)? Unaffordable cards stay interactive so
 *  the attempt surfaces the affordability error; only locked + display-only cards are inert. */
function isActionable(vm: CardVM): boolean {
  if (vm.lane === 'available') return vm.state === 'available';
  return vm.state === 'staged' || vm.cancellable;
}

function pct(capacity: number): number {
  return Math.round(capacity * 100);
}

function moneyLabel(vm: CardVM): string {
  if (vm.state === 'permanent') return 'paid';
  if (vm.state === 'built' || vm.state === 'frozen') return '$0';
  return `$${Math.round(vm.moneyCharge)}${vm.perTurn ? '/turn' : ''}`;
}

function stateLine(vm: CardVM): string | null {
  switch (vm.state) {
    case 'staged': return 'Starts this turn';
    case 'building': return vm.cancelling ? 'Will stop — keeps installed' : 'Building · +10%/turn';
    case 'built': return '✓ Built · benefit persists';
    case 'recurring': return vm.cancelling ? 'Will stop — ends benefit' : 'Funded each turn';
    case 'permanent': return 'Enacted — permanent';
    case 'frozen': return `Stopped · ${pct(vm.capacity ?? 0)}% installed`;
    default: return null;
  }
}

function ariaLabel(vm: CardVM): string {
  const n = vm.policy.name;
  if (vm.lane === 'available') {
    if (vm.state === 'locked') return `${n} (locked — prerequisite required)`;
    return `Enact ${n} in this region${vm.affordable ? '' : ' (unaffordable)'}`;
  }
  if (vm.state === 'staged') return `Remove staged ${n}`;
  if (vm.cancellable) return vm.cancelling ? `Keep ${n} running` : `Stop ${n}`;
  return `${n} (active)`;
}

/**
 * The card's visual surface, with no interaction. Reused by the interactive `PolicyCard` *and*
 * by the floating drag overlay (`PolicyBoard`), so the lifted card looks identical to its source.
 * Pass `floating` when rendered in the overlay (drops the dim, adds a lift shadow).
 */
export function CardFace({ vm, floating = false }: { vm: CardVM; floating?: boolean }) {
  const { policy } = vm;
  const showBar = policy.funding === 'buildout' && vm.capacity !== undefined;
  const staged = vm.state === 'staged';
  const dim = !floating && (vm.state === 'locked' || (vm.lane === 'available' && !vm.affordable));

  return (
    <Card
      withBorder
      padding="sm"
      style={{
        opacity: dim ? 0.5 : 1,
        outline: staged ? '2px solid var(--mantine-color-earth-5)'
          : vm.cancelling ? '2px solid var(--mantine-color-red-6)' : 'none',
        outlineOffset: -1,
        position: 'relative',
        boxShadow: floating ? '0 14px 24px rgba(0,0,0,.55)' : undefined,
      }}
    >
      {staged && (
        <Badge size="xs" color="earth" style={{ position: 'absolute', top: 6, left: 6, zIndex: 2 }}>STAGED</Badge>
      )}
      {vm.cancellable && (
        <Box aria-hidden style={{
          position: 'absolute', top: 5, right: 6, zIndex: 2, width: 18, height: 18, borderRadius: '50%',
          background: vm.cancelling ? 'var(--mantine-color-earth-9)' : 'var(--mantine-color-red-light)',
          color: vm.cancelling ? 'var(--mantine-color-earth-3)' : 'var(--mantine-color-red-4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
        }}>{vm.cancelling ? '↺' : '✕'}</Box>
      )}

      <Box style={{ background: CATEGORY_COLOR[policy.category], height: 34, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
        {CATEGORY_ICON[policy.category] ?? '•'}
      </Box>

      <Text fw={700} mt="xs" size="sm" lh={1.2}>{policy.name}</Text>
      <Badge size="xs" color={FUND_COLOR[policy.funding]} variant="light" mt={4}>
        {FUND_LABEL[policy.funding]}
      </Badge>

      {vm.lane === 'available' && vm.state === 'available' && (
        <Text size="xs" c="dimmed" lineClamp={2} mt={4}>{policy.description}</Text>
      )}
      {vm.state === 'locked' && (
        <Text size="xs" c="dimmed" mt={4}>🔒 Requires {policy.prerequisites?.[0]} here</Text>
      )}

      {showBar && (
        <Box mt={6}>
          <Group justify="space-between" gap={4}>
            <Text size="10px" c="dimmed">Installed</Text>
            <Text size="10px" fw={700}>{pct(vm.capacity ?? 0)}%</Text>
          </Group>
          <Progress value={pct(vm.capacity ?? 0)} size="sm" mt={2}
            color={vm.state === 'frozen' ? 'gray' : 'earth'} />
        </Box>
      )}

      {stateLine(vm) && (
        <Text size="10px" fw={700} mt={6}
          c={vm.cancelling ? 'red.4' : vm.lane === 'active' ? 'earth.4' : 'dimmed'}>
          {stateLine(vm)}
        </Text>
      )}

      {/* Recurring policies have no fixed end — say so honestly (earth when active, dimmed when available). */}
      {durationLine(policy) && (
        <Text size="10px" fw={700} mt={4} c={vm.lane === 'active' ? 'earth.3' : 'dimmed'}>
          ♾︎ {durationLine(policy)}
        </Text>
      )}

      <Group mt="xs" gap={6}>
        <Badge color="teal" variant="light"
          style={(vm.state === 'built' || vm.state === 'frozen' || vm.state === 'permanent') ? { opacity: 0.6 } : undefined}>
          {moneyLabel(vm)}
        </Badge>
      </Group>
    </Card>
  );
}

/**
 * Interactive wrapper around `CardFace`. Pointer down starts a drag/tap that `PolicyBoard` resolves
 * into single-click (inspect), double-click (enact/stop), or drag (enact/stop). Enter/Space opens the
 * detail overlay (the accessible inspect path); enacting from there uses the overlay's action button.
 * Every card is inspectable — including locked/unaffordable ones — so players can read what they do.
 * The dragged source dims while its floating clone is lifted.
 */
export function PolicyCard({ vm, onInspect, onDragStart, dragging = false }: PolicyCardProps) {
  const { policy } = vm;
  const actionable = isActionable(vm);
  const pressed = vm.state === 'staged' || vm.cancelling;

  return (
    <div
      data-testid="policy-card"
      data-policy-id={policy.id}
      data-lane={vm.lane}
      role="button"
      tabIndex={0}
      aria-disabled={!actionable}
      aria-pressed={pressed}
      aria-label={ariaLabel(vm)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onInspect(vm); } }}
      onPointerDown={(e) => { if (e.button === 0) onDragStart(vm, e); }}
      style={{
        width: 180, flex: '0 0 180px',
        cursor: actionable ? 'grab' : 'pointer',
        opacity: dragging ? 0.3 : 1,
        userSelect: 'none', touchAction: 'none',
      }}
    >
      <CardFace vm={vm} />
    </div>
  );
}
