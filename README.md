# PR Fitness

Get fit one PR at a time. A CLI tool that assigns calisthenics exercises every time you create a pull request in [Claude Code](https://claude.ai/claude-code).

## How It Works

1. Create a pull request in Claude Code
2. PR Fitness automatically assigns you an exercise
3. Do the exercise, log what you completed
4. Track your balance over time (banked credit vs. what you owe)

On your first PR each day, you pick your exercise for the day (or let it choose randomly). Every subsequent PR that day assigns reps of your chosen exercise.

## Install

```bash
npm install -g pr-fitness
```

## Quick Start

```bash
pr-fitness setup
```

This walks you through two things:

1. **Equipment** — Select what you have (pull-up bar, resistance bands, weights) to unlock additional exercises. No equipment? No problem — the defaults are all bodyweight.
2. **Claude Code hook** — Installs a hook so exercises are assigned automatically when you create PRs. This is the key step. Without it, you'd have to remember to run `pr-fitness prompt` manually.

## Commands

### `pr-fitness setup`

Initial setup. Configures your exercise pool and installs the Claude Code hook.

### `pr-fitness prompt`

Get your exercise assignment. On the first PR of the day, shows a menu to pick your exercise. After that, assigns reps.

### `pr-fitness choose <exercise>`

Lock in your exercise for the day. Use an exercise name or `random`.

```bash
pr-fitness choose push-ups
pr-fitness choose random
```

### `pr-fitness log`

Record a completed exercise.

```bash
pr-fitness log --exercise push-ups --assigned 10 --completed 12
pr-fitness log --exercise plank --assigned 20 --completed 20 --unit seconds
```

- Did more than assigned? You bank the surplus.
- Did fewer? You owe the difference.

### `pr-fitness history`

View your exercise log.

```bash
pr-fitness history                # today
pr-fitness history -p week        # this week
pr-fitness history -p sprint      # current sprint
pr-fitness history -p all         # everything
```

### `pr-fitness stats`

View your exercise balance (banked vs. owed).

```bash
pr-fitness stats                  # this week
pr-fitness stats -p today
pr-fitness stats -p sprint
```

### `pr-fitness config`

Update preferences without re-running setup.

```bash
pr-fitness config --tone encouraging
pr-fitness config --equipment pull-up-bar,bands
pr-fitness config --sprint-length 21
```

### `pr-fitness reset`

Clear exercise data.

```bash
pr-fitness reset          # reset balances to zero
pr-fitness reset --all    # clear all data (keeps profile)
```

## Exercises

**Default (bodyweight):**
- Push-ups (5-15 reps)
- Sit-ups (10-20 reps)
- Squats (10-15 reps)
- Lunges (10-20 reps, alternating legs)
- Plank (15-30 seconds)

**With pull-up bar:**
- Pull-ups (3-8 reps)
- Hanging leg raises (5-10 reps)

**With resistance bands:**
- Band rows (8-12 reps)
- Band pull-aparts (10-15 reps)

**With weights/dumbbells:**
- Dumbbell curls (8-12 reps)
- Overhead press (5-10 reps)

## How the Claude Code Hook Works

During setup, PR Fitness installs a [Claude Code hook](https://docs.anthropic.com/en/docs/claude-code/hooks) at `~/.claude/hooks.json`. This hook watches for `gh pr create` commands and automatically runs `pr-fitness prompt` when a PR is created.

You can also install or inspect the hook manually:

```bash
# The hook config lives at
cat ~/.claude/hooks.json
```

If you skipped hook installation during setup, you can trigger exercises manually:

```bash
pr-fitness prompt
```

## Data Storage

All data is stored locally at `~/.pr-fitness/data.json`. Nothing is sent to any server.

Set `PR_FITNESS_DIR` to use a custom location:

```bash
export PR_FITNESS_DIR=/path/to/custom/dir
```

## Development

```bash
git clone https://github.com/DomGme/pr-fitness.git
cd pr-fitness
npm install
npm link          # makes pr-fitness available globally

npm test          # run tests
npm run test:watch  # watch mode
```

## License

MIT
