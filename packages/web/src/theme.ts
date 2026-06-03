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
