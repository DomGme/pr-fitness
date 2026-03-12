import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { createTestDir, cleanTestDir } from './helpers/test-storage.js';
import { loadData, saveData, getDataPath } from '../src/storage.js';

describe('storage', () => {
  let testDir;

  beforeEach(() => {
    testDir = createTestDir();
  });

  afterEach(() => {
    cleanTestDir(testDir);
  });

  it('returns default data when file does not exist', () => {
    const data = loadData(testDir);
    expect(data).toEqual({ profile: null, dailyChoice: null, log: [] });
  });

  it('creates directory and saves data', () => {
    const dataDir = join(testDir, 'nested', 'dir');
    const data = { profile: null, dailyChoice: null, log: [] };
    saveData(dataDir, data);
    expect(existsSync(join(dataDir, 'data.json'))).toBe(true);
  });

  it('round-trips data correctly', () => {
    const data = {
      profile: { equipment: ['bands'], exercises: [], tone: 'minimal', sprintLengthDays: 14, sprintStartDate: '2026-03-02' },
      dailyChoice: { date: '2026-03-11', exercise: 'push-ups' },
      log: [{ date: '2026-03-11T10:00:00Z', exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 10, pr: null }]
    };
    saveData(testDir, data);
    const loaded = loadData(testDir);
    expect(loaded).toEqual(data);
  });

  it('returns correct data path', () => {
    const path = getDataPath(testDir);
    expect(path).toBe(join(testDir, 'data.json'));
  });
});
