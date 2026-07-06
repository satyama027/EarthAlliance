import { createInitialState, DEFAULT_PARAMS, regionTaxIncome, type TurnDiagnostics } from '@earth-alliance/engine';
import { regionBudget } from '../src/game/regionBudget.js';

const region = () => createInitialState().regions.find((r) => r.id === 'north-america')!;

const diag = (over: Partial<TurnDiagnostics>): TurnDiagnostics =>
  ({ taxIncomeByRegion: {}, carbonTaxRevenueByRegion: {}, programSpendByRegion: {}, ...over } as TurnDiagnostics);

describe('regionBudget', () => {
  it('composes tax income + carbon tax − upkeep = net from diagnostics', () => {
    const b = regionBudget(region(), diag({
      taxIncomeByRegion: { 'north-america': 1000 },
      carbonTaxRevenueByRegion: { 'north-america': 11 },
      programSpendByRegion: { 'north-america': 120 },
    }));
    expect(b.taxIncome).toBe(1000);
    expect(b.carbonTax).toBe(11);
    expect(b.upkeep).toBe(120);
    expect(b.net).toBe(1000 + 11 - 120);
  });

  it('projects tax income on turn 0 (no diagnostics); carbon tax and upkeep are zero', () => {
    const r = region();
    const b = regionBudget(r, null);
    expect(b.taxIncome).toBeCloseTo(regionTaxIncome(r, DEFAULT_PARAMS), 6);
    expect(b.carbonTax).toBe(0);
    expect(b.upkeep).toBe(0);
    expect(b.net).toBeCloseTo(b.taxIncome, 6);
  });

  it('treats a region missing from the diagnostics maps as zero', () => {
    const b = regionBudget(region(), diag({}));
    expect(b.taxIncome).toBe(0);
    expect(b.carbonTax).toBe(0);
    expect(b.upkeep).toBe(0);
    expect(b.net).toBe(0);
  });
});
