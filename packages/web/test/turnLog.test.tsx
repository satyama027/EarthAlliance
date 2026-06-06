import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { createInitialState, advanceTurn } from '@earth-alliance/engine';
import type { ReactNode } from 'react';
import { TurnLog } from '../src/components/TurnLog.js';
import type { TurnRecord } from '../src/game/useGame.js';

function wrap(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

/** Build a real two-turn log straight from the engine. */
function sampleLog(): TurnRecord[] {
  const s0 = createInitialState();
  const { state: s1, diagnostics } = advanceTurn(s0, []);
  return [
    { turn: s0.turn, year: s0.year, state: s0, diagnostics: null },
    { turn: s1.turn, year: s1.year, state: s1, diagnostics },
  ];
}

describe('TurnLog', () => {
  it('logs the global planet block for each turn, newest first', () => {
    wrap(<TurnLog turnLog={sampleLog()} selectedRegionId={null} />);
    expect(screen.getByText('Turn Log')).toBeInTheDocument();
    expect(screen.getByText('Turn 1')).toBeInTheDocument();
    // Global parameters incl. the new exact damage diagnostic.
    expect(screen.getAllByText('Warming').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Damage').length).toBeGreaterThan(0);
  });

  it('prompts to pick a region when none is selected', () => {
    wrap(<TurnLog turnLog={sampleLog()} selectedRegionId={null} />);
    expect(screen.getAllByText(/select a region/i).length).toBeGreaterThan(0);
  });

  it('logs the selected region block, including demography and growth', () => {
    const log = sampleLog();
    const region = log[1]!.state.regions[0]!;
    wrap(<TurnLog turnLog={log} selectedRegionId={region.id} />);
    expect(screen.getAllByText(region.name).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Education').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Health').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GDP/cap').length).toBeGreaterThan(0);
  });

  it('hides the calc internals behind a per-entry "More" toggle', () => {
    const log = sampleLog();
    const region = log[1]!.state.regions[0]!;
    wrap(<TurnLog turnLog={log} selectedRegionId={region.id} />);

    // Only the turn with diagnostics (turn 1) gets a More toggle; the baseline (turn 0) does not.
    const toggles = screen.getAllByRole('button', { name: /more/i });
    expect(toggles).toHaveLength(1);

    // Calc rows are mounted but collapsed (not visible) by default.
    expect(screen.getByText('CO₂ ratio')).not.toBeVisible();
    expect(screen.getByText('Constraint')).not.toBeVisible();
    expect(screen.getByText('Base growth')).not.toBeVisible();

    // Expanding reveals them — including the swept-in damage, pressure, and support drivers.
    fireEvent.click(toggles[0]!);
    expect(screen.getByText('CO₂ ratio')).toBeVisible();
    expect(screen.getByText('Constraint')).toBeVisible();
    expect(screen.getAllByText('Damage').length).toBeGreaterThan(1); // headline + CALC
    expect(screen.getByText('Water loss')).toBeVisible();
    expect(screen.getByText('Bio loss')).toBeVisible();
    expect(screen.getByText('from warming')).toBeVisible();
    expect(screen.getByText('Money regen')).toBeVisible();
    expect(screen.getByRole('button', { name: /less/i })).toBeInTheDocument();
  });

  it('shows global calc internals but no region calc when no region is selected', () => {
    wrap(<TurnLog turnLog={sampleLog()} selectedRegionId={null} />);
    fireEvent.click(screen.getByRole('button', { name: /more/i }));
    expect(screen.getByText('CO₂ ratio')).toBeVisible();   // global calc present
    expect(screen.queryByText('Constraint')).toBeNull();   // region calc absent
  });
});
