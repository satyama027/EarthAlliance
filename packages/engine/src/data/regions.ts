import type { Region } from '../types.js';

export const SAMPLE_REGIONS: readonly Region[] = [
  {
    id: 'north-america', name: 'North America',
    population: 5.2e8, educationIndex: 86, healthIndex: 88, medianAge: 37,
    fertilityRate: 1.6, gdpPerCapita: 65000, publicSupport: 58, equityIndex: 59,
    biodiversityIndex: 58, regionalEmissions: 5.9, waterAvailability: 70,
    landAvailability: 75, lat: 40, lon: -100,
  },
  {
    id: 'europe', name: 'Europe',
    population: 6.0e8, educationIndex: 86, healthIndex: 92, medianAge: 43,
    fertilityRate: 1.5, gdpPerCapita: 40000, publicSupport: 70, equityIndex: 69,
    biodiversityIndex: 48, regionalEmissions: 3.2, waterAvailability: 70,
    landAvailability: 60, lat: 50, lon: 10,
  },
  {
    id: 'sub-saharan-africa', name: 'Sub-Saharan Africa',
    population: 1.25e9, educationIndex: 45, healthIndex: 63, medianAge: 19,
    fertilityRate: 4.3, gdpPerCapita: 1800, publicSupport: 62, equityIndex: 52,
    biodiversityIndex: 68, regionalEmissions: 1.0, waterAvailability: 58,
    landAvailability: 78, lat: 0, lon: 20,
  },
  {
    id: 'south-asia', name: 'South Asia',
    population: 1.97e9, educationIndex: 53, healthIndex: 77, medianAge: 28,
    fertilityRate: 2.3, gdpPerCapita: 2700, publicSupport: 62, equityIndex: 64,
    biodiversityIndex: 42, regionalEmissions: 3.2, waterAvailability: 42,
    landAvailability: 45, lat: 22, lon: 78,
  },
  {
    id: 'east-asia', name: 'East Asia',
    population: 1.64e9, educationIndex: 70, healthIndex: 89, medianAge: 40,
    fertilityRate: 1.1, gdpPerCapita: 15000, publicSupport: 58, equityIndex: 63,
    biodiversityIndex: 45, regionalEmissions: 13.3, waterAvailability: 52,
    landAvailability: 48, lat: 35, lon: 110,
  },
  {
    id: 'latin-america', name: 'Latin America',
    population: 5.45e8, educationIndex: 70, healthIndex: 85, medianAge: 31,
    fertilityRate: 1.8, gdpPerCapita: 9500, publicSupport: 68, equityIndex: 50,
    biodiversityIndex: 70, regionalEmissions: 1.4, waterAvailability: 80,
    landAvailability: 80, lat: -15, lon: -60,
  },
  {
    id: 'russia-central-asia', name: 'Russia & Central Asia',
    population: 2.45e8, educationIndex: 80, healthIndex: 80, medianAge: 35,
    fertilityRate: 1.9, gdpPerCapita: 12000, publicSupport: 45, equityIndex: 63,
    biodiversityIndex: 70, regionalEmissions: 2.4, waterAvailability: 68,
    landAvailability: 78, lat: 60, lon: 90,
  },
  {
    id: 'mena', name: 'MENA',
    population: 5.3e8, educationIndex: 62, healthIndex: 80, medianAge: 27,
    fertilityRate: 2.8, gdpPerCapita: 8000, publicSupport: 55, equityIndex: 58,
    biodiversityIndex: 40, regionalEmissions: 2.8, waterAvailability: 22,
    landAvailability: 28, lat: 27, lon: 30,
  },
  {
    id: 'southeast-asia', name: 'Southeast Asia',
    population: 6.9e8, educationIndex: 65, healthIndex: 80, medianAge: 30,
    fertilityRate: 2.0, gdpPerCapita: 5500, publicSupport: 65, equityIndex: 60,
    biodiversityIndex: 62, regionalEmissions: 1.8, waterAvailability: 72,
    landAvailability: 58, lat: 5, lon: 110,
  },
  {
    id: 'oceania', name: 'Oceania',
    population: 4.5e7, educationIndex: 82, healthIndex: 84, medianAge: 37,
    fertilityRate: 1.8, gdpPerCapita: 46000, publicSupport: 60, equityIndex: 62,
    biodiversityIndex: 70, regionalEmissions: 0.5, waterAvailability: 60,
    landAvailability: 70, lat: -25, lon: 135,
  },
];
