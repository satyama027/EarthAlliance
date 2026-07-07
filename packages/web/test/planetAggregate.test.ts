import { gridIntensityFromMix, type Region, type GenerationMix, type TurnDiagnostics } from '@earth-alliance/engine';
import { planetAggregate } from '../src/game/planetAggregate.js';

/** A generation mix with everything zero except the given overrides. */
const mix = (over: Partial<GenerationMix>): GenerationMix => ({
  coal: 0, gas: 0, oil: 0, nuclear: 0, hydro: 0, wind: 0, solar: 0, geothermal: 0, ...over,
});

/** A full Region with sensible zeros, overridden by `over` — keeps the fixtures terse. */
const mkRegion = (over: Partial<Region>): Region => ({
  id: 'x', name: 'X',
  population: 0, educationIndex: 0, healthIndex: 0, medianAge: 0, fertilityRate: 0,
  gdpPerCapita: 0, publicSupport: 0, equityIndex: 0, biodiversityIndex: 0,
  regionalEmissions: 0, waterAvailability: 0, landAvailability: 0, lat: 0, lon: 0,
  electricity: 0, transport: 0, aviationShipping: 0, industry: 0, agriculture: 0, landUse: 0,
  generationMix: mix({}), gridCarbonIntensity: 0, electricityDemand: 0,
  agriculturalProductivity: 0, energyStorageCapacity: 0,
  ...over,
});

const A = mkRegion({
  id: 'a', name: 'A',
  population: 100, gdpPerCapita: 10, regionalEmissions: 3,
  electricity: 1, transport: 1, aviationShipping: 0.2, industry: 0.5, agriculture: 0.2, landUse: 0.1,
  generationMix: mix({ coal: 0.5, gas: 0.5 }), gridCarbonIntensity: 0.725,
  electricityDemand: 2, energyStorageCapacity: 0.5, agriculturalProductivity: 100,
  publicSupport: 40, equityIndex: 50, biodiversityIndex: 60, waterAvailability: 70, landAvailability: 80,
});

const B = mkRegion({
  id: 'b', name: 'B',
  population: 300, gdpPerCapita: 20, regionalEmissions: 5,
  electricity: 2, transport: 1, aviationShipping: 0.5, industry: 1, agriculture: 0.3, landUse: 0.2,
  generationMix: mix({ hydro: 1 }), gridCarbonIntensity: 0,
  electricityDemand: 6, energyStorageCapacity: 1, agriculturalProductivity: 120,
  publicSupport: 60, equityIndex: 70, biodiversityIndex: 80, waterAvailability: 90, landAvailability: 100,
});

const diag = (over: Partial<TurnDiagnostics>): TurnDiagnostics =>
  ({ taxIncomeByRegion: {}, carbonTaxRevenueByRegion: {}, programSpendByRegion: {}, ...over } as TurnDiagnostics);

describe('planetAggregate', () => {
  it('sums population and derives GDP-weighted GDP/capita', () => {
    const p = planetAggregate([A, B], null);
    expect(p.population).toBe(400);
    expect(p.gdpPerCapita).toBeCloseTo(7000 / 400, 9); // (100·10 + 300·20) / 400 = 17.5
  });

  it('sums total emissions and the six per-source fields', () => {
    const p = planetAggregate([A, B], null);
    expect(p.regionalEmissions).toBeCloseTo(8, 9);
    expect(p.sources.electricity).toBeCloseTo(3, 9);
    expect(p.sources.transport).toBeCloseTo(2, 9);
    expect(p.sources.aviationShipping).toBeCloseTo(0.7, 9);
    expect(p.sources.industry).toBeCloseTo(1.5, 9);
    expect(p.sources.agriculture).toBeCloseTo(0.5, 9);
    expect(p.sources.landUse).toBeCloseTo(0.3, 9);
  });

  it('demand-weights the generation mix (shares still sum to 1)', () => {
    const p = planetAggregate([A, B], null);
    // total demand 8: coal (0.5·2)/8, gas (0.5·2)/8, hydro (1·6)/8
    expect(p.generationMix.coal).toBeCloseTo(0.125, 9);
    expect(p.generationMix.gas).toBeCloseTo(0.125, 9);
    expect(p.generationMix.hydro).toBeCloseTo(0.75, 9);
    const sum = Object.values(p.generationMix).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 9);
  });

  it('derives grid intensity from the aggregated mix', () => {
    const p = planetAggregate([A, B], null);
    expect(p.gridCarbonIntensity).toBeCloseTo(gridIntensityFromMix(p.generationMix), 9);
    expect(p.gridCarbonIntensity).toBeCloseTo(0.18125, 9); // (0.725·2 + 0·6)/8
  });

  it('sums power demand, demand-weights storage, simple-averages crop yield', () => {
    const p = planetAggregate([A, B], null);
    expect(p.electricityDemand).toBeCloseTo(8, 9);           // sum
    expect(p.energyStorageCapacity).toBeCloseTo(7 / 8, 9);   // (0.5·2 + 1·6)/8 = 0.875
    expect(p.agriculturalProductivity).toBeCloseTo(110, 9);  // (100 + 120)/2
  });

  it('simple-averages the five quality metrics', () => {
    const p = planetAggregate([A, B], null);
    expect(p.publicSupport).toBeCloseTo(50, 9);
    expect(p.equityIndex).toBeCloseTo(60, 9);
    expect(p.biodiversityIndex).toBeCloseTo(70, 9);
    expect(p.waterAvailability).toBeCloseTo(80, 9);
    expect(p.landAvailability).toBeCloseTo(90, 9);
  });

  it('sums each region budget into one planet income ledger', () => {
    const p = planetAggregate([A, B], diag({
      taxIncomeByRegion: { a: 1000, b: 2000 },
      carbonTaxRevenueByRegion: { a: 11, b: 0 },
      programSpendByRegion: { a: 100, b: 200 },
    }));
    expect(p.budget.taxIncome).toBe(3000);
    expect(p.budget.carbonTax).toBe(11);
    expect(p.budget.upkeep).toBe(300);
    expect(p.budget.net).toBe(3000 + 11 - 300);
  });

  it('does not divide by zero when total demand is zero', () => {
    const z = mkRegion({ id: 'z', electricityDemand: 0 });
    const p = planetAggregate([z], null);
    expect(Number.isFinite(p.gridCarbonIntensity)).toBe(true);
    expect(Number.isFinite(p.energyStorageCapacity)).toBe(true);
    const sum = Object.values(p.generationMix).reduce((s, v) => s + v, 0);
    expect(Number.isFinite(sum)).toBe(true);
  });
});
