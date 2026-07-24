import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { vi } from 'vitest';
import type { ReactNode } from 'react';
import { createInitialState, type WorldState } from '@earth-alliance/engine';
import { EndOfTurnReport } from '../src/components/EndOfTurnReport.js';
import { turnReport } from '../src/game/turnReport.js';
import type { TurnRecord } from '../src/game/useGame.js';

function wrap(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

function mkRecord(turn: number, year: number, v: { temp: number; emissions: number; co2: number; money: number; bio: number }): TurnRecord {
  const base = createInitialState();
  const state: WorldState = {
    ...base,
    climate: { ...base.climate, temperatureAnomaly: v.temp, annualEmissions: v.emissions, co2Concentration: v.co2 },
    resources: { ...base.resources, money: v.money },
    regions: base.regions.map((r) => ({ ...r, biodiversityIndex: v.bio })),
  };
  return { turn, year, state, diagnostics: null };
}

const report = turnReport([
  mkRecord(1, 2030, { temp: 1.30, emissions: 41.5, co2: 419, money: 1448, bio: 62.0 }),
  mkRecord(2, 2035, { temp: 1.34, emissions: 41.2, co2: 421, money: 1490, bio: 61.6 }),
]);

describe('EndOfTurnReport', () => {
  it('renders nothing when closed', () => {
    wrap(<EndOfTurnReport opened={false} onClose={() => {}} report={report} />);
    expect(screen.queryByRole('heading', { name: /end of turn/i })).not.toBeInTheDocument();
  });

  it('renders nothing when there is no report yet', () => {
    wrap(<EndOfTurnReport opened onClose={() => {}} report={null} />);
    expect(screen.queryByRole('heading', { name: /end of turn/i })).not.toBeInTheDocument();
  });

  it('shows a clear title over a dimmed turn/years subtitle', () => {
    wrap(<EndOfTurnReport opened onClose={() => {}} report={report} />);
    expect(screen.getByRole('heading', { name: /end of turn/i })).toBeInTheDocument();
    expect(screen.getByText(/Turn 2 · 2030\s*→\s*2035/)).toBeInTheDocument();
  });

  it('lists all five metrics with their values', () => {
    wrap(<EndOfTurnReport opened onClose={() => {}} report={report} />);
    for (const label of ['Temperature', 'Emissions', 'CO₂ concentration', 'Treasury', 'Biodiversity']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('+1.34')).toBeInTheDocument();
    expect(screen.getByText('41.2')).toBeInTheDocument();
    expect(screen.getByText('421')).toBeInTheDocument();
    expect(screen.getByText('1,490')).toBeInTheDocument();
    expect(screen.getByText('61.6')).toBeInTheDocument();
  });

  it('shows a directional delta chip per metric', () => {
    wrap(<EndOfTurnReport opened onClose={() => {}} report={report} />);
    expect(screen.getByText(/▲\s*0\.04/)).toBeInTheDocument();   // warming rose
    expect(screen.getByText(/▼\s*0\.30/)).toBeInTheDocument();   // emissions fell
    expect(screen.getByText(/▼\s*0\.40/)).toBeInTheDocument();   // biodiversity fell
  });

  it('calls onClose from the Continue button', async () => {
    const onClose = vi.fn();
    wrap(<EndOfTurnReport opened onClose={onClose} report={report} />);
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose from the ✕ button', async () => {
    const onClose = vi.fn();
    wrap(<EndOfTurnReport opened onClose={onClose} report={report} />);
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    wrap(<EndOfTurnReport opened onClose={onClose} report={report} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
