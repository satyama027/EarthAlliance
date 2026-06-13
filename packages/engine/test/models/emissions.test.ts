import { describe, it, expect } from 'vitest';
import { emissions } from '../../src/models/emissions.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

/**
 * The sectoral emissions sub-model recomputes each activity-driven source from its driver,
 * with NO autonomous decarbonization. Electricity is NOT finalized here — it is derived
 * (electricityDemand × gridCarbonIntensity) at turn finalization, after policies adjust both.
 */
describe('emissions (sectoral)', () => {
  const ctxFor = (region: ReturnType<typeof makeRegion>, prevGdp: number, prevPop: number) =>
    makeContext(makeState({ regions: [region] }), {
      prevGdpPerCapita: { [region.id]: prevGdp },
      prevPopulation: { [region.id]: prevPop },
    });

  it('scales transport/industry/aviation with economic output growth — no decarb factor', () => {
    const r = makeRegion({ id: 'r1', gdpPerCapita: 55000, population: 1.1e9,
      transport: 2, industry: 3, aviationShipping: 0.5 });
    const ctx = ctxFor(r, 50000, 1e9);
    emissions.step(ctx); // outputRatio = (55000*1.1e9)/(50000*1e9) = 1.21
    expect(r.transport).toBeCloseTo(2 * 1.21, 6);
    expect(r.industry).toBeCloseTo(3 * 1.21, 6);
    expect(r.aviationShipping).toBeCloseTo(0.5 * 1.21, 6);
  });

  it('scales agriculture with population growth, not GDP', () => {
    const r = makeRegion({ id: 'r1', gdpPerCapita: 60000, population: 1.2e9, agriculture: 1 });
    const ctx = ctxFor(r, 50000, 1e9);
    emissions.step(ctx); // popRatio = 1.2
    expect(r.agriculture).toBeCloseTo(1.2, 6);
  });

  it('grows electricity demand with output but never touches grid intensity', () => {
    const r = makeRegion({ id: 'r1', gdpPerCapita: 55000, population: 1e9,
      electricityDemand: 8, gridCarbonIntensity: 0.5 });
    const ctx = ctxFor(r, 50000, 1e9);
    emissions.step(ctx); // outputRatio = 1.1
    expect(r.electricityDemand).toBeCloseTo(8 * 1.1, 6);
    expect(r.gridCarbonIntensity).toBeCloseTo(0.5, 9);
  });

  it('does NOT shrink a source when output is flat (no autonomous decarbonization)', () => {
    const r = makeRegion({ id: 'r1', gdpPerCapita: 50000, population: 1e9, transport: 2 });
    const ctx = ctxFor(r, 50000, 1e9);
    emissions.step(ctx);
    expect(r.transport).toBeCloseTo(2, 9); // old model shrank this via AUTON_DECARB
  });

  it('leaves land-use untouched (policy-driven, no natural driver)', () => {
    const r = makeRegion({ id: 'r1', gdpPerCapita: 60000, population: 1.2e9, landUse: 0.5 });
    const ctx = ctxFor(r, 50000, 1e9);
    emissions.step(ctx);
    expect(r.landUse).toBeCloseTo(0.5, 9);
  });

  it('records the output-ratio diagnostic', () => {
    const r = makeRegion({ id: 'r1', gdpPerCapita: 55000, population: 1e9 });
    const ctx = ctxFor(r, 50000, 1e9);
    emissions.step(ctx);
    expect(ctx.scratch.outputRatioByRegion.r1).toBeCloseTo(1.1, 6);
  });
});
