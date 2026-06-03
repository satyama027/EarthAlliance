import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { POLICY_CATALOG } from '@earth-alliance/engine';
import type { ReactNode } from 'react';
import { PolicyTray } from '../src/components/PolicyTray.js';

function wrap(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

const sample = POLICY_CATALOG.slice(0, 3);

describe('PolicyTray', () => {
  it('lists available policies by name', () => {
    wrap(<PolicyTray policies={sample} selectedIds={[]} affordableIds={sample.map((p) => p.id)}
      onToggle={() => {}} onEndTurn={() => {}} canEndTurn validationReason={null} />);
    for (const p of sample) expect(screen.getByText(p.name)).toBeInTheDocument();
  });

  it('calls onToggle when a card is clicked', async () => {
    const onToggle = vi.fn();
    wrap(<PolicyTray policies={sample} selectedIds={[]} affordableIds={sample.map((p) => p.id)}
      onToggle={onToggle} onEndTurn={() => {}} canEndTurn validationReason={null} />);
    await userEvent.click(screen.getByText(sample[0]!.name));
    expect(onToggle).toHaveBeenCalledWith(sample[0]!.id);
  });

  it('disables End Turn and shows the reason when the selection is invalid', () => {
    wrap(<PolicyTray policies={sample} selectedIds={[]} affordableIds={sample.map((p) => p.id)}
      onToggle={() => {}} onEndTurn={() => {}} canEndTurn={false} validationReason="Not enough money" />);
    expect(screen.getByRole('button', { name: /end turn/i })).toBeDisabled();
    expect(screen.getByText(/not enough money/i)).toBeInTheDocument();
  });

  it('marks unaffordable policies as disabled', () => {
    wrap(<PolicyTray policies={sample} selectedIds={[]} affordableIds={[]}
      onToggle={() => {}} onEndTurn={() => {}} canEndTurn validationReason={null} />);
    // Unaffordable cards expose aria-disabled
    expect(screen.getAllByTestId('policy-card').every((el) => el.getAttribute('aria-disabled') === 'true')).toBe(true);
  });
});
