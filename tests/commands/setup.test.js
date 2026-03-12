import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDir, cleanTestDir } from '../helpers/test-storage.js';
import { runSetup } from '../../src/commands/setup.js';
import { loadData } from '../../src/storage.js';

describe('setup command', () => {
  let testDir;

  beforeEach(() => {
    testDir = createTestDir();
  });

  afterEach(() => {
    cleanTestDir(testDir);
  });

  it('saves profile with no equipment', () => {
    runSetup({ equipment: [], tone: 'minimal' }, testDir);
    const data = loadData(testDir);
    expect(data.profile).not.toBeNull();
    expect(data.profile.equipment).toEqual([]);
    expect(data.profile.tone).toBe('minimal');
    expect(data.profile.exercises).toHaveLength(5);
  });

  it('saves profile with equipment', () => {
    runSetup({ equipment: ['pull-up-bar', 'bands'], tone: 'encouraging' }, testDir);
    const data = loadData(testDir);
    expect(data.profile.equipment).toEqual(['pull-up-bar', 'bands']);
    expect(data.profile.tone).toBe('encouraging');
    expect(data.profile.exercises.length).toBe(5 + 2 + 2);
  });

  it('sets default sprint config', () => {
    runSetup({ equipment: [], tone: 'minimal' }, testDir);
    const data = loadData(testDir);
    expect(data.profile.sprintLengthDays).toBe(14);
    expect(data.profile.sprintStartDate).toBeDefined();
  });

  it('preserves existing log entries', async () => {
    const { saveData } = await import('../../src/storage.js');
    saveData(testDir, {
      profile: null,
      dailyChoice: null,
      log: [{ date: '2026-03-11T10:00:00Z', exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 10, pr: null }],
    });
    runSetup({ equipment: [], tone: 'minimal' }, testDir);
    const data = loadData(testDir);
    expect(data.log).toHaveLength(1);
  });
});
