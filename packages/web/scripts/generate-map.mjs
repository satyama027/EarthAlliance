// Offline world-map generator. Run with: pnpm --filter @earth-alliance/web generate-map
//
// Bakes the 10-region world map into a self-contained, HD vector asset
// (src/assets/world-map.svg) using REAL Natural Earth geometry. The game loads
// that SVG at runtime — it never runs d3/topojson. Re-run only when the regions
// or boundaries change. See docs/design/proposals/2026-06-04-world-map-regions/.

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoEquirectangular, geoPath, geoGraticule } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import { topology } from 'topojson-server';
import { regionOf, applyGoiCorrection } from './regions.mjs';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load world-atlas countries-110m (robust to package "exports") ──
let topo;
try {
  topo = require('world-atlas/countries-110m.json');
} catch {
  const pkg = require.resolve('world-atlas/package.json');
  topo = JSON.parse(readFileSync(join(dirname(pkg), 'countries-110m.json'), 'utf8'));
}

// ── Region palette: MUST match REGION_COLORS in src/theme.ts ──
const REGION_COLORS = {
  'north-america': '#4dabf7', 'latin-america': '#ffa94d', 'europe': '#9775fa',
  'russia-central-asia': '#f783ac', 'mena': '#ffd43b', 'sub-saharan-africa': '#69db7c',
  'south-asia': '#ff8787', 'east-asia': '#38d9a9', 'southeast-asia': '#a9e34b', 'oceania': '#66d9e8',
};
const PARTITION = '#0a0f17', GRATICULE = '#1b3a5c';
const REGION_NAMES = {
  'north-america': 'North America', 'latin-america': 'Latin America', 'europe': 'Europe',
  'russia-central-asia': 'Russia & Central Asia', 'mena': 'MENA', 'sub-saharan-africa': 'Sub-Saharan Africa',
  'south-asia': 'South Asia', 'east-asia': 'East Asia', 'southeast-asia': 'Southeast Asia', 'oceania': 'Oceania',
};

// ── Country → region lookup + GoI Aksai Chin correction live in regions.mjs ──
const EXCLUDE = new Set(['Antarctica', 'Fr. S. Antarctic Lands']);

// Explicit label anchors (more reliable than centroids for spread-out regions).
const LABEL = {
  'north-america': [-100, 45], 'latin-america': [-60, -12], 'europe': [15, 50],
  'russia-central-asia': [95, 62], 'mena': [25, 27], 'sub-saharan-africa': [22, -4],
  'south-asia': [79, 22], 'east-asia': [110, 36], 'southeast-asia': [114, 0], 'oceania': [134, -26],
};

const W = 1000, H = 500;

// ── Features (+ France/French Guiana split) ──
const all = feature(topo, topo.objects.countries).features;
const features = all.filter((f) => !EXCLUDE.has(f.properties.name));
const fr = features.find((f) => f.properties.name === 'France');
if (fr && fr.geometry.type === 'MultiPolygon') {
  const metro = [], guiana = [];
  fr.geometry.coordinates.forEach((poly) => { (poly[0][0][0] < -20 ? guiana : metro).push(poly); });
  fr.geometry.coordinates = metro;
  if (guiana.length) features.push({ type: 'Feature', properties: { name: 'French Guiana' }, geometry: { type: 'MultiPolygon', coordinates: guiana } });
}

// ── GoI correction: cut Aksai Chin out of China and re-add it as South Asia ──
applyGoiCorrection(features);

const projection = geoEquirectangular().fitExtent([[10, 12], [W - 10, H - 12]], { type: 'FeatureCollection', features });
const path = geoPath(projection);

// ── One concatenated path per region (stroke == fill dissolves internal seams) ──
const byRegion = {};
features.forEach((f) => { const r = regionOf(f.properties.name); if (r) (byRegion[r] = byRegion[r] || []).push(f); });
const regionPaths = Object.keys(REGION_COLORS).map((r) => {
  const d = (byRegion[r] || []).map((f) => path(f)).join('');
  const c = REGION_COLORS[r];
  return `<path id="${r}" data-region="${r}" class="region" d="${d}" fill="${c}" stroke="${c}" stroke-width="0.8" stroke-linejoin="round"/>`;
}).join('\n    ');

// ── Region partition lines: real borders where the region differs. Rebuilt from
//    the GoI-corrected features (not the raw topo) so the China↔Aksai-Chin edge
//    follows the GoI line and the old Chinese-aligned segment is gone. France's
//    only cross-region edge is via French Guiana, handled by the split above. ──
const corrected = topology({ countries: { type: 'FeatureCollection', features } });
const partition = path(mesh(corrected, corrected.objects.countries, (a, b) => {
  if (a === b) return false;
  if (a.properties.name === 'France' || b.properties.name === 'France') return false;
  const ra = regionOf(a.properties.name), rb = regionOf(b.properties.name);
  return ra && rb && ra !== rb;
}));

// ── Ocean + graticule ──
const graticule = path(geoGraticule().step([30, 20])());
const labels = Object.keys(LABEL).map((r) => {
  const [x, y] = projection(LABEL[r]);
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="rlabel">${escapeXml(REGION_NAMES[r])}</text>`;
}).join('\n    ');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="World map of 10 regions">
  <defs>
    <radialGradient id="ocean" cx="50%" cy="40%" r="75%">
      <stop offset="0%" stop-color="#0d2440"/><stop offset="70%" stop-color="#071529"/><stop offset="100%" stop-color="#05080f"/>
    </radialGradient>
  </defs>
  <style>
    .region { cursor: pointer; transition: opacity .15s ease, filter .15s ease; }
    .region:hover { filter: brightness(1.12); }
    .region.dim { opacity: .32; }
    .rlabel { fill: #fff; font: 700 15px system-ui, sans-serif; text-anchor: middle;
      paint-order: stroke; stroke: rgba(0,0,0,.6); stroke-width: 2.6px; pointer-events: none; }
    .partition, .graticule { pointer-events: none; }
  </style>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ocean)"/>
  <path class="graticule" d="${graticule}" fill="none" stroke="${GRATICULE}" stroke-width="0.5" opacity="0.5"/>
  <g id="regions">
    ${regionPaths}
  </g>
  <path class="partition" d="${partition}" fill="none" stroke="${PARTITION}" stroke-width="1.5" stroke-linejoin="round"/>
  <g id="labels">
    ${labels}
  </g>
</svg>
`;

function escapeXml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const outDir = join(__dirname, '..', 'src', 'assets');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'world-map.svg'), svg, 'utf8');
console.log(`Wrote src/assets/world-map.svg (${(svg.length / 1024).toFixed(1)} KB)`);
