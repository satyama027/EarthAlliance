import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { vi } from 'vitest';
import { SAMPLE_REGIONS } from '@earth-alliance/engine';
import type { ReactNode } from 'react';
import { DataOverlay } from '../src/components/DataOverlay.js';

function wrap(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

const climate = {
  temperature: 1.84,
  co2: 431.2,
  annualEmissions: 35,
  regions: [...SAMPLE_REGIONS],
  history: [{ year: 2025, temperature: 1.3, co2: 420 }],
};

describe('DataOverlay', () => {
  it('renders nothing when closed', () => {
    wrap(<DataOverlay opened={false} onClose={() => {}} region={null} {...climate} />);
    expect(screen.queryByText('Planet')).not.toBeInTheDocument();
    expect(screen.queryByText(/emissions by source/i)).not.toBeInTheDocument();
  });

  it('shows the planet breakdown when open with no region selected', () => {
    wrap(<DataOverlay opened onClose={() => {}} region={null} {...climate} />);
    expect(screen.getByText('Planet')).toBeInTheDocument();
    expect(screen.getByText(/emissions by source/i)).toBeInTheDocument();
    expect(screen.getByText('Electricity')).toBeInTheDocument();
  });

  it('gives the planet view full region-parity: generation mix, levers, income and quality bars', () => {
    wrap(<DataOverlay opened onClose={() => {}} region={null} {...climate} />);
    // Generation mix block + its banded legend.
    expect(screen.getByText(/generation mix/i)).toBeInTheDocument();
    expect(screen.getByText('Fossil')).toBeInTheDocument();
    // Energy & land levers (labels unique to the lever grid).
    expect(screen.getByText(/storage built/i)).toBeInTheDocument();
    expect(screen.getByText(/power demand/i)).toBeInTheDocument();
    // Income ledger, summed across regions.
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('Net')).toBeInTheDocument();
    // The five simple-averaged quality bars.
    expect(screen.getByText('Biodiversity')).toBeInTheDocument();
  });

  it('shows the selected region breakdown, levers and metrics when a region is selected', () => {
    const region = SAMPLE_REGIONS[0]!; // north-america
    wrap(<DataOverlay opened onClose={() => {}} region={region} {...climate} />);
    expect(screen.getByText(region.name)).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText(/grid intensity/i)).toBeInTheDocument();
    expect(screen.getByText(/support/i)).toBeInTheDocument();
    // The planet headline title should NOT show in the region view.
    expect(screen.queryByText('Planet')).not.toBeInTheDocument();
  });

  it('calls onClose when the ✕ button is clicked', async () => {
    const onClose = vi.fn();
    wrap(<DataOverlay opened onClose={onClose} region={null} {...climate} />);
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    wrap(<DataOverlay opened onClose={onClose} region={null} {...climate} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
