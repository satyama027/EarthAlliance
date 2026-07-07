import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { createInitialState, advanceTurn, SAMPLE_REGIONS } from '@earth-alliance/engine';
import type { ReactNode } from 'react';
import { DrillDownPanel } from '../src/components/DrillDownPanel.js';
import type { TurnRecord } from '../src/game/useGame.js';

function wrap(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

function buildLog(): TurnRecord[] {
  const s0 = createInitialState();
  const log: TurnRecord[] = [{ turn: s0.turn, year: s0.year, state: s0, diagnostics: null }];
  let s = s0;
  for (let i = 0; i < 2; i++) {
    const { state, diagnostics } = advanceTurn(s, []);
    log.push({ turn: state.turn, year: state.year, state, diagnostics });
    s = state;
  }
  return log;
}

const log = buildLog();

describe('DrillDownPanel — planet', () => {
  it('opens on the six-tile grid with the planet heading', () => {
    wrap(<DrillDownPanel entity={{ kind: 'planet' }} log={log} />);
    expect(screen.getByRole('heading', { name: 'Planet' })).toBeInTheDocument();
    for (const name of [/emissions/i, /public support/i, /income/i, /biodiversity/i, /water availability/i, /land availability/i]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('drills Emissions → Electricity into the generation/emissions panel', async () => {
    wrap(<DrillDownPanel entity={{ kind: 'planet' }} log={log} />);
    await userEvent.click(screen.getByRole('button', { name: /emissions/i }));
    // sector rows appear
    expect(screen.getByRole('button', { name: /transport/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /electricity/i }));
    // the custom electricity panel: two separated sections + the emissions-total change chip
    expect(screen.getByText('Generation mix')).toBeInTheDocument();
    expect(screen.getByText('Electricity emissions')).toBeInTheDocument();
    expect(screen.getByText('clean')).toBeInTheDocument();      // donut hole = clean share
    expect(screen.getByText(/since 20\d\d/i)).toBeInTheDocument();
  });

  it('breadcrumb navigates back to a prior level and to the overview', async () => {
    wrap(<DrillDownPanel entity={{ kind: 'planet' }} log={log} />);
    await userEvent.click(screen.getByRole('button', { name: /emissions/i }));
    await userEvent.click(screen.getByRole('button', { name: /electricity/i }));
    // breadcrumb has an Emissions crumb — click it to go back one level
    await userEvent.click(screen.getByRole('button', { name: 'Emissions' }));
    expect(screen.getByRole('button', { name: /industry/i })).toBeInTheDocument();
    // back to overview grid
    await userEvent.click(screen.getByRole('button', { name: /overview/i }));
    expect(screen.getByRole('button', { name: /biodiversity/i })).toBeInTheDocument();
  });

  it('an index tile opens its trend directly', async () => {
    wrap(<DrillDownPanel entity={{ kind: 'planet' }} log={log} />);
    await userEvent.click(screen.getByRole('button', { name: /biodiversity/i }));
    // breadcrumb current crumb names the metric; the trend change chip renders
    expect(screen.getByText('Biodiversity')).toBeInTheDocument();
    expect(screen.getByText(/since 2025/i)).toBeInTheDocument();
  });

  it('Income drills into a signed ledger with a Net row', async () => {
    wrap(<DrillDownPanel entity={{ kind: 'planet' }} log={log} />);
    await userEvent.click(screen.getByRole('button', { name: /income/i }));
    expect(screen.getByText('Tax (GDP)')).toBeInTheDocument();
    expect(screen.getByText('Net')).toBeInTheDocument();
  });
});

describe('DrillDownPanel — region', () => {
  it('uses the region name as the heading and drives the same tree', async () => {
    const region = SAMPLE_REGIONS[0]!;
    wrap(<DrillDownPanel entity={{ kind: 'region', id: region.id }} log={log} />);
    expect(screen.getByRole('heading', { name: region.name })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /water availability/i }));
    expect(screen.getByText('Water availability')).toBeInTheDocument(); // breadcrumb current crumb
    expect(screen.getByText(/since 2025/i)).toBeInTheDocument();
  });
});
