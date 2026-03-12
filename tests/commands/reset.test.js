import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDir, cleanTestDir } from '../helpers/test-storage.js';
import { saveData, loadData } from '../../src/storage.js';
import { resetBalances, resetAll } from '../../src/commands/reset.js';

describe('reset command', () => {
  let testDir;

  beforeEach(() => {
    testDir = createTestDir();
    saveData(testDir, {
      profile: { equipment: [], exercises: [], tone: 'minimal', sprintLengthDays: 14, sprintStartDate: '2026-03-02' },
      dailyChoice: { date: '2026-03-11', exercise: 'push-ups' },
      log: [
        { date: '2026-03-11T10:00:00Z', exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 5, pr: null },
        { date: '2026-03-11T11:00:00Z', exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 0, pr: null },
      ],
    });
  });

  afterEach(() => {
    cleanTestDir(testDir);
  });

  it('resetBalances adds offset entries to zero out balance but keeps history', () => {
    resetBalances(testDir);
    const data = loadData(testDir);
    expect(data.log.length).toBeGreaterThan(2);
    expect(data.profile).not.toBeNull();
    const balance = data.log.reduce((sum, e) => sum + (e.completed - e.assigned), 0);
    expect(balance).toBe(0);
  });

  it('resetAll clears log and daily choice but keeps profile', () => {
    resetAll(testDir);
    const data = loadData(testDir);
    expect(data.log).toHaveLength(0);
    expect(data.dailyChoice).toBeNull();
    expect(data.profile).not.toBeNull();
  });
});
