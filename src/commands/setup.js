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
