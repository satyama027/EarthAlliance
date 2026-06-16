import { describe, it, expect } from 'vitest';
import { evElectrification } from '../../src/models/evElectrification.js';
import { DEFAULT_PARAMS } from '../../src/data/scenario.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';
import type { Enactment } from '../../src/types.js';

const F = DEFAULT_PARAMS.EV_DEMAND_FACTOR;
const ev = (o: Partial<Enactment> = {}): Enactment =>
  ({ policyId: 'ev-transition', regionId: 'r1', capacity: 0.1, complete: false, ...o });

describe('evElectrification submodel', () => {
  it('snapshots a baseline, cuts transport by capacity, and adds matching electricity demand', () => {
    const r = makeRegion({ id: 'r1', transport: 2, electricityDemand: 8 });
    const e = ev({ capacity: 0.1 });
    evElectrification.step(makeContext(makeState({ regions: [r], enactments: [e] })));
    expect(r.transport).toBeCloseTo(2 * (1 - 0.1), 9);           // 1.8
    expect(r.electricityDemand).toBeCloseTo(8 + 0.1 * 2 * F, 9); // gradual, not a one-shot +0.5
    expect(e.evBaselineTransport).toBeCloseTo(2, 9);
    expect(e.evDemandAdded).toBeCloseTo(0.1 * 2 * F, 9);
  });

  it('grows demand gradually and drives transport to ~0 as capacity ramps to full buildout', () => {
    const r = makeRegion({ id: 'r1', transport: 2, electricityDemand: 8 });
    const e = ev({ capacity: 0 });
    const state = makeState({ regions: [r], enactments: [e] });
    let lastDemand = r.electricityDemand;
    for (const cap of [0.2, 0.4, 0.6, 0.8, 1.0]) {
      e.capacity = cap;
      evElectrification.step(makeContext(state));
      expect(r.electricityDemand).toBeGreaterThan(lastDemand); // monotonic each turn
      lastDemand = r.electricityDemand;
    }
    expect(r.transport).toBeCloseTo(0, 9);                  // fully electrified
    expect(r.electricityDemand).toBeCloseTo(8 + 1 * 2 * F, 9); // cumulative = capacity×baseline×F
  });

  it('is drift-free: no further demand is added when capacity and GDP are unchanged', () => {
    const r = makeRegion({ id: 'r1', transport: 2, electricityDemand: 8 });
    const e = ev({ capacity: 0.5, complete: true });
    const state = makeState({ regions: [r], enactments: [e] });
    evElectrification.step(makeContext(state));
    const demandAfterFirst = r.electricityDemand;
    evElectrification.step(makeContext(state)); // identical inputs
    expect(r.electricityDemand).toBeCloseTo(demandAfterFirst, 9); // no compounding
    expect(r.transport).toBeCloseTo(2 * 0.5, 9);
  });

  it('adds roughly EV_DEMAND_FACTOR units of demand per unit of transport removed', () => {
    const r = makeRegion({ id: 'r1', transport: 2, electricityDemand: 8 });
    const e = ev({ capacity: 0.5 });
    evElectrification.step(makeContext(makeState({ regions: [r], enactments: [e] })));
    const removed = 2 - r.transport;            // 1.0
    const added = r.electricityDemand - 8;      // 0.35
    expect(added / removed).toBeCloseTo(F, 9);
    expect(F).toBeLessThan(1); // efficiency gain net of charging losses
  });

  it('ignores regions without an EV enactment', () => {
    const r = makeRegion({ id: 'r1', transport: 2, electricityDemand: 8 });
    evElectrification.step(makeContext(makeState({ regions: [r], enactments: [] })));
    expect(r.transport).toBe(2);
    expect(r.electricityDemand).toBe(8);
  });
});
