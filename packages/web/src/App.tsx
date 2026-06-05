import { useEffect, useState } from 'react';
import { AppShell, Grid, Box } from '@mantine/core';
import { WorldMap } from './scene/WorldMap.js';
import { ResourceBar } from './components/ResourceBar.js';
import { Dashboard } from './components/Dashboard.js';
import { PolicyTray } from './components/PolicyTray.js';
import { RegionPanel } from './components/RegionPanel.js';
import { EndingScreen } from './components/EndingScreen.js';
import { useGame } from './game/useGame.js';
import { useSfx } from './audio/useSfx.js';
import { validateSelection, type Region } from '@earth-alliance/engine';

export default function App() {
  const game = useGame();
  const sfx = useSfx();
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  // Play a sound for each event produced by the last turn.
  useEffect(() => {
    for (const e of game.lastEvents) sfx.playForEvent(e);
  }, [game.lastEvents, sfx]);

  const affordableIds = game.available
    .filter((p) => validateSelection(game.state, [...game.selected, p.id]).ok || game.selected.includes(p.id))
    .map((p) => p.id);

  const selectedRegion: Region | null =
    game.state.regions.find((r) => r.id === selectedRegionId) ?? null;

  return (
    <AppShell padding="md">
      <AppShell.Main>
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Box style={{ height: '70vh', minHeight: 420, borderRadius: 8, overflow: 'hidden', background: '#05080f' }}>
              <WorldMap
                selectedRegionId={selectedRegionId}
                onSelectRegion={setSelectedRegionId}
              />
            </Box>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Box style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ResourceBar year={game.state.year} turn={game.state.turn}
                politicalCapital={game.state.resources.politicalCapital} money={game.state.resources.money} />
              <Dashboard temperature={game.state.climate.temperatureAnomaly} co2={game.state.climate.co2Concentration}
                annualEmissions={game.state.climate.annualEmissions} history={game.history} />
              <RegionPanel region={selectedRegion} />
            </Box>
          </Grid.Col>
          <Grid.Col span={12}>
            <PolicyTray
              policies={game.available}
              selectedIds={game.selected}
              affordableIds={affordableIds}
              onToggle={game.togglePolicy}
              onEndTurn={game.endTurn}
              canEndTurn={game.canEndTurn}
              validationReason={game.validationReason}
            />
          </Grid.Col>
        </Grid>
      </AppShell.Main>
      {game.ending && (
        <EndingScreen ending={game.ending} year={game.state.year} onPlayAgain={() => { game.reset(); setSelectedRegionId(null); }} />
      )}
    </AppShell>
  );
}
