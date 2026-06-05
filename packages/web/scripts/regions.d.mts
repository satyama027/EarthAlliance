// Type declarations for the plain-ESM region helpers in regions.mjs, so the
// TypeScript test suite (test/regions.test.ts) can import them under
// moduleResolution "Bundler".

export const NAME2REGION: Record<string, string>;
export function regionOf(name: string): string | null;
export const GOI_CLAIM: { type: 'Polygon'; coordinates: number[][][] };

/** Move Aksai Chin from China's geometry into a South Asia feature (GoI depiction). */
export function applyGoiCorrection<T>(features: T[]): T[];
