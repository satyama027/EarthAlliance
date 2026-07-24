import { createInitialState, type WorldState } from '@earth-alliance/engine';
import { turnReport } from '../src/game/turnReport.js';
import type { TurnRecord } from '../src/game/useGame.js';

interface Vals { temp: number; emissions: number; co2: number; money: number; bio: number; }

/** A TurnRecord whose planet reads back the given six-metric values (every region shares `bio`). */
function mkRecord(turn: number, year: number, v: Vals): TurnRecord {
  const base = createInitialState();
  const state: WorldState = {
    ...base,
    climate: { ...base.climate, temperatureAnomaly: v.temp, annualEmissions: v.emissions, co2Concentration: v.co2 },
    resources: { ...base.resources, money: v.money },
    regions: base.regions.map((r) => ({ ...r, biodiversityIndex: v.bio })),
  };
  return { turn, year, state, diagnostics: null };
}

const prev = mkRecord(1, 2030, { temp: 1.30, emissions: 41.5, co2: 419, money: 1448, bio: 62.0 });
const cur = mkRecord(2, 2035, { temp: 1.34, emissions: 41.2, co2: 421, money: 1490, bio: 61.6 });

describe('turnReport', () => {
  it('returns null when there is no prior turn to compare', () => {
    expect(turnReport([prev])).toBeNull();
    expect(turnReport([])).toBeNull();
  });

  it('reports the elapsed turn header (latest turn, both years)', () => {
    const r = turnReport([prev, cur])!;
    expect(r).not.toBeNull();
    expect(r.turn).toBe(2);
    expect(r.year).toBe(2035);
    expect(r.prevYear).toBe(2030);
  });

  it('summarises exactly the five metrics in order', () => {
    const r = turnReport([prev, cur])!;
    expect(r.metrics.map((m) => m.key)).toEqual([
      'temperature', 'emissions', 'co2', 'treasury', 'biodiversity',
    ]);
  });

  it('computes each metric value, delta, and formatted display', () => {
    const r = turnReport([prev, cur])!;
    const by = (key: string) => r.metrics.find((m) => m.key === key)!;

    expect(by('temperature').value).toBeCloseTo(1.34, 9);
    expect(by('temperature').delta).toBeCloseTo(0.04, 9);
    expect(by('temperature').valueText).toBe('+1.34');

    expect(by('emissions').value).toBeCloseTo(41.2, 9);
    expect(by('emissions').delta).toBeCloseTo(-0.3, 9);
    expect(by('emissions').valueText).toBe('41.2');

    expect(by('co2').value).toBeCloseTo(421, 9);
    expect(by('co2').delta).toBeCloseTo(2, 9);
    expect(by('co2').valueText).toBe('421');

    expect(by('treasury').value).toBeCloseTo(1490, 9);
    expect(by('treasury').delta).toBeCloseTo(42, 9);
    expect(by('treasury').valueText).toBe('1,490');

    expect(by('biodiversity').value).toBeCloseTo(61.6, 6);
    expect(by('biodiversity').delta).toBeCloseTo(-0.4, 6);
    expect(by('biodiversity').valueText).toBe('61.6');
  });

  it('colors deltas by good/bad polarity (up-is-bad for climate, up-is-good for treasury/biodiversity)', () => {
    const r = turnReport([prev, cur])!;
    const by = (key: string) => r.metrics.find((m) => m.key === key)!;

    // Warming rose → bad; emissions fell → good; CO₂ rose → bad.
    expect(by('temperature').change).toMatchObject({ arrow: '▲', tone: 'bad' });
    expect(by('emissions').change).toMatchObject({ arrow: '▼', tone: 'good' });
    expect(by('co2').change).toMatchObject({ arrow: '▲', tone: 'bad' });
    // Treasury rose → good; biodiversity fell → bad.
    expect(by('treasury').change).toMatchObject({ arrow: '▲', tone: 'good' });
    expect(by('biodiversity').change).toMatchObject({ arrow: '▼', tone: 'bad' });
  });

  it('marks a change that rounds to zero as neutral flat', () => {
    const flat = mkRecord(2, 2035, { temp: 1.30, emissions: 41.5, co2: 419, money: 1448, bio: 62.0 });
    const r = turnReport([prev, flat])!;
    const temp = r.metrics.find((m) => m.key === 'temperature')!;
    expect(temp.change).toMatchObject({ arrow: '—', tone: 'flat' });
  });
});
