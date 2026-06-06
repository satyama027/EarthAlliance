import type { GameEvent, TurnDiagnostics, WorldState } from './types.js';
import type { ModelParams, SubModel } from './models/types.js';
import { createScratch } from './models/types.js';
import { DEFAULT_MODELS } from './models/pipeline.js';
import { DEFAULT_PARAMS } from './data/scenario.js';
import { createRng } from './rng.js';
import { spendAndRegister, applyEffects } from './effects.js';
import { validateSelection } from './policies.js';
import { evaluateEnding } from './endings.js';

export interface AdvanceResult {
  state: WorldState;
  events: GameEvent[];
  diagnostics: TurnDiagnostics;
}

export interface Simulation {
  advanceTurn(state: WorldState, policyIds: string[]): AdvanceResult;
}

export function createSimulation(
  models: readonly SubModel[] = DEFAULT_MODELS,
  params: ModelParams = DEFAULT_PARAMS,
): Simulation {
  return {
    advanceTurn(state, policyIds) {
      if (state.status === 'ended') {
        throw new Error('Cannot advance a game that has already ended');
      }

      const validation = validateSelection(state, policyIds);
      if (!validation.ok) throw new Error(validation.reason ?? 'Invalid policy selection');

      const draft: WorldState = structuredClone(state);
      const events: GameEvent[] = [];

      // 1–2: spend + register effects (immediate applied after the natural models).
      const immediate = spendAndRegister(draft, policyIds);

      // 3–12: run the swappable world-model pipeline.
      const rng = createRng(draft.rngSeed);
      const ctx = { state: draft, params, rng, scratch: createScratch() };
      for (const model of models) model.step(ctx);

      // 13: layer policy effects on top of the natural dynamics.
      applyEffects(draft, immediate);

      // 14: annual emissions are always derived from regional emissions.
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
        decarbFactor: scratch.decarbFactor,
        avgSupport: scratch.avgSupport,
        worldPopulation: scratch.worldPopulation,
        worldGdp: scratch.worldGdp,
        capitalGain: scratch.capitalGain,
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
      };

      return { state: draft, events, diagnostics };
    },
  };
}

const defaultSimulation = createSimulation();

export function advanceTurn(state: WorldState, policyIds: string[]): AdvanceResult {
  return defaultSimulation.advanceTurn(state, policyIds);
}
