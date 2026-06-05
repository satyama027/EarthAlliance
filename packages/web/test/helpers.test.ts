import { metricColor, temperatureColor } from '../src/scene/metricColor.js';
import { eventToSound } from '../src/audio/sound.js';

describe('metricColor', () => {
  it('is red at low values and green at high values', () => {
    expect(metricColor(5)).toMatch(/^#/);
    expect(metricColor(0)).not.toBe(metricColor(100));
  });
  it('clamps out-of-range inputs', () => {
    expect(metricColor(-50)).toBe(metricColor(0));
    expect(metricColor(150)).toBe(metricColor(100));
  });
});

describe('temperatureColor', () => {
  it('gets hotter (redder) as anomaly rises', () => {
    expect(temperatureColor(1.3)).not.toBe(temperatureColor(3.5));
  });
});

describe('eventToSound', () => {
  it('maps turn-advanced to a defined tone', () => {
    const tone = eventToSound({ turn: 1, type: 'turn-advanced', message: '' });
    expect(tone).not.toBeNull();
    expect(tone!.frequency).toBeGreaterThan(0);
    expect(tone!.durationMs).toBeGreaterThan(0);
  });
  it('returns null for unknown event types', () => {
    expect(eventToSound({ turn: 1, type: 'nope', message: '' })).toBeNull();
  });
});
