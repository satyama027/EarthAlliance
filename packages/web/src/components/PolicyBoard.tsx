import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Paper, Group, Text, Button, ScrollArea, Box, Divider, Stack } from '@mantine/core';
import { validateSelection, type WorldState, type PolicySelection } from '@earth-alliance/engine';
import { REGION_COLORS } from '../theme.js';
import { regionPolicyView, type CardVM } from '../game/policyView.js';
import { PolicyCard, CardFace } from './PolicyCard.js';
import { PolicyDetailOverlay } from './PolicyDetailOverlay.js';

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
  costNow: { money: number };
  upkeepNext: number;
  stagedTotal: number;
}

/** Empty drop slots shown in the Active lane so the drop target is always visible. */
const ACTIVE_SLOTS = 2;
/** How far the pointer must travel before a press becomes a drag (vs. a tap). */
const DRAG_THRESHOLD = 5;
/** Window (ms) within which a second tap on the same card counts as a double-click (= activate). */
const DOUBLE_TAP_MS = 220;

type Lane = 'active' | 'available';
interface DragState { vm: CardVM; x: number; y: number; over: Lane | null }

/** Can this card be enacted/stopped directly (vs. inspect-only, e.g. locked)? Mirrors `isActionable`. */
function isActionableVm(vm: CardVM): boolean {
  if (vm.lane === 'available') return vm.state === 'available';
  return vm.state === 'staged' || vm.cancellable;
}

export function PolicyBoard(props: PolicyBoardProps) {
  const { state, regionId, staged, cancels } = props;
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [detailVm, setDetailVm] = useState<CardVM | null>(null);

  // Single- vs double-click discrimination for the pointer tap (see `handleTap`).
  const pendingTap = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<{ key: string; time: number } | null>(null);
  useEffect(() => () => { if (pendingTap.current) clearTimeout(pendingTap.current); }, []);

  const region = regionId ? state.regions.find((r) => r.id === regionId) ?? null : null;
  const regionColor = regionId ? REGION_COLORS[regionId] ?? '#909296' : null;

  const view = useMemo(
    () => (regionId ? regionPolicyView(state, regionId, staged, cancels) : null),
    [state, regionId, staged, cancels],
  );

  // The canonical action for a card: enact / unstage / toggle-cancel. A tap, Enter/Space, and a valid
  // cross-lane drop all funnel here. Returns true if it moved.
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

  // A pointer tap. Single tap (after a 220ms wait) opens the detail overlay; a second tap on the same
  // card within that window is a double-click and runs the enact/stop action. Locked / inspect-only
  // cards always just open the overlay.
  function handleTap(vm: CardVM) {
    if (!isActionableVm(vm)) { setDetailVm(vm); return; }
    const key = `${vm.policy.id}:${vm.lane}`;
    const now = Date.now();
    const isDouble = lastTap.current?.key === key && now - lastTap.current.time < DOUBLE_TAP_MS;
    if (pendingTap.current) { clearTimeout(pendingTap.current); pendingTap.current = null; }
    if (isDouble) {
      lastTap.current = null;
      performPrimary(vm);
    } else {
      lastTap.current = { key, time: now };
      pendingTap.current = setTimeout(() => {
        setDetailVm(vm);
        pendingTap.current = null;
        lastTap.current = null;
      }, DOUBLE_TAP_MS);
    }
  }

  // Which lane is under this viewport point? Uses the real hit-test, so it is correct regardless of
  // page scroll (the old getBoundingClientRect math broke once the page scrolled).
  function laneAtPoint(x: number, y: number): Lane | null {
    const lane = document.elementFromPoint(x, y)?.closest('[data-droplane]');
    const v = lane?.getAttribute('data-droplane');
    return v === 'active' || v === 'available' ? v : null;
  }

  // Pointer-driven drag/tap. The lifted card is rendered in a fixed overlay (see below) so it floats
  // ABOVE both lanes and can never be clipped "under" the Active lane's scroll container.
  function startDrag(vm: CardVM, e: React.PointerEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ox = e.clientX - r.left;
    const oy = e.clientY - r.top;
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;

    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return;
      moved = true;
      setDrag({ vm, x: ev.clientX - ox, y: ev.clientY - oy, over: laneAtPoint(ev.clientX, ev.clientY) });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDrag(null);
      if (!moved) { handleTap(vm); return; }                      // a tap — single = inspect, double = act
      const target = laneAtPoint(ev.clientX, ev.clientY);
      if (target && target !== vm.lane && isActionableVm(vm)) performPrimary(vm); // dropped in other lane
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const draggingId = drag ? `${drag.vm.policy.id}:${drag.vm.lane}` : null;
  const activeArmed = drag?.over === 'active' && drag.vm.lane === 'available';
  const enactable = !!view?.available.some((c) => c.state === 'available');
  const activeSlots = enactable ? ACTIVE_SLOTS : 0;

  const armedBorder = (armed: boolean) =>
    armed ? '1.5px dashed var(--mantine-color-earth-5)' : '1.5px dashed transparent';

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
          <div data-droplane="active" style={{ borderRadius: 8, border: armedBorder(activeArmed),
            background: activeArmed ? 'rgba(32,201,151,.04)' : 'transparent', padding: 8 }}>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6} style={{ letterSpacing: '.06em' }}>
              Active · {region.name} · {view.active.length}
              <Text span size="xs" c="dimmed" tt="none" fw={500} style={{ letterSpacing: 0 }}> — drag a card here to enact (or ✕ to remove)</Text>
            </Text>
            <LaneStrip cards={view.active} emptyText="Nothing active here yet." slots={activeSlots}
              armed={activeArmed} draggingId={draggingId}
              onInspect={setDetailVm} onDragStart={startDrag} />
          </div>

          <Divider />

          {/* Available lane */}
          <div data-droplane="available" style={{ borderRadius: 8, padding: 8 }}>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6} style={{ letterSpacing: '.06em' }}>
              Available · {view.available.length}
              <Text span size="xs" c="dimmed" tt="none" fw={500} style={{ letterSpacing: 0 }}> — drag a card up to enact in {region.name} ↑</Text>
            </Text>
            <LaneStrip cards={view.available} emptyText="No more policies available here." slots={0}
              armed={false} draggingId={draggingId}
              onInspect={setDetailVm} onDragStart={startDrag} />
          </div>
        </Stack>
      )}

      {/* Footer: global this-turn summary + End Turn */}
      <Group mt="md" gap="lg" align="center">
        <SummaryCol k="Staged this turn" v={`${props.stagedTotal}${props.cancels.length ? ` · ${props.cancels.length} stopping` : ''}`} />
        <SummaryCol k="Cost now" v={`$${Math.round(props.costNow.money)}`} />
        <SummaryCol k="Upkeep next turn" v={`$${Math.round(props.upkeepNext)} / turn`} />
        <Box style={{ marginLeft: 'auto', textAlign: 'right' }}>
          {props.validationReason && <Text c="red" size="xs" mb={4}>{props.validationReason}</Text>}
          <Button size="md" disabled={!props.canEndTurn} onClick={props.onEndTurn}>End Turn ▶</Button>
        </Box>
      </Group>

      {/* Detail overlay — opened by single click / Enter; its action button runs the same enact/stop. */}
      <PolicyDetailOverlay
        vm={detailVm}
        regionName={region?.name ?? 'this region'}
        onPrimary={performPrimary}
        onClose={() => setDetailVm(null)}
      />

      {/* Floating drag overlay — lives on <body>, above everything, never clipped by a lane. */}
      {drag && createPortal(
        <div style={{ position: 'fixed', left: drag.x, top: drag.y, width: 180, zIndex: 9999,
          pointerEvents: 'none', transform: 'rotate(-3deg) scale(1.05)', transformOrigin: 'center' }}>
          <CardFace vm={drag.vm} floating />
        </div>,
        document.body,
      )}
    </Paper>
  );
}

function LaneStrip({ cards, emptyText, slots, armed, draggingId, onInspect, onDragStart }: {
  cards: CardVM[];
  emptyText: string;
  slots: number;
  armed: boolean;
  draggingId: string | null;
  onInspect(vm: CardVM): void;
  onDragStart(vm: CardVM, e: React.PointerEvent): void;
}) {
  if (cards.length === 0 && slots === 0) {
    return <Text size="xs" c="dimmed" fs="italic" py={18}>{emptyText}</Text>;
  }
  return (
    <ScrollArea.Autosize>
      <Group align="stretch" gap={12} wrap="nowrap" py={2}>
        {cards.map((vm) => (
          <PolicyCard key={`${vm.policy.id}:${vm.lane}`} vm={vm}
            dragging={draggingId === `${vm.policy.id}:${vm.lane}`}
            onInspect={onInspect} onDragStart={onDragStart} />
        ))}
        {Array.from({ length: slots }).map((_, i) => <DropSlot key={`slot-${i}`} armed={armed} />)}
      </Group>
    </ScrollArea.Autosize>
  );
}

/** An empty "ghost" slot in the Active lane signalling where a dragged policy can land. */
function DropSlot({ armed }: { armed: boolean }) {
  return (
    <Box data-testid="drop-slot" style={{
      width: 180, flex: '0 0 180px', minHeight: 150, borderRadius: 8,
      border: armed ? '1.6px dashed var(--mantine-color-earth-5)' : '1.6px dashed var(--mantine-color-dark-4)',
      background: armed ? 'rgba(32,201,151,.08)' : 'transparent',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
      textAlign: 'center', padding: 10,
    }}>
      <Text style={{ fontSize: 22, lineHeight: 1 }} c={armed ? 'earth.5' : 'dark.2'}>＋</Text>
      <Text size="xs" fw={600} c={armed ? 'earth.3' : 'dark.2'}>drop a policy here</Text>
    </Box>
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
