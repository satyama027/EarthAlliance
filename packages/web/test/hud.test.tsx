import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { ResourceBar } from '../src/components/ResourceBar.js';
import { Dashboard } from '../src/components/Dashboard.js';
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
});

describe('Dashboard', () => {
  it('shows temperature and CO2', () => {
    wrap(<Dashboard temperature={1.84} co2={431.2} annualEmissions={35} history={[{ year: 2025, temperature: 1.3, co2: 420 }]} />);
    expect(screen.getByText(/1\.84/)).toBeInTheDocument();
    expect(screen.getByText(/431/)).toBeInTheDocument();
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
