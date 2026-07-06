import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { SAMPLE_REGIONS } from '@earth-alliance/engine';
import type { ReactNode } from 'react';
import { RegionInfoBox } from '../src/components/RegionInfoBox.js';

function wrap(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

const planet = { temperature: 1.3, co2: 420, annualEmissions: 35.5 };

describe('RegionInfoBox', () => {
  it('shows planet quick-stats and a drill-down button when no region is selected', () => {
    wrap(<RegionInfoBox region={null} {...planet} onOpenData={() => {}} />);
    expect(screen.getByText('🌍 Planet')).toBeInTheDocument();
    expect(screen.getByText(/\+1\.30/)).toBeInTheDocument();   // warming
    expect(screen.getByText(/420/)).toBeInTheDocument();        // CO₂
    expect(screen.getByText(/35\.5/)).toBeInTheDocument();      // emissions
    expect(screen.getByText(/click a region/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /full planet data/i })).toBeInTheDocument();
  });

  it('calls onOpenData from the planet drill-down button', async () => {
    const onOpenData = vi.fn();
    wrap(<RegionInfoBox region={null} {...planet} onOpenData={onOpenData} />);
    await userEvent.click(screen.getByRole('button', { name: /full planet data/i }));
    expect(onOpenData).toHaveBeenCalledTimes(1);
  });

  it('shows the selected region name and the three headline stats', () => {
    const region = SAMPLE_REGIONS[0]!; // north-america
    wrap(<RegionInfoBox region={region} {...planet} onOpenData={() => {}} />);
    expect(screen.getByText(region.name)).toBeInTheDocument();
    expect(screen.getByText(/GDP per capita/i)).toBeInTheDocument();
    expect(screen.getByText(`$${Math.round(region.gdpPerCapita).toLocaleString('en-US')}`)).toBeInTheDocument();
    expect(screen.getByText(/public support/i)).toBeInTheDocument();
    expect(screen.getByText(/Gt\/yr/i)).toBeInTheDocument();
  });

  it('calls onOpenData from the region drill-down button', async () => {
    const onOpenData = vi.fn();
    const region = SAMPLE_REGIONS[0]!;
    wrap(<RegionInfoBox region={region} {...planet} onOpenData={onOpenData} />);
    await userEvent.click(screen.getByRole('button', { name: /full region data/i }));
    expect(onOpenData).toHaveBeenCalledTimes(1);
  });

  it('shows the net Income stat when a budget is provided', () => {
    const region = SAMPLE_REGIONS[0]!;
    const budget = { taxIncome: 1014, carbonTax: 11, upkeep: 120, net: 905 };
    wrap(<RegionInfoBox region={region} {...planet} budget={budget} onOpenData={() => {}} />);
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('$905')).toBeInTheDocument();
  });
});
