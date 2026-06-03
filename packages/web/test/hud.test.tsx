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
  it('shows the year, political capital, and money', () => {
    wrap(<ResourceBar year={2030} turn={1} politicalCapital={123} money={45} />);
    expect(screen.getByText(/2030/)).toBeInTheDocument();
    expect(screen.getByText(/123/)).toBeInTheDocument();
    expect(screen.getByText(/45/)).toBeInTheDocument();
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
