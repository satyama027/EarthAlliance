import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/state.js';
import { advanceTurn } from '../src/simulation.js';

function playDoNothing() {
  let state = createInitialState();
  let guard = 0;
  while (state.status === 'playing' && guard < 35) {
    state = advanceTurn(state, []).state;
    guard++;
  }
  return {
    turn: state.turn,
    year: state.year,
    endingId: state.endingId,
    temp: Number(state.climate.temperatureAnomaly.toFixed(4)),
    co2: Number(state.climate.co2Concentration.toFixed(2)),
  };
}

describe('golden trajectory (do-nothing)', () => {
  it('matches the recorded terminal reference', () => {
    // Regression guard. If a model change is intentional, update this snapshot
    // via `pnpm --filter @earth-alliance/engine test -- integration -u`.
    expect(playDoNothing()).toMatchSnapshot();
  });

  it('warms monotonically until the game ends', () => {
    let state = createInitialState();
    let prev = state.climate.temperatureAnomaly;
    let guard = 0;
    while (state.status === 'playing' && guard < 35) {
      state = advanceTurn(state, []).state;
      expect(state.climate.temperatureAnomaly).toBeGreaterThanOrEqual(prev);
      prev = state.climate.temperatureAnomaly;
      guard++;
    }
  });
});

describe('determinism', () => {
  it('produces identical states for identical inputs', () => {
    const run = () => {
      let state = createInitialState();
      let guard = 0;
      while (state.status === 'playing' && guard < 10) {
        state = advanceTurn(state, []).state;
        guard++;
      }
      return state;
    };
    expect(run()).toEqual(run());
  });
});
