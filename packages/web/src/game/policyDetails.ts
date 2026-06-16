import { getPolicy } from '@earth-alliance/engine';
import type { Policy, PolicyEffect, PolicyFunding, EffectTarget } from '@earth-alliance/engine';
import type { CardVM } from './policyView.js';

/** A display-ready line describing one of a policy's effects, for the detail overlay. */
export interface EffectLine {
  label: string;                          // friendly target name, e.g. "Grid carbon intensity"
  magnitude: string;                      // signed + unit, e.g. "−0.20 Gt/yr", "−$500", "+8"
  scope: string;                          // "each turn" (ongoing) | "one-time" (immediate)
  direction: 'good' | 'bad' | 'neutral';  // for ▲/▼ coloring
  note?: string;                          // extra qualifier, e.g. "scales with grid storage"
}

const TARGET_LABEL: Record<EffectTarget, string> = {
  biodiversityIndex: 'Biodiversity',
  publicSupport: 'Public support',
  equityIndex: 'Equity',
  waterAvailability: 'Water availability',
  landAvailability: 'Land availability',
  educationIndex: 'Education',
  healthIndex: 'Health',
  gdpPerCapita: 'GDP per capita',
  transport: 'Transport emissions',
  aviationShipping: 'Aviation & shipping emissions',
  industry: 'Industry emissions',
  agriculture: 'Agriculture emissions',
  landUse: 'Land-use emissions',
  windShare: 'Wind share',
  solarShare: 'Solar share',
  nuclearShare: 'Nuclear share',
  electricityDemand: 'Electricity demand',
  agriculturalProductivity: 'Crop yield',
  energyStorageCapacity: 'Grid storage',
};

/** Targets where a DECREASE is the good outcome (emissions + the demand coupling). */
const LOWER_IS_BETTER = new Set<EffectTarget>([
  'transport', 'aviationShipping', 'industry', 'agriculture', 'landUse',
  'electricityDemand',
]);

/** Per-source emission targets are flows in GtCO₂/yr. */
const GT_TARGET = new Set<EffectTarget>([
  'transport', 'aviationShipping', 'industry', 'agriculture', 'landUse',
]);

const MINUS = '−'; // U+2212 minus, matches the rest of the UI

/** Format a number without forcing decimals (8 → "8", 0.08 → "0.08", 1.5 → "1.5"). */
function num(abs: number): string {
  return Number.isInteger(abs) ? String(abs) : String(abs);
}

function magnitude(target: EffectTarget, delta: number): string {
  const sign = delta < 0 ? MINUS : '+';
  const abs = Math.abs(delta);
  if (target === 'gdpPerCapita') return `${sign}$${abs.toLocaleString('en-US')}`;
  if (GT_TARGET.has(target)) return `${sign}${abs.toFixed(2)} Gt/yr`;
  return `${sign}${num(abs)}`;
}

function direction(target: EffectTarget, delta: number): EffectLine['direction'] {
  if (delta === 0) return 'neutral';
  const positiveIsGood = !LOWER_IS_BETTER.has(target);
  const isGood = delta > 0 ? positiveIsGood : !positiveIsGood;
  return isGood ? 'good' : 'bad';
}

function toLine(effect: PolicyEffect): EffectLine {
  return {
    label: TARGET_LABEL[effect.target] ?? effect.target,
    magnitude: magnitude(effect.target, effect.delta),
    scope: effect.duration === 'ongoing' ? 'each turn' : 'one-time',
    direction: direction(effect.target, effect.delta),
    ...(effect.storageGated ? { note: 'scales with grid storage' } : {}),
  };
}

/**
 * Synthesized effect lines for policies whose mechanics live in a simulation submodel rather than
 * declared `effects` (so the detail overlay still explains what they do). EV Subsidies converts
 * road transport to electricity demand gradually via buildout capacity (see evElectrification).
 */
const SYNTHESIZED_EFFECTS: Record<string, EffectLine[]> = {
  'ev-transition': [
    { label: 'Transport emissions', magnitude: `${MINUS}falls to 0`, scope: 'each turn',
      direction: 'good', note: 'fleet electrifies as the buildout ramps' },
    { label: 'Electricity demand', magnitude: '+rises', scope: 'each turn',
      direction: 'bad', note: 'oil demand shifts to power (~35% after EV efficiency)' },
  ],
  // Renewable & nuclear are fossil-replacement conversions (see programs.ts): each turn they swap a
  // fixed slice of the dirtiest fossil for clean generation, so their effect is on the mix, not a
  // declared per-source delta.
  'renewable-subsidy': [
    { label: 'Renewable share', magnitude: '+rises', scope: 'each turn',
      direction: 'good', note: 'replaces fossil generation (dirtiest first); scales with grid storage' },
    { label: 'Grid carbon intensity', magnitude: `${MINUS}falls`, scope: 'each turn',
      direction: 'good', note: 'uncapped — can clean the grid to ~100%' },
  ],
  'nuclear-buildout': [
    { label: 'Nuclear share', magnitude: '+rises', scope: 'each turn',
      direction: 'good', note: 'replaces fossil generation; capped by the region’s uranium reserves' },
    { label: 'Grid carbon intensity', magnitude: `${MINUS}falls`, scope: 'each turn',
      direction: 'good', note: 'firm baseload — delivers in full (no storage gate)' },
  ],
};

/** Display-ready breakdown of what a policy does, one line per effect. */
export function effectLines(policy: Policy): EffectLine[] {
  if (policy.effects.length === 0 && SYNTHESIZED_EFFECTS[policy.id]) {
    return SYNTHESIZED_EFFECTS[policy.id]!;
  }
  return policy.effects.map(toLine);
}

/** One-line plain-language meaning of a funding mode (mirrors the doc in engine `types.ts`). */
export function fundingBlurb(funding: PolicyFunding): string {
  switch (funding) {
    case 'one-time':
      return 'Charged once at enactment; the effect is permanent.';
    case 'recurring':
      return 'Charged every turn while active; never completes — runs until you stop it.';
    case 'buildout':
      return 'Charged every turn until fully installed (then $0); effects ramp with installed capacity.';
  }
}

/** Honest lifespan line for the card. Recurring policies have no fixed end; others show none here. */
export function durationLine(policy: Policy): string | null {
  return policy.funding === 'recurring' ? 'Runs until cancelled' : null;
}

/** The detail-overlay action button derived from a card's lane + state. Mirrors `performPrimary`. */
export interface CardAction {
  label: string;
  kind: 'primary' | 'danger';
  disabled: boolean;
  reason?: string;
}

export function cardAction(vm: CardVM, regionName: string): CardAction {
  if (vm.lane === 'available') {
    if (vm.state === 'locked') {
      const reqId = vm.policy.prerequisites?.[0];
      const reqName = (reqId && getPolicy(reqId)?.name) ?? reqId ?? 'a prerequisite';
      return { label: `Requires ${reqName}`, kind: 'primary', disabled: true,
        reason: `Enact ${reqName} in ${regionName} first.` };
    }
    if (!vm.affordable) {
      return { label: `Enact in ${regionName}`, kind: 'primary', disabled: true,
        reason: 'Not enough money this turn.' };
    }
    return { label: `Enact in ${regionName}`, kind: 'primary', disabled: false };
  }
  // Active lane.
  if (vm.state === 'staged') return { label: 'Remove staged', kind: 'danger', disabled: false };
  if (vm.cancellable) {
    if (vm.cancelling) return { label: 'Keep running', kind: 'primary', disabled: false };
    const label = vm.policy.funding === 'buildout' ? 'Stop buildout — keeps installed %' : 'Stop funding';
    return { label, kind: 'danger', disabled: false };
  }
  // Committed but not cancellable: permanent / built / frozen.
  const label = vm.state === 'permanent' ? 'Enacted — permanent'
    : vm.state === 'built' ? 'Built — benefit persists'
      : 'Stopped';
  return { label, kind: 'primary', disabled: true };
}
