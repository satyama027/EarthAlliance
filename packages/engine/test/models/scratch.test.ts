import { describe, it, expect } from 'vitest';
import { createScratch } from '../../src/models/types.js';

describe('createScratch', () => {
  it('returns zeroed scalars and empty records', () => {
    const s = createScratch();
    expect(s.deltaTemperature).toBe(0);
    expect(s.damageFraction).toBe(0);
    expect(s.prevGdpPerCapita).toEqual({});
    expect(s.prevPopulation).toEqual({});
  });
});
