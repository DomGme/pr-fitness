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
