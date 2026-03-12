import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createTestDir, cleanTestDir } from '../helpers/test-storage.js';
import { runSetup, installHook, getHookConfig } from '../../src/commands/setup.js';
import { loadData, saveData } from '../../src/storage.js';

describe('setup command', () => {
  let testDir;

  beforeEach(() => {
    testDir = createTestDir();
  });

  afterEach(() => {
    cleanTestDir(testDir);
  });

  it('saves profile with no equipment and defaults to minimal tone', () => {
    runSetup({ equipment: [] }, testDir);
    const data = loadData(testDir);
    expect(data.profile).not.toBeNull();
    expect(data.profile.equipment).toEqual([]);
    expect(data.profile.tone).toBe('minimal');
    expect(data.profile.exercises).toHaveLength(5);
  });

  it('saves profile with equipment', () => {
    runSetup({ equipment: ['pull-up-bar', 'bands'] }, testDir);
    const data = loadData(testDir);
    expect(data.profile.equipment).toEqual(['pull-up-bar', 'bands']);
    expect(data.profile.exercises.length).toBe(5 + 2 + 2);
  });

  it('sets default sprint config', () => {
    runSetup({ equipment: [] }, testDir);
    const data = loadData(testDir);
    expect(data.profile.sprintLengthDays).toBe(14);
    expect(data.profile.sprintStartDate).toBeDefined();
  });

  it('preserves existing log entries', () => {
    saveData(testDir, {
      profile: null,
      dailyChoice: null,
      log: [{ date: '2026-03-11T10:00:00Z', exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 10, pr: null }],
    });
    runSetup({ equipment: [] }, testDir);
    const data = loadData(testDir);
    expect(data.log).toHaveLength(1);
  });
});

describe('hook installation', () => {
  let fakeHome;
  let originalHome;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), 'pr-fitness-home-'));
    originalHome = process.env.HOME;
    process.env.HOME = fakeHome;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it('installs hook to ~/.claude/hooks.json', () => {
    const result = installHook();
    expect(result.installed).toBe(true);
    const hooksPath = join(fakeHome, '.claude', 'hooks.json');
    expect(existsSync(hooksPath)).toBe(true);
    const hooks = JSON.parse(readFileSync(hooksPath, 'utf-8'));
    expect(hooks.hooks.PostToolUse).toHaveLength(1);
    expect(hooks.hooks.PostToolUse[0].command).toContain('pr-fitness prompt');
  });

  it('does not duplicate hook if already installed', () => {
    installHook();
    const result = installHook();
    expect(result.installed).toBe(false);
    expect(result.reason).toBe('already-installed');
    const hooksPath = join(fakeHome, '.claude', 'hooks.json');
    const hooks = JSON.parse(readFileSync(hooksPath, 'utf-8'));
    expect(hooks.hooks.PostToolUse).toHaveLength(1);
  });

  it('preserves existing hooks when installing', async () => {
    const { mkdirSync, writeFileSync } = await import('node:fs');
    mkdirSync(join(fakeHome, '.claude'), { recursive: true });
    writeFileSync(join(fakeHome, '.claude', 'hooks.json'), JSON.stringify({
      hooks: {
        PostToolUse: [{ matcher: 'Other', command: 'echo hello', description: 'existing hook' }],
      },
    }));

    const result = installHook();
    expect(result.installed).toBe(true);
    const hooks = JSON.parse(readFileSync(join(fakeHome, '.claude', 'hooks.json'), 'utf-8'));
    expect(hooks.hooks.PostToolUse).toHaveLength(2);
    expect(hooks.hooks.PostToolUse[0].command).toBe('echo hello');
    expect(hooks.hooks.PostToolUse[1].command).toContain('pr-fitness prompt');
  });

  it('getHookConfig returns valid hook structure', () => {
    const config = getHookConfig();
    expect(config.hooks.PostToolUse).toHaveLength(1);
    expect(config.hooks.PostToolUse[0].matcher).toBe('Bash');
  });
});
