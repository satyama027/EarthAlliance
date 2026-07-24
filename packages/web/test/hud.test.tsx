import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { vi } from 'vitest';
import type { ReactNode } from 'react';
import { ResourceBar } from '../src/components/ResourceBar.js';
import { Sparkline } from '../src/components/Sparkline.js';

function wrap(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('ResourceBar', () => {
  it('shows the year and money', () => {
    wrap(<ResourceBar year={2030} turn={1} money={45} />);
    expect(screen.getByText(/2030/)).toBeInTheDocument();
    expect(screen.getByText(/Money:\s*45/)).toBeInTheDocument();
  });

  it('shows the full balance when nothing is staged (zero cost)', () => {
    wrap(<ResourceBar year={2030} turn={1} money={1500} costNow={{ money: 0 }} />);
    expect(screen.getByText(/Money:\s*1,500/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('subtracts the staged cost so the bar shows what is REMAINING to spend', () => {
    wrap(<ResourceBar year={2030} turn={1} money={1500} costNow={{ money: 250 }} />);
    expect(screen.getByText(/Money:\s*1,250/)).toBeInTheDocument();               // 1500 − 250
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('flags an over-budget selection when remaining goes negative', () => {
    wrap(<ResourceBar year={2030} turn={1} money={100} costNow={{ money: 250 }} />);
    expect(screen.getByText(/Money:\s*-150(?!\d)/)).toBeInTheDocument(); // 100 − 250
    expect(screen.getByRole('alert')).toHaveTextContent(/over budget/i);
  });

  it('shows the headline climate stats in the bar when provided (Variant A)', () => {
    // Emissions moved to the RegionInfoBox / DataOverlay; the bar keeps warming + CO₂ glanceable.
    wrap(<ResourceBar year={2030} turn={1} money={45} temperature={1.84} co2={431.2} />);
    expect(screen.getByText(/\+1\.84/)).toBeInTheDocument();
    expect(screen.getByText(/431/)).toBeInTheDocument();
    expect(screen.queryByText(/Gt\/yr/)).not.toBeInTheDocument();
  });

  it('no longer renders the emissions-data button (the RegionInfoBox owns drill-down)', () => {
    wrap(<ResourceBar year={2030} turn={1} money={45} />);
    expect(screen.queryByRole('button', { name: /emissions data/i })).not.toBeInTheDocument();
  });

  it('shows the end-of-turn report button and fires onShowReport when a turn has elapsed', async () => {
    const onShowReport = vi.fn();
    wrap(<ResourceBar year={2030} turn={1} money={45} canShowReport onShowReport={onShowReport} />);
    await userEvent.click(screen.getByRole('button', { name: /end-of-turn report/i }));
    expect(onShowReport).toHaveBeenCalledTimes(1);
  });

  it('hides the report button on turn 0 (no turn has elapsed yet)', () => {
    wrap(<ResourceBar year={2025} turn={0} money={45} onShowReport={() => {}} />);
    expect(screen.queryByRole('button', { name: /end-of-turn report/i })).not.toBeInTheDocument();
  });
});

describe('Sparkline', () => {
  it('renders an svg polyline for the series', () => {
    const { container } = wrap(<Sparkline values={[1, 2, 1.5, 3]} width={100} height={30} />);
    expect(container.querySelector('polyline')).not.toBeNull();
  });
  it('renders nothing meaningful for an empty series without crashing', () => {
    const { container } = wrap(<Sparkline values={[]} width={100} height={30} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
