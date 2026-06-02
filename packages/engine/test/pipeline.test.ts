import { describe, it, expect } from 'vitest';
import { DEFAULT_MODELS } from '../src/models/pipeline.js';

describe('DEFAULT_MODELS', () => {
  it('runs the ten sub-models in the documented order', () => {
    expect(DEFAULT_MODELS.map((m) => m.id)).toEqual([
      'carbonCycle', 'climate', 'damage', 'economy', 'demography',
      'emissions', 'constraints', 'biodiversity', 'support', 'resources',
    ]);
  });
});
