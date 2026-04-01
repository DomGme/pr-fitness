import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDir, cleanTestDir } from '../helpers/test-storage.js';
import { runSetup } from '../../src/commands/setup.js';
import { saveData, loadData } from '../../src/storage.js';
import { getStatus } from '../../src/commands/status.js';

describe('status command', () => {
  let testDir;

  beforeEach(() => {
    testDir = createTestDir();
  });

  afterEach(() => {
    cleanTestDir(testDir);
  });

  it('returns needs-setup when no profile exists', () => {
    const result = getStatus(testDir);
    expect(result.state).toBe('needs-setup');
  });

  it('returns needs-choice when profile exists but no daily choice', () => {
    runSetup({ equipment: [] }, testDir);
    const result = getStatus(testDir);
    expect(result.state).toBe('needs-choice');
    expect(result.exercises).toHaveLength(5);
    expect(result.exercises[0]).toHaveProperty('name');
    expect(result.exercises[0]).toHaveProperty('unit');
    expect(result.exercises[0]).toHaveProperty('min');
    expect(result.exercises[0]).toHaveProperty('max');
  });

  it('returns needs-choice when daily choice is from yesterday', () => {
    runSetup({ equipment: [] }, testDir);
    const data = loadData(testDir);
    data.dailyChoice = { date: '2020-01-01', exercise: 'push-ups' };
    saveData(testDir, data);
    const result = getStatus(testDir);
    expect(result.state).toBe('needs-choice');
  });

  it('returns ready when daily choice is set for today', () => {
    runSetup({ equipment: [] }, testDir);
    const data = loadData(testDir);
    data.dailyChoice = { date: new Date().toISOString().split('T')[0], exercise: 'push-ups' };
    saveData(testDir, data);
    const result = getStatus(testDir);
    expect(result.state).toBe('ready');
    expect(result.exercise).toBe('push-ups');
    expect(result.count).toBeGreaterThanOrEqual(5);
    expect(result.count).toBeLessThanOrEqual(15);
    expect(result.unit).toBe('reps');
    expect(result.prompt).toContain('Push-ups');
  });

  it('includes equipment exercises in needs-choice', () => {
    runSetup({ equipment: ['pull-up-bar'] }, testDir);
    const result = getStatus(testDir);
    expect(result.state).toBe('needs-choice');
    expect(result.exercises).toHaveLength(7);
  });
});
