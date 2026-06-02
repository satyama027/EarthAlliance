import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/state.js';
import { advanceTurn } from '../src/simulation.js';

function playDoNothing() {
  let state = createInitialState();
  const snapshots: Record<number, { year: number; temp: number; co2: number }> = {};
  for (let i = 0; i < 35; i++) {
    state = advanceTurn(state, []).state;
    if (state.year === 2050 || state.year === 2100 || state.year === 2200) {
      snapshots[state.year] = {
        year: state.year,
        temp: Number(state.climate.temperatureAnomaly.toFixed(4)),
        co2: Number(state.climate.co2Concentration.toFixed(2)),
      };
    }
  }
  return { state, snapshots };
}

describe('golden trajectory (do-nothing)', () => {
  it('matches the recorded reference snapshots', () => {
    const { snapshots } = playDoNothing();
    // Regression guard. If a model change is intentional, update this snapshot
    // via `pnpm --filter @earth-alliance/engine test -- integration -u`.
    expect(snapshots).toMatchSnapshot();
  });

  it('warms monotonically with no policies', () => {
    let state = createInitialState();
    let prev = state.climate.temperatureAnomaly;
    for (let i = 0; i < 35; i++) {
      state = advanceTurn(state, []).state;
      expect(state.climate.temperatureAnomaly).toBeGreaterThanOrEqual(prev);
      prev = state.climate.temperatureAnomaly;
    }
  });
});

describe('determinism', () => {
  it('produces identical states for identical inputs', () => {
    const run = () => {
      let state = createInitialState();
      for (let i = 0; i < 10; i++) state = advanceTurn(state, []).state;
      return state;
    };
    expect(run()).toEqual(run());
  });
});
