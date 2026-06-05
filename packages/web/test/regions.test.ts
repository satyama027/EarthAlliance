import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { feature } from 'topojson-client';
import { geoContains } from 'd3-geo';
import { applyGoiCorrection, regionOf } from '../scripts/regions.mjs';

// Load world-atlas the same robust way the generator does (package "exports"
// can hide the deep .json path from require).
const require = createRequire(import.meta.url);
let topo: any;
try {
  topo = require('world-atlas/countries-110m.json');
} catch {
  const pkg = require.resolve('world-atlas/package.json');
  topo = JSON.parse(readFileSync(join(dirname(pkg), 'countries-110m.json'), 'utf8'));
}

// [lon, lat] sample points.
const AKSAI_CHIN: [number, number] = [79, 35]; // disputed area, GoI depicts as India
const CORE_CHINA: [number, number] = [104, 35]; // unambiguously China

const freshFeatures = (): any[] => (feature(topo, topo.objects.countries) as any).features;
const regionFC = (features: any[], region: string): any => ({
  type: 'FeatureCollection',
  features: features.filter((f) => regionOf(f.properties.name) === region),
});

describe('GoI Aksai Chin correction', () => {
  it('maps the Aksai Chin feature name to south-asia', () => {
    expect(regionOf('Aksai Chin (India)')).toBe('south-asia');
  });

  it('moves Aksai Chin out of East Asia (China) into South Asia', () => {
    const corrected = applyGoiCorrection(freshFeatures());
    expect(geoContains(regionFC(corrected, 'south-asia'), AKSAI_CHIN)).toBe(true);
    expect(geoContains(regionFC(corrected, 'east-asia'), AKSAI_CHIN)).toBe(false);
  });

  it('does not over-clip core China out of East Asia', () => {
    const corrected = applyGoiCorrection(freshFeatures());
    expect(geoContains(regionFC(corrected, 'east-asia'), CORE_CHINA)).toBe(true);
  });
});
