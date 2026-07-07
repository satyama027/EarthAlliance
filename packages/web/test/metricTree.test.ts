import {
  createInitialState, advanceTurn, gridIntensityFromMix,
} from '@earth-alliance/engine';
import type { TurnRecord } from '../src/game/useGame.js';
import { electricityFuelEmissions, readingAt } from '../src/game/metricSeries.js';
import {
  METRIC_TREE, topLevelIds, findNode, nodeValue, nodeSeries, changeSince,
  type Entity,
} from '../src/game/metricTree.js';
import { planetAggregate } from '../src/game/planetAggregate.js';

// A real 3-point turnLog from the engine (turn-0 baseline + two do-nothing turns).
function buildLog(): TurnRecord[] {
  const s0 = createInitialState();
  const log: TurnRecord[] = [{ turn: s0.turn, year: s0.year, state: s0, diagnostics: null }];
  let s = s0;
  for (let i = 0; i < 2; i++) {
    const { state, diagnostics } = advanceTurn(s, []);
    log.push({ turn: state.turn, year: state.year, state, diagnostics });
    s = state;
  }
  return log;
}

const PLANET: Entity = { kind: 'planet' };

describe('electricityFuelEmissions', () => {
  const mix = {
    coal: 0.5, gas: 0.3, oil: 0.2, nuclear: 0, hydro: 0, wind: 0, solar: 0, geothermal: 0,
  };
  it('computes per-fuel electricity emissions as demand × share × factor', () => {
    const f = electricityFuelEmissions(10, mix);
    expect(f.coal).toBeCloseTo(10 * 0.5 * 1.0, 9);
    expect(f.gas).toBeCloseTo(10 * 0.3 * 0.45, 9);
    expect(f.oil).toBeCloseTo(10 * 0.2 * 0.7, 9);
  });
  it('sums to the electricity emission total (demand × grid intensity)', () => {
    const f = electricityFuelEmissions(10, mix);
    expect(f.coal + f.gas + f.oil).toBeCloseTo(10 * gridIntensityFromMix(mix), 9);
  });
});

describe('readingAt', () => {
  const log = buildLog();
  const latest = log[log.length - 1]!;

  it('builds a planet reading equal to the planetAggregate rollup', () => {
    const r = readingAt(PLANET, latest);
    const p = planetAggregate(latest.state.regions, latest.diagnostics);
    expect(r.regionalEmissions).toBeCloseTo(p.regionalEmissions, 9);
    expect(r.sources.transport).toBeCloseTo(p.sources.transport, 9);
    expect(r.publicSupport).toBeCloseTo(p.publicSupport, 9);
    expect(r.budget.net).toBeCloseTo(p.budget.net, 9);
  });

  it('builds a region reading from that region', () => {
    const region = latest.state.regions[0]!;
    const r = readingAt({ kind: 'region', id: region.id }, latest);
    expect(r.regionalEmissions).toBeCloseTo(region.regionalEmissions, 9);
    expect(r.waterAvailability).toBe(region.waterAvailability);
  });

  it('electricity-by-fuel sums to the electricity source total', () => {
    const region = latest.state.regions[0]!;
    const r = readingAt({ kind: 'region', id: region.id }, latest);
    const f = r.electricityByFuel;
    expect(f.coal + f.gas + f.oil).toBeCloseTo(region.electricity, 6);
  });
});

describe('METRIC_TREE structure', () => {
  it('exposes the six top-level metrics in the mockup order', () => {
    expect(topLevelIds()).toEqual([
      'emissions', 'support', 'income', 'biodiversity', 'water', 'land',
    ]);
  });

  it('Emissions is a composition of the six sectors', () => {
    const emissions = findNode(['emissions'])!;
    expect(emissions.kind).toBe('composition');
    expect(emissions.children!.map((c) => c.id)).toEqual([
      'electricity', 'transport', 'aviationShipping', 'industry', 'agriculture', 'landUse',
    ]);
  });

  it('Electricity is the custom generation/emissions panel over coal/gas/oil', () => {
    const elec = findNode(['emissions', 'electricity'])!;
    expect(elec.kind).toBe('electricity');
    // keeps the fuel children so the emissions still sum-check (coal/gas/oil trend leaves)
    expect(elec.children!.map((c) => c.id)).toEqual(['coal', 'gas', 'oil']);
    expect(elec.children!.every((c) => c.kind === 'trend')).toBe(true);
  });

  it('index metrics are trend leaves', () => {
    for (const id of ['support', 'biodiversity', 'water', 'land']) {
      expect(findNode([id])!.kind).toBe('trend');
    }
  });

  it('Income is a composition ledger of tax / carbon-tax / upkeep', () => {
    const income = findNode(['income'])!;
    expect(income.kind).toBe('composition');
    expect(income.children!.map((c) => c.id)).toEqual(['tax', 'carbonTax', 'upkeep']);
  });

  it('findNode returns null for an unknown path', () => {
    expect(findNode(['emissions', 'nope'])).toBeNull();
    expect(findNode(['ghost'])).toBeNull();
  });
});

describe('nodeValue / nodeSeries', () => {
  const log = buildLog();

  it('nodeValue reads the latest turn', () => {
    const latest = log[log.length - 1]!;
    const p = planetAggregate(latest.state.regions, latest.diagnostics);
    expect(nodeValue(findNode(['emissions'])!, PLANET, log)).toBeCloseTo(p.regionalEmissions, 9);
    expect(nodeValue(findNode(['support'])!, PLANET, log)).toBeCloseTo(p.publicSupport, 9);
  });

  it('nodeSeries yields one { year, value } per turn record, anchored at turn 0', () => {
    const s = nodeSeries(findNode(['biodiversity'])!, PLANET, log);
    expect(s).toHaveLength(log.length);
    expect(s.map((pt) => pt.year)).toEqual(log.map((r) => r.year));
    // turn-0 point equals the baseline reading
    const base = planetAggregate(log[0]!.state.regions, null);
    expect(s[0]!.value).toBeCloseTo(base.biodiversityIndex, 9);
  });

  it('the six emission children sum to the emissions total (composition invariant)', () => {
    const emissions = findNode(['emissions'])!;
    const total = nodeValue(emissions, PLANET, log);
    const parts = emissions.children!.reduce((sum, c) => sum + nodeValue(c, PLANET, log), 0);
    expect(parts).toBeCloseTo(total, 6);
  });
});

describe('changeSince', () => {
  it('is flat (neutral —, no direction) when the change rounds to zero', () => {
    const c = changeSince(0.004, false); // rounds to 0.00 at 2-dp
    expect(c.arrow).toBe('—');
    expect(c.tone).toBe('flat');
    expect(c.label).toBe('flat');
  });

  it('colors a rise/fall good or bad by the metric direction', () => {
    expect(changeSince(2, true)).toMatchObject({ arrow: '▲', tone: 'good' });
    expect(changeSince(2, false)).toMatchObject({ arrow: '▲', tone: 'bad' });
    expect(changeSince(-2, true)).toMatchObject({ arrow: '▼', tone: 'bad' });
    expect(changeSince(-2, false)).toMatchObject({ arrow: '▼', tone: 'good' });
  });
});
