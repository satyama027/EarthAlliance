import type { ActiveEffect, EffectTarget, Enactment, PolicySelection, Region, WorldState } from './types.js';
import type { GenerationSource } from './generation.js';
import { clamp } from './math.js';
import { getPolicy, regionCharge } from './policies.js';

/**
 * Stop active policies in their regions (player-initiated). Funding mode decides what "stop" means:
 * - `buildout`: freeze it — flag `cancelled` so the `programs` submodel stops charging upkeep and
 *   advancing capacity, but the already-installed capacity keeps delivering its benefit.
 * - `recurring`: end it — drop the enactment and its ongoing effects (upkeep and benefit both stop).
 * - `one-time`: ignored (already paid, permanent — nothing ongoing to stop).
 */
export function applyCancellations(state: WorldState, cancellations: PolicySelection[]): void {
  for (const { policyId, regionId } of cancellations) {
    const policy = getPolicy(policyId);
    if (!policy) continue;
    if (policy.funding === 'buildout') {
      const e = state.enactments.find((x) => x.policyId === policyId && x.regionId === regionId);
      if (e) e.cancelled = true;
    } else if (policy.funding === 'recurring') {
      // Reverse any flat level-shift the enactment baked into the region before dropping it, so the
      // metric returns to its no-policy line (only the Carbon Tax sets `carbonSupportApplied`).
      const e = state.enactments.find((x) => x.policyId === policyId && x.regionId === regionId);
      if (e?.carbonSupportApplied) {
        const region = state.regions.find((r) => r.id === regionId);
        if (region) region.publicSupport = clamp(region.publicSupport - e.carbonSupportApplied, 0, 100);
      }
      state.enactments = state.enactments.filter((x) => !(x.policyId === policyId && x.regionId === regionId));
      state.activeEffects = state.activeEffects.filter((x) => !(x.policyId === policyId && x.regionId === regionId));
    }
    // one-time: no-op
  }
}

const CLAMPED_TARGETS: ReadonlySet<EffectTarget> = new Set([
  'biodiversityIndex', 'publicSupport', 'equityIndex',
  'waterAvailability', 'landAvailability', 'educationIndex', 'healthIndex',
]);

// Generation-share targets add into `generationMix`; the generationMix submodel rebalances Σ=1
// and derives grid intensity. (Grid intensity itself is never a target.)
const SHARE_TARGET_SOURCE: Partial<Record<EffectTarget, GenerationSource>> = {
  windShare: 'wind', solarShare: 'solar', nuclearShare: 'nuclear',
};

// Region fields a non-share effect target may write (everything except the share targets).
type RegionNumericTarget = Exclude<EffectTarget, 'windShare' | 'solarShare' | 'nuclearShare'>;

export function applyToRegion(region: Region, target: EffectTarget, delta: number): void {
  const source = SHARE_TARGET_SOURCE[target];
  if (source) {
    region.generationMix[source] += delta;
    return;
  }
  const field = target as RegionNumericTarget;
  const next = region[field] + delta;
  region[field] = CLAMPED_TARGETS.has(target) ? clamp(next, 0, 100) : next;
}

function buildoutBaseline(state: WorldState, policy: ReturnType<typeof getPolicy>, regionId: string): number {
  if (policy?.conversion) return 0; // fossil-replacement starts at zero converted
  const spec = policy?.buildout;
  if (!spec) return 1; // non-buildout: fully "installed" immediately
  return spec.baselineByRegion?.[regionId] ?? spec.defaultBaseline ?? 0;
}

/**
 * Enact each selection in its region: for one-time policies, deduct the GDP-scaled
 * money now. Seed an `Enactment`, apply/queue effects, and return this turn's immediate
 * effects. Recurring/buildout money and buildout ramped effects are handled by the
 * `programs` submodel.
 */
export function spendAndRegister(state: WorldState, selections: PolicySelection[]): ActiveEffect[] {
  const immediate: ActiveEffect[] = [];
  for (const { policyId, regionId } of selections) {
    const policy = getPolicy(policyId);
    if (!policy) continue; // precondition: advanceTurn validates the selection first

    if (policy.funding === 'one-time') {
      state.resources.money -= regionCharge(state, policy, regionId);
    }

    const capacity = buildoutBaseline(state, policy, regionId);
    const enactment: Enactment = {
      policyId, regionId, capacity,
      complete: policy.funding === 'one-time' || (policy.funding === 'buildout' && capacity >= 1),
    };
    if (policy.conversion) enactment.convertedShare = 0;
    state.enactments.push(enactment);

    for (const effect of policy.effects) {
      // Buildout ongoing effects ramp with capacity in the programs submodel; skip them here.
      if (effect.duration === 'ongoing' && policy.funding === 'buildout') continue;
      const entry: ActiveEffect = {
        policyId, regionId, effect,
        turnsRemaining: effect.turns ?? Number.POSITIVE_INFINITY,
      };
      if (effect.duration === 'immediate') immediate.push(entry);
      else state.activeEffects.push(entry);
    }
  }
  return immediate;
}

/** Apply this turn's immediate effects plus all active ongoing effects; tick + expire ongoing. */
export function applyEffects(state: WorldState, immediate: ActiveEffect[]): void {
  const apply = (entry: ActiveEffect): void => {
    const targets = entry.regionId === null
      ? state.regions
      : state.regions.filter((r) => r.id === entry.regionId);
    for (const region of targets) applyToRegion(region, entry.effect.target, entry.effect.delta);
  };

  for (const entry of immediate) apply(entry);

  for (const entry of state.activeEffects) {
    apply(entry);
    entry.turnsRemaining -= 1;
  }
  state.activeEffects = state.activeEffects.filter((e) => e.turnsRemaining > 0);
}
