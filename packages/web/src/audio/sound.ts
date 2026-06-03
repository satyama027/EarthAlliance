import type { GameEvent } from '@earth-alliance/engine';

export interface Tone {
  frequency: number; // Hz
  durationMs: number;
  type: OscillatorType;
}

/** Map a game event to a short tone, or null if it has no sound. */
export function eventToSound(event: GameEvent): Tone | null {
  switch (event.type) {
    case 'turn-advanced':
      return { frequency: 440, durationMs: 140, type: 'sine' };
    case 'disaster':
      return { frequency: 120, durationMs: 300, type: 'sawtooth' };
    case 'milestone':
      return { frequency: 660, durationMs: 200, type: 'triangle' };
    default:
      return null;
  }
}
