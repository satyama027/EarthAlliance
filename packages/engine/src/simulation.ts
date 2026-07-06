import type { GameEvent, PolicySelection, TurnDiagnostics, WorldState } from './types.js';
import type { ModelParams, SubModel } from './models/types.js';
import { createScratch } from './models/types.js';
import { DEFAULT_MODELS } from './models/pipeline.js';
import { DEFAULT_PARAMS } from './data/scenario.js';
import { createRng } from './rng.js';
import { clamp } from './math.js';
import { spendAndRegister, applyEffects, applyCancellations } from './effects.js';
import { validateSelection } from './policies.js';
import { evaluateEnding } from './endings.js';

export interface AdvanceResult {
  state: WorldState;
  events: GameEvent[];
  diagnostics: TurnDiagnostics;
}

export interface Simulation {
  advanceTurn(state: WorldState, selections: PolicySelection[], cancellations?: PolicySelection[]): AdvanceResult;
}

export function createSimulation(
  models: readonly SubModel[] = DEFAULT_MODELS,
  params: ModelParams = DEFAULT_PARAMS,
): Simulation {
  return {
    advanceTurn(state, selections, cancellations = []) {
      if (state.status === 'ended') {
        throw new Error('Cannot advance a game that has already ended');
      }

      const validation = validateSelection(state, selections);
      if (!validation.ok) throw new Error(validation.reason ?? 'Invalid policy selection');

      const draft: WorldState = structuredClone(state);
      const events: GameEvent[] = [];

      // 1–2: stop cancelled programs, then spend + register new effects (immediate applied after the natural models).
      applyCancellations(draft, cancellations);
      const immediate = spendAndRegister(draft, selections);

      // 3–12: run the swappable world-model pipeline.
      const rng = createRng(draft.rngSeed);
      const ctx = { state: draft, params, rng, scratch: createScratch() };
      for (const model of models) model.step(ctx);

      // 13: layer policy effects on top of the natural dynamics.
      applyEffects(draft, immediate);

      // 14: finalize emissions. First clamp the coupling stocks policies moved this turn to
      // their valid ranges. Electricity is then derived LAST (after policy moved demand & grid
      // intensity); regionalEmissions is the derived sum of the six sources; annual emissions is
      // the sum across regions. landUse may be negative (a sink), so the regional total — and
      // the global total — may go net-negative.
      for (const r of draft.regions) {
        r.gridCarbonIntensity = clamp(r.gridCarbonIntensity, 0, 1);
        r.energyStorageCapacity = clamp(r.energyStorageCapacity, 0, 1);
        r.electricityDemand = Math.max(0, r.electricityDemand);
        r.agriculturalProductivity = Math.max(0, r.agriculturalProductivity);
        // A sector cannot emit negative, so clamp the activity sources at 0. Only `landUse`
        // may go negative (a forest carbon sink) — it is the sole route to net-negative.
        r.transport = Math.max(0, r.transport);
        r.industry = Math.max(0, r.industry);
        r.agriculture = Math.max(0, r.agriculture);
        // Aviation/shipping cannot be policy-driven below its hard-to-abate floor for the turn.
        r.aviationShipping = Math.max(r.aviationShipping, ctx.scratch.aviationFloorByRegion[r.id] ?? 0);
        r.electricity = r.electricityDemand * r.gridCarbonIntensity;
        r.regionalEmissions =
          r.electricity + r.transport + r.aviationShipping + r.industry + r.agriculture + r.landUse;
      }
      draft.climate.annualEmissions = draft.regions.reduce((a, r) => a + r.regionalEmissions, 0);

      // 15–16: persist RNG, advance the clock.
      draft.rngSeed = rng.seed;
      draft.turn += 1;
      draft.year += params.TURN_YEARS;
      const tick: GameEvent = {
        turn: draft.turn,
        type: 'turn-advanced',
        message: `Year ${draft.year}: +${draft.climate.temperatureAnomaly.toFixed(2)}°C`,
      };
      draft.log.push(tick);
      events.push(tick);

      // 17: endings.
      const ending = evaluateEnding(draft);
      if (ending) {
        draft.status = 'ended';
        draft.endingId = ending.id;
      }

      // Surface the intermediates the pipeline computed but the state discards.
      const { scratch } = ctx;
      const diagnostics: TurnDiagnostics = {
        damageFraction: scratch.damageFraction,
        deltaTemperature: scratch.deltaTemperature,
        growthByRegion: Object.fromEntries(
          draft.regions.map((r) => {
            const prev = scratch.prevGdpPerCapita[r.id] ?? r.gdpPerCapita;
            return [r.id, prev > 0 ? (r.gdpPerCapita - prev) / prev : 0];
          }),
        ),
        co2Ratio: scratch.co2Ratio,
        equilibriumTemp: scratch.equilibriumTemp,
        deltaPpm: scratch.deltaPpm,
        grossEmissions: scratch.grossEmissions,
        baseGrowthFactor: scratch.baseGrowthFactor,
        avgSupport: scratch.avgSupport,
        worldPopulation: scratch.worldPopulation,
        worldGdp: scratch.worldGdp,
        moneyGain: scratch.moneyGain,
        scarcityByRegion: { ...scratch.scarcityByRegion },
        constraintFactorByRegion: { ...scratch.constraintFactorByRegion },
        outputRatioByRegion: { ...scratch.outputRatioByRegion },
        popGrowthByRegion: { ...scratch.popGrowthByRegion },
        waterLossByRegion: { ...scratch.waterLossByRegion },
        landLossByRegion: { ...scratch.landLossByRegion },
        bioLossByRegion: { ...scratch.bioLossByRegion },
        supportTempTermByRegion: { ...scratch.supportTempTermByRegion },
        supportEconTermByRegion: { ...scratch.supportEconTermByRegion },
        supportEquityTermByRegion: { ...scratch.supportEquityTermByRegion },
        equityDriftByRegion: { ...scratch.equityDriftByRegion },
        programSpendByRegion: { ...scratch.programSpendByRegion },
        capacityByRegionPolicy: { ...scratch.capacityByRegionPolicy },
        taxIncomeByRegion: { ...scratch.taxIncomeByRegion },
        carbonTaxRevenueByRegion: { ...scratch.carbonTaxRevenueByRegion },
      };

      return { state: draft, events, diagnostics };
    },
  };
}

const defaultSimulation = createSimulation();

export function advanceTurn(
  state: WorldState, selections: PolicySelection[], cancellations: PolicySelection[] = [],
): AdvanceResult {
  return defaultSimulation.advanceTurn(state, selections, cancellations);
}
