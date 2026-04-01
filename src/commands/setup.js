import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadData, saveData } from '../storage.js';
import { getExercisesForEquipment } from '../exercises.js';

export function runSetup(answers, dataDir) {
  const data = loadData(dataDir);
  const exercises = getExercisesForEquipment(answers.equipment);

  data.profile = {
    equipment: answers.equipment,
    exercises,
    tone: 'minimal',
    sprintLengthDays: 14,
    sprintStartDate: new Date().toISOString().split('T')[0],
  };

  saveData(dataDir, data);
  return data;
}

export function getHookConfig() {
  return {
    hooks: {
      PreToolUse: [
        {
          matcher: 'Bash',
          hooks: [
            {
              type: 'command',
              command: "INPUT=$(cat); if echo \"$INPUT\" | jq -r '.tool_input.command' 2>/dev/null | grep -q 'gh pr create'; then pr-fitness status --json 2>/dev/null; fi",
            },
          ],
        },
      ],
    },
  };
}

export function installHook() {
  const claudeDir = join(process.env.HOME || process.env.USERPROFILE, '.claude');
  const hooksPath = join(claudeDir, 'hooks.json');

  mkdirSync(claudeDir, { recursive: true });

  let existing = { hooks: {} };
  if (existsSync(hooksPath)) {
    try {
      existing = JSON.parse(readFileSync(hooksPath, 'utf-8'));
    } catch {
      // If the file is corrupt, start fresh
    }
  }

  // Merge — don't overwrite existing hooks
  if (!existing.hooks) existing.hooks = {};
  if (!existing.hooks.PreToolUse) existing.hooks.PreToolUse = [];

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
}

export async function interactiveSetup(dataDir) {
  const inquirer = await import('inquirer');

  console.log('\nWelcome to PR Fitness! Get fit one PR at a time.\n');

  const { equipment } = await inquirer.default.prompt([
    {
      type: 'checkbox',
      name: 'equipment',
      message: 'Got any equipment? (select with space, enter to continue)',
      choices: [
        { name: 'Pull-up bar', value: 'pull-up-bar' },
        { name: 'Resistance bands', value: 'bands' },
        { name: 'Weights / dumbbells', value: 'weights' },
      ],
    },
  ]);

  runSetup({ equipment }, dataDir);

  console.log('\n———————————————————————————————————————————');
  console.log('One more thing — the most important step!\n');
  console.log('PR Fitness works by automatically assigning you an exercise');
  console.log('every time you create a pull request in Claude Code.\n');
  console.log('Without this hook, nothing happens — you\'d have to');
  console.log('remember to run "pr-fitness prompt" manually every time.\n');
  console.log('The hook makes it automatic: create a PR → get an exercise.\n');

  const { installIt } = await inquirer.default.prompt([
    {
      type: 'confirm',
      name: 'installIt',
      message: 'Install the Claude Code hook? (highly recommended)',
      default: true,
    },
  ]);

  if (installIt) {
    const result = installHook();
    if (result.installed) {
      console.log(`\nHook installed at ${result.path}`);
      console.log('Now every PR you create in Claude Code will assign an exercise!\n');
    } else {
      console.log('\nHook is already installed — you\'re good!\n');
    }
  } else {
    console.log('\nNo worries! You can install it later with:');
    console.log('  pr-fitness hook install\n');
    console.log('Or run exercises manually with:');
    console.log('  pr-fitness prompt\n');
  }

  console.log('You\'re all set! Happy coding (and exercising).\n');
}
