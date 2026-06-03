import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { ENDINGS } from '@earth-alliance/engine';
import type { ReactNode } from 'react';
import { EndingScreen } from '../src/components/EndingScreen.js';

function wrap(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('EndingScreen', () => {
  it('shows the ending title and description and a play-again button', async () => {
    const ending = ENDINGS['green-utopia']!;
    const onPlayAgain = vi.fn();
    wrap(<EndingScreen ending={ending} year={2200} onPlayAgain={onPlayAgain} />);
    expect(screen.getByText(ending.title)).toBeInTheDocument();
    expect(screen.getByText(ending.description)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /play again/i }));
    expect(onPlayAgain).toHaveBeenCalled();
  });
});
