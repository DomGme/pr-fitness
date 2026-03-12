import { describe, it, expect } from 'vitest';
import { formatPrompt, formatDailyChoice } from '../src/tones.js';

describe('tones', () => {
  it('formats minimal prompt for reps', () => {
    const result = formatPrompt('minimal', 'push-ups', 10, 'reps');
    expect(result).toBe('Push-ups (10) — How many did you do?');
  });

  it('formats minimal prompt for seconds', () => {
    const result = formatPrompt('minimal', 'plank', 20, 'seconds');
    expect(result).toBe('Plank (20s) — How many seconds did you hold?');
  });

  it('formats encouraging prompt for reps', () => {
    const result = formatPrompt('encouraging', 'push-ups', 10, 'reps');
    expect(result).toBe('Nice PR! Time for 10 push-ups — you\'ve got this! How many did you get?');
  });

  it('formats encouraging prompt for seconds', () => {
    const result = formatPrompt('encouraging', 'plank', 20, 'seconds');
    expect(result).toBe('Nice PR! Time for a 20s plank — you\'ve got this! How many seconds did you hold?');
  });

  it('formats daily choice prompt', () => {
    const exercises = [
      { name: 'push-ups', unit: 'reps', min: 5, max: 15 },
      { name: 'sit-ups', unit: 'reps', min: 10, max: 20 },
    ];
    const result = formatDailyChoice(exercises);
    expect(result).toContain('Pick your exercise for today');
    expect(result).toContain('1. Random');
    expect(result).toContain('2. Push-ups');
    expect(result).toContain('3. Sit-ups');
    expect(result).toContain('Random');
  });

  it('defaults to minimal for unknown tone', () => {
    const result = formatPrompt('unknown', 'push-ups', 10, 'reps');
    expect(result).toBe('Push-ups (10) — How many did you do?');
  });
});
