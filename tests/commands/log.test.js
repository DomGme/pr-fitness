import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDir, cleanTestDir } from '../helpers/test-storage.js';
import { runSetup } from '../../src/commands/setup.js';
import { recordExercise } from '../../src/commands/log.js';
import { loadData } from '../../src/storage.js';

describe('log command', () => {
  let testDir;

  beforeEach(() => {
    testDir = createTestDir();
    runSetup({ equipment: [], tone: 'minimal' }, testDir);
  });

  afterEach(() => {
    cleanTestDir(testDir);
  });

  it('records an exercise entry', () => {
    recordExercise(testDir, { exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 10, pr: null });
    const data = loadData(testDir);
    expect(data.log).toHaveLength(1);
    expect(data.log[0].exercise).toBe('push-ups');
    expect(data.log[0].assigned).toBe(10);
    expect(data.log[0].completed).toBe(10);
  });

  it('appends to existing log', () => {
    recordExercise(testDir, { exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 10, pr: null });
    recordExercise(testDir, { exercise: 'sit-ups', unit: 'reps', assigned: 15, completed: 12, pr: 'fix/#99' });
    const data = loadData(testDir);
    expect(data.log).toHaveLength(2);
  });

  it('stores ISO date', () => {
    recordExercise(testDir, { exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 10, pr: null });
    const data = loadData(testDir);
    expect(data.log[0].date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('rejects invalid completed value', () => {
    expect(() => {
      recordExercise(testDir, { exercise: 'push-ups', unit: 'reps', assigned: 10, completed: -5, pr: null });
    }).toThrow('must be a non-negative number');
  });
});
