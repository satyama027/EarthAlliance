import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { vi } from 'vitest';
import { createInitialState, advanceTurn, SAMPLE_REGIONS } from '@earth-alliance/engine';
import type { ReactNode } from 'react';
import { DataOverlay } from '../src/components/DataOverlay.js';
import type { TurnRecord } from '../src/game/useGame.js';

function wrap(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

function buildLog(): TurnRecord[] {
  const s0 = createInitialState();
  const log: TurnRecord[] = [{ turn: s0.turn, year: s0.year, state: s0, diagnostics: null }];
  const { state, diagnostics } = advanceTurn(s0, []);
  log.push({ turn: state.turn, year: state.year, state, diagnostics });
  return log;
}

const log = buildLog();
const PLANET = { kind: 'planet' } as const;

describe('DataOverlay', () => {
  it('renders nothing when closed', () => {
    wrap(<DataOverlay opened={false} onClose={() => {}} entity={PLANET} log={log} />);
    expect(screen.queryByText('Planet')).not.toBeInTheDocument();
  });

  it('opens on the planet six-tile metrics grid', () => {
    wrap(<DataOverlay opened onClose={() => {}} entity={PLANET} log={log} />);
    expect(screen.getByRole('heading', { name: 'Planet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /emissions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /biodiversity/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /income/i })).toBeInTheDocument();
  });

  it('drills a planet metric into a composition breakdown', async () => {
    wrap(<DataOverlay opened onClose={() => {}} entity={PLANET} log={log} />);
    await userEvent.click(screen.getByRole('button', { name: /emissions/i }));
    // breadcrumb names the current metric; the sector rows appear (no separate section label)
    expect(screen.getByRole('button', { name: /transport/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /electricity/i })).toBeInTheDocument();
  });

  it('shows the region drill-down when a region entity is given', () => {
    const region = SAMPLE_REGIONS[0]!; // north-america
    wrap(<DataOverlay opened onClose={() => {}} entity={{ kind: 'region', id: region.id }} log={log} />);
    expect(screen.getByRole('heading', { name: region.name })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /water availability/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Planet' })).not.toBeInTheDocument();
  });

  it('calls onClose when the ✕ button is clicked', async () => {
    const onClose = vi.fn();
    wrap(<DataOverlay opened onClose={onClose} entity={PLANET} log={log} />);
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    wrap(<DataOverlay opened onClose={onClose} entity={PLANET} log={log} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
