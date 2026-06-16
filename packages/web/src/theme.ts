import { createTheme, Tooltip, type MantineColorsTuple } from '@mantine/core';
import type { PolicyCategory } from '@earth-alliance/engine';

const earth: MantineColorsTuple = [
  '#e6fcf5', '#c3fae8', '#96f2d7', '#63e6be', '#38d9a9',
  '#20c997', '#12b886', '#0ca678', '#099268', '#087f5b',
];

/**
 * App-wide stacking order. Overlays (`DataOverlay`, `EndingScreen`,
 * `PolicyDetailOverlay`) sit at 1000–1100; tooltips portal to `document.body` as
 * siblings of those overlays, so they MUST out-rank them or hover help paints
 * behind the backdrop. Mantine's tooltip default (300) is below the overlays —
 * hence `tooltip` here, wired into the theme's Tooltip defaults below.
 */
export const Z_LAYERS = {
  overlay: 1000,
  overlayRaised: 1100,
  tooltip: 2000,
} as const;

export const theme = createTheme({
  primaryColor: 'earth',
  colors: { earth },
  fontFamily: 'system-ui, sans-serif',
  components: {
    Tooltip: Tooltip.extend({ defaultProps: { zIndex: Z_LAYERS.tooltip } }),
  },
});

/**
 * Emission-source colors for the by-source breakdown (Dashboard + RegionPanel stacked bar).
 * All reused from existing palette hues so the breakdown reads as native; `sink` is the one
 * new accent, used when `landUse` goes negative (a carbon sink). Keep in sync with
 * docs/design/DESIGN-SYSTEM.md.
 */
export const SOURCE_COLORS = {
  electricity: '#f59f00',      // energy category (⚡)
  transport: '#4dabf7',        // north-america region blue
  aviationShipping: '#66d9e8', // oceania region cyan
  industry: '#868e96',         // industry category (🏭)
  agriculture: '#a9e34b',      // southeast-asia region lime
  landUse: '#2f9e44',          // land category (🌳)
  sink: '#1098ad',             // land-use when negative (a carbon sink)
} as const;

/**
 * Generation-source colors for the per-region generation-mix bar (RegionPanel). Chosen so the
 * three bands read as distinct families: fossils = dark/grey cluster + orange oil; nuclear = violet
 * (firm, zero-carbon, but NOT renewable); renewables = cool blue/cyan/yellow/lime. Keep in sync with
 * docs/design/DESIGN-SYSTEM.md.
 */
export const GENERATION_COLORS = {
  coal: '#495057',       // fossil — dark slate grey (dirtiest)
  gas: '#868e96',        // fossil — grey (industry hue)
  oil: '#e8590c',        // fossil — deep orange (orange-7)
  nuclear: '#9775fa',    // violet (europe region hue) — firm, zero-carbon, not renewable
  hydro: '#4dabf7',      // renewable — blue (water)
  wind: '#3bc9db',       // renewable — cyan (air)
  solar: '#ffd43b',      // renewable — yellow (sun)
  geothermal: '#94d82d', // renewable — lime (earth heat)
} as const;

/** Placeholder card-art colors per policy category (real art drops in later). */
export const CATEGORY_COLOR: Record<PolicyCategory, string> = {
  energy: '#f59f00',
  industry: '#868e96',
  land: '#2f9e44',
  social: '#1971c2',
  frontier: '#9c36b5',
};

/**
 * Distinct fill color per world-map region (keyed by engine region id).
 * SINGLE SOURCE OF TRUTH for region colors. The map-generator script
 * (`scripts/generate-map.mjs`) bakes these same values into `world-map.svg`;
 * keep the two in sync (see docs/design/DESIGN-SYSTEM.md).
 */
export const REGION_COLORS: Record<string, string> = {
  'north-america': '#4dabf7',
  'latin-america': '#ffa94d',
  'europe': '#9775fa',
  'russia-central-asia': '#f783ac',
  'mena': '#ffd43b',
  'sub-saharan-africa': '#69db7c',
  'south-asia': '#ff8787',
  'east-asia': '#38d9a9',
  'southeast-asia': '#a9e34b',
  'oceania': '#66d9e8',
};

/** World-map surface tokens (also baked into world-map.svg by the generator). */
export const MAP_SURFACE = {
  oceanGradient: ['#0d2440', '#071529', '#05080f'] as const,
  graticule: '#1b3a5c',
  partitionLine: '#0a0f17',
  selectedOutline: '#20c997', // earth-5
};
