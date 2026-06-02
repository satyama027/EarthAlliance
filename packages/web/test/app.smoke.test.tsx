import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import App from '../src/App.js';

function renderApp() {
  return render(
    <MantineProvider>
      <App />
    </MantineProvider>,
  );
}

describe('App', () => {
  it('renders the game title', () => {
    renderApp();
    expect(screen.getByText('Earth Alliance')).toBeInTheDocument();
  });
});
