import { getPolicy } from '@earth-alliance/engine';
import { effectLines, fundingBlurb, durationLine } from '../src/game/policyDetails.js';

const policy = (id: string) => {
  const p = getPolicy(id);
  if (!p) throw new Error(`missing policy ${id}`);
  return p;
};

describe('effectLines', () => {
  it('formats an emission-source cut as a per-turn Gt reduction (good)', () => {
    // anti-deforestation: landUse -0.2 ongoing, biodiversity +1 ongoing, gdpPerCapita -500 immediate
    const lines = effectLines(policy('anti-deforestation'));
    const land = lines.find((l) => l.label === 'Land-use emissions')!;
    expect(land.magnitude).toBe('−0.20 Gt/yr');
    expect(land.scope).toBe('each turn');
    expect(land.direction).toBe('good'); // lowering emissions is good

    const gdp = lines.find((l) => l.label === 'GDP per capita')!;
    expect(gdp.magnitude).toBe('−$500');
    expect(gdp.scope).toBe('one-time'); // immediate
    expect(gdp.direction).toBe('bad'); // losing GDP is bad
  });

  it('marks a storage-gated grid effect and formats a 0–1 delta plainly', () => {
    // renewable-subsidy: gridCarbonIntensity -0.08 ongoing storageGated
    const lines = effectLines(policy('renewable-subsidy'));
    const grid = lines[0]!;
    expect(grid.label).toBe('Grid carbon intensity');
    expect(grid.magnitude).toBe('−0.08');
    expect(grid.direction).toBe('good'); // lowering grid intensity is good
    expect(grid.note).toMatch(/storage/i);
  });

  it('treats an index gain as good with a + sign', () => {
    // precision-agriculture: agriculturalProductivity +8 immediate
    const lines = effectLines(policy('precision-agriculture'));
    const yield_ = lines.find((l) => l.label === 'Crop yield')!;
    expect(yield_.magnitude).toBe('+8');
    expect(yield_.direction).toBe('good');
  });
});

describe('durationLine', () => {
  it('returns "Runs until cancelled" for recurring policies', () => {
    expect(durationLine(policy('anti-deforestation'))).toBe('Runs until cancelled');
  });
  it('returns null for one-time and buildout policies', () => {
    expect(durationLine(policy('carbon-tax'))).toBeNull(); // one-time
    expect(durationLine(policy('renewable-subsidy'))).toBeNull(); // buildout
  });
});

describe('fundingBlurb', () => {
  it('explains each funding mode', () => {
    expect(fundingBlurb('one-time')).toMatch(/once/i);
    expect(fundingBlurb('recurring')).toMatch(/every turn/i);
    expect(fundingBlurb('buildout')).toMatch(/until/i);
  });
});
