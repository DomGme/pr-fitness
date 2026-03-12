import { describe, it, expect } from 'vitest';
import { getDefaultExercises, getExercisesForEquipment, pickExercise, pickRepCount, getAdaptiveRepCount } from '../src/exercises.js';

describe('exercises', () => {
  it('returns 5 default exercises for no equipment', () => {
    const exercises = getDefaultExercises();
    expect(exercises).toHaveLength(5);
    expect(exercises.map(e => e.name)).toContain('push-ups');
    expect(exercises.map(e => e.name)).toContain('plank');
  });

  it('adds pull-up bar exercises when equipment includes pull-up-bar', () => {
    const exercises = getExercisesForEquipment(['pull-up-bar']);
    const names = exercises.map(e => e.name);
    expect(names).toContain('pull-ups');
    expect(names).toContain('hanging-leg-raises');
    expect(names).toContain('push-ups');
  });

  it('adds band exercises when equipment includes bands', () => {
    const exercises = getExercisesForEquipment(['bands']);
    const names = exercises.map(e => e.name);
    expect(names).toContain('band-rows');
    expect(names).toContain('band-pull-aparts');
  });

  it('adds weight exercises when equipment includes weights', () => {
    const exercises = getExercisesForEquipment(['weights']);
    const names = exercises.map(e => e.name);
    expect(names).toContain('dumbbell-curls');
    expect(names).toContain('overhead-press');
  });

  it('combines all equipment', () => {
    const exercises = getExercisesForEquipment(['pull-up-bar', 'bands', 'weights']);
    expect(exercises.length).toBe(5 + 2 + 2 + 2);
  });

  it('pickExercise returns an exercise from the list', () => {
    const exercises = getDefaultExercises();
    const picked = pickExercise(exercises);
    expect(exercises).toContainEqual(picked);
  });

  it('pickRepCount returns a number within min-max range', () => {
    const exercise = { name: 'push-ups', unit: 'reps', min: 5, max: 15 };
    for (let i = 0; i < 50; i++) {
      const count = pickRepCount(exercise);
      expect(count).toBeGreaterThanOrEqual(5);
      expect(count).toBeLessThanOrEqual(15);
    }
  });
});

describe('adaptive rep count', () => {
  const exercise = { name: 'push-ups', unit: 'reps', min: 5, max: 15 };

  it('falls back to pickRepCount with fewer than 3 log entries', () => {
    const log = [
      { date: '2026-03-11T10:00:00Z', exercise: 'push-ups', completed: 20 },
      { date: '2026-03-12T10:00:00Z', exercise: 'push-ups', completed: 20 },
    ];
    for (let i = 0; i < 20; i++) {
      const count = getAdaptiveRepCount(exercise, log);
      expect(count).toBeGreaterThanOrEqual(5);
      expect(count).toBeLessThanOrEqual(15);
    }
  });

  it('adapts to user completions with 3+ entries', () => {
    const log = [
      { date: '2026-03-10T10:00:00Z', exercise: 'push-ups', completed: 20 },
      { date: '2026-03-11T10:00:00Z', exercise: 'push-ups', completed: 20 },
      { date: '2026-03-12T10:00:00Z', exercise: 'push-ups', completed: 20 },
    ];
    for (let i = 0; i < 20; i++) {
      const count = getAdaptiveRepCount(exercise, log);
      expect(count).toBeGreaterThanOrEqual(16); // 80% of 20
      expect(count).toBeLessThanOrEqual(24);    // 120% of 20
    }
  });

  it('never assigns below exercise min', () => {
    const log = [
      { date: '2026-03-10T10:00:00Z', exercise: 'push-ups', completed: 1 },
      { date: '2026-03-11T10:00:00Z', exercise: 'push-ups', completed: 1 },
      { date: '2026-03-12T10:00:00Z', exercise: 'push-ups', completed: 1 },
    ];
    for (let i = 0; i < 20; i++) {
      const count = getAdaptiveRepCount(exercise, log);
      expect(count).toBeGreaterThanOrEqual(exercise.min);
    }
  });

  it('never assigns above 2x exercise max', () => {
    const log = [
      { date: '2026-03-10T10:00:00Z', exercise: 'push-ups', completed: 100 },
      { date: '2026-03-11T10:00:00Z', exercise: 'push-ups', completed: 100 },
      { date: '2026-03-12T10:00:00Z', exercise: 'push-ups', completed: 100 },
    ];
    for (let i = 0; i < 20; i++) {
      const count = getAdaptiveRepCount(exercise, log);
      expect(count).toBeLessThanOrEqual(exercise.max * 2);
    }
  });

  it('only uses entries for the matching exercise', () => {
    const log = [
      { date: '2026-03-10T10:00:00Z', exercise: 'squats', completed: 50 },
      { date: '2026-03-11T10:00:00Z', exercise: 'squats', completed: 50 },
      { date: '2026-03-12T10:00:00Z', exercise: 'squats', completed: 50 },
    ];
    // No push-ups entries, should fall back to defaults
    for (let i = 0; i < 20; i++) {
      const count = getAdaptiveRepCount(exercise, log);
      expect(count).toBeGreaterThanOrEqual(5);
      expect(count).toBeLessThanOrEqual(15);
    }
  });

  it('includes zero completions in the average', () => {
    const log = [
      { date: '2026-03-10T10:00:00Z', exercise: 'push-ups', completed: 0 },
      { date: '2026-03-11T10:00:00Z', exercise: 'push-ups', completed: 0 },
      { date: '2026-03-12T10:00:00Z', exercise: 'push-ups', completed: 0 },
    ];
    for (let i = 0; i < 20; i++) {
      const count = getAdaptiveRepCount(exercise, log);
      // Average is 0, 80-120% of 0 is 0, but clamped to min
      expect(count).toBe(exercise.min);
    }
  });
});
