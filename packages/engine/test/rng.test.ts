import { describe, it, expect } from 'vitest';
import { createRng } from '../src/rng.js';

describe('createRng', () => {
  it('produces values in [0, 1)', () => {
    const rng = createRng(123);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
  });

  it('differs for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('exposes an advancing seed that can resume the sequence', () => {
    const a = createRng(7);
    a.next();
    a.next();
    const resumed = createRng(a.seed);
    const continued = createRng(7);
    continued.next();
    continued.next();
    expect(resumed.next()).toBe(continued.next());
  });
});
