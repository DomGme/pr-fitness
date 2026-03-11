# PR Fitness — Design Spec

## Overview

A lightweight Node.js CLI tool and Claude Code hook that assigns quick calisthenics exercises when you create a pull request. Tracks what you've done vs what you owe, and optionally shares stats with your team.

The tool is meant to be fun, light, and joyful. It should not get in the way of work — it should bring a moment of movement and encouragement to the PR workflow.

## Core Flow

1. PR created → Claude Code hook triggers `pr-fitness prompt`
2. Tool picks an exercise based on user preferences and equipment
3. Displays: `Push-ups (10) — How many did you do?`
4. User responds with a number (0, 10, 15, etc.)
5. Difference is tracked: negative = owed, positive = banked credit
6. User moves on with their day

## CLI Commands

| Command | Description |
|---------|-------------|
| `pr-fitness setup` | Interactive onboarding: equipment, exercise pool, tone, storage backend |
| `pr-fitness prompt` | Assign and log an exercise (called by the hook, or manually) |
| `pr-fitness log` | Show history (today / this week / this sprint) |
| `pr-fitness stats` | Summary with owed vs banked per exercise |
| `pr-fitness config` | Update preferences |

## Data Model

Storage: local JSON file at `~/.pr-fitness/data.json`

```json
{
  "profile": {
    "equipment": ["pull-up-bar", "bands"],
    "exercises": ["push-ups", "sit-ups", "pull-ups", "band-rows"],
    "tone": "minimal",
    "storage": "local"
  },
  "log": [
    {
      "date": "2026-03-11T14:30:00Z",
      "exercise": "push-ups",
      "assigned": 10,
      "completed": 15,
      "pr": "feat/add-auth#42"
    }
  ]
}
```

### Fields

- **profile.equipment**: List of available equipment. Options: `none`, `pull-up-bar`, `bands`, `weights`
- **profile.exercises**: Exercises available based on equipment. Auto-populated during setup, editable via `config`
- **profile.tone**: Display personality. One of `minimal`, `encouraging`
- **profile.storage**: Storage backend. One of `local`, `google-sheets`, `custom-api`
- **log[].date**: ISO timestamp of when the exercise was assigned
- **log[].exercise**: Name of the exercise
- **log[].assigned**: Number of reps suggested
- **log[].completed**: Number of reps the user reported doing
- **log[].pr**: PR identifier (optional, captured from hook context)

## Exercise Selection

### Default Pool (no equipment)

| Exercise | Rep Range |
|----------|-----------|
| Push-ups | 5–15 |
| Sit-ups | 10–20 |
| Squats | 10–15 |
| Lunges | 5–10 per side |
| Plank | 15–30 seconds |

### Equipment Unlocks

| Equipment | Exercises Added |
|-----------|----------------|
| Pull-up bar | Pull-ups (3–8), Hanging leg raises (5–10) |
| Bands | Band rows (8–12), Band pull-aparts (10–15) |
| Weights | Dumbbell curls (8–12), Overhead press (5–10) |

All exercises are low-rep, office-floor friendly. Selection is random from the user's configured pool.

## Tone Presets

| Tone | Example Output |
|------|---------------|
| **minimal** (default) | `Push-ups (10) — How many did you do?` |
| **encouraging** | `Nice PR! Time for 10 push-ups — you've got this! How many did you get?` |

Users can customize their tone preference during setup or via `pr-fitness config`.

## Onboarding (Setup)

### Flow

1. Run `pr-fitness setup` or get prompted on first PR
2. "Got any equipment?" → multi-select: pull-up bar / bands / weights / none
3. Exercise pool auto-generated based on equipment
4. "Pick your vibe:" → minimal / encouraging
5. "Where to store data?" → local (default) / Google Sheets (future) / custom API (future)
6. Config saved to `~/.pr-fitness/data.json`

If setup hasn't been run, the first `pr-fitness prompt` invocation triggers setup automatically.

## Stats and Tracking

### Balance Tracking

Each exercise maintains a running balance:
- Assigned 10, completed 10 → balance: 0
- Assigned 10, completed 0 → balance: -10 (owed)
- Assigned 10, completed 15 → balance: +5 (banked)

### Views

- **Daily**: exercises assigned and completed today
- **Weekly**: summary for the current week
- **Sprint**: configurable sprint length (default 2 weeks)
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

## Storage Backends

### Local (default)

- JSON file at `~/.pr-fitness/data.json`
- Zero dependencies, zero setup
- Human-readable, easy to debug

### Google Sheets (future)

- Shared team tracking
- Each team member's data in a shared spreadsheet
- Requires one-time auth setup

### Custom API (future)

- POST exercise logs to a webhook URL
- GET stats from the same endpoint
- For teams that want their own dashboard

## Claude Code Integration

### Hook Configuration

A hook in the project's `.claude/hooks.json` that fires after PR creation:

```json
{
  "hooks": {
    "post-pr-create": {
      "command": "pr-fitness prompt --pr $PR_URL"
    }
  }
}
```

Teams share this by including the hook config in their repo. Each team member installs `pr-fitness` and runs setup individually.

### Manual Use

Works standalone without Claude Code:

```bash
npx pr-fitness setup    # one-time
npx pr-fitness prompt   # after any PR
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
- **Storage**: JSON file (default), pluggable backends
- **CLI framework**: TBD during implementation (e.g., inquirer for prompts, commander for CLI parsing)
- **No external services required** for default usage

## Out of Scope (for v1)

- Web dashboard
- Slack/Discord integration
- Leaderboards
- Custom exercise creation UI (edit JSON directly for now)
- Team sync without external storage
