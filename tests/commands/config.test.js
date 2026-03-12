import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDir, cleanTestDir } from '../helpers/test-storage.js';
import { runSetup } from '../../src/commands/setup.js';
import { updateConfig } from '../../src/commands/config.js';
import { loadData } from '../../src/storage.js';

describe('config command', () => {
  let testDir;

  beforeEach(() => {
    testDir = createTestDir();
    runSetup({ equipment: [], tone: 'minimal' }, testDir);
  });

  afterEach(() => {
    cleanTestDir(testDir);
  });

  it('updates tone', () => {
    updateConfig(testDir, { tone: 'encouraging' });
    const data = loadData(testDir);
    expect(data.profile.tone).toBe('encouraging');
  });

  it('updates equipment and regenerates exercises', () => {
    updateConfig(testDir, { equipment: ['bands'] });
    const data = loadData(testDir);
    expect(data.profile.equipment).toEqual(['bands']);
    expect(data.profile.exercises.map(e => e.name)).toContain('band-rows');
  });

  it('updates sprint length', () => {
    updateConfig(testDir, { sprintLengthDays: 7 });
    const data = loadData(testDir);
    expect(data.profile.sprintLengthDays).toBe(7);
  });

  it('throws when no profile exists', () => {
    const emptyDir = createTestDir();
    expect(() => updateConfig(emptyDir, { tone: 'encouraging' })).toThrow('Run pr-fitness setup first');
    cleanTestDir(emptyDir);
  });
});
