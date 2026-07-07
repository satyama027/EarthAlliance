import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { Composition, type CompositionItem } from '../src/components/Composition.js';

function wrap(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

const sumItems: CompositionItem[] = [
  { id: 'electricity', label: 'Electricity', value: 15.6, color: '#f59f00', drillable: true },
  { id: 'industry', label: 'Industry', value: 12.6, color: '#868e96', drillable: false },
  { id: 'transport', label: 'Transport', value: 8.6, color: '#4dabf7', drillable: false },
];

describe('Composition — sum mode', () => {
  it('renders a stacked bar and a row per item', () => {
    const { container } = wrap(<Composition items={sumItems} mode="sum" unit="Gt" onDrill={() => {}} />);
    expect(container.querySelectorAll('[data-seg]').length).toBe(3);
    expect(screen.getByRole('button', { name: /electricity/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /industry/i })).toBeInTheDocument();
  });

  it('shows each item as a percentage of the total', () => {
    wrap(<Composition items={sumItems} mode="sum" unit="Gt" onDrill={() => {}} />);
    // 15.6 / (15.6+12.6+8.6=36.8) ≈ 42%
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('calls onDrill with the item id when a row is clicked', async () => {
    const onDrill = vi.fn();
    wrap(<Composition items={sumItems} mode="sum" unit="Gt" onDrill={onDrill} />);
    await userEvent.click(screen.getByRole('button', { name: /transport/i }));
    expect(onDrill).toHaveBeenCalledWith('transport');
  });

  it('renders a negative item as a sink, never a negative percentage or "-0.0"', () => {
    const withSink: CompositionItem[] = [
      { id: 'industry', label: 'Industry', value: 0.8, color: '#868e96', drillable: false },
      { id: 'electricity', label: 'Electricity', value: 0.8, color: '#f59f00', drillable: true },
      { id: 'landUse', label: 'Land use', value: -0.03, color: '#2f9e44', drillable: false },
    ];
    wrap(<Composition items={withSink} mode="sum" unit="Gt" onDrill={() => {}} />);
    // the sink shows the word "sink" instead of a computed percentage
    expect(screen.getByText('sink')).toBeInTheDocument();
    // its magnitude reads with a sign and real precision, not "-0.0"
    expect(screen.getByText(/−0\.03/)).toBeInTheDocument();
    expect(screen.queryByText('-0.0')).not.toBeInTheDocument();
    // no bogus negative percentage anywhere
    expect(screen.queryByText(/-\d+%/)).not.toBeInTheDocument();
    // positives still show a percentage (0.8 / 1.6 = 50%)
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
  });
});

const ledgerItems: CompositionItem[] = [
  { id: 'tax', label: 'Tax (GDP)', value: 9240, color: '#38d9a9', drillable: false, flow: 'in' },
  { id: 'carbonTax', label: 'Carbon tax', value: 184, color: '#20c997', drillable: false, flow: 'in' },
  { id: 'upkeep', label: 'Policy upkeep', value: 1420, color: '#ff6b6b', drillable: false, flow: 'out' },
];

describe('Composition — ledger mode', () => {
  it('shows signed amounts and a Net row', () => {
    wrap(<Composition items={ledgerItems} mode="ledger" unit="$/turn" net={8004} onDrill={() => {}} />);
    expect(screen.getByText('Tax (GDP)')).toBeInTheDocument();
    expect(screen.getByText('Policy upkeep')).toBeInTheDocument();
    expect(screen.getByText('Net')).toBeInTheDocument();
    expect(screen.getByText(/\+\$9,240/)).toBeInTheDocument();
    expect(screen.getByText(/−\$1,420/)).toBeInTheDocument();
    expect(screen.getByText(/\$8,004/)).toBeInTheDocument();
  });

  it('drills into a ledger line when clicked', async () => {
    const onDrill = vi.fn();
    wrap(<Composition items={ledgerItems} mode="ledger" unit="$/turn" net={8004} onDrill={onDrill} />);
    await userEvent.click(screen.getByRole('button', { name: /carbon tax/i }));
    expect(onDrill).toHaveBeenCalledWith('carbonTax');
  });
});
