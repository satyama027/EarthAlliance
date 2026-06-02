import type { ActiveEffect, EffectTarget, Region, WorldState } from './types.js';
import { clamp } from './math.js';
import { getPolicy } from './policies.js';

const CLAMPED_TARGETS: ReadonlySet<EffectTarget> = new Set([
  'biodiversityIndex', 'publicSupport', 'equityIndex',
  'waterAvailability', 'landAvailability', 'educationIndex', 'healthIndex',
]);

function applyToRegion(region: Region, target: EffectTarget, delta: number): void {
  const next = region[target] + delta;
  region[target] = CLAMPED_TARGETS.has(target) ? clamp(next, 0, 100) : next;
}

/** Deduct cost, record enacted policies, queue ongoing effects; return this turn's immediate effects. */
export function spendAndRegister(state: WorldState, policyIds: string[]): ActiveEffect[] {
  const immediate: ActiveEffect[] = [];
  for (const id of policyIds) {
    const policy = getPolicy(id);
    if (!policy) continue;
    state.resources.politicalCapital -= policy.cost.politicalCapital;
    state.resources.money -= policy.cost.money;
    state.enactedPolicyIds.push(id);
    for (const effect of policy.effects) {
      const entry: ActiveEffect = {
        policyId: id,
        regionId: policy.scope === 'global' ? null : state.regions[0]!.id,
        effect,
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
