import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { useGame } from '../src/game/useGame.js';
import { ResourceBar } from '../src/components/ResourceBar.js';
import { PolicyBoard } from '../src/components/PolicyBoard.js';

const REGION = 'north-america';
const wrap = (ui: ReactNode) => render(<MantineProvider>{ui}</MantineProvider>);

/** Mirrors how App wires ResourceBar's "remaining" badges to the staged costNow. */
function Harness() {
  const game = useGame();
  return (
    <>
      <ResourceBar year={game.state.year} turn={game.state.turn}
        politicalCapital={game.state.resources.politicalCapital} money={game.state.resources.money}
        costNow={game.costNow} />
      <PolicyBoard
        state={game.state} regionId={REGION}
        staged={game.staged} cancels={game.cancels}
        onEnact={game.stage} onUnstage={game.unstage} onToggleCancel={game.toggleCancel}
        onEndTurn={game.endTurn} canEndTurn={game.canEndTurn}
        validationReason={game.validationReason} costNow={game.costNow}
        upkeepNext={game.upkeepNext} stagedTotal={game.staged.length} />
    </>
  );
}

function pcBadge(): HTMLElement {
  return screen.getByText(/Political Capital:/i);
}
function moneyBadge(): HTMLElement {
  return screen.getByText(/Money:/i);
}

describe('ResourceBar reflects staged cost', () => {
  it('drops remaining Political Capital when a policy is staged', async () => {
    wrap(<Harness />);
    expect(pcBadge()).toHaveTextContent('Political Capital: 100');
    await userEvent.click(screen.getByRole('button', { name: /enact renewable subsidy/i }));
    // renewable-subsidy costs PC 10 → remaining 100 - 10 = 90
    expect(pcBadge()).toHaveTextContent('Political Capital: 90');
  });

  it('drops remaining Money when a one-time policy is staged', async () => {
    wrap(<Harness />);
    expect(moneyBadge()).toHaveTextContent('Money: 1,500');
    await userEvent.click(screen.getByRole('button', { name: /enact carbon tax/i }));
    // carbon-tax is one-time → some GDP-scaled money is charged now, so remaining < 1500
    expect(moneyBadge()).not.toHaveTextContent('Money: 1,500');
  });
});
