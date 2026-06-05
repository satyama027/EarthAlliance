import { describe, it, expect } from 'vitest';
import { SAMPLE_REGIONS } from '../src/data/regions.js';
import { DEFAULT_PARAMS, DEFAULT_SCENARIO, END_YEAR } from '../src/data/scenario.js';

describe('sample regions', () => {
  it('has ten regions with unique ids', () => {
    expect(SAMPLE_REGIONS).toHaveLength(10);
    const ids = new Set(SAMPLE_REGIONS.map((r) => r.id));
    expect(ids.size).toBe(10);
  });

  it('keeps 0–100 indices within range', () => {
    for (const r of SAMPLE_REGIONS) {
      for (const v of [r.educationIndex, r.healthIndex, r.publicSupport,
        r.equityIndex, r.biodiversityIndex, r.waterAvailability, r.landAvailability]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('default scenario', () => {
  it('starts in an already-warmed 2025 world', () => {
    expect(DEFAULT_SCENARIO.startYear).toBe(2025);
    expect(DEFAULT_SCENARIO.startTemperatureAnomaly).toBeCloseTo(1.3, 5);
    expect(END_YEAR).toBe(2200);
  });

  it('has a 35-turn horizon at 5 years per turn', () => {
    expect((END_YEAR - DEFAULT_SCENARIO.startYear) / DEFAULT_PARAMS.TURN_YEARS).toBe(35);
  });
});
