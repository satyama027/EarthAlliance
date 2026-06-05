import { createInitialState } from '@earth-alliance/engine';

// Guards the engine↔web boundary: the web client must see the *current* engine
// source, not a stale compiled `dist`. A stale build once shipped only the
// original 5 regions, so the 5 newer regions rendered on the map but resolved
// to no data when selected. These ids must always be present in a fresh game.
const EXPECTED_REGION_IDS = [
  'north-america', 'europe', 'sub-saharan-africa', 'south-asia', 'east-asia',
  'latin-america', 'russia-central-asia', 'mena', 'southeast-asia', 'oceania',
];

describe('engine ↔ web boundary', () => {
  it('exposes all 10 regions with full data to the web client', () => {
    const ids = createInitialState().regions.map((r) => r.id);
    expect(ids).toHaveLength(10);
    for (const id of EXPECTED_REGION_IDS) {
      expect(ids).toContain(id);
    }
  });

  it('gives every region a usable public-support data point', () => {
    for (const r of createInitialState().regions) {
      expect(Number.isFinite(r.publicSupport)).toBe(true);
      expect(r.publicSupport).toBeGreaterThanOrEqual(0);
      expect(r.publicSupport).toBeLessThanOrEqual(100);
    }
  });
});
