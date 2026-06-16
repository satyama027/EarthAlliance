import {
  POLICY_CATALOG, isEnacted, validateSelection, regionCharge,
  type Policy, type PolicySelection, type WorldState, type Enactment,
} from '@earth-alliance/engine';

/** Visual state of a policy card within the selected region's board. */
export type CardState =
  | 'available'  // enactable here (Available lane)
  | 'locked'     // prerequisite not enacted here (Available lane, disabled)
  | 'staged'     // staged to enact this turn (Active lane, removable)
  | 'building'   // committed buildout in progress (Active lane, cancellable)
  | 'built'      // committed buildout at 100% (Active lane; upkeep already 0)
  | 'recurring'  // committed recurring fund (Active lane, cancellable)
  | 'permanent'  // committed one-time policy (Active lane, not cancellable)
  | 'frozen';    // buildout cancelled in a prior turn (Active lane, frozen)

export interface CardVM {
  policy: Policy;
  lane: 'available' | 'active';
  state: CardState;
  capacity?: number;     // 0–1 for buildout cards
  moneyCharge: number;   // GDP-scaled money for this region
  perTurn: boolean;      // true => "/turn", false => "once"
  affordable: boolean;   // (Available) can be staged given what's already staged
  cancellable: boolean;  // (Active) can be removed/cancelled
  cancelling: boolean;   // (Active) marked for cancel this turn
}

export interface RegionPolicyView {
  available: CardVM[];
  active: CardVM[];
}

function baselineCapacity(policy: Policy, regionId: string): number {
  const b = policy.buildout;
  if (!b) return 1;
  return b.baselineByRegion?.[regionId] ?? b.defaultBaseline ?? 0;
}

const has = (list: PolicySelection[], policyId: string, regionId: string): boolean =>
  list.some((s) => s.policyId === policyId && s.regionId === regionId);

/** Build the Available / Active lanes for one region, given this turn's staged + cancelled selections. */
export function regionPolicyView(
  state: WorldState,
  regionId: string,
  staged: PolicySelection[],
  cancels: PolicySelection[],
): RegionPolicyView {
  const committed = new Map(
    state.enactments.filter((e) => e.regionId === regionId).map((e) => [e.policyId, e] as const),
  );
  const available: CardVM[] = [];
  const active: CardVM[] = [];

  for (const policy of POLICY_CATALOG) {
    const perTurn = policy.funding !== 'one-time';
    const moneyCharge = regionCharge(state, policy, regionId);
    const enactment: Enactment | undefined = committed.get(policy.id);
    const stagedHere = has(staged, policy.id, regionId);

    if (enactment) {
      let cardState: CardState;
      if (enactment.cancelled) cardState = 'frozen';
      else if (policy.funding === 'one-time') cardState = 'permanent';
      else if (policy.funding === 'recurring') cardState = 'recurring';
      else cardState = enactment.complete ? 'built' : 'building';
      // Only *ongoing* policies stay on the board: an in-progress buildout or a recurring fund.
      // Completed buildouts/conversions, one-time 'permanent' policies, and frozen (cancelled)
      // buildouts are dropped from the Active lane — they remain enacted in engine state (their
      // effects persist), they just no longer need a card. Such cards never re-appear in
      // Available either (they are already enacted), so they simply leave the board.
      const ongoing = cardState === 'building' || cardState === 'recurring';
      if (ongoing) {
        active.push({
          policy, lane: 'active', state: cardState,
          capacity: policy.funding === 'buildout' ? enactment.capacity : undefined,
          moneyCharge, perTurn, affordable: true, cancellable: true,
          cancelling: has(cancels, policy.id, regionId),
        });
      }
    } else if (stagedHere) {
      active.push({
        policy, lane: 'active', state: 'staged',
        capacity: policy.funding === 'buildout' ? baselineCapacity(policy, regionId) : undefined,
        moneyCharge, perTurn, affordable: true, cancellable: true, cancelling: false,
      });
    } else {
      const prereqMet = (policy.prerequisites ?? []).every((req) => isEnacted(state, req, regionId));
      if (!prereqMet) {
        available.push({ policy, lane: 'available', state: 'locked', moneyCharge, perTurn,
          affordable: false, cancellable: false, cancelling: false });
      } else {
        const affordable = validateSelection(state, [...staged, { policyId: policy.id, regionId }]).ok;
        available.push({ policy, lane: 'available', state: 'available', moneyCharge, perTurn,
          affordable, cancellable: false, cancelling: false });
      }
    }
  }
  return { available, active };
}

/**
 * Money the player commits *this turn* across all regions. Every funding mode spends money on its
 * enactment turn — one-time at enactment, recurring/buildout as their first upkeep (the `programs`
 * submodel charges it the same turn) — so all staged policies' GDP-scaled `regionCharge` counts here.
 * Mirrors the engine's `validateSelection` money gate so the ResourceBar and End-Turn stay consistent.
 */
export function stagedCostNow(state: WorldState, staged: PolicySelection[]): { money: number } {
  let money = 0;
  for (const { policyId, regionId } of staged) {
    const policy = POLICY_CATALOG.find((p) => p.id === policyId);
    if (!policy) continue;
    money += regionCharge(state, policy, regionId);
  }
  return { money };
}

/** Estimated recurring/buildout upkeep that will be charged next turn, across all regions. */
export function upkeepNextTurn(state: WorldState, staged: PolicySelection[], cancels: PolicySelection[]): number {
  let total = 0;
  const cancelled = (policyId: string, regionId: string) => has(cancels, policyId, regionId);
  for (const e of state.enactments) {
    if (e.cancelled) continue;
    const policy = POLICY_CATALOG.find((p) => p.id === e.policyId);
    if (!policy || policy.funding === 'one-time') continue;
    if (cancelled(e.policyId, e.regionId)) continue;             // will be stopped this turn
    if (policy.funding === 'buildout' && e.complete) continue;    // built => $0
    total += regionCharge(state, policy, e.regionId);
  }
  for (const { policyId, regionId } of staged) {
    const policy = POLICY_CATALOG.find((p) => p.id === policyId);
    if (!policy || policy.funding === 'one-time') continue;
    total += regionCharge(state, policy, regionId);
  }
  return total;
}
