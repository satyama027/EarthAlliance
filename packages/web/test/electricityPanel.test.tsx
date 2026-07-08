import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { createInitialState, advanceTurn } from '@earth-alliance/engine';
import type { ReactNode } from 'react';
import { ElectricityPanel } from '../src/components/ElectricityPanel.js';
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
const EA = 'east-asia'; // coal-heavy grid — a clear generation/emissions split

describe('ElectricityPanel', () => {
  it('renders the two separated sections (generation vs emissions)', () => {
    wrap(<ElectricityPanel entity={{ kind: 'region', id: EA }} log={log} />);
    expect(screen.getByText('Generation mix')).toBeInTheDocument();
    expect(screen.getByText('Electricity emissions')).toBeInTheDocument();
  });

  it('shows total power generation (TWh/yr) on the heading row and drops the "share of power" note', () => {
    wrap(<ElectricityPanel entity={{ kind: 'region', id: EA }} log={log} />);
    expect(screen.getByText('TWh/yr')).toBeInTheDocument();
    expect(screen.getByText(/total generation/i)).toBeInTheDocument();
    // East Asia is a very large grid (~11,600 TWh) — the figure should be in the thousands
    expect(screen.getByText(/^\d{2},\d{3}$/)).toBeInTheDocument();
    // the trimmed heading no longer carries the "— share of power · = 100%" note
    expect(screen.queryByText(/share of power/i)).toBeNull();
  });

  it('draws the generation donut (8 slices) with the clean share in the hole', () => {
    const { container } = wrap(<ElectricityPanel entity={{ kind: 'region', id: EA }} log={log} />);
    expect(screen.getByText('clean')).toBeInTheDocument();
    const donut = container.querySelector('svg[aria-label="generation mix"]')!;
    expect(donut.querySelectorAll('circle').length).toBe(8);
  });

  it('groups generation into Fossil and Clean', () => {
    wrap(<ElectricityPanel entity={{ kind: 'region', id: EA }} log={log} />);
    expect(screen.getByText('Fossil')).toBeInTheDocument();
    expect(screen.getByText('Clean')).toBeInTheDocument();
  });

  it('labels emitters in Gt, clean sources as 0, and pools to a total', () => {
    const { container } = wrap(<ElectricityPanel entity={{ kind: 'region', id: EA }} log={log} />);
    const streams = container.querySelector('svg[aria-label="electricity emissions by source"]')!;
    const texts = Array.from(streams.querySelectorAll('text')).map((t) => t.textContent ?? '');
    expect(texts.some((t) => /^= \d/.test(t))).toBe(true);    // pooled total "= X.X"
    expect(texts.some((t) => /Gt/.test(t))).toBe(true);        // a fossil labelled in Gt
    expect(texts).toContain('0');                              // clean sources show 0
    // clean streams are dashed (zero-width), fossils are filled ribbons
    expect(streams.querySelectorAll('path[stroke-dasharray]').length).toBe(5); // nuclear + 4 renewables
  });
});
