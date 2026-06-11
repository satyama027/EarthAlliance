import { describe, it, expect } from 'vitest';
import { advanceTurn } from '../src/simulation.js';
import { createInitialState } from '../src/state.js';
import { validateSelection } from '../src/policies.js';
import { DEFAULT_PARAMS } from '../src/data/scenario.js';

describe('advanceTurn', () => {
  it('advances the clock by one 5-year turn', () => {
    const s0 = createInitialState();
    const { state: s1 } = advanceTurn(s0, []);
    expect(s1.turn).toBe(1);
    expect(s1.year).toBe(2030);
  });

  it('does not mutate the input state', () => {
    const s0 = createInitialState();
    advanceTurn(s0, []);
    expect(s0.turn).toBe(0);
    expect(s0.year).toBe(2025);
  });

  it('raises CO2 and temperature on a do-nothing turn', () => {
    const s0 = createInitialState();
    const { state: s1 } = advanceTurn(s0, []);
    expect(s1.climate.co2Concentration).toBeGreaterThan(s0.climate.co2Concentration);
    expect(s1.climate.temperatureAnomaly).toBeGreaterThan(s0.climate.temperatureAnomaly);
  });

  it('keeps annualEmissions equal to the sum of regional emissions', () => {
    const s0 = createInitialState();
    const { state: s1 } = advanceTurn(s0, []);
    const sum = s1.regions.reduce((a, r) => a + r.regionalEmissions, 0);
    expect(s1.climate.annualEmissions).toBeCloseTo(sum, 6);
  });

  it('spends resources when a policy is enacted', () => {
    const s0 = createInitialState();
    const sel = [{ policyId: 'renewable-subsidy', regionId: 'north-america' }];
    expect(validateSelection(s0, sel).ok).toBe(true);
    const { state: s1 } = advanceTurn(s0, sel);
    expect(s1.enactments.some((e) => e.policyId === 'renewable-subsidy' && e.regionId === 'north-america')).toBe(true);
  });

  it('throws on an invalid selection', () => {
    const s0 = createInitialState();
    expect(() => advanceTurn(s0, [{ policyId: 'does-not-exist', regionId: 'north-america' }])).toThrow();
  });

  it('sets status to ended and records the ending id at resolution', () => {
    let state = createInitialState();
    let guard = 0;
    while (state.status === 'playing' && guard < 35) {
      state = advanceTurn(state, []).state;
      guard++;
    }
    expect(state.status).toBe('ended');
    expect(state.endingId).not.toBeNull();
    expect(state.year).toBeLessThanOrEqual(2200);
  });

  it('reports per-turn diagnostics the pipeline computed but the state discards', () => {
    const s0 = createInitialState();
    const { state: s1, diagnostics } = advanceTurn(s0, []);

    // Damage is the DICE-style quadratic of this turn's (post-climate) temperature.
    const t = s1.climate.temperatureAnomaly;
    expect(diagnostics.damageFraction).toBeCloseTo(
      Math.min(DEFAULT_PARAMS.DAMAGE_COEFF * t * t, 1),
      9,
    );

    // Temperature change matches the state delta.
    expect(diagnostics.deltaTemperature).toBeCloseTo(
      s1.climate.temperatureAnomaly - s0.climate.temperatureAnomaly,
      9,
    );

    // Every region has an exact GDP/capita growth fraction.
    for (const r1 of s1.regions) {
      const r0 = s0.regions.find((r) => r.id === r1.id)!;
      expect(diagnostics.growthByRegion[r1.id]).toBeCloseTo(
        (r1.gdpPerCapita - r0.gdpPerCapita) / r0.gdpPerCapita,
        9,
      );
    }
  });

  it('never lets growth — or its support contribution — go negative on a do-nothing run (regression: b90e5d8)', () => {
    // The pre-fix economy dampened the GDP *stock* (growth * (1-damage) * constraint),
    // so realistic scarcity/damage shrank gdpPerCapita every turn → negative econGrowth →
    // a negative "from growth" support term. The fix dampens the growth *increment*, so
    // growth floors at zero and the econ support term can never turn negative.
    let state = createInitialState();
    for (let turn = 0; turn < 6; turn++) {
      const { state: next, diagnostics: d } = advanceTurn(state, []);
      for (const r of next.regions) {
        expect(d.growthByRegion[r.id]).toBeGreaterThanOrEqual(0);
        expect(d.supportEconTermByRegion[r.id]).toBeGreaterThanOrEqual(0);
        // On a do-nothing turn (no policy effects) the econ term is exactly W × growth.
        expect(d.supportEconTermByRegion[r.id]).toBeCloseTo(
          DEFAULT_PARAMS.SUPPORT_ECON_W * d.growthByRegion[r.id]!,
          9,
        );
      }
      state = next;
    }
  });

  it('surfaces the widened per-turn calc intermediates exactly', () => {
    const s0 = createInitialState();
    const { state: s1, diagnostics: d } = advanceTurn(s0, []);
    const P = DEFAULT_PARAMS;
    const CO2_PREINDUSTRIAL = 280;

    // ── Global climate intermediates ──
    // Ratio/equilibrium temp use the post-carbonCycle CO2, which is s1's final CO2.
    expect(d.co2Ratio).toBeCloseTo(s1.climate.co2Concentration / CO2_PREINDUSTRIAL, 9);
    expect(d.equilibriumTemp).toBeCloseTo(P.ECS * Math.log2(d.co2Ratio), 9);
    // Gross emissions = the pre-turn annual rate over the turn period; ΔCO2 is its airborne share.
    expect(d.grossEmissions).toBeCloseTo(s0.climate.annualEmissions * P.TURN_YEARS, 9);
    expect(d.deltaPpm).toBeCloseTo((P.AIRBORNE_FRACTION * d.grossEmissions) / P.GTCO2_PER_PPM, 9);
    expect(d.deltaPpm).toBeCloseTo(s1.climate.co2Concentration - s0.climate.co2Concentration, 6);

    // ── Global economy intermediates ──
    expect(d.baseGrowthFactor).toBeCloseTo(Math.pow(1 + P.BASE_GROWTH, P.TURN_YEARS), 9);
    expect(d.decarbFactor).toBeCloseTo(Math.pow(1 - P.AUTON_DECARB, P.TURN_YEARS), 9);
    // Avg support is the population-weighted mean of the post-turn (final) regional support.
    const supportPop = s1.regions.reduce((a, r) => a + r.publicSupport * r.population, 0);
    const totalPop = s1.regions.reduce((a, r) => a + r.population, 0);
    expect(d.avgSupport).toBeCloseTo(supportPop / totalPop, 9);

    // ── Per-region intermediates ──
    for (const r1 of s1.regions) {
      const r0 = s0.regions.find((r) => r.id === r1.id)!;
      const scarcity = Math.min(r0.waterAvailability, r0.landAvailability) / 100;
      expect(d.scarcityByRegion[r1.id]).toBeCloseTo(scarcity, 9);
      expect(d.constraintFactorByRegion[r1.id]).toBeCloseTo(0.5 + 0.5 * scarcity, 9);
      expect(d.outputRatioByRegion[r1.id]).toBeCloseTo(
        (r1.gdpPerCapita * r1.population) / (r0.gdpPerCapita * r0.population),
        9,
      );
      const popGrowth = Math.max(-0.02, Math.min(0.04,
        (r0.fertilityRate - 2.1) * P.FERT_W + (r0.healthIndex - 50) * P.HEALTH_W));
      expect(d.popGrowthByRegion[r1.id]).toBeCloseTo(popGrowth, 9);
    }
  });

  it('surfaces the constraints / biodiversity / support / resources drivers exactly', () => {
    const s0 = createInitialState();
    const { state: s1, diagnostics: d } = advanceTurn(s0, []);
    const P = DEFAULT_PARAMS;
    const warming = Math.max(0, s1.climate.temperatureAnomaly - s0.climate.temperatureAnomaly);

    // ── Global resource aggregates (do-nothing turn ⇒ regen equals the budget delta) ──
    expect(d.worldPopulation).toBeCloseTo(s1.regions.reduce((a, r) => a + r.population, 0), 6);
    expect(d.worldGdp).toBeCloseTo(s1.regions.reduce((a, r) => a + r.gdpPerCapita * r.population, 0), 4);
    expect(d.capitalGain).toBeCloseTo(s1.resources.politicalCapital - s0.resources.politicalCapital, 6);
    expect(d.moneyGain).toBeCloseTo(s1.resources.money - s0.resources.money, 6);

    // ── Per-region pressure & support drivers ──
    for (const r1 of s1.regions) {
      const r0 = s0.regions.find((r) => r.id === r1.id)!;
      const popGrowthRealized = Math.max(0, r1.population / r0.population - 1);
      const econGrowth = r1.gdpPerCapita / r0.gdpPerCapita - 1;

      expect(d.waterLossByRegion[r1.id]).toBeCloseTo(
        P.WATER_TEMP_LOSS * warming + P.POP_PRESSURE * popGrowthRealized, 9);
      expect(d.landLossByRegion[r1.id]).toBeCloseTo(P.LAND_DEGRADE * warming, 9);
      expect(d.bioLossByRegion[r1.id]).toBeCloseTo(P.BIO_TEMP_LOSS * warming, 9);

      // Support breakdown uses the pre-turn equity (no model touches it before support).
      expect(d.supportTempTermByRegion[r1.id]).toBeCloseTo(-P.SUPPORT_TEMP_W * warming, 9);
      expect(d.supportEconTermByRegion[r1.id]).toBeCloseTo(P.SUPPORT_ECON_W * econGrowth, 9);
      expect(d.supportEquityTermByRegion[r1.id]).toBeCloseTo(P.SUPPORT_EQUITY_W * (r0.equityIndex - 50), 9);
      expect(d.equityDriftByRegion[r1.id]).toBeCloseTo(P.INEQUALITY_DRIFT * Math.max(0, econGrowth), 9);
    }
  });

  it('throws when advancing a game that has already ended', () => {
    let state = createInitialState();
    let guard = 0;
    while (state.status === 'playing' && guard < 35) {
      state = advanceTurn(state, []).state;
      guard++;
    }
    expect(state.status).toBe('ended');
    expect(() => advanceTurn(state, [])).toThrow(/already ended/i);
  });
});
