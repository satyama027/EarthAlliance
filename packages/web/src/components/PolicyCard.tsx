import { Card, Group, Text, Badge, Box } from '@mantine/core';
import { motion } from 'framer-motion';
import type { Policy } from '@earth-alliance/engine';
import { CATEGORY_COLOR } from '../theme.js';

const CATEGORY_ICON: Record<string, string> = {
  energy: '⚡', industry: '🏭', land: '🌳', social: '🤝', frontier: '🚀',
};

interface PolicyCardProps {
  policy: Policy;
  selected: boolean;
  affordable: boolean;
  onToggle(id: string): void;
}

export function PolicyCard({ policy, selected, affordable, onToggle }: PolicyCardProps) {
  const disabled = !affordable && !selected;
  return (
    <motion.div whileHover={disabled ? undefined : { scale: 1.03 }} whileTap={disabled ? undefined : { scale: 0.98 }}>
      <Card
        data-testid="policy-card"
        withBorder
        padding="sm"
        aria-disabled={disabled}
        onClick={() => { if (!disabled) onToggle(policy.id); }}
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          outline: selected ? '2px solid var(--mantine-color-earth-5)' : 'none',
        }}
      >
        {/* Placeholder art: category-colored band + icon (real art drops in later) */}
        <Box style={{ background: CATEGORY_COLOR[policy.category], height: 36, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          {CATEGORY_ICON[policy.category] ?? '•'}
        </Box>
        <Text fw={700} mt="xs">{policy.name}</Text>
        <Text size="xs" c="dimmed" lineClamp={2}>{policy.description}</Text>
        <Group mt="xs" gap="xs">
          <Badge color="grape" variant="light">PC {policy.cost.politicalCapital}</Badge>
          <Badge color="teal" variant="light">$ {policy.cost.money}</Badge>
        </Group>
      </Card>
    </motion.div>
  );
}
