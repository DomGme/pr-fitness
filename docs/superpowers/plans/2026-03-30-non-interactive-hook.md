# Non-Interactive Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken interactive hook with a non-interactive `status --json` command that reports state to Claude, letting Claude handle the conversation.

**Architecture:** New `getStatus()` function returns structured JSON (`needs-setup`, `needs-choice`, or `ready`). Hook calls `pr-fitness status --json` instead of `pr-fitness prompt`. `installHook()` gains upgrade logic to replace old hooks in-place.

**Tech Stack:** Node.js, Commander, Vitest

**Spec:** `docs/superpowers/specs/2026-03-30-non-interactive-hook-design.md`

---

### Task 1: Create `getStatus()` with tests

**Files:**
- Create: `src/commands/status.js`
- Create: `tests/commands/status.test.js`

- [ ] **Step 1: Write the failing tests**

In `tests/commands/status.test.js`:

```javascript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/commands/status.test.js`
Expected: FAIL — `Cannot find module '../../src/commands/status.js'`

- [ ] **Step 3: Write the implementation**

In `src/commands/status.js`:

```javascript
import { loadData } from '../storage.js';
import { getAdaptiveRepCount } from '../exercises.js';
import { formatPrompt } from '../tones.js';

export function getStatus(dataDir) {
  const data = loadData(dataDir);

  if (!data.profile) {
    return { state: 'needs-setup' };
  }

  const today = new Date().toISOString().split('T')[0];

  if (!data.dailyChoice || data.dailyChoice.date !== today) {
    return {
      state: 'needs-choice',
      exercises: data.profile.exercises,
    };
  }

  const exerciseName = data.dailyChoice.exercise;
  const exercise = data.profile.exercises.find(e => e.name === exerciseName);

  if (!exercise) {
    return {
      state: 'needs-choice',
      exercises: data.profile.exercises,
    };
  }

  const count = getAdaptiveRepCount(exercise, data.log);
  const prompt = formatPrompt(data.profile.tone, exercise.name, count, exercise.unit);

  return {
    state: 'ready',
    exercise: exercise.name,
    count,
    unit: exercise.unit,
    prompt,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/commands/status.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/status.js tests/commands/status.test.js
git commit -m "feat: add getStatus() for non-interactive hook"
```

---

### Task 2: Register `status` command in CLI

**Files:**
- Modify: `bin/pr-fitness.js`

- [ ] **Step 1: Add the status command to the CLI**

In `bin/pr-fitness.js`, add after the `stats` command block (after line 98):

```javascript
program
  .command('status')
  .description('Check current exercise state')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { getStatus } = await import('../src/commands/status.js');
    const { formatDailyChoice } = await import('../src/tones.js');
    const status = getStatus(dataDir);
    if (opts.json) {
      console.log(JSON.stringify(status));
    } else {
      if (status.state === 'needs-setup') {
        console.log('No profile found. Run: pr-fitness setup');
      } else if (status.state === 'needs-choice') {
        console.log(formatDailyChoice(status.exercises));
      } else {
        console.log(status.prompt);
      }
    }
  });
```

- [ ] **Step 2: Verify CLI works**

Run: `node bin/pr-fitness.js status --json`
Expected: JSON output with one of the three states

Run: `node bin/pr-fitness.js status`
Expected: Human-readable output

- [ ] **Step 3: Commit**

```bash
git add bin/pr-fitness.js
git commit -m "feat: register status command in CLI"
```

---

### Task 3: Update hook config and upgrade logic

**Files:**
- Modify: `src/commands/setup.js`
- Modify: `hooks/claude-code-hooks.json`

- [ ] **Step 1: Write failing tests for the new hook behavior**

Add to `tests/commands/setup.test.js`, inside the `'hook installation'` describe block:

```javascript
it('getHookConfig returns command with pr-fitness status --json', () => {
  const config = getHookConfig();
  expect(config.hooks.PreToolUse[0].hooks[0].command).toContain('pr-fitness status --json');
});

it('upgrades old hook to new hook', () => {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  mkdirSync(join(fakeHome, '.claude'), { recursive: true });
  writeFileSync(join(fakeHome, '.claude', 'hooks.json'), JSON.stringify({
    hooks: {
      PreToolUse: [{
        matcher: 'Bash',
        hooks: [{ type: 'command', command: 'INPUT=$(cat); if echo "$INPUT" | jq -r \'.tool_input.command\' 2>/dev/null | grep -q \'gh pr create\'; then pr-fitness prompt 2>/dev/null; fi' }],
      }],
    },
  }));

  const result = installHook();
  expect(result.installed).toBe(true);
  expect(result.upgraded).toBe(true);
  const hooks = JSON.parse(readFileSync(join(fakeHome, '.claude', 'hooks.json'), 'utf-8'));
  expect(hooks.hooks.PreToolUse).toHaveLength(1);
  expect(hooks.hooks.PreToolUse[0].hooks[0].command).toContain('pr-fitness status --json');
});

it('does not duplicate when new hook already installed', () => {
  installHook();
  const result = installHook();
  expect(result.installed).toBe(false);
  expect(result.reason).toBe('already-installed');
});
```

Note: the existing test `'installs hook to ~/.claude/hooks.json'` assertion on line 77 checks for `'pr-fitness prompt'` — update it to check for `'pr-fitness status --json'` instead. Similarly update line 104 in `'preserves existing hooks when installing'`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/commands/setup.test.js`
Expected: FAIL — hook config still contains `pr-fitness prompt`

- [ ] **Step 3: Update `getHookConfig()` in `src/commands/setup.js`**

Replace the command string in `getHookConfig()` (line 31):

Old:
```javascript
command: "INPUT=$(cat); if echo \"$INPUT\" | jq -r '.tool_input.command' 2>/dev/null | grep -q 'gh pr create'; then pr-fitness prompt 2>/dev/null; fi",
```

New:
```javascript
command: "INPUT=$(cat); if echo \"$INPUT\" | jq -r '.tool_input.command' 2>/dev/null | grep -q 'gh pr create'; then pr-fitness status --json 2>/dev/null; fi",
```

- [ ] **Step 4: Update `installHook()` with upgrade logic**

Replace the detection and installation logic in `installHook()` (lines 59-72, from the `alreadyInstalled` check through the `writeFileSync` and `return`):

```javascript
const oldHookIndex = existing.hooks.PreToolUse.findIndex(
  (h) => h.hooks && h.hooks.some((sub) => sub.command && sub.command.includes('pr-fitness prompt'))
);
const currentHookInstalled = existing.hooks.PreToolUse.some(
  (h) => h.hooks && h.hooks.some((sub) => sub.command && sub.command.includes('pr-fitness status'))
);

if (currentHookInstalled) {
  return { installed: false, reason: 'already-installed', path: hooksPath };
}

const hookConfig = getHookConfig();

if (oldHookIndex !== -1) {
  existing.hooks.PreToolUse[oldHookIndex] = hookConfig.hooks.PreToolUse[0];
  writeFileSync(hooksPath, JSON.stringify(existing, null, 2) + '\n');
  return { installed: true, upgraded: true, path: hooksPath };
}

existing.hooks.PreToolUse.push(...hookConfig.hooks.PreToolUse);
writeFileSync(hooksPath, JSON.stringify(existing, null, 2) + '\n');
return { installed: true, path: hooksPath };
```

- [ ] **Step 5: Update `hooks/claude-code-hooks.json`**

Replace the command on line 9 to match `getHookConfig()`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "INPUT=$(cat); if echo \"$INPUT\" | jq -r '.tool_input.command' 2>/dev/null | grep -q 'gh pr create'; then pr-fitness status --json 2>/dev/null; fi"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS (including updated setup tests)

- [ ] **Step 7: Commit**

```bash
git add src/commands/setup.js hooks/claude-code-hooks.json tests/commands/setup.test.js
git commit -m "feat: update hook to use status --json with upgrade logic"
```

---

### Task 4: Upgrade local hook and verify end-to-end

**Files:**
- Modify: `~/.claude/hooks.json` (via `pr-fitness setup`)

- [ ] **Step 1: Run setup to upgrade the local hook**

Run: `node bin/pr-fitness.js setup`

Follow the prompts. When asked about the hook, confirm installation. The upgrade logic should detect the old `pr-fitness prompt` hook and replace it.

- [ ] **Step 2: Verify the hook was upgraded**

Run: `cat ~/.claude/hooks.json | grep 'pr-fitness status'`
Expected: Should find `pr-fitness status --json` in the hook command

- [ ] **Step 3: Test the full flow manually**

Run: `pr-fitness status --json`
Expected: JSON output matching one of the three states from the spec

- [ ] **Step 4: Run full test suite one more time**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 5: Commit any remaining changes**

If there are no code changes, skip this step. The hook upgrade is local config only.
