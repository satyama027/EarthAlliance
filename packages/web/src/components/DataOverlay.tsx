import { useEffect } from 'react';
import { ActionIcon, Box, Overlay, ScrollArea } from '@mantine/core';
import { motion } from 'framer-motion';
import { DrillDownPanel } from './DrillDownPanel.js';
import { Z_LAYERS } from '../theme.js';
import type { Entity } from '../game/metricTree.js';
import type { TurnRecord } from '../game/useGame.js';

interface DataOverlayProps {
  opened: boolean;
  onClose(): void;
  /** The planet, or a selected region — the entity the drill-down reads. */
  entity: Entity;
  /** The full per-turn history; every metric series is derived from it. */
  log: TurnRecord[];
}

/**
 * The "Full data" window (opened from the RegionInfoBox 📊 button). Hosts the config-driven
 * `DrillDownPanel` — a 6-tile metrics grid that drills into composition breakdowns or value-vs-year
 * trend graphs. Follows the `EndingScreen` overlay pattern (dark backdrop, centered surface,
 * framer-motion fade + rise); closes on ✕, Escape, or a backdrop click. `key`ing the panel by entity
 * resets the drill path when the selection changes.
 */
export function DataOverlay({ opened, onClose, entity, log }: DataOverlayProps) {
  useEffect(() => {
    if (!opened) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opened, onClose]);

  if (!opened) return null;

  const entityKey = entity.kind === 'region' ? entity.id : 'planet';

  return (
    <Overlay color="#000" backgroundOpacity={0.85} fixed zIndex={Z_LAYERS.overlay} onClick={onClose}>
      <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
        {/* stopPropagation so clicks inside the window don't fall through to the backdrop. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'relative', width: 460, maxWidth: '100%' }}
        >
          <ActionIcon
            aria-label="Close" variant="subtle" color="gray" size="md"
            onClick={onClose}
            style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
          >
            ✕
          </ActionIcon>
          <ScrollArea.Autosize mah="86vh">
            <DrillDownPanel key={entityKey} entity={entity} log={log} />
          </ScrollArea.Autosize>
        </motion.div>
      </Box>
    </Overlay>
  );
}
