import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { SAMPLE_REGIONS } from '@earth-alliance/engine';
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
});

describe('Dashboard', () => {
  const props = {
    temperature: 1.84, co2: 431.2, annualEmissions: 35,
    regions: [...SAMPLE_REGIONS], history: [{ year: 2025, temperature: 1.3, co2: 420 }],
  };

  it('shows temperature and CO2', () => {
    wrap(<Dashboard {...props} />);
    expect(screen.getByText(/1\.84/)).toBeInTheDocument();
    expect(screen.getByText(/431/)).toBeInTheDocument();
  });

  it('shows the emissions-by-source breakdown', () => {
    wrap(<Dashboard {...props} />);
    expect(screen.getByText(/emissions by source/i)).toBeInTheDocument();
    // Electricity is the largest global source in the sample data.
    expect(screen.getByText('Electricity')).toBeInTheDocument();
    expect(screen.getByText('Industry')).toBeInTheDocument();
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
