import { createTheme, type MantineColorsTuple } from '@mantine/core';
import type { PolicyCategory } from '@earth-alliance/engine';

const earth: MantineColorsTuple = [
  '#e6fcf5', '#c3fae8', '#96f2d7', '#63e6be', '#38d9a9',
  '#20c997', '#12b886', '#0ca678', '#099268', '#087f5b',
];

export const theme = createTheme({
  primaryColor: 'earth',
  colors: { earth },
  fontFamily: 'system-ui, sans-serif',
});

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
