import { render, screen } from '@testing-library/react';
import { MantineProvider, Tooltip } from '@mantine/core';
import { theme } from '../src/theme.js';

/**
 * Regression: tooltips inside the data/policy overlays were rendering *behind* the
 * overlay backdrop. Mantine portals tooltips to `document.body` (siblings of the
 * overlay), so stacking is decided purely by z-index — and the tooltip default (300)
 * sat below our overlays (1000 / 1100). The theme must lift tooltips above them.
 */
describe('tooltip stacking', () => {
  it('renders tooltips above the overlay layer', () => {
    render(
      <MantineProvider theme={theme}>
        <Tooltip label="hover help" opened>
          <button type="button">trigger</button>
        </Tooltip>
      </MantineProvider>,
    );
    const z = Number.parseInt(screen.getByText('hover help').style.zIndex, 10);
    // Must clear the highest overlay (PolicyDetailOverlay = 1100).
    expect(z).toBeGreaterThan(1100);
  });
});
