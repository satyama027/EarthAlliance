import type { SubModel } from './types.js';
import { carbonCycle } from './carbonCycle.js';
import { climate } from './climate.js';
import { damage } from './damage.js';
import { economy } from './economy.js';
import { demography } from './demography.js';
import { emissions } from './emissions.js';
import { constraints } from './constraints.js';
import { biodiversity } from './biodiversity.js';
import { support } from './support.js';
import { resources } from './resources.js';

/** The default world-model pipeline, run in order each turn. Swap entries to change fidelity. */
export const DEFAULT_MODELS: readonly SubModel[] = [
  carbonCycle, climate, damage, economy, demography,
  emissions, constraints, biodiversity, support, resources,
];
