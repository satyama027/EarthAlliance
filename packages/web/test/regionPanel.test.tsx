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
});
