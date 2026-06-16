import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { vi } from 'vitest';
import type { ReactNode } from 'react';
import { getPolicy } from '@earth-alliance/engine';
import { PolicyDetailOverlay } from '../src/components/PolicyDetailOverlay.js';
import type { CardVM } from '../src/game/policyView.js';

const wrap = (ui: ReactNode) => render(<MantineProvider>{ui}</MantineProvider>);

function vm(over: Partial<CardVM> = {}): CardVM {
  return {
    policy: getPolicy('carbon-tax')!,
    lane: 'available',
    state: 'available',
    moneyCharge: 18,
    perTurn: false,
    affordable: true,
    cancellable: false,
    cancelling: false,
    ...over,
  };
}

describe('PolicyDetailOverlay', () => {
  it('renders nothing when vm is null', () => {
    wrap(<PolicyDetailOverlay vm={null} regionName="North America" onPrimary={() => {}} onClose={() => {}} />);
    expect(screen.queryByText(/price carbon/i)).not.toBeInTheDocument();
  });

  it('shows the full description and a per-effect breakdown', () => {
    wrap(<PolicyDetailOverlay vm={vm()} regionName="North America" onPrimary={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/price carbon to curb power demand/i)).toBeInTheDocument();
    expect(screen.getByText('Electricity demand')).toBeInTheDocument();
    expect(screen.getByText('Public support')).toBeInTheDocument();
  });

  it('shows "Runs until cancelled" for a recurring policy', () => {
    const recurring = vm({ policy: getPolicy('climate-adaptation')!, perTurn: true });
    wrap(<PolicyDetailOverlay vm={recurring} regionName="North America" onPrimary={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/no fixed end/i)).toBeInTheDocument();
  });

  it('fires onPrimary then onClose when the action button is clicked', async () => {
    const onPrimary = vi.fn();
    const onClose = vi.fn();
    const v = vm();
    wrap(<PolicyDetailOverlay vm={v} regionName="North America" onPrimary={onPrimary} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /enact in north america/i }));
    expect(onPrimary).toHaveBeenCalledWith(v);
    expect(onClose).toHaveBeenCalled();
  });

  it('disables the action for a locked card', () => {
    const locked = vm({ policy: getPolicy('off-world-colonies')!, state: 'locked', affordable: false });
    const onPrimary = vi.fn();
    wrap(<PolicyDetailOverlay vm={locked} regionName="North America" onPrimary={onPrimary} onClose={() => {}} />);
    const btn = screen.getByRole('button', { name: /requires|locked/i });
    expect(btn).toBeDisabled();
  });

  it('calls onClose on the ✕ button and Escape', async () => {
    const onClose = vi.fn();
    wrap(<PolicyDetailOverlay vm={vm()} regionName="North America" onPrimary={() => {}} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
