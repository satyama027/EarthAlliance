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

  it('synthesizes the renewable fossil-replacement conversion (storage-gated, good)', () => {
    // renewable-subsidy converts fossil → wind/solar in a submodel (no declared effects).
    const lines = effectLines(policy('renewable-subsidy'));
    const share = lines.find((l) => l.label === 'Renewable share')!;
    expect(share.direction).toBe('good'); // growing renewable share is good
    expect(share.scope).toBe('each turn');
    expect(share.note).toMatch(/storage/i);
  });

  it('synthesizes the nuclear fossil-replacement conversion (uranium-capped, good)', () => {
    const lines = effectLines(policy('nuclear-buildout'));
    const share = lines.find((l) => l.label === 'Nuclear share')!;
    expect(share.direction).toBe('good');
    expect(share.note).toMatch(/uranium/i);
  });

  it('synthesizes EV Subsidies mechanics (effects live in a submodel, not declared)', () => {
    const lines = effectLines(policy('ev-transition'));
    const transport = lines.find((l) => l.label === 'Transport emissions')!;
    const demand = lines.find((l) => l.label === 'Electricity demand')!;
    expect(transport.direction).toBe('good'); // tailpipe falls toward zero
    expect(demand.direction).toBe('bad');     // power load grows
    expect(transport.scope).toBe('each turn');
  });

  it('treats an index gain as good with a + sign', () => {
    // precision-agriculture: agriculturalProductivity +8 immediate
    const lines = effectLines(policy('precision-agriculture'));
    const yield_ = lines.find((l) => l.label === 'Crop yield')!;
    expect(yield_.magnitude).toBe('+8');
    expect(yield_.direction).toBe('good');
  });

  it('shows the Carbon Tax revenue + flat support offset (synthesized) alongside its industry cut', () => {
    // carbon-tax: revenue + a flat public-support offset live in the submodel; only industry is declared.
    const lines = effectLines(policy('carbon-tax'));
    const revenue = lines.find((l) => l.label === 'Treasury revenue')!;
    expect(revenue.direction).toBe('good');
    expect(revenue.note).toMatch(/decarbonise/i);

    const support = lines.find((l) => l.label === 'Public support')!;
    expect(support.magnitude).toBe('−5');
    expect(support.scope).toBe('while active'); // held flat while active, not per-turn
    expect(support.direction).toBe('bad');

    const industry = lines.find((l) => l.label === 'Industry emissions')!;
    expect(industry.magnitude).toBe('−0.05 Gt/yr');
    expect(industry.direction).toBe('good');
  });
});

describe('durationLine', () => {
  it('returns "Runs until cancelled" for recurring policies', () => {
    expect(durationLine(policy('anti-deforestation'))).toBe('Runs until cancelled');
  });
  it('returns "Runs until cancelled" for the recurring Carbon Tax', () => {
    expect(durationLine(policy('carbon-tax'))).toBe('Runs until cancelled');
  });
  it('returns null for one-time and buildout policies', () => {
    expect(durationLine(policy('fuel-efficiency'))).toBeNull(); // one-time
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
