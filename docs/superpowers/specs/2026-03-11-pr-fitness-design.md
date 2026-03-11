# PR Fitness — Design Spec

## Overview

A lightweight Node.js CLI tool and Claude Code hook that assigns quick calisthenics exercises when you create a pull request. Tracks what you've done vs what you owe, and optionally shares stats with your team.

The tool is meant to be fun, light, and joyful. It should not get in the way of work — it should bring a moment of movement and encouragement to the PR workflow.

## Core Flow

### First PR of the Day

On the first PR of each day, the hook detects there are no log entries for today and outputs a daily exercise selection prompt:

```
Good morning! Pick your exercise for today:
1. Push-ups
2. Sit-ups
3. Squats
4. Lunges
5. Plank
6. Random (surprise me)
```

The user picks one (or "random"), and that exercise is locked in for the rest of the day. Subsequent PRs that day skip this step and go straight to the assigned exercise.

The daily choice is stored in `~/.pr-fitness/data.json` under a `dailyChoice` field:

```json
{
  "dailyChoice": {
    "date": "2026-03-11",
    "exercise": "push-ups"
  }
}
```

### Subsequent PRs

1. PR created → Claude Code hook runs `pr-fitness prompt` and outputs the exercise assignment
2. Claude sees the hook output and relays it to the user: `Push-ups (10) — How many did you do?`
3. User responds in the conversation with a number
4. Claude calls `pr-fitness log --exercise push-ups --assigned 10 --completed 15` to record it
5. Difference is tracked: negative = owed, positive = banked credit
6. User moves on with their day

The hook itself is non-interactive — it assigns the exercise and outputs the prompt. The actual user interaction happens through Claude Code's conversation, and logging is a separate CLI call.

## CLI Commands

| Command | Description |
|---------|-------------|
| `pr-fitness setup` | Interactive onboarding: equipment, exercise pool, tone |
| `pr-fitness prompt` | Assign an exercise and output the prompt (called by the hook) |
| `pr-fitness log` | Record completed reps: `--exercise push-ups --assigned 10 --completed 15` |
| `pr-fitness history` | Show exercise history (today / this week / this sprint) |
| `pr-fitness stats` | Summary with owed vs banked per exercise |
| `pr-fitness config` | Update preferences |
| `pr-fitness reset` | Clear all data or reset balance to zero |

## Data Model

Storage: local JSON file at `~/.pr-fitness/data.json`

```json
{
  "profile": {
    "equipment": ["pull-up-bar", "bands"],
    "exercises": [
      { "name": "push-ups", "unit": "reps", "min": 5, "max": 15 },
      { "name": "plank", "unit": "seconds", "min": 15, "max": 30 },
      { "name": "lunges", "unit": "reps", "min": 10, "max": 20, "note": "total, alternating legs" }
    ],
    "tone": "minimal",
    "sprintLengthDays": 14,
    "sprintStartDate": "2026-03-02"
  },
  "log": [
    {
      "date": "2026-03-11T14:30:00Z",
      "exercise": "push-ups",
      "unit": "reps",
      "assigned": 10,
      "completed": 15,
      "pr": "feat/add-auth#42"
    }
  ]
}
```

### Fields

- **profile.equipment**: List of available equipment. Options: `none`, `pull-up-bar`, `bands`, `weights`
- **profile.exercises**: Exercise definitions with name, unit (`reps` or `seconds`), and min/max range
- **profile.tone**: Display personality. One of `minimal`, `encouraging`
- **profile.sprintLengthDays**: Sprint length in days (default 14)
- **profile.sprintStartDate**: Start date of current sprint cycle
- **log[].date**: ISO timestamp of when the exercise was assigned
- **log[].exercise**: Name of the exercise
- **log[].unit**: `reps` or `seconds`
- **log[].assigned**: Amount suggested
- **log[].completed**: Amount the user reported doing
- **log[].pr**: PR identifier (optional, captured from hook context)

## Exercise Selection

### Default Pool (no equipment)

| Exercise | Unit | Range | Notes |
|----------|------|-------|-------|
| Push-ups | reps | 5–15 | |
| Sit-ups | reps | 10–20 | |
| Squats | reps | 10–15 | |
| Lunges | reps | 10–20 | Total, alternating legs |
| Plank | seconds | 15–30 | |

### Equipment Unlocks

| Equipment | Exercises Added |
|-----------|----------------|
| Pull-up bar | Pull-ups (3–8 reps), Hanging leg raises (5–10 reps) |
| Bands | Band rows (8–12 reps), Band pull-aparts (10–15 reps) |
| Weights | Dumbbell curls (8–12 reps), Overhead press (5–10 reps) |

All exercises are low-rep, office-floor friendly. Selection is random from the user's configured pool. No variety algorithm in v1 — random is intentionally simple.

## Tone Presets

| Tone | Example Output |
|------|---------------|
| **minimal** (default) | `Push-ups (10) — How many did you do?` |
| **encouraging** | `Nice PR! Time for 10 push-ups — you've got this! How many did you get?` |

Units are reflected in the prompt: `Plank (20s) — How many seconds did you hold?`

Users can customize their tone preference during setup or via `pr-fitness config`.

## Onboarding (Setup)

### Flow

1. Run `pr-fitness setup` or get prompted on first `pr-fitness prompt` invocation
2. "Got any equipment?" → multi-select: pull-up bar / bands / weights / none
3. Exercise pool auto-generated based on equipment
4. "Pick your vibe:" → minimal / encouraging
5. Config saved to `~/.pr-fitness/data.json`

Storage backend selection is omitted from v1 setup since only local storage is implemented. Future backends will be added to setup when available.

If setup hasn't been run, the first `pr-fitness prompt` invocation triggers setup automatically.

## Input Validation

- `completed` must be a non-negative integer (or non-negative number for seconds)
- Non-numeric input is rejected with a friendly message
- No upper cap — if someone says they did 100 push-ups, good for them

## Stats and Tracking

### Balance Tracking

Each exercise maintains a running balance:
- Assigned 10, completed 10 → balance: 0
- Assigned 10, completed 0 → balance: -10 (owed)
- Assigned 10, completed 15 → balance: +5 (banked)

### Views

- **Daily**: exercises assigned and completed today
- **Weekly**: summary for the current week (Monday–Sunday)
- **Sprint**: based on `sprintLengthDays` and `sprintStartDate` in config
- **All-time**: cumulative stats

### Example Output (`pr-fitness stats`)

```
PR Fitness — This Week

Exercise      Assigned  Done  Balance
Push-ups           30    35      +5
Sit-ups            20    10     -10
Squats             15    15       0

Total PRs: 6
```

### Reset

`pr-fitness reset` offers:
- Reset all balances to zero (keeps history)
- Clear all data (fresh start)

## Storage

### Local (default, v1)

- JSON file at `~/.pr-fitness/data.json`
- Zero dependencies, zero setup
- Human-readable, easy to debug
- Atomic writes: write to temp file, then rename (prevents corruption from concurrent writes)

### Future Backends (post-v1)

- **Google Sheets**: shared team tracking
- **Custom API**: POST/GET to a webhook URL for custom dashboards

## Claude Code Integration

### Hook Configuration

Uses a `PostToolUse` hook that fires after the Bash tool runs `gh pr create`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "command": "pr-fitness prompt --pr \"$CC_TOOL_OUTPUT\"",
        "description": "Assign a fitness exercise after creating a PR"
      }
    ]
  }
}
```

The hook outputs the exercise assignment (e.g., `Push-ups (10) — How many did you do?`). Claude Code relays this to the user in conversation. When the user responds with a number, Claude calls `pr-fitness log` to record it.

Teams share this by including the hook config in their repo's `.claude/hooks.json`. Each team member installs `pr-fitness` and runs setup individually.

### Manual Use

Works standalone without Claude Code:

```bash
npx pr-fitness setup    # one-time
npx pr-fitness prompt   # assign an exercise
npx pr-fitness log --exercise push-ups --assigned 10 --completed 8
npx pr-fitness stats    # check your balance
```

## Distribution

- Published to npm as `pr-fitness`
- `npx pr-fitness setup` to get started instantly
- Open source, MIT license
- README with quick start, team setup guide, and contributing guidelines

## Technical Stack

- **Runtime**: Node.js
- **Package manager**: npm
- **Storage**: JSON file (default), pluggable backends via adapter pattern
- **CLI framework**: TBD during implementation (e.g., inquirer for prompts, commander for CLI parsing)
- **No external services required** for default usage

## Out of Scope (for v1)

- Web dashboard
- Slack/Discord integration
- Leaderboards
- Custom exercise creation UI (edit JSON directly for now)
- Team sync without external storage
- Smart exercise rotation / avoiding repeats
- Balance decay or auto-forgiveness
