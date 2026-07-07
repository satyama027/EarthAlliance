import { useEffect, useState } from 'react';
import { AppShell, Grid, Box } from '@mantine/core';
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
    <AppShell padding="md">
      <AppShell.Main>
        {/* Sticky resource header — stays visible while you set policies, and shows what is
            REMAINING to spend (balance − this turn's staged cost). */}
        <Box style={{ position: 'sticky', top: 0, zIndex: 200, background: 'var(--mantine-color-body)', paddingBottom: 8 }}>
          <ResourceBar year={game.state.year} turn={game.state.turn}
            money={game.state.resources.money} costNow={game.costNow}
            temperature={game.state.climate.temperatureAnomaly} co2={game.state.climate.co2Concentration} />
        </Box>
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 9 }}>
            {/* Map shares the row with the RegionInfoBox now. The inline SVG (preserveAspectRatio
                "meet") always shows the whole world, centered; height stays fixed so it never
                letterboxes regardless of the info box's height. */}
            <Box style={{ height: 480, borderRadius: 8, overflow: 'hidden', background: '#05080f' }}>
              <WorldMap
                selectedRegionId={selectedRegionId}
                onSelectRegion={setSelectedRegionId}
              />
            </Box>
          </Grid.Col>
          {/* Single-click headline data beside the map; its 📊 button drills into the DataOverlay. */}
          <Grid.Col span={{ base: 12, md: 3 }}>
            <RegionInfoBox
              region={selectedRegion}
              temperature={game.state.climate.temperatureAnomaly}
              co2={game.state.climate.co2Concentration}
              annualEmissions={game.state.climate.annualEmissions}
              budget={selectedBudget}
              onOpenData={() => setDataOpen(true)}
            />
          </Grid.Col>
          {/* Policy board raised directly under the map so policies can be set and the
              turn ended without scrolling. */}
          <Grid.Col span={12}>
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
          </Grid.Col>
          {/* Turn Log demoted to the bottom — reference/history, not action. */}
          <Grid.Col span={12}>
            <TurnLog turnLog={game.turnLog} selectedRegionId={selectedRegionId} />
          </Grid.Col>
        </Grid>
      </AppShell.Main>
      <DataOverlay
        opened={dataOpen} onClose={() => setDataOpen(false)}
        region={selectedRegion} budget={selectedBudget}
        temperature={game.state.climate.temperatureAnomaly} co2={game.state.climate.co2Concentration}
        annualEmissions={game.state.climate.annualEmissions}
        regions={game.state.regions} history={game.history}
        diagnostics={latestDiagnostics}
      />
      {game.ending && (
        <EndingScreen ending={game.ending} year={game.state.year} onPlayAgain={() => { game.reset(); setSelectedRegionId(null); }} />
      )}
    </AppShell>
  );
}
