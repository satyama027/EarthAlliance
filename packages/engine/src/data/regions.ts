import type { Region } from '../types.js';

export const SAMPLE_REGIONS: readonly Region[] = [
  {
    id: 'north-america', name: 'North America',
    population: 5.0e8, educationIndex: 80, healthIndex: 78, medianAge: 38,
    fertilityRate: 1.7, gdpPerCapita: 65000, publicSupport: 55, equityIndex: 60,
    biodiversityIndex: 55, regionalEmissions: 6.0, waterAvailability: 70,
    landAvailability: 75, lat: 40, lon: -100,
  },
  {
    id: 'europe', name: 'Europe',
    population: 7.5e8, educationIndex: 82, healthIndex: 80, medianAge: 43,
    fertilityRate: 1.6, gdpPerCapita: 45000, publicSupport: 60, equityIndex: 68,
    biodiversityIndex: 50, regionalEmissions: 4.0, waterAvailability: 75,
    landAvailability: 65, lat: 50, lon: 10,
  },
  {
    id: 'sub-saharan-africa', name: 'Sub-Saharan Africa',
    population: 1.2e9, educationIndex: 45, healthIndex: 50, medianAge: 19,
    fertilityRate: 4.3, gdpPerCapita: 4000, publicSupport: 50, equityIndex: 40,
    biodiversityIndex: 70, regionalEmissions: 2.0, waterAvailability: 55,
    landAvailability: 80, lat: 0, lon: 20,
  },
  {
    id: 'south-asia', name: 'South Asia',
    population: 1.9e9, educationIndex: 55, healthIndex: 58, medianAge: 28,
    fertilityRate: 2.2, gdpPerCapita: 7000, publicSupport: 52, equityIndex: 42,
    biodiversityIndex: 45, regionalEmissions: 8.0, waterAvailability: 50,
    landAvailability: 55, lat: 22, lon: 78,
  },
  {
    id: 'east-asia', name: 'East Asia',
    population: 1.6e9, educationIndex: 75, healthIndex: 74, medianAge: 39,
    fertilityRate: 1.4, gdpPerCapita: 18000, publicSupport: 48, equityIndex: 50,
    biodiversityIndex: 40, regionalEmissions: 15.0, waterAvailability: 60,
    landAvailability: 50, lat: 35, lon: 110,
  },
];
