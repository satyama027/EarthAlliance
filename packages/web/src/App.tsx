import { useEffect, useState } from 'react';
import { AppShell, Box } from '@mantine/core';
import { WorldMap } from './scene/WorldMap.js';
import { ResourceBar } from './components/ResourceBar.js';
import { RegionInfoBox } from './components/RegionInfoBox.js';
import { PolicyBoard } from './components/PolicyBoard.js';
import { TurnLog } from './components/TurnLog.js';
import { DataOverlay } from './components/DataOverlay.js';
import { EndingScreen } from './components/EndingScreen.js';
import { useGame } from './game/useGame.js';
import { regionBudget } from './game/regionBudget.js';
import { useSfx } from './audio/useSfx.js';
import { type Region } from '@earth-alliance/engine';

export default function App() {
  const game = useGame();
  const sfx = useSfx();
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [dataOpen, setDataOpen] = useState(false);

  // Play a sound for each event produced by the last turn.
  useEffect(() => {
    for (const e of game.lastEvents) sfx.playForEvent(e);
  }, [game.lastEvents, sfx]);

  const selectedRegion: Region | null =
    game.state.regions.find((r) => r.id === selectedRegionId) ?? null;

  // Per-region income breakdown from the last turn's diagnostics (projection on the opening turn).
  const latestDiagnostics = game.turnLog[game.turnLog.length - 1]?.diagnostics ?? null;
  const selectedBudget = selectedRegion ? regionBudget(selectedRegion, latestDiagnostics) : undefined;

  return (
    <AppShell padding={0}>
      <AppShell.Main>
        {/* Sticky resource header → a map row of a FIXED, viewport-derived height (stable — it
            depends only on the screen height, NOT on whether a region is selected, so the map never
            resizes when you click a region) → the PolicyBoard (End Turn in its right gutter). The
            Turn Log follows, below the fold. */}
        <Box style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8 }}>
          <Box style={{ position: 'sticky', top: 0, zIndex: 200, background: 'var(--mantine-color-body)' }}>
            <ResourceBar year={game.state.year} turn={game.state.turn}
              money={game.state.resources.money} costNow={game.costNow}
              temperature={game.state.climate.temperatureAnomaly} co2={game.state.climate.co2Concentration} />
          </Box>

          {/* Map row. The map height is `clamp(min, 100dvh − board/chrome, max)`: it grows on tall
              screens and shrinks on short ones, but is INDEPENDENT of the board's content — so it is
              identical with or without a region selected. The region card sits top-aligned beside it. */}
          <Box style={{ display: 'flex', gap: 10 }}>
            <Box style={{ flex: '1 1 auto', minWidth: 0, height: 'clamp(180px, calc(100dvh - 376px), 560px)', borderRadius: 8, overflow: 'hidden', background: '#05080f' }}>
              <WorldMap selectedRegionId={selectedRegionId} onSelectRegion={setSelectedRegionId} />
            </Box>
            <Box style={{ flex: '0 0 clamp(220px, 22vw, 260px)', alignSelf: 'flex-start' }}>
              <RegionInfoBox
                region={selectedRegion}
                temperature={game.state.climate.temperatureAnomaly}
                co2={game.state.climate.co2Concentration}
                annualEmissions={game.state.climate.annualEmissions}
                budget={selectedBudget}
                onOpenData={() => setDataOpen(true)}
              />
            </Box>
          </Box>

          {/* Policy board directly under the map; End Turn lives in its right gutter (not a footer). */}
          <PolicyBoard
            state={game.state}
            regionId={selectedRegionId}
            staged={game.staged}
            cancels={game.cancels}
            onEnact={game.stage}
            onUnstage={game.unstage}
            onToggleCancel={game.toggleCancel}
            onEndTurn={game.endTurn}
            canEndTurn={game.canEndTurn}
            validationReason={game.validationReason}
            costNow={game.costNow}
            upkeepNext={game.upkeepNext}
            stagedTotal={game.staged.length}
          />
        </Box>

        {/* Turn Log — reference/history, intentionally below the fold. */}
        <Box style={{ padding: '0 10px 10px' }}>
          <TurnLog turnLog={game.turnLog} selectedRegionId={selectedRegionId} />
        </Box>
      </AppShell.Main>
      <DataOverlay
        opened={dataOpen} onClose={() => setDataOpen(false)}
        entity={selectedRegion ? { kind: 'region', id: selectedRegion.id } : { kind: 'planet' }}
        log={game.turnLog}
      />
      {game.ending && (
        <EndingScreen ending={game.ending} year={game.state.year} onPlayAgain={() => { game.reset(); setSelectedRegionId(null); }} />
      )}
    </AppShell>
  );
}
