# PR Fitness Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js CLI tool that assigns calisthenics exercises when creating pull requests, tracks completion with a balance system, and integrates with Claude Code via hooks.

**Architecture:** A single npm package with a CLI entry point (`pr-fitness`). Commands are handled by a thin CLI router that delegates to focused modules: storage (JSON read/write), exercises (pool definitions, selection, daily choice), prompts (tone-aware formatting), and stats (balance calculation, period filtering). All state lives in `~/.pr-fitness/data.json`.

**Tech Stack:** Node.js, Commander (CLI parsing), Inquirer (interactive prompts), Vitest (testing)

**Spec:** `docs/superpowers/specs/2026-03-11-pr-fitness-design.md`

---

## File Structure

```
pr-fitness/
├── package.json
├── bin/
│   └── pr-fitness.js          # CLI entry point (hashbang, imports commander)
├── src/
│   ├── commands/
│   │   ├── setup.js           # Interactive onboarding flow
│   │   ├── prompt.js          # Assign exercise, handle daily choice
│   │   ├── log.js             # Record completed reps
│   │   ├── history.js         # Show exercise history
│   │   ├── stats.js           # Balance summary
│   │   ├── config.js          # Update preferences
│   │   └── reset.js           # Clear data or balances
│   ├── storage.js             # Read/write ~/.pr-fitness/data.json (atomic writes)
│   ├── exercises.js           # Exercise pool definitions, equipment mapping, selection
│   ├── tones.js               # Tone templates (minimal, encouraging)
│   └── utils.js               # Date helpers, input validation
├── tests/
│   ├── storage.test.js
│   ├── exercises.test.js
│   ├── tones.test.js
│   ├── utils.test.js
│   ├── commands/
│   │   ├── setup.test.js
│   │   ├── prompt.test.js
│   │   ├── log.test.js
│   │   ├── history.test.js
│   │   ├── stats.test.js
│   │   ├── config.test.js
│   │   └── reset.test.js
│   └── helpers/
│       └── test-storage.js    # Test helper: temp dir storage for isolated tests
└── hooks/
    └── claude-code-hooks.json # Example hook config for teams to copy
```

---

## Chunk 1: Project Scaffolding and Core Modules

### Task 1: Project Initialization

**Files:**
- Create: `package.json`
- Create: `bin/pr-fitness.js`
- Create: `.gitignore`

- [ ] **Step 1: Initialize npm project**

```bash
cd /Users/dominikgmeiner/super/PrFitness
npm init -y
```

- [ ] **Step 2: Update package.json with correct metadata**

Set `name` to `pr-fitness`, `version` to `0.1.0`, add `bin` field pointing to `bin/pr-fitness.js`, set `type` to `module`, add description.

```json
{
  "name": "pr-fitness",
  "version": "0.1.0",
  "description": "Get fit one PR at a time. Assigns calisthenics exercises when you create pull requests.",
  "type": "module",
  "bin": {
    "pr-fitness": "./bin/pr-fitness.js"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "license": "MIT"
}
```

- [ ] **Step 3: Install dependencies**

```bash
npm install commander inquirer
npm install -D vitest
```

- [ ] **Step 4: Create CLI entry point**

Create `bin/pr-fitness.js`:

```js
#!/usr/bin/env node
import { program } from 'commander';

program
  .name('pr-fitness')
  .description('Get fit one PR at a time')
  .version('0.1.0');

program.parse();
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
```

- [ ] **Step 6: Verify CLI runs**

```bash
chmod +x bin/pr-fitness.js
node bin/pr-fitness.js --version
```

Expected: `0.1.0`

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json bin/pr-fitness.js .gitignore
git commit -m "feat: initialize project with CLI entry point"
```

---

### Task 2: Storage Module

**Files:**
- Create: `src/storage.js`
- Create: `tests/storage.test.js`
- Create: `tests/helpers/test-storage.js`

- [ ] **Step 1: Create test helper for isolated storage**

Create `tests/helpers/test-storage.js`:

```js
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export function createTestDir() {
  return mkdtempSync(join(tmpdir(), 'pr-fitness-test-'));
}

export function cleanTestDir(dir) {
  rmSync(dir, { recursive: true, force: true });
}
```

- [ ] **Step 2: Write failing tests for storage**

Create `tests/storage.test.js`:

```js
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
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run tests/storage.test.js
```

Expected: FAIL (module not found)

- [ ] **Step 4: Implement storage module**

Create `src/storage.js`:

```js
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const DATA_FILE = 'data.json';

const DEFAULT_DATA = {
  profile: null,
  dailyChoice: null,
  log: [],
};

export function getDefaultDir() {
  return join(process.env.HOME || process.env.USERPROFILE, '.pr-fitness');
}

export function getDataPath(dir) {
  return join(dir, DATA_FILE);
}

export function loadData(dir = getDefaultDir()) {
  const filePath = getDataPath(dir);
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { ...DEFAULT_DATA };
    }
    throw err;
  }
}

export function saveData(dir = getDefaultDir(), data) {
  mkdirSync(dir, { recursive: true });
  const filePath = getDataPath(dir);
  const tmpPath = join(dir, `.data-${randomUUID()}.tmp`);
  writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n');
  renameSync(tmpPath, filePath);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/storage.test.js
```

Expected: all 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/storage.js tests/storage.test.js tests/helpers/test-storage.js
git commit -m "feat: add storage module with atomic JSON writes"
```

---

### Task 3: Exercise Definitions and Selection

**Files:**
- Create: `src/exercises.js`
- Create: `tests/exercises.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/exercises.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { getDefaultExercises, getExercisesForEquipment, pickExercise, pickRepCount } from '../src/exercises.js';

describe('exercises', () => {
  it('returns 5 default exercises for no equipment', () => {
    const exercises = getDefaultExercises();
    expect(exercises).toHaveLength(5);
    expect(exercises.map(e => e.name)).toContain('push-ups');
    expect(exercises.map(e => e.name)).toContain('plank');
  });

  it('adds pull-up bar exercises when equipment includes pull-up-bar', () => {
    const exercises = getExercisesForEquipment(['pull-up-bar']);
    const names = exercises.map(e => e.name);
    expect(names).toContain('pull-ups');
    expect(names).toContain('hanging-leg-raises');
    expect(names).toContain('push-ups'); // still has defaults
  });

  it('adds band exercises when equipment includes bands', () => {
    const exercises = getExercisesForEquipment(['bands']);
    const names = exercises.map(e => e.name);
    expect(names).toContain('band-rows');
    expect(names).toContain('band-pull-aparts');
  });

  it('adds weight exercises when equipment includes weights', () => {
    const exercises = getExercisesForEquipment(['weights']);
    const names = exercises.map(e => e.name);
    expect(names).toContain('dumbbell-curls');
    expect(names).toContain('overhead-press');
  });

  it('combines all equipment', () => {
    const exercises = getExercisesForEquipment(['pull-up-bar', 'bands', 'weights']);
    expect(exercises.length).toBe(5 + 2 + 2 + 2); // 11
  });

  it('pickExercise returns an exercise from the list', () => {
    const exercises = getDefaultExercises();
    const picked = pickExercise(exercises);
    expect(exercises).toContainEqual(picked);
  });

  it('pickRepCount returns a number within min-max range', () => {
    const exercise = { name: 'push-ups', unit: 'reps', min: 5, max: 15 };
    for (let i = 0; i < 50; i++) {
      const count = pickRepCount(exercise);
      expect(count).toBeGreaterThanOrEqual(5);
      expect(count).toBeLessThanOrEqual(15);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/exercises.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement exercises module**

Create `src/exercises.js`:

```js
const DEFAULT_EXERCISES = [
  { name: 'push-ups', unit: 'reps', min: 5, max: 15 },
  { name: 'sit-ups', unit: 'reps', min: 10, max: 20 },
  { name: 'squats', unit: 'reps', min: 10, max: 15 },
  { name: 'lunges', unit: 'reps', min: 10, max: 20, note: 'total, alternating legs' },
  { name: 'plank', unit: 'seconds', min: 15, max: 30 },
];

const EQUIPMENT_EXERCISES = {
  'pull-up-bar': [
    { name: 'pull-ups', unit: 'reps', min: 3, max: 8 },
    { name: 'hanging-leg-raises', unit: 'reps', min: 5, max: 10 },
  ],
  'bands': [
    { name: 'band-rows', unit: 'reps', min: 8, max: 12 },
    { name: 'band-pull-aparts', unit: 'reps', min: 10, max: 15 },
  ],
  'weights': [
    { name: 'dumbbell-curls', unit: 'reps', min: 8, max: 12 },
    { name: 'overhead-press', unit: 'reps', min: 5, max: 10 },
  ],
};

export function getDefaultExercises() {
  return [...DEFAULT_EXERCISES];
}

export function getExercisesForEquipment(equipment = []) {
  const exercises = [...DEFAULT_EXERCISES];
  for (const item of equipment) {
    if (EQUIPMENT_EXERCISES[item]) {
      exercises.push(...EQUIPMENT_EXERCISES[item]);
    }
  }
  return exercises;
}

export function pickExercise(exercises) {
  const index = Math.floor(Math.random() * exercises.length);
  return exercises[index];
}

export function pickRepCount(exercise) {
  return Math.floor(Math.random() * (exercise.max - exercise.min + 1)) + exercise.min;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/exercises.test.js
```

Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/exercises.js tests/exercises.test.js
git commit -m "feat: add exercise definitions and selection logic"
```

---

### Task 4: Tone Templates

**Files:**
- Create: `src/tones.js`
- Create: `tests/tones.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/tones.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { formatPrompt, formatDailyChoice } from '../src/tones.js';

describe('tones', () => {
  it('formats minimal prompt for reps', () => {
    const result = formatPrompt('minimal', 'push-ups', 10, 'reps');
    expect(result).toBe('Push-ups (10) — How many did you do?');
  });

  it('formats minimal prompt for seconds', () => {
    const result = formatPrompt('minimal', 'plank', 20, 'seconds');
    expect(result).toBe('Plank (20s) — How many seconds did you hold?');
  });

  it('formats encouraging prompt for reps', () => {
    const result = formatPrompt('encouraging', 'push-ups', 10, 'reps');
    expect(result).toBe('Nice PR! Time for 10 push-ups — you\'ve got this! How many did you get?');
  });

  it('formats encouraging prompt for seconds', () => {
    const result = formatPrompt('encouraging', 'plank', 20, 'seconds');
    expect(result).toBe('Nice PR! Time for a 20s plank — you\'ve got this! How many seconds did you hold?');
  });

  it('formats daily choice prompt', () => {
    const exercises = [
      { name: 'push-ups', unit: 'reps', min: 5, max: 15 },
      { name: 'sit-ups', unit: 'reps', min: 10, max: 20 },
    ];
    const result = formatDailyChoice(exercises);
    expect(result).toContain('Pick your exercise for today');
    expect(result).toContain('1. Push-ups');
    expect(result).toContain('2. Sit-ups');
    expect(result).toContain('Random');
  });

  it('defaults to minimal for unknown tone', () => {
    const result = formatPrompt('unknown', 'push-ups', 10, 'reps');
    expect(result).toBe('Push-ups (10) — How many did you do?');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/tones.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement tones module**

Create `src/tones.js`:

```js
import { capitalize } from './utils.js';

function formatMinimal(exercise, count, unit) {
  const name = capitalize(exercise);
  if (unit === 'seconds') {
    return `${name} (${count}s) — How many seconds did you hold?`;
  }
  return `${name} (${count}) — How many did you do?`;
}

function formatEncouraging(exercise, count, unit) {
  if (unit === 'seconds') {
    return `Nice PR! Time for a ${count}s ${exercise} — you've got this! How many seconds did you hold?`;
  }
  return `Nice PR! Time for ${count} ${exercise} — you've got this! How many did you get?`;
}

export function formatPrompt(tone, exercise, count, unit) {
  switch (tone) {
    case 'encouraging':
      return formatEncouraging(exercise, count, unit);
    case 'minimal':
    default:
      return formatMinimal(exercise, count, unit);
  }
}

export function formatDailyChoice(exercises) {
  const lines = ['Good morning! Pick your exercise for today:'];
  exercises.forEach((ex, i) => {
    lines.push(`${i + 1}. ${capitalize(ex.name)}`);
  });
  lines.push(`${exercises.length + 1}. Random (surprise me)`);
  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/tones.test.js
```

Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/tones.js tests/tones.test.js
git commit -m "feat: add tone templates for exercise prompts"
```

---

### Task 5: Utility Functions

**Files:**
- Create: `src/utils.js`
- Create: `tests/utils.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/utils.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { validateCompleted, isToday, isThisWeek, isInSprint, filterLogByPeriod } from '../src/utils.js';

describe('validateCompleted', () => {
  it('accepts valid integer', () => {
    expect(validateCompleted('10')).toBe(10);
  });

  it('accepts zero', () => {
    expect(validateCompleted('0')).toBe(0);
  });

  it('accepts decimal for seconds', () => {
    expect(validateCompleted('15.5')).toBe(15.5);
  });

  it('rejects negative numbers', () => {
    expect(validateCompleted('-5')).toBe(null);
  });

  it('rejects non-numeric input', () => {
    expect(validateCompleted('abc')).toBe(null);
  });

  it('rejects empty string', () => {
    expect(validateCompleted('')).toBe(null);
  });
});

describe('date filters', () => {
  const now = new Date('2026-03-11T14:00:00Z');

  it('isToday returns true for today', () => {
    expect(isToday('2026-03-11T10:00:00Z', now)).toBe(true);
  });

  it('isToday returns false for yesterday', () => {
    expect(isToday('2026-03-10T10:00:00Z', now)).toBe(false);
  });

  it('isThisWeek returns true for same week (Mon-Sun)', () => {
    // March 11 2026 is a Wednesday, week starts March 9 (Monday)
    expect(isThisWeek('2026-03-09T10:00:00Z', now)).toBe(true);
    expect(isThisWeek('2026-03-11T10:00:00Z', now)).toBe(true);
  });

  it('isThisWeek returns false for last week', () => {
    expect(isThisWeek('2026-03-08T10:00:00Z', now)).toBe(false);
  });

  it('isInSprint returns true for date within sprint', () => {
    expect(isInSprint('2026-03-05T10:00:00Z', '2026-03-02', 14, now)).toBe(true);
  });

  it('isInSprint returns false for date before sprint', () => {
    expect(isInSprint('2026-03-01T10:00:00Z', '2026-03-02', 14, now)).toBe(false);
  });
});

describe('filterLogByPeriod', () => {
  const log = [
    { date: '2026-03-11T10:00:00Z', exercise: 'push-ups', assigned: 10, completed: 10 },
    { date: '2026-03-10T10:00:00Z', exercise: 'sit-ups', assigned: 15, completed: 15 },
    { date: '2026-03-01T10:00:00Z', exercise: 'squats', assigned: 10, completed: 5 },
  ];
  const now = new Date('2026-03-11T14:00:00Z');

  it('filters by today', () => {
    const result = filterLogByPeriod(log, 'today', {}, now);
    expect(result).toHaveLength(1);
    expect(result[0].exercise).toBe('push-ups');
  });

  it('filters by week', () => {
    const result = filterLogByPeriod(log, 'week', {}, now);
    expect(result).toHaveLength(2);
  });

  it('returns all for all-time', () => {
    const result = filterLogByPeriod(log, 'all', {}, now);
    expect(result).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/utils.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement utils module**

Create `src/utils.js`:

```js
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function validateCompleted(input) {
  if (input === '' || input === null || input === undefined) return null;
  const num = Number(input);
  if (isNaN(num) || num < 0) return null;
  return num;
}

export function isToday(dateStr, now = new Date()) {
  const date = new Date(dateStr);
  return date.toDateString() === now.toDateString();
}

export function isThisWeek(dateStr, now = new Date()) {
  const date = new Date(dateStr);
  const dayOfWeek = now.getDay();
  // Monday = start of week (getDay: 0=Sun, 1=Mon, ...)
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - mondayOffset);

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 7);

  return date >= monday && date < sunday;
}

export function isInSprint(dateStr, sprintStartDate, sprintLengthDays, now = new Date()) {
  const date = new Date(dateStr);
  const sprintStart = new Date(sprintStartDate + 'T00:00:00');

  // Find current sprint window
  const msPerDay = 86400000;
  const daysSinceStart = Math.floor((now - sprintStart) / msPerDay);
  const currentSprintNumber = Math.floor(daysSinceStart / sprintLengthDays);
  const currentSprintStart = new Date(sprintStart.getTime() + currentSprintNumber * sprintLengthDays * msPerDay);
  const currentSprintEnd = new Date(currentSprintStart.getTime() + sprintLengthDays * msPerDay);

  return date >= currentSprintStart && date < currentSprintEnd;
}

export function filterLogByPeriod(log, period, profile = {}, now = new Date()) {
  switch (period) {
    case 'today':
      return log.filter(entry => isToday(entry.date, now));
    case 'week':
      return log.filter(entry => isThisWeek(entry.date, now));
    case 'sprint':
      return log.filter(entry =>
        isInSprint(entry.date, profile.sprintStartDate, profile.sprintLengthDays, now)
      );
    case 'all':
    default:
      return [...log];
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/utils.test.js
```

Expected: all 12 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils.js tests/utils.test.js
git commit -m "feat: add date filtering and input validation utilities"
```

---

## Chunk 2: CLI Commands

### Task 6: Setup Command

**Files:**
- Create: `src/commands/setup.js`
- Create: `tests/commands/setup.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/commands/setup.test.js`:

```js
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
    expect(data.profile.exercises).toHaveLength(5); // defaults only
  });

  it('saves profile with equipment', () => {
    runSetup({ equipment: ['pull-up-bar', 'bands'], tone: 'encouraging' }, testDir);
    const data = loadData(testDir);
    expect(data.profile.equipment).toEqual(['pull-up-bar', 'bands']);
    expect(data.profile.tone).toBe('encouraging');
    expect(data.profile.exercises.length).toBe(5 + 2 + 2); // defaults + pullup + bands
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/commands/setup.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement setup command**

Create `src/commands/setup.js`:

```js
import { loadData, saveData } from '../storage.js';
import { getExercisesForEquipment } from '../exercises.js';

export function runSetup(answers, dataDir) {
  const data = loadData(dataDir);
  const exercises = getExercisesForEquipment(answers.equipment);

  data.profile = {
    equipment: answers.equipment,
    exercises,
    tone: answers.tone,
    sprintLengthDays: 14,
    sprintStartDate: new Date().toISOString().split('T')[0],
  };

  saveData(dataDir, data);
  return data;
}

export async function interactiveSetup(dataDir) {
  const inquirer = await import('inquirer');

  const answers = await inquirer.default.prompt([
    {
      type: 'checkbox',
      name: 'equipment',
      message: 'Got any equipment?',
      choices: [
        { name: 'Pull-up bar', value: 'pull-up-bar' },
        { name: 'Resistance bands', value: 'bands' },
        { name: 'Weights / dumbbells', value: 'weights' },
      ],
    },
    {
      type: 'list',
      name: 'tone',
      message: 'Pick your vibe:',
      choices: [
        { name: 'Minimal — "Push-ups (10) — How many did you do?"', value: 'minimal' },
        { name: 'Encouraging — "Nice PR! Time for 10 push-ups — you\'ve got this!"', value: 'encouraging' },
      ],
    },
  ]);

  runSetup(answers, dataDir);
  console.log('\nYou\'re all set! Exercises will appear when you create PRs.\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/commands/setup.test.js
```

Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/setup.js tests/commands/setup.test.js
git commit -m "feat: add setup command with equipment and tone selection"
```

---

### Task 7: Prompt Command (with Daily Choice)

**Files:**
- Create: `src/commands/prompt.js`
- Create: `tests/commands/prompt.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/commands/prompt.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/commands/prompt.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement prompt command**

Create `src/commands/prompt.js`:

```js
import { loadData, saveData } from '../storage.js';
import { pickExercise, pickRepCount } from '../exercises.js';
import { formatPrompt, formatDailyChoice } from '../tones.js';

export function generatePrompt(dataDir) {
  const data = loadData(dataDir);

  if (!data.profile) {
    return { needsSetup: true };
  }

  const today = new Date().toISOString().split('T')[0];

  // Check if daily choice is set and current
  if (!data.dailyChoice || data.dailyChoice.date !== today) {
    return {
      needsDailyChoice: true,
      exercises: data.profile.exercises,
      dailyChoicePrompt: formatDailyChoice(data.profile.exercises),
    };
  }

  // Daily choice is set — generate the prompt
  const exerciseName = data.dailyChoice.exercise;
  const exercise = data.profile.exercises.find(e => e.name === exerciseName);

  if (!exercise) {
    return { needsDailyChoice: true, exercises: data.profile.exercises, dailyChoicePrompt: formatDailyChoice(data.profile.exercises) };
  }

  const count = pickRepCount(exercise);
  const prompt = formatPrompt(data.profile.tone, exercise.name, count, exercise.unit);

  return {
    needsSetup: false,
    needsDailyChoice: false,
    exercise: exercise.name,
    unit: exercise.unit,
    count,
    prompt,
  };
}

export function setDailyChoice(dataDir, choice) {
  const data = loadData(dataDir);
  const today = new Date().toISOString().split('T')[0];

  let exerciseName = choice;
  if (choice === 'random') {
    const picked = pickExercise(data.profile.exercises);
    exerciseName = picked.name;
  }

  data.dailyChoice = { date: today, exercise: exerciseName };
  saveData(dataDir, data);
  return exerciseName;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/commands/prompt.test.js
```

Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/prompt.js tests/commands/prompt.test.js
git commit -m "feat: add prompt command with daily exercise selection"
```

---

### Task 8: Log Command

**Files:**
- Create: `src/commands/log.js`
- Create: `tests/commands/log.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/commands/log.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDir, cleanTestDir } from '../helpers/test-storage.js';
import { runSetup } from '../../src/commands/setup.js';
import { recordExercise } from '../../src/commands/log.js';
import { loadData } from '../../src/storage.js';

describe('log command', () => {
  let testDir;

  beforeEach(() => {
    testDir = createTestDir();
    runSetup({ equipment: [], tone: 'minimal' }, testDir);
  });

  afterEach(() => {
    cleanTestDir(testDir);
  });

  it('records an exercise entry', () => {
    recordExercise(testDir, { exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 10, pr: null });
    const data = loadData(testDir);
    expect(data.log).toHaveLength(1);
    expect(data.log[0].exercise).toBe('push-ups');
    expect(data.log[0].assigned).toBe(10);
    expect(data.log[0].completed).toBe(10);
  });

  it('appends to existing log', () => {
    recordExercise(testDir, { exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 10, pr: null });
    recordExercise(testDir, { exercise: 'sit-ups', unit: 'reps', assigned: 15, completed: 12, pr: 'fix/#99' });
    const data = loadData(testDir);
    expect(data.log).toHaveLength(2);
  });

  it('stores ISO date', () => {
    recordExercise(testDir, { exercise: 'push-ups', unit: 'reps', assigned: 10, completed: 10, pr: null });
    const data = loadData(testDir);
    expect(data.log[0].date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('rejects invalid completed value', () => {
    expect(() => {
      recordExercise(testDir, { exercise: 'push-ups', unit: 'reps', assigned: 10, completed: -5, pr: null });
    }).toThrow('must be a non-negative number');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/commands/log.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement log command**

Create `src/commands/log.js`:

```js
import { loadData, saveData } from '../storage.js';

export function recordExercise(dataDir, { exercise, unit, assigned, completed, pr }) {
  if (typeof completed !== 'number' || completed < 0) {
    throw new Error('Completed must be a non-negative number');
  }

  const data = loadData(dataDir);

  data.log.push({
    date: new Date().toISOString(),
    exercise,
    unit: unit || 'reps',
    assigned,
    completed,
    pr: pr || null,
  });

  saveData(dataDir, data);
  return data.log[data.log.length - 1];
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/commands/log.test.js
```

Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/log.js tests/commands/log.test.js
git commit -m "feat: add log command to record exercise completion"
```

---

### Task 9: Stats Command

**Files:**
- Create: `src/commands/stats.js`
- Create: `tests/commands/stats.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/commands/stats.test.js`:

```js
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
    expect(output).toContain('push-ups');
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/commands/stats.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement stats command**

Create `src/commands/stats.js`:

```js
import { loadData } from '../storage.js';
import { filterLogByPeriod, capitalize } from '../utils.js';

const PERIOD_LABELS = {
  today: 'Today',
  week: 'This Week',
  sprint: 'This Sprint',
  all: 'All Time',
};

export function getStats(dataDir, period = 'week', now = new Date()) {
  const data = loadData(dataDir);
  const filtered = filterLogByPeriod(data.log, period, data.profile || {}, now);

  const exercises = {};
  for (const entry of filtered) {
    if (!exercises[entry.exercise]) {
      exercises[entry.exercise] = { assigned: 0, completed: 0, balance: 0 };
    }
    exercises[entry.exercise].assigned += entry.assigned;
    exercises[entry.exercise].completed += entry.completed;
    exercises[entry.exercise].balance += (entry.completed - entry.assigned);
  }

  return { exercises, totalPRs: filtered.length };
}

export function formatStats(dataDir, period = 'week', now = new Date()) {
  const { exercises, totalPRs } = getStats(dataDir, period, now);
  const label = PERIOD_LABELS[period] || period;

  if (totalPRs === 0) {
    return `PR Fitness — ${label}\n\nNo exercises logged yet.\n`;
  }

  const lines = [`PR Fitness — ${label}\n`];
  const header = 'Exercise'.padEnd(20) + 'Assigned'.padStart(10) + 'Done'.padStart(8) + 'Balance'.padStart(10);
  lines.push(header);

  for (const [name, data] of Object.entries(exercises)) {
    const balance = data.balance > 0 ? `+${data.balance}` : `${data.balance}`;
    lines.push(
      capitalize(name).padEnd(20) +
      String(data.assigned).padStart(10) +
      String(data.completed).padStart(8) +
      balance.padStart(10)
    );
  }

  lines.push(`\nTotal PRs: ${totalPRs}`);
  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/commands/stats.test.js
```

Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/stats.js tests/commands/stats.test.js
git commit -m "feat: add stats command with balance tracking and period filtering"
```

---

### Task 10: History Command

**Files:**
- Create: `src/commands/history.js`
- Create: `tests/commands/history.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/commands/history.test.js`:

```js
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
    const sitUpsPos = output.indexOf('sit-ups');
    const pushUpsPos = output.indexOf('push-ups');
    expect(sitUpsPos).toBeLessThan(pushUpsPos); // most recent first
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/commands/history.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement history command**

Create `src/commands/history.js`:

```js
import { loadData } from '../storage.js';
import { filterLogByPeriod, capitalize } from '../utils.js';

const PERIOD_LABELS = {
  today: 'Today',
  week: 'This Week',
  sprint: 'This Sprint',
  all: 'All Time',
};

export function formatHistory(dataDir, period = 'today', now = new Date()) {
  const data = loadData(dataDir);
  const filtered = filterLogByPeriod(data.log, period, data.profile || {}, now);
  const label = PERIOD_LABELS[period] || period;

  if (filtered.length === 0) {
    return `PR Fitness History — ${label}\n\nNo exercises logged yet.\n`;
  }

  // Reverse chronological
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  const lines = [`PR Fitness History — ${label}\n`];
  for (const entry of sorted) {
    const time = new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date(entry.date).toLocaleDateString();
    const unit = entry.unit === 'seconds' ? 's' : '';
    const diff = entry.completed - entry.assigned;
    const diffStr = diff > 0 ? ` (+${diff})` : diff < 0 ? ` (${diff})` : '';
    const pr = entry.pr ? ` [${entry.pr}]` : '';
    lines.push(`  ${date} ${time}  ${capitalize(entry.exercise)} — ${entry.completed}${unit}/${entry.assigned}${unit}${diffStr}${pr}`);
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/commands/history.test.js
```

Expected: all 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/history.js tests/commands/history.test.js
git commit -m "feat: add history command showing exercise log"
```

---

### Task 11: Reset Command

**Files:**
- Create: `src/commands/reset.js`
- Create: `tests/commands/reset.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/commands/reset.test.js`:

```js
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
    // Original 2 entries + 1 offset entry for push-ups (owed 15, so +15 offset)
    expect(data.log.length).toBeGreaterThan(2);
    expect(data.profile).not.toBeNull();
    // Net balance should now be zero
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/commands/reset.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement reset command**

Create `src/commands/reset.js`:

```js
import { loadData, saveData } from '../storage.js';

export function resetBalances(dataDir) {
  const data = loadData(dataDir);

  // Calculate current balance per exercise and add offset entries to zero them out
  const balances = {};
  for (const entry of data.log) {
    if (!balances[entry.exercise]) {
      balances[entry.exercise] = { balance: 0, unit: entry.unit || 'reps' };
    }
    balances[entry.exercise].balance += (entry.completed - entry.assigned);
  }

  for (const [exercise, info] of Object.entries(balances)) {
    if (info.balance !== 0) {
      // Add a compensating entry: if balance is -10, add completed=10, assigned=0
      // If balance is +5, add assigned=5, completed=0
      data.log.push({
        date: new Date().toISOString(),
        exercise,
        unit: info.unit,
        assigned: info.balance > 0 ? info.balance : 0,
        completed: info.balance < 0 ? Math.abs(info.balance) : 0,
        pr: null,
      });
    }
  }

  saveData(dataDir, data);
}

export function resetAll(dataDir) {
  const data = loadData(dataDir);
  data.log = [];
  data.dailyChoice = null;
  saveData(dataDir, data);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/commands/reset.test.js
```

Expected: all 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/reset.js tests/commands/reset.test.js
git commit -m "feat: add reset command to clear balances or all data"
```

---

## Chunk 3: CLI Wiring, Config Command, and Hook

### Task 12: Config Command

**Files:**
- Create: `src/commands/config.js`
- Create: `tests/commands/config.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/commands/config.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/commands/config.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement config command**

Create `src/commands/config.js`:

```js
import { loadData, saveData } from '../storage.js';
import { getExercisesForEquipment } from '../exercises.js';

export function updateConfig(dataDir, updates) {
  const data = loadData(dataDir);

  if (!data.profile) {
    throw new Error('Run pr-fitness setup first');
  }

  if (updates.tone) {
    data.profile.tone = updates.tone;
  }

  if (updates.equipment) {
    data.profile.equipment = updates.equipment;
    data.profile.exercises = getExercisesForEquipment(updates.equipment);
  }

  if (updates.sprintLengthDays) {
    data.profile.sprintLengthDays = updates.sprintLengthDays;
  }

  if (updates.sprintStartDate) {
    data.profile.sprintStartDate = updates.sprintStartDate;
  }

  saveData(dataDir, data);
  return data.profile;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/commands/config.test.js
```

Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/config.js tests/commands/config.test.js
git commit -m "feat: add config command to update preferences"
```

---

### Task 13: Wire All Commands to CLI Entry Point

**Files:**
- Modify: `bin/pr-fitness.js`

- [ ] **Step 1: Wire up all commands**

Update `bin/pr-fitness.js`:

```js
#!/usr/bin/env node
import { program } from 'commander';
import { getDefaultDir } from '../src/storage.js';

const dataDir = process.env.PR_FITNESS_DIR || getDefaultDir();

program
  .name('pr-fitness')
  .description('Get fit one PR at a time')
  .version('0.1.0');

program
  .command('setup')
  .description('Set up your exercise preferences')
  .action(async () => {
    const { interactiveSetup } = await import('../src/commands/setup.js');
    await interactiveSetup(dataDir);
  });

program
  .command('prompt')
  .description('Get your exercise assignment')
  .option('--pr <pr>', 'PR reference')
  .action(async (opts) => {
    const { generatePrompt, setDailyChoice } = await import('../src/commands/prompt.js');
    const result = generatePrompt(dataDir);

    if (result.needsSetup) {
      const { interactiveSetup } = await import('../src/commands/setup.js');
      await interactiveSetup(dataDir);
      const retried = generatePrompt(dataDir);
      console.log(retried.dailyChoicePrompt || retried.prompt);
      return;
    }

    if (result.needsDailyChoice) {
      console.log(result.dailyChoicePrompt);
      return;
    }

    console.log(result.prompt);
  });

program
  .command('choose <exercise>')
  .description('Set your exercise for today (or "random")')
  .action(async (exercise) => {
    const { setDailyChoice } = await import('../src/commands/prompt.js');
    const chosen = setDailyChoice(dataDir, exercise);
    console.log(`Locked in: ${chosen} for today!`);
  });

program
  .command('log')
  .description('Record completed exercise')
  .requiredOption('--exercise <name>', 'Exercise name')
  .requiredOption('--assigned <n>', 'Assigned amount', Number)
  .requiredOption('--completed <n>', 'Completed amount', Number)
  .option('--unit <unit>', 'reps or seconds', 'reps')
  .option('--pr <pr>', 'PR reference')
  .action(async (opts) => {
    const { recordExercise } = await import('../src/commands/log.js');
    const { validateCompleted } = await import('../src/utils.js');

    const completed = validateCompleted(String(opts.completed));
    if (completed === null) {
      console.error('Completed must be a non-negative number.');
      process.exit(1);
    }

    recordExercise(dataDir, {
      exercise: opts.exercise,
      unit: opts.unit,
      assigned: opts.assigned,
      completed,
      pr: opts.pr || null,
    });

    const diff = completed - opts.assigned;
    if (diff > 0) {
      console.log(`Logged! You banked +${diff}. Nice work!`);
    } else if (diff < 0) {
      console.log(`Logged! You owe ${Math.abs(diff)} — you'll get there!`);
    } else {
      console.log('Logged! Right on target.');
    }
  });

program
  .command('history')
  .description('Show exercise history')
  .option('-p, --period <period>', 'today, week, sprint, or all', 'today')
  .action(async (opts) => {
    const { formatHistory } = await import('../src/commands/history.js');
    console.log(formatHistory(dataDir, opts.period));
  });

program
  .command('stats')
  .description('Show exercise balance summary')
  .option('-p, --period <period>', 'today, week, sprint, or all', 'week')
  .action(async (opts) => {
    const { formatStats } = await import('../src/commands/stats.js');
    console.log(formatStats(dataDir, opts.period));
  });

program
  .command('config')
  .description('Update preferences')
  .option('--tone <tone>', 'minimal or encouraging')
  .option('--equipment <items>', 'Comma-separated: pull-up-bar,bands,weights')
  .option('--sprint-length <days>', 'Sprint length in days', Number)
  .action(async (opts) => {
    const { updateConfig } = await import('../src/commands/config.js');
    const updates = {};
    if (opts.tone) updates.tone = opts.tone;
    if (opts.equipment) updates.equipment = opts.equipment.split(',');
    if (opts.sprintLength) updates.sprintLengthDays = opts.sprintLength;

    try {
      updateConfig(dataDir, updates);
      console.log('Config updated!');
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

program
  .command('reset')
  .description('Clear exercise data')
  .option('--all', 'Clear all data (keeps profile)')
  .action(async (opts) => {
    const inquirer = await import('inquirer');
    const { answer } = await inquirer.default.prompt([{
      type: 'confirm',
      name: 'answer',
      message: opts.all ? 'Clear all exercise data? (profile is kept)' : 'Reset all balances to zero?',
      default: false,
    }]);

    if (!answer) {
      console.log('Cancelled.');
      return;
    }

    if (opts.all) {
      const { resetAll } = await import('../src/commands/reset.js');
      resetAll(dataDir);
      console.log('All data cleared. Fresh start!');
    } else {
      const { resetBalances } = await import('../src/commands/reset.js');
      resetBalances(dataDir);
      console.log('Balances reset to zero.');
    }
  });

program.parse();
```

- [ ] **Step 2: Test CLI manually**

```bash
PR_FITNESS_DIR=/tmp/pr-fitness-test node bin/pr-fitness.js --help
PR_FITNESS_DIR=/tmp/pr-fitness-test node bin/pr-fitness.js stats --help
```

Expected: help output showing all commands

- [ ] **Step 3: Commit**

```bash
git add bin/pr-fitness.js
git commit -m "feat: wire all commands to CLI entry point"
```

---

### Task 14: Claude Code Hook Example

**Files:**
- Create: `hooks/claude-code-hooks.json`

- [ ] **Step 1: Create hook configuration example**

Create `hooks/claude-code-hooks.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "command": "if echo \"$CC_TOOL_INPUT\" | grep -q 'gh pr create'; then pr-fitness prompt --pr \"$(echo $CC_TOOL_OUTPUT | grep -oE 'https://github.com/[^ ]+' | head -1)\"; fi",
        "description": "PR Fitness: assigns an exercise after creating a PR. If it outputs a daily choice menu, respond with the exercise name or 'random', then Claude will call 'pr-fitness choose <name>' followed by 'pr-fitness prompt' again."
      }
    ]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/claude-code-hooks.json
git commit -m "feat: add example Claude Code hook configuration"
```

---

### Task 15: Run Full Test Suite and Final Verification

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 2: Test full CLI flow manually**

```bash
PR_FITNESS_DIR=/tmp/pr-fitness-e2e node bin/pr-fitness.js prompt
# Should trigger setup or show daily choice
```

- [ ] **Step 3: Link and test as global command**

```bash
npm link
PR_FITNESS_DIR=/tmp/pr-fitness-e2e pr-fitness --version
npm unlink
```

Expected: `0.1.0`

- [ ] **Step 4: Commit any fixes**

```bash
git status
# If fixes were needed, commit them
```
