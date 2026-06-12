import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { vi } from 'vitest';
import type { ReactNode } from 'react';
import { createInitialState, type WorldState, type Enactment, type PolicySelection } from '@earth-alliance/engine';
import { PolicyBoard } from '../src/components/PolicyBoard.js';

const REGION = 'north-america';
const wrap = (ui: ReactNode) => render(<MantineProvider>{ui}</MantineProvider>);

function board(over: Partial<React.ComponentProps<typeof PolicyBoard>> = {}) {
  const handlers = {
    onEnact: vi.fn(), onUnstage: vi.fn(), onToggleCancel: vi.fn(), onEndTurn: vi.fn(),
  };
  const props: React.ComponentProps<typeof PolicyBoard> = {
    state: createInitialState(),
    regionId: REGION,
    staged: [] as PolicySelection[],
    cancels: [] as PolicySelection[],
    canEndTurn: true,
    validationReason: null,
    costNow: { money: 0 },
    upkeepNext: 0,
    stagedTotal: 0,
    ...handlers,
    ...over,
  };
  wrap(<PolicyBoard {...props} />);
  return handlers;
}

describe('PolicyBoard', () => {
  it('prompts to pick a region when none is selected', () => {
    board({ regionId: null });
    expect(screen.getByText(/manage its policies/i)).toBeInTheDocument();
  });

  it('lists available policies for the selected region', () => {
    board();
    expect(screen.getByText('Renewable Subsidy')).toBeInTheDocument();
  });

  it('enacts a policy when an available card is clicked', async () => {
    const h = board();
    await userEvent.click(screen.getByRole('button', { name: /enact renewable subsidy/i }));
    expect(h.onEnact).toHaveBeenCalledWith('renewable-subsidy', REGION);
  });

  it('enacts via keyboard (Enter) for accessibility', async () => {
    const h = board();
    screen.getByRole('button', { name: /enact renewable subsidy/i }).focus();
    await userEvent.keyboard('{Enter}');
    expect(h.onEnact).toHaveBeenCalledWith('renewable-subsidy', REGION);
  });

  it('shows an error and does not enact when an unaffordable card is clicked', async () => {
    const broke: WorldState = { ...createInitialState(), resources: { money: 0 } };
    const h = board({ state: broke });
    await userEvent.click(screen.getByRole('button', { name: /enact renewable subsidy/i }));
    expect(h.onEnact).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/can't enact renewable subsidy/i);
  });

  it('removes a staged policy when its card is clicked', async () => {
    const h = board({ staged: [{ policyId: 'renewable-subsidy', regionId: REGION }] });
    await userEvent.click(screen.getByRole('button', { name: /remove staged renewable subsidy/i }));
    expect(h.onUnstage).toHaveBeenCalledWith('renewable-subsidy', REGION);
  });

  it('cancels a committed recurring policy when its card is clicked', async () => {
    const e: Enactment = { policyId: 'climate-adaptation', regionId: REGION, capacity: 1, complete: false };
    const state: WorldState = { ...createInitialState(), enactments: [e] };
    const h = board({ state });
    await userEvent.click(screen.getByRole('button', { name: /stop climate adaptation/i }));
    expect(h.onToggleCancel).toHaveBeenCalledWith('climate-adaptation', REGION);
  });

  it('disables End Turn and shows the reason when the selection is invalid', () => {
    board({ canEndTurn: false, validationReason: 'Not enough political capital' });
    expect(screen.getByRole('button', { name: /end turn/i })).toBeDisabled();
    expect(screen.getByText(/not enough political capital/i)).toBeInTheDocument();
  });

  it('shows empty drop slots in the Active lane as visible drop targets', () => {
    board(); // region selected, has available policies, nothing active yet
    const slots = screen.getAllByTestId('drop-slot');
    expect(slots.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/drop a policy here/i).length).toBeGreaterThan(0);
  });

  it('does not show drop slots when no region is selected', () => {
    board({ regionId: null });
    expect(screen.queryAllByTestId('drop-slot')).toHaveLength(0);
  });
});
