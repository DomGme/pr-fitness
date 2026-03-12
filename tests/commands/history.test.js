import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDir, cleanTestDir } from '../helpers/test-storage.js';
import { saveData } from '../../src/storage.js';
import { formatHistory } from '../../src/commands/history.js';

describe('history command', () => {
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

  it('shows log entries in reverse chronological order', () => {
    saveData(testDir, makeData([
      { date: '2026-03-11T09:00:00Z', exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 10, pr: null },
      { date: '2026-03-11T14:00:00Z', exercise: 'sit-ups', unit: 'reps', assigned: 15, completed: 12, pr: 'fix/#5' },
    ]));

    const now = new Date('2026-03-11T15:00:00Z');
    const output = formatHistory(testDir, 'today', now);
    const sitUpsPos = output.indexOf('Sit-ups');
    const pushUpsPos = output.indexOf('Push-ups');
    expect(sitUpsPos).toBeLessThan(pushUpsPos);
  });

  it('shows empty message when no entries', () => {
    saveData(testDir, makeData([]));
    const output = formatHistory(testDir, 'today');
    expect(output).toContain('No exercises logged');
  });

  it('shows PR reference when available', () => {
    saveData(testDir, makeData([
      { date: '2026-03-11T10:00:00Z', exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 10, pr: 'feat/#42' },
    ]));

    const now = new Date('2026-03-11T15:00:00Z');
    const output = formatHistory(testDir, 'today', now);
    expect(output).toContain('feat/#42');
  });
});
