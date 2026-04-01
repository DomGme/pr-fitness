# Non-Interactive Hook Design

**Date:** 2026-03-30
**Status:** Draft
**Issue:** Hook fires on `gh pr create` but fails silently because `pr-fitness prompt` requires interactive stdin (Inquirer menu) which isn't available in hook context.

## Problem

The PreToolUse hook runs `pr-fitness prompt 2>/dev/null` when it detects `gh pr create`. This fails because:

1. Hooks run non-interactively — no tty, no stdin for Inquirer
2. `2>/dev/null` suppresses all error output
3. The hook doesn't return structured data that Claude Code can act on
4. Claude never sees the exercise assignment

## Solution

Make the hook a **state reporter** that returns structured JSON. Claude becomes the interactive layer — it reads the state and handles the conversation (picking exercises, showing assignments, logging completions).

## Design Principle

The hook should never try to be interactive. It detects `gh pr create`, checks PR Fitness state, and returns guidance to Claude. Claude handles all user interaction. The PR creation is not blocked — the user does their workout while the PR runs.

## New Command: `pr-fitness status --json`

A non-interactive command that returns current state as JSON to stdout.

### Output States

**No profile (needs setup):**
```json
{
  "state": "needs-setup"
}
```

**Profile exists, no daily choice for today:**
```json
{
  "state": "needs-choice",
  "exercises": [
    { "name": "push-ups", "unit": "reps", "min": 5, "max": 15 },
    { "name": "squats", "unit": "reps", "min": 10, "max": 15 },
    { "name": "plank", "unit": "seconds", "min": 15, "max": 30 }
  ]
}
```

**Daily choice set, ready to assign reps:**
```json
{
  "state": "ready",
  "exercise": "push-ups",
  "count": 12,
  "unit": "reps",
  "prompt": "Push-ups (12) — How many did you do?"
}
```

### Implementation

New file: `src/commands/status.js`

```javascript
export function getStatus(dataDir) {
  // Reuses loadData from storage.js
  // Reuses getAdaptiveRepCount from exercises.js
  // Reuses formatPrompt from tones.js
  // Returns one of the three state objects above
}
```

CLI registration in `bin/pr-fitness.js`:

```javascript
program
  .command('status')
  .description('Check current exercise state')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { getStatus } = await import('../src/commands/status.js');
    const status = getStatus(dataDir);
    if (opts.json) {
      console.log(JSON.stringify(status));
    } else {
      // Human-readable fallback
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

## Updated Hook

### Hook Command

```bash
INPUT=$(cat); if echo "$INPUT" | jq -r '.tool_input.command' 2>/dev/null | grep -q 'gh pr create'; then pr-fitness status --json 2>/dev/null; fi
```

Key differences from current hook:
- Runs `pr-fitness status --json` instead of `pr-fitness prompt`
- No interactive prompts — pure JSON output
- stdout reaches Claude as hook context (not suppressed)
- Hook allows the tool (no blocking response)

### Hook Config Update

`src/commands/setup.js` `getHookConfig()` returns the updated command.

`hooks/claude-code-hooks.json` updated to match.

## Claude's Conversation Flow

When Claude sees the hook output before `gh pr create`, it acts on the `state` field:

| State | Claude's Action |
|-------|----------------|
| `needs-setup` | Tells user to run `pr-fitness setup` first |
| `needs-choice` | Shows exercise list from `exercises` array, asks user to pick, runs `pr-fitness choose <pick>`, then runs `pr-fitness status --json` again to get the `ready` state with rep count and show assignment |
| `ready` | Shows the `prompt` text (exercise + rep count), asks how many they did, runs `pr-fitness log --exercise <name> --assigned <n> --completed <n> --pr <ref>` |

The PR creation proceeds without blocking. The user does their workout while the PR is being created/reviewed.

## Files Changed

| File | Change |
|------|--------|
| `src/commands/status.js` | **New** — `getStatus(dataDir)` returns state JSON |
| `bin/pr-fitness.js` | Add `status` command with `--json` flag |
| `src/commands/setup.js` | Update `getHookConfig()` to use `status --json` |
| `hooks/claude-code-hooks.json` | Updated hook command |
| `tests/commands/status.test.js` | **New** — tests for all three states |
| `tests/commands/setup.test.js` | Update hook config snapshot |

## Files Unchanged

- `src/commands/prompt.js` — still works for manual interactive use
- `src/commands/log.js`, `history.js`, `stats.js`, `config.js` — untouched
- `src/storage.js` — no data model changes
- `src/exercises.js` — no algorithm changes
- `src/tones.js` — no formatting changes

## Migration

Users with the old hook installed need to re-run `pr-fitness setup` to upgrade.

### Upgrade Logic in `installHook()`

The current `installHook()` detects existing hooks via `sub.command.includes('pr-fitness prompt')` and returns "already-installed" without updating. This must change to support upgrades:

1. **Detect old hook:** Check for hooks containing `pr-fitness prompt` (the old command)
2. **Detect current hook:** Check for hooks containing `pr-fitness status` (the new command)
3. **If old hook found:** Replace it in-place with the new hook config, return `{ installed: true, upgraded: true }`
4. **If current hook found:** Return `{ installed: false, reason: 'already-installed' }` (no change needed)
5. **If neither found:** Install fresh as before

```javascript
const oldHookIndex = existing.hooks.PreToolUse.findIndex(
  (h) => h.hooks?.some((sub) => sub.command?.includes('pr-fitness prompt'))
);
const currentHookInstalled = existing.hooks.PreToolUse.some(
  (h) => h.hooks?.some((sub) => sub.command?.includes('pr-fitness status'))
);

if (currentHookInstalled) {
  return { installed: false, reason: 'already-installed' };
}

if (oldHookIndex !== -1) {
  // Replace old hook in-place
  existing.hooks.PreToolUse[oldHookIndex] = hookConfig.hooks.PreToolUse[0];
  // write and return { installed: true, upgraded: true }
} else {
  // Fresh install
  existing.hooks.PreToolUse.push(...hookConfig.hooks.PreToolUse);
  // write and return { installed: true }
}
```

The `interactiveSetup()` flow should inform the user when an upgrade occurs.

## Testing

- `getStatus()` with no profile → returns `needs-setup`
- `getStatus()` with profile, no daily choice → returns `needs-choice` with exercise list
- `getStatus()` with profile and daily choice → returns `ready` with prompt
- `getHookConfig()` returns command containing `pr-fitness status --json`
- Hook command integration: pipe mock JSON input, verify JSON output
