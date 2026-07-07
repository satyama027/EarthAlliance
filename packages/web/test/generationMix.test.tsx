import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { SAMPLE_REGIONS } from '@earth-alliance/engine';
import type { ReactNode } from 'react';
import { GenerationMix } from '../src/components/GenerationMix.js';

function wrap(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

const eastAsia = SAMPLE_REGIONS.find((r) => r.id === 'east-asia')!;

describe('GenerationMix', () => {
  it('groups sources under the three bands', () => {
    wrap(<GenerationMix mix={eastAsia.generationMix} intensity={eastAsia.gridCarbonIntensity} />);
    expect(screen.getByText('Fossil')).toBeInTheDocument();
    expect(screen.getByText('Renewable')).toBeInTheDocument();
    // "Nuclear" appears twice — the band header and its single source row.
    expect(screen.getAllByText('Nuclear').length).toBeGreaterThanOrEqual(2);
  });

  it('labels the present sources', () => {
    wrap(<GenerationMix mix={eastAsia.generationMix} intensity={eastAsia.gridCarbonIntensity} />);
    // east-asia: coal .54, gas .07, hydro .13, wind .09, solar .09, nuclear .06, oil .01, geo .01
    for (const label of ['Coal', 'Gas', 'Hydro', 'Wind', 'Solar']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('shows the derived grid carbon intensity', () => {
    wrap(<GenerationMix mix={eastAsia.generationMix} intensity={eastAsia.gridCarbonIntensity} />);
    expect(screen.getByText(/grid carbon intensity/i)).toBeInTheDocument();
    expect(screen.getByText('0.58')).toBeInTheDocument(); // 0.5785 → 0.58
  });

  it('shows per-source share percentages and the fossil band subtotal', () => {
    wrap(<GenerationMix mix={eastAsia.generationMix} intensity={eastAsia.gridCarbonIntensity} />);
    expect(screen.getByText('54%')).toBeInTheDocument(); // coal share
    expect(screen.getByText('62%')).toBeInTheDocument(); // fossil band subtotal 54+7+1
  });
});
