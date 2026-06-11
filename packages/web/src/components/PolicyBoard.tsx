import { useMemo, useRef, useState } from 'react';
import { Paper, Group, Text, Button, ScrollArea, Box, Divider, Stack } from '@mantine/core';
import { validateSelection, type WorldState, type PolicySelection } from '@earth-alliance/engine';
import { REGION_COLORS } from '../theme.js';
import { regionPolicyView, type CardVM } from '../game/policyView.js';
import { PolicyCard } from './PolicyCard.js';

interface PolicyBoardProps {
  state: WorldState;
  regionId: string | null;
  staged: PolicySelection[];
  cancels: PolicySelection[];
  onEnact(policyId: string, regionId: string): void;
  onUnstage(policyId: string, regionId: string): void;
  onToggleCancel(policyId: string, regionId: string): void;
  onEndTurn(): void;
  canEndTurn: boolean;
  validationReason: string | null;
  costNow: { politicalCapital: number; money: number };
  upkeepNext: number;
  stagedTotal: number;
}

type DropHint = 'none' | 'valid' | 'reject';

export function PolicyBoard(props: PolicyBoardProps) {
  const { state, regionId, staged, cancels } = props;
  const [error, setError] = useState<string | null>(null);
  const [activeHint, setActiveHint] = useState<DropHint>('none');
  const activeRef = useRef<HTMLDivElement>(null);
  const availableRef = useRef<HTMLDivElement>(null);

  const region = regionId ? state.regions.find((r) => r.id === regionId) ?? null : null;
  const regionColor = regionId ? REGION_COLORS[regionId] ?? '#909296' : null;

  const view = useMemo(
    () => (regionId ? regionPolicyView(state, regionId, staged, cancels) : null),
    [state, regionId, staged, cancels],
  );

  // The canonical action for a card: enact / unstage / toggle-cancel. Click, keyboard, and a valid
  // cross-lane drag all funnel here. Returns true if it moved.
  function performPrimary(vm: CardVM): boolean {
    if (!regionId) return false;
    if (vm.lane === 'available') {
      if (vm.affordable) { props.onEnact(vm.policy.id, regionId); setError(null); return true; }
      const reason = validateSelection(state, [...staged, { policyId: vm.policy.id, regionId }]).reason
        ?? 'cannot be afforded';
      setError(`Can't enact ${vm.policy.name} in ${region?.name ?? 'this region'} — ${reason}.`);
      return false;
    }
    if (vm.state === 'staged') { props.onUnstage(vm.policy.id, regionId); setError(null); return true; }
    if (vm.cancellable) { props.onToggleCancel(vm.policy.id, regionId); setError(null); return true; }
    return false;
  }

  function laneAt(point: { x: number; y: number }): 'active' | 'available' | null {
    const hit = (el: HTMLDivElement | null) => {
      const r = el?.getBoundingClientRect();
      return !!r && point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom;
    };
    if (hit(activeRef.current)) return 'active';
    if (hit(availableRef.current)) return 'available';
    return null;
  }

  function handleDragStart(vm: CardVM) {
    if (vm.lane === 'available') setActiveHint(vm.affordable ? 'valid' : 'reject');
  }
  function handleDragEnd(vm: CardVM, point: { x: number; y: number }) {
    setActiveHint('none');
    const target = laneAt(point);
    if (target && target !== vm.lane) performPrimary(vm);
  }

  const laneBorder = (hint: DropHint) =>
    hint === 'valid' ? '1.5px dashed var(--mantine-color-earth-5)'
      : hint === 'reject' ? '1.5px dashed var(--mantine-color-red-6)'
        : '1.5px dashed transparent';

  return (
    <Paper withBorder p="sm">
      <Group gap={8} mb="sm" align="center">
        <Text fw={700} size="md">Policies</Text>
        {region && <Box w={12} h={12} style={{ borderRadius: 3, background: regionColor! }} />}
        <Text size="xs" c="dimmed">
          {region ? `· ${region.name} — costs scaled to this region` : '· select a region on the map'}
        </Text>
      </Group>

      {error && <Text c="red" size="sm" mb="xs" role="alert">⚠ {error}</Text>}

      {!region || !view ? (
        <Box style={{ border: '1px dashed var(--mantine-color-dark-4)', borderRadius: 8, padding: 22 }}>
          <Text c="dimmed" size="sm">Select a region on the map to manage its policies.</Text>
        </Box>
      ) : (
        <Stack gap={6}>
          {/* Active lane */}
          <div ref={activeRef} style={{ borderRadius: 8, border: laneBorder(activeHint),
            background: activeHint !== 'none' ? 'rgba(32,201,151,.04)' : 'transparent', padding: 8 }}>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6} style={{ letterSpacing: '.06em' }}>
              Active · {region.name} · {view.active.length}
              <Text span size="xs" c="dimmed" tt="none" fw={500} style={{ letterSpacing: 0 }}> — drag a card down (or ✕) to remove ↓</Text>
            </Text>
            <LaneStrip cards={view.active} emptyText="Nothing active here yet."
              onActivate={performPrimary} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
          </div>

          <Divider />

          {/* Available lane */}
          <div ref={availableRef} style={{ borderRadius: 8, padding: 8 }}>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6} style={{ letterSpacing: '.06em' }}>
              Available · {view.available.length}
              <Text span size="xs" c="dimmed" tt="none" fw={500} style={{ letterSpacing: 0 }}> — drag a card up to enact in {region.name} ↑</Text>
            </Text>
            <LaneStrip cards={view.available} emptyText="No more policies available here."
              onActivate={performPrimary} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
          </div>
        </Stack>
      )}

      {/* Footer: global this-turn summary + End Turn */}
      <Group mt="md" gap="lg" align="center">
        <SummaryCol k="Staged this turn" v={`${props.stagedTotal}${props.cancels.length ? ` · ${props.cancels.length} stopping` : ''}`} />
        <SummaryCol k="Cost now" v={`PC ${props.costNow.politicalCapital} · $${Math.round(props.costNow.money)}`} />
        <SummaryCol k="Upkeep next turn" v={`$${Math.round(props.upkeepNext)} / turn`} />
        <Box style={{ marginLeft: 'auto', textAlign: 'right' }}>
          {props.validationReason && <Text c="red" size="xs" mb={4}>{props.validationReason}</Text>}
          <Button size="md" disabled={!props.canEndTurn} onClick={props.onEndTurn}>End Turn ▶</Button>
        </Box>
      </Group>
    </Paper>
  );
}

function LaneStrip({ cards, emptyText, onActivate, onDragStart, onDragEnd }: {
  cards: CardVM[];
  emptyText: string;
  onActivate(vm: CardVM): void;
  onDragStart(vm: CardVM): void;
  onDragEnd(vm: CardVM, point: { x: number; y: number }): void;
}) {
  if (cards.length === 0) {
    return <Text size="xs" c="dimmed" fs="italic" py={18}>{emptyText}</Text>;
  }
  return (
    <ScrollArea.Autosize>
      <Group align="stretch" gap={12} wrap="nowrap" py={2}>
        {cards.map((vm) => (
          <PolicyCard key={`${vm.policy.id}:${vm.lane}`} vm={vm}
            onActivate={onActivate} onDragStart={onDragStart} onDragEnd={onDragEnd} />
        ))}
      </Group>
    </ScrollArea.Autosize>
  );
}

function SummaryCol({ k, v }: { k: string; v: string }) {
  return (
    <Box>
      <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: '.05em' }}>{k}</Text>
      <Text fw={700}>{v}</Text>
    </Box>
  );
}
