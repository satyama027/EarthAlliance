import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { MetricTrend } from '../src/components/MetricTrend.js';
import type { TrendPoint } from '../src/game/metricTree.js';

function wrap(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

function svgTexts(container: HTMLElement): (string | null)[] {
  return Array.from(container.querySelectorAll('text')).map((t) => t.textContent);
}

const points: TrendPoint[] = [
  { year: 2025, value: 62 }, { year: 2030, value: 60 }, { year: 2035, value: 57 },
  { year: 2040, value: 55 }, { year: 2045, value: 52 }, { year: 2050, value: 48 },
];

describe('MetricTrend', () => {
  it('draws a polyline for the series', () => {
    const { container } = wrap(<MetricTrend points={points} color="#63e6be" unit="/100" goodUp />);
    expect(container.querySelector('polyline')).not.toBeNull();
  });

  it('shows the latest value as the headline', () => {
    wrap(<MetricTrend points={points} color="#63e6be" unit="/100" goodUp />);
    expect(screen.getAllByText('48').length).toBeGreaterThanOrEqual(1); // headline (also a per-turn label)
  });

  it('baselines the Y axis at 0 with distinct tick labels', () => {
    const { container } = wrap(<MetricTrend points={points} color="#63e6be" unit="/100" goodUp />);
    const yTicks = Array.from(container.querySelectorAll('text[data-axis="y"]')).map((t) => t.textContent);
    // 62..48 baselined at 0 → ticks 0,20,40,60,80
    expect(yTicks).toContain('0');
    expect(yTicks).toContain('60');
    // no duplicate tick labels (the old 1-decimal collapse bug)
    expect(new Set(yTicks).size).toBe(yTicks.length);
  });

  it('labels the X axis with the first and last year (unclipped)', () => {
    const { container } = wrap(<MetricTrend points={points} color="#63e6be" unit="/100" goodUp />);
    const texts = svgTexts(container);
    expect(texts).toContain('2025'); // starting year always shown
    expect(texts).toContain('2050'); // final year always shown
  });

  it('shows enough Y-axis precision for small (sub-1) values', () => {
    const small: TrendPoint[] = [
      { year: 2025, value: 0.02 }, { year: 2030, value: 0.06 }, { year: 2035, value: 0.12 },
    ];
    const { container } = wrap(<MetricTrend points={small} color="#f59f00" unit="Gt CO₂/yr" />);
    const texts = svgTexts(container);
    // 0.05-step ticks must render 2 decimals, never a duplicated "0.0"
    expect(texts).toContain('0.05');
    expect(texts).toContain('0.10');
  });

  it('reports a real small change instead of rounding it to 0.0', () => {
    const rising: TrendPoint[] = [{ year: 2025, value: 0.35 }, { year: 2030, value: 0.52 }];
    wrap(<MetricTrend points={rising} color="#f59f00" unit="Gt CO₂/yr" goodUp={false} />);
    expect(screen.getByText(/0\.17 since 2025/)).toBeInTheDocument();
  });

  it('shows the change chip relative to the first year', () => {
    wrap(<MetricTrend points={points} color="#63e6be" unit="/100" goodUp />);
    expect(screen.getByText(/since 2025/i)).toBeInTheDocument();
  });

  it('draws a dot marker at every turn point', () => {
    const { container } = wrap(<MetricTrend points={points} color="#63e6be" unit="/100" goodUp />);
    expect(container.querySelectorAll('circle').length).toBe(points.length);
  });

  it('labels each turn value on a short series', () => {
    const { container } = wrap(<MetricTrend points={points} color="#63e6be" unit="/100" goodUp />);
    const texts = svgTexts(container);
    // interior values 57 and 52 are not Y-tick or headline values, so they must be per-turn labels
    expect(texts).toContain('57');
    expect(texts).toContain('52');
  });

  it('keeps a dot per turn but thins the year/value labels on a long series', () => {
    const long: TrendPoint[] = [];
    for (let y = 2025; y <= 2200; y += 5) long.push({ year: y, value: 0.7 - (y - 2025) * 0.003 });
    const { container } = wrap(<MetricTrend points={long} color="#f59f00" unit="Gt CO₂/yr" />);
    // a marker at every one of the 36 turns
    expect(container.querySelectorAll('circle').length).toBe(long.length);
    const texts = svgTexts(container);
    // first + last year always labelled…
    expect(texts).toContain('2025');
    expect(texts).toContain('2200');
    // …but an interior turn's year is thinned away
    expect(texts).not.toContain('2040');
  });

  it('does not crash on an empty or single-point series', () => {
    const { container: c1 } = wrap(<MetricTrend points={[]} color="#63e6be" unit="/100" />);
    expect(c1.querySelector('svg')).not.toBeNull();
    const { container: c2 } = wrap(<MetricTrend points={[{ year: 2025, value: 5 }]} color="#63e6be" unit="Gt" />);
    expect(c2.querySelector('svg')).not.toBeNull();
  });
});
