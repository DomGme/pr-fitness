import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDir, cleanTestDir } from '../helpers/test-storage.js';
import { saveData } from '../../src/storage.js';
import { getStats, formatStats } from '../../src/commands/stats.js';

describe('stats command', () => {
  let testDir;

  beforeEach(() => {
    testDir = createTestDir();
  });

  afterEach(() => {
    cleanTestDir(testDir);
  });

  const makeData = (log) => ({
    profile: { equipment: [], exercises: [], tone: 'minimal', sprintLengthDays: 14, sprintStartDate: '2026-03-02' },
    dailyChoice: null,
    log,
  });

  it('calculates balance per exercise', () => {
    saveData(testDir, makeData([
      { date: '2026-03-11T10:00:00Z', exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 15, pr: null },
      { date: '2026-03-11T11:00:00Z', exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 5, pr: null },
      { date: '2026-03-11T12:00:00Z', exercise: 'sit-ups', unit: 'reps', assigned: 20, completed: 20, pr: null },
    ]));

    const now = new Date('2026-03-11T14:00:00Z');
    const stats = getStats(testDir, 'today', now);

    expect(stats.exercises['push-ups'].assigned).toBe(20);
    expect(stats.exercises['push-ups'].completed).toBe(20);
    expect(stats.exercises['push-ups'].balance).toBe(0);
    expect(stats.exercises['sit-ups'].balance).toBe(0);
    expect(stats.totalPRs).toBe(3);
  });

  it('shows negative balance for owed', () => {
    saveData(testDir, makeData([
      { date: '2026-03-11T10:00:00Z', exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 0, pr: null },
    ]));

    const now = new Date('2026-03-11T14:00:00Z');
    const stats = getStats(testDir, 'today', now);
    expect(stats.exercises['push-ups'].balance).toBe(-10);
  });

  it('shows positive balance for banked', () => {
    saveData(testDir, makeData([
      { date: '2026-03-11T10:00:00Z', exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 25, pr: null },
    ]));

    const now = new Date('2026-03-11T14:00:00Z');
    const stats = getStats(testDir, 'today', now);
    expect(stats.exercises['push-ups'].balance).toBe(15);
  });

  it('formats stats as a table string', () => {
    saveData(testDir, makeData([
      { date: '2026-03-11T10:00:00Z', exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 15, pr: null },
    ]));

    const now = new Date('2026-03-11T14:00:00Z');
    const output = formatStats(testDir, 'today', now);
    expect(output).toContain('Push-ups');
    expect(output).toContain('+5');
    expect(output).toContain('Total PRs: 1');
  });

  it('returns empty stats when no log entries', () => {
    saveData(testDir, makeData([]));
    const stats = getStats(testDir, 'today');
    expect(stats.totalPRs).toBe(0);
    expect(Object.keys(stats.exercises)).toHaveLength(0);
  });
});
