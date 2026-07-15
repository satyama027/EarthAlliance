import { Box, Group, Text, Tooltip, ActionIcon } from '@mantine/core';

interface TurnControlProps {
  /** How many policies are staged this turn. */
  stagedTotal: number;
  /** How many committed programs are marked to stop this turn. */
  cancelsCount: number;
  /** This turn's staged spend (money). */
  costNow: { money: number };
  /** Next turn's recurring/buildout upkeep. */
  upkeepNext: number;
  /** Why the turn can't end yet (over budget / invalid), or `null`. */
  validationReason: string | null;
  canEndTurn: boolean;
  onEndTurn(): void;
}

/** A right-aligned label + bold value line. */
function SummaryLine({ k, v }: { k: string; v: string }) {
  return (
    <Group gap={6} justify="flex-end" wrap="nowrap">
      <Text size="xs" c="dimmed">{k}</Text>
      <Text size="sm" fw={700}>{v}</Text>
    </Group>
  );
}

/**
 * The turn-control cluster that sits in the PolicyBoard's reclaimed right gutter: the this-turn
 * summary (staged / cost / upkeep) at the top and the primary **End Turn** action — an icon button
 * with a hover tooltip — pinned at the bottom-right. Disabled with the validation reason shown when
 * the turn cannot be ended (mirrors the engine's `validateSelection`).
 */
export function TurnControl(props: TurnControlProps) {
  return (
    <Box
      data-testid="turn-control"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', height: '100%' }}
    >
      <SummaryLine
        k="Staged"
        v={`${props.stagedTotal}${props.cancelsCount ? ` · ${props.cancelsCount} stopping` : ''}`}
      />
      <SummaryLine k="Cost now" v={`$${Math.round(props.costNow.money)}`} />
      <SummaryLine k="Upkeep" v={`$${Math.round(props.upkeepNext)}/turn`} />

      <Box style={{ flex: 1 }} />

      {props.validationReason && (
        <Text c="red" size="xs" ta="right" mb={6} role="alert" style={{ maxWidth: 150 }}>
          {props.validationReason}
        </Text>
      )}
      <Tooltip label="End turn" position="top" withArrow>
        <ActionIcon
          size={52}
          radius="md"
          color="earth"
          variant="filled"
          disabled={!props.canEndTurn}
          onClick={props.onEndTurn}
          aria-label="End turn"
        >
          <Text span style={{ fontSize: 22, lineHeight: 1 }}>⏭</Text>
        </ActionIcon>
      </Tooltip>
    </Box>
  );
}
