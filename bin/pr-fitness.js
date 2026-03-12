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

    console.log('Logged! Back to work.');
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
