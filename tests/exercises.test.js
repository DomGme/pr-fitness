import { describe, it, expect } from 'vitest';
import { getDefaultExercises, getExercisesForEquipment, pickExercise, pickRepCount } from '../src/exercises.js';

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
