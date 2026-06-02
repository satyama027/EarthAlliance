import { describe, it, expect } from 'vitest';
import { evaluateEnding } from '../src/endings.js';
import { makeRegion, makeState } from './fixtures.js';

function regionsWith(props: Parameters<typeof makeRegion>[0]) {
  return [makeRegion(props)];
}

describe('evaluateEnding', () => {
  it('returns null mid-game when no loss condition is met', () => {
    const state = makeState({ year: 2100 });
    state.climate.temperatureAnomaly = 2.0;
    expect(evaluateEnding(state)).toBeNull();
  });

  it('triggers eco-collapse early when warming is extreme', () => {
    const state = makeState({ year: 2100 });
    state.climate.temperatureAnomaly = 3.6;
    expect(evaluateEnding(state)?.id).toBe('eco-collapse');
  });

  it('triggers economic-ruin early when support collapses', () => {
    const state = makeState({ year: 2100, regions: regionsWith({ publicSupport: 5 }) });
    state.climate.temperatureAnomaly = 2.0;
    expect(evaluateEnding(state)?.id).toBe('economic-ruin');
  });

  it('awards green-utopia at the end when all is well', () => {
    const state = makeState({
      year: 2200,
      regions: regionsWith({ biodiversityIndex: 60, equityIndex: 65, gdpPerCapita: 40000 }),
    });
    state.climate.temperatureAnomaly = 1.8;
    expect(evaluateEnding(state)?.id).toBe('green-utopia');
  });

  it('awards orbital-exodus only when off-world-colonies was enacted on a degrading rich world', () => {
    const base = {
      year: 2200,
      enactedPolicyIds: ['orbital-infrastructure', 'off-world-colonies'],
      regions: regionsWith({ gdpPerCapita: 45000, educationIndex: 80, biodiversityIndex: 30 }),
    };
    const exodus = makeState(base);
    exodus.climate.temperatureAnomaly = 2.7;
    expect(evaluateEnding(exodus)?.id).toBe('orbital-exodus');

    const noColony = makeState({ ...base, enactedPolicyIds: ['orbital-infrastructure'] });
    noColony.climate.temperatureAnomaly = 2.7;
    expect(evaluateEnding(noColony)?.id).not.toBe('orbital-exodus');
  });

  it('awards authoritarian-stability when targets are met but support is crushed', () => {
    const state = makeState({ year: 2200, regions: regionsWith({ publicSupport: 25, biodiversityIndex: 30, equityIndex: 30, gdpPerCapita: 20000 }) });
    state.climate.temperatureAnomaly = 2.5;
    expect(evaluateEnding(state)?.id).toBe('authoritarian-stability');
  });

  it('falls back to muddling-through at the end', () => {
    const state = makeState({ year: 2200, regions: regionsWith({ biodiversityIndex: 30, equityIndex: 45, publicSupport: 50 }) });
    state.climate.temperatureAnomaly = 2.8;
    expect(evaluateEnding(state)?.id).toBe('muddling-through');
  });
});
