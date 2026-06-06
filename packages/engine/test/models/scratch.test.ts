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

  it('zeroes the surfaced calc intermediates and empties their per-region records', () => {
    const s = createScratch();
    expect(s.co2Ratio).toBe(0);
    expect(s.equilibriumTemp).toBe(0);
    expect(s.deltaPpm).toBe(0);
    expect(s.grossEmissions).toBe(0);
    expect(s.baseGrowthFactor).toBe(0);
    expect(s.decarbFactor).toBe(0);
    expect(s.avgSupport).toBe(0);
    expect(s.worldPopulation).toBe(0);
    expect(s.worldGdp).toBe(0);
    expect(s.capitalGain).toBe(0);
    expect(s.moneyGain).toBe(0);
    expect(s.scarcityByRegion).toEqual({});
    expect(s.constraintFactorByRegion).toEqual({});
    expect(s.outputRatioByRegion).toEqual({});
    expect(s.popGrowthByRegion).toEqual({});
    expect(s.waterLossByRegion).toEqual({});
    expect(s.landLossByRegion).toEqual({});
    expect(s.bioLossByRegion).toEqual({});
    expect(s.supportTempTermByRegion).toEqual({});
    expect(s.supportEconTermByRegion).toEqual({});
    expect(s.supportEquityTermByRegion).toEqual({});
    expect(s.equityDriftByRegion).toEqual({});
  });
});
