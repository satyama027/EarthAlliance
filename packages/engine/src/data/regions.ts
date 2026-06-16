import type { Region } from '../types.js';

// Per-region ~2025 data. ALL emission figures — `regionalEmissions` and the six per-source
// fields — are in **Gt CO₂/yr** (gigatonnes of CO₂ per year). The six sources sum to
// `regionalEmissions` (the calibrated real territorial total); their split reflects each
// region's sectoral profile (e.g. China =
// industry+coal-power heavy; Latin America / SE Asia = land-use + agriculture heavy; cleaner
// hydro grids in Latin America). `generationMix` is each region's real
// ~2024 electricity generation split (Ember / EIA / IEA / energy.gov.au), built from its dominant
// economies (e.g. East Asia = China+Japan+Korea), with biomass folded proportionally into the
// other renewables. `gridCarbonIntensity` is DERIVED from the mix (Σ share × emission factor,
// coal = 1.0) — it is no longer a policy lever. `electricityDemand` is then set so
// `electricityDemand × gridCarbonIntensity = electricity` (the real territorial electricity CO₂
// is preserved; demand is in coal-equivalent reference units). Real 2024 demand for sanity:
// East Asia ≈ 11,600 TWh > NA ≈ 5,300 > Europe ≈ 3,300 > Latin America ≈ 1,500 >
// MENA ≈ Russia ≈ 1,400 > SE Asia ≈ 1,100 > Sub-Saharan Africa ≈ 450 > Oceania ≈ 290.
// `agriculturalProductivity` starts at the 100 baseline; grid storage is nascent (≈ 0).
export const SAMPLE_REGIONS: readonly Region[] = [
  {
    id: 'north-america', name: 'North America',
    population: 5.2e8, educationIndex: 86, healthIndex: 88, medianAge: 37,
    fertilityRate: 1.6, gdpPerCapita: 65000, publicSupport: 58, equityIndex: 59,
    biodiversityIndex: 58, regionalEmissions: 5.9, waterAvailability: 70,
    landAvailability: 75, lat: 40, lon: -100,
    electricity: 2.24, transport: 1.65, aviationShipping: 0.41, industry: 1.18,
    agriculture: 0.30, landUse: 0.12,
    generationMix: { coal: 0.13, gas: 0.41, oil: 0.01, nuclear: 0.16, hydro: 0.14, wind: 0.08, solar: 0.06, geothermal: 0.01 },
    gridCarbonIntensity: 0.3215, electricityDemand: 6.9673,
    agriculturalProductivity: 100, energyStorageCapacity: 0.04,
  },
  {
    id: 'europe', name: 'Europe',
    population: 6.0e8, educationIndex: 86, healthIndex: 92, medianAge: 43,
    fertilityRate: 1.5, gdpPerCapita: 40000, publicSupport: 70, equityIndex: 69,
    biodiversityIndex: 48, regionalEmissions: 3.2, waterAvailability: 70,
    landAvailability: 60, lat: 50, lon: 10,
    electricity: 0.96, transport: 0.90, aviationShipping: 0.32, industry: 0.70,
    agriculture: 0.26, landUse: 0.06,
    generationMix: { coal: 0.11, gas: 0.17, oil: 0.01, nuclear: 0.23, hydro: 0.16, wind: 0.20, solar: 0.11, geothermal: 0.01 },
    gridCarbonIntensity: 0.1935, electricityDemand: 4.9612,
    agriculturalProductivity: 100, energyStorageCapacity: 0.05,
  },
  {
    id: 'sub-saharan-africa', name: 'Sub-Saharan Africa',
    population: 1.25e9, educationIndex: 45, healthIndex: 63, medianAge: 19,
    fertilityRate: 4.3, gdpPerCapita: 1800, publicSupport: 62, equityIndex: 52,
    biodiversityIndex: 68, regionalEmissions: 1.0, waterAvailability: 58,
    landAvailability: 78, lat: 0, lon: 20,
    electricity: 0.20, transport: 0.18, aviationShipping: 0.04, industry: 0.13,
    agriculture: 0.25, landUse: 0.20,
    generationMix: { coal: 0.35, gas: 0.30, oil: 0.05, nuclear: 0.02, hydro: 0.23, wind: 0.02, solar: 0.03, geothermal: 0.00 },
    gridCarbonIntensity: 0.52, electricityDemand: 0.3846,
    agriculturalProductivity: 100, energyStorageCapacity: 0.01,
  },
  {
    id: 'south-asia', name: 'South Asia',
    population: 1.97e9, educationIndex: 53, healthIndex: 77, medianAge: 28,
    fertilityRate: 2.3, gdpPerCapita: 2700, publicSupport: 62, equityIndex: 64,
    biodiversityIndex: 42, regionalEmissions: 3.2, waterAvailability: 42,
    landAvailability: 45, lat: 22, lon: 78,
    electricity: 1.34, transport: 0.45, aviationShipping: 0.10, industry: 0.70,
    agriculture: 0.51, landUse: 0.10,
    generationMix: { coal: 0.70, gas: 0.03, oil: 0.01, nuclear: 0.03, hydro: 0.09, wind: 0.05, solar: 0.09, geothermal: 0.00 },
    gridCarbonIntensity: 0.7205, electricityDemand: 1.8598,
    agriculturalProductivity: 100, energyStorageCapacity: 0.01,
  },
  {
    id: 'east-asia', name: 'East Asia',
    population: 1.64e9, educationIndex: 70, healthIndex: 89, medianAge: 40,
    fertilityRate: 1.1, gdpPerCapita: 15000, publicSupport: 58, equityIndex: 63,
    biodiversityIndex: 45, regionalEmissions: 13.3, waterAvailability: 52,
    landAvailability: 48, lat: 35, lon: 110,
    electricity: 5.99, transport: 1.33, aviationShipping: 0.40, industry: 4.65,
    agriculture: 0.66, landUse: 0.27,
    generationMix: { coal: 0.54, gas: 0.07, oil: 0.01, nuclear: 0.06, hydro: 0.13, wind: 0.09, solar: 0.09, geothermal: 0.01 },
    gridCarbonIntensity: 0.5785, electricityDemand: 10.3544,
    agriculturalProductivity: 100, energyStorageCapacity: 0.05,
  },
  {
    id: 'latin-america', name: 'Latin America',
    population: 5.45e8, educationIndex: 70, healthIndex: 85, medianAge: 31,
    fertilityRate: 1.8, gdpPerCapita: 9500, publicSupport: 68, equityIndex: 50,
    biodiversityIndex: 70, regionalEmissions: 1.4, waterAvailability: 80,
    landAvailability: 80, lat: -15, lon: -60,
    electricity: 0.25, transport: 0.31, aviationShipping: 0.07, industry: 0.21,
    agriculture: 0.28, landUse: 0.28,
    generationMix: { coal: 0.04, gas: 0.24, oil: 0.05, nuclear: 0.02, hydro: 0.49, wind: 0.10, solar: 0.05, geothermal: 0.01 },
    gridCarbonIntensity: 0.183, electricityDemand: 1.3661,
    agriculturalProductivity: 100, energyStorageCapacity: 0.02,
  },
  {
    id: 'russia-central-asia', name: 'Russia & Central Asia',
    population: 2.45e8, educationIndex: 80, healthIndex: 80, medianAge: 35,
    fertilityRate: 1.9, gdpPerCapita: 12000, publicSupport: 45, equityIndex: 63,
    biodiversityIndex: 70, regionalEmissions: 2.4, waterAvailability: 68,
    landAvailability: 78, lat: 60, lon: 90,
    electricity: 0.96, transport: 0.36, aviationShipping: 0.10, industry: 0.72,
    agriculture: 0.19, landUse: 0.07,
    generationMix: { coal: 0.24, gas: 0.42, oil: 0.01, nuclear: 0.16, hydro: 0.15, wind: 0.01, solar: 0.01, geothermal: 0.00 },
    gridCarbonIntensity: 0.436, electricityDemand: 2.2018,
    agriculturalProductivity: 100, energyStorageCapacity: 0.01,
  },
  {
    id: 'mena', name: 'MENA',
    population: 5.3e8, educationIndex: 62, healthIndex: 80, medianAge: 27,
    fertilityRate: 2.8, gdpPerCapita: 8000, publicSupport: 55, equityIndex: 58,
    biodiversityIndex: 40, regionalEmissions: 2.8, waterAvailability: 22,
    landAvailability: 28, lat: 27, lon: 30,
    electricity: 1.26, transport: 0.56, aviationShipping: 0.17, industry: 0.70,
    agriculture: 0.08, landUse: 0.03,
    generationMix: { coal: 0.03, gas: 0.68, oil: 0.22, nuclear: 0.01, hydro: 0.02, wind: 0.01, solar: 0.03, geothermal: 0.00 },
    gridCarbonIntensity: 0.49, electricityDemand: 2.5714,
    agriculturalProductivity: 100, energyStorageCapacity: 0.01,
  },
  {
    id: 'southeast-asia', name: 'Southeast Asia',
    population: 6.9e8, educationIndex: 65, healthIndex: 80, medianAge: 30,
    fertilityRate: 2.0, gdpPerCapita: 5500, publicSupport: 65, equityIndex: 60,
    biodiversityIndex: 62, regionalEmissions: 1.8, waterAvailability: 72,
    landAvailability: 58, lat: 5, lon: 110,
    electricity: 0.54, transport: 0.32, aviationShipping: 0.09, industry: 0.31,
    agriculture: 0.22, landUse: 0.32,
    generationMix: { coal: 0.43, gas: 0.21, oil: 0.02, nuclear: 0.00, hydro: 0.20, wind: 0.01, solar: 0.05, geothermal: 0.08 },
    gridCarbonIntensity: 0.5385, electricityDemand: 1.0028,
    agriculturalProductivity: 100, energyStorageCapacity: 0.01,
  },
  {
    id: 'oceania', name: 'Oceania',
    population: 4.5e7, educationIndex: 82, healthIndex: 84, medianAge: 37,
    fertilityRate: 1.8, gdpPerCapita: 46000, publicSupport: 60, equityIndex: 62,
    biodiversityIndex: 70, regionalEmissions: 0.5, waterAvailability: 60,
    landAvailability: 70, lat: -25, lon: 135,
    electricity: 0.19, transport: 0.10, aviationShipping: 0.04, industry: 0.06,
    agriculture: 0.09, landUse: 0.02,
    generationMix: { coal: 0.42, gas: 0.16, oil: 0.01, nuclear: 0.00, hydro: 0.08, wind: 0.11, solar: 0.18, geothermal: 0.04 },
    gridCarbonIntensity: 0.499, electricityDemand: 0.3808,
    agriculturalProductivity: 100, energyStorageCapacity: 0.03,
  },
];
