import { Button, Group, ScrollArea, Stack, Text } from '@mantine/core';
import type { Policy } from '@earth-alliance/engine';
import { PolicyCard } from './PolicyCard.js';

interface PolicyTrayProps {
  policies: Policy[];
  selectedIds: string[];
  affordableIds: string[];
  onToggle(id: string): void;
  onEndTurn(): void;
  canEndTurn: boolean;
  validationReason: string | null;
}

export function PolicyTray({ policies, selectedIds, affordableIds, onToggle, onEndTurn, canEndTurn, validationReason }: PolicyTrayProps) {
  return (
    <Stack gap="xs">
      <ScrollArea.Autosize mah={420}>
        <Group align="stretch">
          {policies.map((p) => (
            <div key={p.id} style={{ width: 180 }}>
              <PolicyCard
                policy={p}
                selected={selectedIds.includes(p.id)}
                affordable={affordableIds.includes(p.id) || selectedIds.includes(p.id)}
                onToggle={onToggle}
              />
            </div>
          ))}
        </Group>
      </ScrollArea.Autosize>
      {validationReason && <Text c="red" size="sm">{validationReason}</Text>}
      <Button size="md" disabled={!canEndTurn} onClick={onEndTurn}>End Turn ▶</Button>
    </Stack>
  );
}
