# Adaptive Rep Count System

**Date:** 2026-03-12
**Status:** Approved

## Problem

Rep counts are hardcoded per exercise (e.g. pull-ups 3-8). Users who can easily exceed the max bank a huge surplus every time. Users who struggle with the minimum fall behind. The system doesn't match individual fitness levels.

## Solution

Replace hardcoded ranges with an adaptive system that learns from the user's actual completions. No setup changes — it works automatically from existing log data.

### Adaptive Rep Assignment

**New function:** `getAdaptiveRepCount(exercise, log)` in `exercises.js`

**Logic:**
1. Filter the log for entries matching the exercise name, sorted by date (most recent first)
2. If fewer than 3 entries: fall back to `pickRepCount(exercise)` (current hardcoded min/max)
3. If 3+ entries: calculate weighted average of the `completed` field using exponential decay (factor 0.9)
4. Assign a random value between 80% and 120% of the weighted average, rounded to nearest integer
5. Clamp result to exercise's `min`/`max` as guardrails — never go below the exercise minimum or above 2x the exercise maximum
6. Floor of 1 — never assign 0

**Zero completions:** Entries where `completed` is 0 are included in the average. If a user logs 0, that's real data — they couldn't do the exercise and the system should adapt downward.

**Exponential decay formula:**
```
weights: [1.0, 0.9, 0.81, 0.729, ...] (most recent first, sorted by date)
weightedAvg = sum(completed[i] * weight[i]) / sum(weight[i])
```

This means recent sessions matter more, but no single session dominates. ~10 sessions ago has ~35% weight.

**Integration point:** `generatePrompt` in `prompt.js` currently calls `pickRepCount(exercise)`. Change it to call `getAdaptiveRepCount(exercise, data.log)` instead, which internally falls back to `pickRepCount` when there's not enough data.

### Simplified Log Response

**Current behavior** (in `bin/pr-fitness.js`):
- "Logged! You banked +6. Nice work!"
- "Logged! You owe 3 — you'll get there!"
- "Logged! Right on target."

**New behavior:**
- "Logged! Back to work."

Just confirm and move on. This is an intentional simplification — the surplus/deficit messaging was noise during the coding flow. Balance data still tracked internally and viewable via `pr-fitness stats`.

## Files Changed

| File | Change |
|------|--------|
| `src/exercises.js` | Add `getAdaptiveRepCount(exercise, log)` |
| `src/commands/prompt.js` | Use `getAdaptiveRepCount` instead of `pickRepCount` |
| `bin/pr-fitness.js` | Simplify log command output |
| `tests/exercises.test.js` | Add tests for adaptive rep count |
| `tests/commands/prompt.test.js` | Update to verify adaptive integration |

## What Doesn't Change

- Storage schema (reads existing log entries)
- Setup flow (no new questions)
- `pickRepCount` still exists as fallback
- Stats/history still track balance internally
