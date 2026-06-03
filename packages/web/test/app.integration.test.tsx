import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { vi } from 'vitest';
import App from '../src/App.js';

// jsdom has no WebGL — replace the 3D scene with a stub so App can render.
vi.mock('../src/scene/EarthScene.js', () => ({
  EarthScene: () => <div data-testid="earth-scene-stub" />,
}));

function renderApp() {
  return render(<MantineProvider><App /></MantineProvider>);
}

describe('App integration', () => {
  it('renders the HUD and advances a turn when End Turn is clicked', async () => {
    renderApp();
    expect(screen.getByText(/Year 2025/)).toBeInTheDocument();
    expect(screen.getByTestId('earth-scene-stub')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /end turn/i }));
    expect(screen.getByText(/Year 2030/)).toBeInTheDocument();
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
  });
});
