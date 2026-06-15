import { useEffect } from 'react';
import { ActionIcon, Box, Overlay, ScrollArea } from '@mantine/core';
import { motion } from 'framer-motion';
import type { Region } from '@earth-alliance/engine';
import { Dashboard } from './Dashboard.js';
import { RegionPanel } from './RegionPanel.js';
import type { ClimatePoint } from '../game/useGame.js';

interface DataOverlayProps {
  opened: boolean;
  onClose(): void;
  /** Selected region → its breakdown; `null` → the planet breakdown. */
  region: Region | null;
  temperature: number;
  co2: number;
  annualEmissions: number;
  regions: Region[];
  history: ClimatePoint[];
}

/**
 * Emissions data in an overlay window (opened from the resource-bar 📊 button). Hosts the existing
 * `RegionPanel` (when a region is selected) or `Dashboard` (the planet, otherwise) — no emissions
 * logic is duplicated here. Follows the `EndingScreen` overlay pattern (dark backdrop, centered
 * surface, framer-motion fade + rise); closes on ✕, Escape, or a backdrop click.
 */
export function DataOverlay({
  opened, onClose, region, temperature, co2, annualEmissions, regions, history,
}: DataOverlayProps) {
  useEffect(() => {
    if (!opened) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opened, onClose]);

  if (!opened) return null;

  return (
    <Overlay color="#000" backgroundOpacity={0.85} fixed zIndex={1000} onClick={onClose}>
      <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
        {/* stopPropagation so clicks inside the window don't fall through to the backdrop. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'relative', width: 560, maxWidth: '100%' }}
        >
          <ActionIcon
            aria-label="Close" variant="subtle" color="gray" size="md"
            onClick={onClose}
            style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
          >
            ✕
          </ActionIcon>
          {/* RegionPanel / Dashboard each render their own bordered Paper surface. */}
          <ScrollArea.Autosize mah="86vh">
            {region ? (
              <RegionPanel region={region} />
            ) : (
              <Dashboard
                temperature={temperature} co2={co2} annualEmissions={annualEmissions}
                regions={regions} history={history}
              />
            )}
          </ScrollArea.Autosize>
        </motion.div>
      </Box>
    </Overlay>
  );
}
