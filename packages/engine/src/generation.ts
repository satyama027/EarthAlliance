/**
 * Electricity generation mix: the per-region split of power generation across sources, and the
 * derivation of grid carbon intensity from it. Grid intensity is NO LONGER a policy lever — it is
 * derived here as Σ(share × emissionFactor). Policies move the *mix* (renewable/nuclear share),
 * which mechanically moves intensity.
 *
 * Emission factors are normalized to coal = 1.0 from real per-kWh combustion intensities
 * (coal ≈ 1000 gCO₂/kWh; gas CCGT ≈ 450 → 0.45; oil-fired ≈ 700 → 0.70; IPCC AR5 / EIA). The five
 * zero-carbon sources (nuclear + the four renewables) contribute 0.
 */

/** A single generation source. Renewables are the four tagged below; nuclear is zero-carbon but NOT renewable. */
export type GenerationSource =
  | 'coal' | 'gas' | 'oil'                       // fossil
  | 'nuclear'                                     // zero-carbon, NOT renewable
  | 'hydro' | 'wind' | 'solar' | 'geothermal';   // renewable

/** A region's generation mix: share (0–1) of each source. Shares sum to 1. */
export type GenerationMix = Record<GenerationSource, number>;

export interface GenerationSourceSpec {
  emissionFactor: number; // relative to coal = 1.0
  renewable: boolean;
}

export const GENERATION_SOURCES: Record<GenerationSource, GenerationSourceSpec> = {
  coal:       { emissionFactor: 1.0,  renewable: false },
  gas:        { emissionFactor: 0.45, renewable: false },
  oil:        { emissionFactor: 0.7,  renewable: false },
  nuclear:    { emissionFactor: 0,    renewable: false },
  hydro:      { emissionFactor: 0,    renewable: true  },
  wind:       { emissionFactor: 0,    renewable: true  },
  solar:      { emissionFactor: 0,    renewable: true  },
  geothermal: { emissionFactor: 0,    renewable: true  },
};

export const GENERATION_SOURCE_IDS = Object.keys(GENERATION_SOURCES) as GenerationSource[];

/**
 * Fossil sources ordered dirtiest-first by emission factor (coal 1.0 → oil 0.70 → gas 0.45) — the
 * order in which they are retired as clean share grows. Gas is the *cleanest* fossil, so it retires
 * last.
 */
const FOSSIL_BY_DIRTINESS: readonly GenerationSource[] = ['coal', 'oil', 'gas'];

/**
 * Pull up to `amount` of generation share out of the fossils, dirtiest-first (coal → oil → gas),
 * capped at what is actually available. Mutates the fossil shares down in place and returns the
 * amount actually pulled (which is `< amount` only when fossils are exhausted). The caller pairs
 * this with a matching add to a clean source, so the conversion is net-zero to Σ shares — no
 * renormalization is needed and two clean policies cannot dilute each other.
 */
export function drawFromFossils(mix: GenerationMix, amount: number): number {
  let remaining = amount;
  for (const f of FOSSIL_BY_DIRTINESS) {
    if (remaining <= 0) break;
    const take = Math.min(mix[f], remaining);
    mix[f] -= take;
    remaining -= take;
  }
  return amount - remaining;
}

/** Average grid carbon intensity (0–1) implied by a generation mix. */
export function gridIntensityFromMix(mix: GenerationMix): number {
  let intensity = 0;
  for (const s of GENERATION_SOURCE_IDS) intensity += mix[s] * GENERATION_SOURCES[s].emissionFactor;
  return intensity;
}

/**
 * Conserve Σ shares = 1 after policy has grown clean shares. The net share added above 1 is drawn
 * out of the fossils dirtiest-first (coal → oil → gas), so coal retires before oil before gas (gas
 * is the cleanest fossil). Negative shares are clamped to 0; a terminal proportional renormalization
 * guards floating-point drift and the (rare) case where fossils are exhausted.
 */
export function rebalanceMix(mix: GenerationMix): void {
  for (const s of GENERATION_SOURCE_IDS) if (mix[s] < 0) mix[s] = 0;

  let excess = GENERATION_SOURCE_IDS.reduce((a, s) => a + mix[s], 0) - 1;
  if (excess > 1e-12) {
    for (const f of FOSSIL_BY_DIRTINESS) {
      const take = Math.min(mix[f], excess);
      mix[f] -= take;
      excess -= take;
      if (excess <= 1e-12) break;
    }
  }

  const total = GENERATION_SOURCE_IDS.reduce((a, s) => a + mix[s], 0);
  if (total > 0 && Math.abs(total - 1) > 1e-9) {
    for (const s of GENERATION_SOURCE_IDS) mix[s] /= total;
  }
}
