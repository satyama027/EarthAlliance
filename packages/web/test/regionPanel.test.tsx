import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { SAMPLE_REGIONS } from '@earth-alliance/engine';
import type { ReactNode } from 'react';
import { RegionPanel } from '../src/components/RegionPanel.js';

function wrap(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('RegionPanel', () => {
  it('prompts to pick a region when none is selected', () => {
    wrap(<RegionPanel region={null} />);
    expect(screen.getByText(/select a region/i)).toBeInTheDocument();
  });

  it('shows the selected region name and key metrics', () => {
    const region = SAMPLE_REGIONS[0]!;
    wrap(<RegionPanel region={region} />);
    expect(screen.getByText(region.name)).toBeInTheDocument();
    expect(screen.getByText(/support/i)).toBeInTheDocument();
    expect(screen.getByText(/biodiversity/i)).toBeInTheDocument();
  });

  it('shows the per-source emissions breakdown and the energy/land levers', () => {
    const region = SAMPLE_REGIONS[0]!; // north-america
    wrap(<RegionPanel region={region} />);
    expect(screen.getByText(/emissions by source/i)).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Land-use')).toBeInTheDocument();
    // The generation-mix block (bands + derived intensity).
    expect(screen.getByText(/generation mix/i)).toBeInTheDocument();
    expect(screen.getByText('Fossil')).toBeInTheDocument();
    expect(screen.getByText(/grid carbon intensity/i)).toBeInTheDocument();
    // The four coupling levers.
    expect(screen.getByText(/grid intensity/i)).toBeInTheDocument();
    expect(screen.getByText(/storage built/i)).toBeInTheDocument();
    expect(screen.getByText(/crop yield/i)).toBeInTheDocument();
    expect(screen.getByText(/power demand/i)).toBeInTheDocument();
  });

  it('shows the Income breakdown with the carbon-tax row when the tax is active', () => {
    const region = SAMPLE_REGIONS[0]!;
    const budget = { taxIncome: 1014, carbonTax: 11, upkeep: 120, net: 905 };
    wrap(<RegionPanel region={region} budget={budget} />);
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('Tax (GDP)')).toBeInTheDocument();
    expect(screen.getByText('Carbon tax')).toBeInTheDocument();
    expect(screen.getByText('Policy upkeep')).toBeInTheDocument();
    expect(screen.getByText('Net')).toBeInTheDocument();
    expect(screen.getByText('$905')).toBeInTheDocument();
  });

  it('hides the carbon-tax row when the tax is not active in the region', () => {
    const region = SAMPLE_REGIONS[0]!;
    const budget = { taxIncome: 1014, carbonTax: 0, upkeep: 0, net: 1014 };
    wrap(<RegionPanel region={region} budget={budget} />);
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.queryByText('Carbon tax')).not.toBeInTheDocument();
  });
});
