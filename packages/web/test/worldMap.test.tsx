import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { WorldMap } from '../src/scene/WorldMap.js';

describe('WorldMap', () => {
  it('renders the baked SVG with all 10 region paths', () => {
    render(<WorldMap selectedRegionId={null} onSelectRegion={() => {}} />);
    const root = screen.getByTestId('world-map');
    const ids = new Set(
      Array.from(root.querySelectorAll('[data-region]')).map((el) => el.getAttribute('data-region')),
    );
    for (const id of [
      'north-america', 'latin-america', 'europe', 'russia-central-asia', 'mena',
      'sub-saharan-africa', 'south-asia', 'east-asia', 'southeast-asia', 'oceania',
    ]) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it('calls onSelectRegion with the clicked region id', async () => {
    const onSelect = vi.fn();
    render(<WorldMap selectedRegionId={null} onSelectRegion={onSelect} />);
    const root = screen.getByTestId('world-map');
    const europe = root.querySelector('[data-region="europe"]') as Element;
    await userEvent.click(europe);
    expect(onSelect).toHaveBeenCalledWith('europe');
  });

  it('dims every region except the selected one', () => {
    render(<WorldMap selectedRegionId="mena" onSelectRegion={() => {}} />);
    const root = screen.getByTestId('world-map');
    root.querySelectorAll('[data-region]').forEach((el) => {
      const id = el.getAttribute('data-region');
      expect(el.classList.contains('dim')).toBe(id !== 'mena');
    });
  });
});
