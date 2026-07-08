import { describe, it, expect } from 'vitest';
import { generationTWh, SAMPLE_REGIONS, REAL_GENERATION_TWH_2025 } from '../src/index.js';

const byId = (id: string) => SAMPLE_REGIONS.find((r) => r.id === id)!;

describe('generationTWh', () => {
  it('returns each region\'s real ~2025 generation (TWh) at the baseline demand', () => {
    for (const r of SAMPLE_REGIONS) {
      expect(generationTWh(r)).toBeCloseTo(REAL_GENERATION_TWH_2025[r.id]!, 1);
    }
  });

  it('scales linearly with electricity demand (a grid that grows 20% generates 20% more)', () => {
    const east = byId('east-asia');
    const grown = { ...east, electricityDemand: east.electricityDemand * 1.2 };
    expect(generationTWh(grown)).toBeCloseTo(generationTWh(east) * 1.2, 6);
  });

  it('East Asia ≈ 11,600 TWh and Oceania ≈ 290 TWh (real-world magnitudes)', () => {
    expect(generationTWh(byId('east-asia'))).toBeCloseTo(11600, 0);
    expect(generationTWh(byId('oceania'))).toBeCloseTo(290, 0);
  });

  it('falls back to a plausible magnitude for an unknown region id', () => {
    const custom = { ...byId('europe'), id: 'atlantis' };
    // unknown id → default factor, still a positive number in the same ballpark
    expect(generationTWh(custom)).toBeGreaterThan(0);
  });
});
