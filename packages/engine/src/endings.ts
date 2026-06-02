import type { Ending, Region, WorldState } from './types.js';
import { END_YEAR } from './data/scenario.js';

export const ENDINGS: Readonly<Record<string, Ending>> = Object.freeze({
  'eco-collapse': { id: 'eco-collapse', title: 'Ecological Collapse', kind: 'loss',
    description: 'Runaway warming and dying ecosystems overwhelmed civilization.' },
  'economic-ruin': { id: 'economic-ruin', title: 'Economic Ruin', kind: 'loss',
    description: 'Society fractured under economic collapse and lost legitimacy.' },
  'orbital-exodus': { id: 'orbital-exodus', title: 'Orbital Exodus', kind: 'ambiguous',
    description: 'A wealthy few escaped to the stars while Earth was left to burn.' },
  'green-utopia': { id: 'green-utopia', title: 'Green Utopia', kind: 'win',
    description: 'A thriving, equitable world within safe planetary limits.' },
  'authoritarian-stability': { id: 'authoritarian-stability', title: 'Authoritarian Stability', kind: 'ambiguous',
    description: 'Targets were met, but only by crushing dissent and equity.' },
  'muddling-through': { id: 'muddling-through', title: 'Muddling Through', kind: 'ambiguous',
    description: 'Humanity survived the century — battered, unequal, but standing.' },
});

function weightedAvg(regions: readonly Region[], pick: (r: Region) => number): number {
  let acc = 0;
  let pop = 0;
  for (const r of regions) {
    acc += pick(r) * r.population;
    pop += r.population;
  }
  return pop > 0 ? acc / pop : 0;
}

/** Returns an Ending if the game should end (loss any turn; resolution at END_YEAR), else null. */
export function evaluateEnding(state: WorldState): Ending | null {
  const t = state.climate.temperatureAnomaly;
  const biodiversity = weightedAvg(state.regions, (r) => r.biodiversityIndex);
  const support = weightedAvg(state.regions, (r) => r.publicSupport);
  const equity = weightedAvg(state.regions, (r) => r.equityIndex);
  const gdp = weightedAvg(state.regions, (r) => r.gdpPerCapita);
  const education = weightedAvg(state.regions, (r) => r.educationIndex);

  // Early-loss conditions — can fire any turn.
  if (t >= 3.5 || biodiversity <= 15) return ENDINGS['eco-collapse']!;
  if (support <= 10 || gdp <= 2000) return ENDINGS['economic-ruin']!;

  if (state.year < END_YEAR) return null;

  // Resolution at the final turn, in priority order.
  if (state.enactedPolicyIds.includes('off-world-colonies') && t >= 2.5 && gdp >= 40000 && education >= 75) {
    return ENDINGS['orbital-exodus']!;
  }
  if (t < 2.0 && biodiversity >= 55 && equity >= 60 && gdp >= 30000) {
    return ENDINGS['green-utopia']!;
  }
  if (t < 3.0 && support < 35) return ENDINGS['authoritarian-stability']!;
  if (t < 3.0) return ENDINGS['muddling-through']!;
  return ENDINGS['eco-collapse']!;
}
