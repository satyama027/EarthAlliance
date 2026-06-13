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

  describe('re-grounded to real-world ~2025 figures', () => {
    const byId = (id: string) => {
      const r = SAMPLE_REGIONS.find((x) => x.id === id);
      if (!r) throw new Error(`no region ${id}`);
      return r;
    };

    it('uses nominal-USD GDP per capita for developing regions', () => {
      // The class of bug this fixes: developing regions were inflated far above
      // real nominal USD (South Asia 7000, Sub-Saharan Africa 4000).
      expect(byId('south-asia').gdpPerCapita).toBe(2700);
      expect(byId('sub-saharan-africa').gdpPerCapita).toBe(1800);
      expect(byId('north-america').gdpPerCapita).toBe(65000); // already correct
    });

    it('uses real territorial CO₂ for emissions', () => {
      expect(byId('south-asia').regionalEmissions).toBe(3.2);
      const total = SAMPLE_REGIONS.reduce((s, r) => s + r.regionalEmissions, 0);
      expect(total).toBeGreaterThan(35);
      expect(total).toBeLessThan(36);
    });

    it('keeps East Asia (China) as the single largest emitter', () => {
      // Structural invariant that would have caught the old South-Asia=8.0 error.
      const eastAsia = byId('east-asia').regionalEmissions;
      for (const r of SAMPLE_REGIONS) {
        if (r.id === 'east-asia') continue;
        expect(r.regionalEmissions).toBeLessThan(eastAsia);
      }
    });
  });

  describe('per-source emission breakdown', () => {
    const SOURCES = [
      'electricity', 'transport', 'aviationShipping', 'industry', 'agriculture', 'landUse',
    ] as const;

    it("splits each region's emissions into six sources summing to its total", () => {
      for (const r of SAMPLE_REGIONS) {
        const sum = SOURCES.reduce((s, k) => s + r[k], 0);
        expect(sum).toBeCloseTo(r.regionalEmissions, 2);
      }
    });

    it('derives electricity emissions as electricityDemand × gridCarbonIntensity', () => {
      for (const r of SAMPLE_REGIONS) {
        expect(r.electricity).toBeCloseTo(r.electricityDemand * r.gridCarbonIntensity, 2);
      }
    });

    it('keeps the new coupling variables in valid ranges', () => {
      for (const r of SAMPLE_REGIONS) {
        expect(r.gridCarbonIntensity).toBeGreaterThanOrEqual(0);
        expect(r.gridCarbonIntensity).toBeLessThanOrEqual(1);
        expect(r.energyStorageCapacity).toBeGreaterThanOrEqual(0);
        expect(r.energyStorageCapacity).toBeLessThanOrEqual(1);
        expect(r.agriculturalProductivity).toBeGreaterThan(0);
        expect(r.electricityDemand).toBeGreaterThan(0);
      }
    });
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
