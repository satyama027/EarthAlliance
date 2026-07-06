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
import { programs } from './programs.js';
import { evElectrification } from './evElectrification.js';
import { generationMix } from './generationMix.js';
import { carbonTax } from './carbonTax.js';

/** The default world-model pipeline, run in order each turn. Swap entries to change fidelity. */
// `programs` runs after `resources` so this turn's regenerated tax income is available to fund
// policy upkeep. `evElectrification` then converts road transport to electricity demand at the
// EV buildout's capacity. `generationMix` conserves the mix and derives grid carbon intensity
// before emissions are finalized. `carbonTax` runs last so it taxes this turn's post-decarbonization
// grid intensity + sectors (revenue shrinks as the region cleans up).
export const DEFAULT_MODELS: readonly SubModel[] = [
  carbonCycle, climate, damage, economy, demography,
  emissions, constraints, biodiversity, support, resources, programs, evElectrification, generationMix, carbonTax,
];
