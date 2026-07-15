import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { TurnControl } from '../src/components/TurnControl.js';

function renderControl(props: Partial<React.ComponentProps<typeof TurnControl>> = {}) {
  const onEndTurn = props.onEndTurn ?? (() => {});
  render(
    <MantineProvider>
      <TurnControl
        stagedTotal={0}
        cancelsCount={0}
        costNow={{ money: 0 }}
        upkeepNext={0}
        validationReason={null}
        canEndTurn={true}
        onEndTurn={onEndTurn}
        {...props}
      />
    </MantineProvider>,
  );
  return { onEndTurn };
}

describe('TurnControl', () => {
  it('renders the this-turn summary and an End Turn button', () => {
    renderControl({ stagedTotal: 2, costNow: { money: 250 }, upkeepNext: 80 });
    expect(screen.getByTestId('turn-control')).toBeInTheDocument();
    expect(screen.getByText(/250/)).toBeInTheDocument();
    expect(screen.getByText(/80/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /end turn/i })).toBeInTheDocument();
  });

  it('fires onEndTurn when clicked and is enabled', async () => {
    const onEndTurn = vi.fn();
    renderControl({ canEndTurn: true, onEndTurn });
    await userEvent.click(screen.getByRole('button', { name: /end turn/i }));
    expect(onEndTurn).toHaveBeenCalledTimes(1);
  });

  it('disables End Turn and shows the validation reason when the turn cannot end', () => {
    renderControl({ canEndTurn: false, validationReason: 'over budget' });
    expect(screen.getByRole('button', { name: /end turn/i })).toBeDisabled();
    expect(screen.getByText(/over budget/i)).toBeInTheDocument();
  });
});
