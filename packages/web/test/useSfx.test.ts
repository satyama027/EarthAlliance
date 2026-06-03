import { renderHook } from '@testing-library/react';
import { useSfx } from '../src/audio/useSfx.js';

// jsdom has no real AudioContext; stub a minimal one so the glue can be exercised.
class FakeOsc { type = 'sine'; frequency = { value: 0 }; connect() {} start() {} stop() {} }
class FakeGain { gain = { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} }; connect() {} }
class FakeAudioCtx {
  currentTime = 0;
  destination = {};
  createOscillator() { return new FakeOsc(); }
  createGain() { return new FakeGain(); }
}

describe('useSfx', () => {
  beforeEach(() => {
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeAudioCtx;
  });

  it('plays a tone for a known event without throwing', () => {
    const { result } = renderHook(() => useSfx());
    expect(() => result.current.playForEvent({ turn: 1, type: 'turn-advanced', message: '' })).not.toThrow();
  });

  it('ignores events with no sound', () => {
    const { result } = renderHook(() => useSfx());
    expect(() => result.current.playForEvent({ turn: 1, type: 'nope', message: '' })).not.toThrow();
  });
});
