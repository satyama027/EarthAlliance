import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/state.js';
import { DEFAULT_SCENARIO } from '../src/data/scenario.js';

describe('createInitialState', () => {
  it('initializes turn 0 in 2025, playing', () => {
    const s = createInitialState();
    expect(s.turn).toBe(0);
    expect(s.year).toBe(2025);
    expect(s.status).toBe('playing');
    expect(s.endingId).toBeNull();
  });

  it('seeds an already-warmed climate with derived annual emissions', () => {
    const s = createInitialState();
    expect(s.climate.temperatureAnomaly).toBeCloseTo(1.3, 5);
    expect(s.climate.co2Concentration).toBeCloseTo(420, 5);
    const sumEmissions = DEFAULT_SCENARIO.regions.reduce((a, r) => a + r.regionalEmissions, 0);
    expect(s.climate.annualEmissions).toBeCloseTo(sumEmissions, 5);
  });

  it('deep-copies regions so the scenario is not mutated', () => {
    const s = createInitialState();
    s.regions[0]!.publicSupport = 0;
    expect(DEFAULT_SCENARIO.regions[0]!.publicSupport).not.toBe(0);
  });

  it('starts with empty effects, log, and enactments', () => {
    const s = createInitialState();
    expect(s.activeEffects).toEqual([]);
    expect(s.log).toEqual([]);
    expect(s.enactments).toEqual([]);
  });
});
