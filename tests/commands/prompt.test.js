import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDir, cleanTestDir } from '../helpers/test-storage.js';
import { runSetup } from '../../src/commands/setup.js';
import { generatePrompt } from '../../src/commands/prompt.js';
import { saveData, loadData } from '../../src/storage.js';

describe('prompt command', () => {
  let testDir;

  beforeEach(() => {
    testDir = createTestDir();
    runSetup({ equipment: [], tone: 'minimal' }, testDir);
  });

  afterEach(() => {
    cleanTestDir(testDir);
  });

  it('returns needsSetup when no profile exists', () => {
    const emptyDir = createTestDir();
    const result = generatePrompt(emptyDir);
    expect(result.needsSetup).toBe(true);
    cleanTestDir(emptyDir);
  });

  it('returns needsDailyChoice on first prompt of the day', () => {
    const result = generatePrompt(testDir);
    expect(result.needsDailyChoice).toBe(true);
    expect(result.exercises.length).toBeGreaterThan(0);
  });

  it('returns exercise prompt when daily choice is set', () => {
    const data = loadData(testDir);
    data.dailyChoice = { date: new Date().toISOString().split('T')[0], exercise: 'push-ups' };
    saveData(testDir, data);

    const result = generatePrompt(testDir);
    expect(result.needsDailyChoice).toBe(false);
    expect(result.exercise).toBe('push-ups');
    expect(result.count).toBeGreaterThanOrEqual(5);
    expect(result.count).toBeLessThanOrEqual(15);
    expect(result.prompt).toContain('Push-ups');
  });

  it('resets daily choice if date is yesterday', () => {
    const data = loadData(testDir);
    data.dailyChoice = { date: '2020-01-01', exercise: 'push-ups' };
    saveData(testDir, data);

    const result = generatePrompt(testDir);
    expect(result.needsDailyChoice).toBe(true);
  });

  it('setDailyChoice locks in exercise for the day', async () => {
    const { setDailyChoice } = await import('../../src/commands/prompt.js');
    setDailyChoice(testDir, 'squats');
    const data = loadData(testDir);
    expect(data.dailyChoice.exercise).toBe('squats');
    expect(data.dailyChoice.date).toBe(new Date().toISOString().split('T')[0]);
  });

  it('setDailyChoice with random picks from pool', async () => {
    const { setDailyChoice } = await import('../../src/commands/prompt.js');
    setDailyChoice(testDir, 'random');
    const data = loadData(testDir);
    expect(data.dailyChoice.exercise).toBeDefined();
    expect(data.dailyChoice.date).toBe(new Date().toISOString().split('T')[0]);
  });
});
