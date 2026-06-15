import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { vi } from 'vitest';
import App from '../src/App.js';

// Stub the map so the integration test stays focused on the HUD/turn loop
// (the SVG asset + click wiring are covered in worldMap.test.tsx).
vi.mock('../src/scene/WorldMap.js', () => ({
  WorldMap: () => <div data-testid="world-map-stub" />,
}));

function renderApp() {
  return render(<MantineProvider><App /></MantineProvider>);
}

describe('App integration', () => {
  it('renders the HUD and advances a turn when End Turn is clicked', async () => {
    renderApp();
    expect(screen.getByText(/Year 2025/)).toBeInTheDocument();
    expect(screen.getByTestId('world-map-stub')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /end turn/i }));
    expect(screen.getByText(/Year 2030/)).toBeInTheDocument();
  });

  it('opens the emissions-data overlay from the header button (planet view) and closes it', async () => {
    renderApp();
    // The Planet/Region panels are no longer inline — emissions data lives behind the button.
    // (TurnLog has its own "Planet" block label as plain text; the overlay's is a heading.)
    expect(screen.queryByRole('heading', { name: 'Planet' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /emissions data/i }));
    // With no region selected, the overlay shows the planet breakdown.
    expect(screen.getByRole('heading', { name: 'Planet' })).toBeInTheDocument();
    expect(screen.getByText(/emissions by source/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('heading', { name: 'Planet' })).not.toBeInTheDocument();
  });

  it('shows the ending overlay when the game ends and Play again resets it', async () => {
    renderApp();
    // Do-nothing play: keep ending turns until the ending overlay appears.
    for (let i = 0; i < 35; i++) {
      if (screen.queryByRole('button', { name: /play again/i })) break;
      const endBtn = screen.queryByRole('button', { name: /end turn/i }) as HTMLButtonElement | null;
      if (!endBtn || endBtn.disabled) break;
      await userEvent.click(endBtn);
    }
    expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /play again/i }));
    expect(screen.getByText(/Year 2025/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /play again/i })).not.toBeInTheDocument();
  }, 20000); // do-nothing collapses at turn 13; 13 full re-renders with a growing TurnLog is slow in jsdom
});
