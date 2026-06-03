import { useCallback, useRef } from 'react';
import type { GameEvent } from '@earth-alliance/engine';
import { eventToSound } from './sound.js';

type AudioCtor = typeof AudioContext;

/** Tiny assetless SFX via the Web Audio API. Swap for Howler + audio files later. */
export function useSfx() {
  const ctxRef = useRef<AudioContext | null>(null);

  const ensureCtx = useCallback((): AudioContext | null => {
    const Ctor: AudioCtor | undefined =
      (globalThis as unknown as { AudioContext?: AudioCtor }).AudioContext;
    if (!Ctor) return null;
    if (!ctxRef.current) ctxRef.current = new Ctor();
    return ctxRef.current;
  }, []);

  const playForEvent = useCallback((event: GameEvent) => {
    const tone = eventToSound(event);
    if (!tone) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type;
    osc.frequency.value = tone.frequency;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.durationMs / 1000);
    osc.start(now);
    osc.stop(now + tone.durationMs / 1000);
  }, [ensureCtx]);

  return { playForEvent };
}
