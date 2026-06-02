import { describe, it, expect } from 'vitest';
import { clamp } from '../src/math.js';

describe('clamp', () => {
  it('returns the value when inside the range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });
  it('clamps below the minimum', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });
  it('clamps above the maximum', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });
});
