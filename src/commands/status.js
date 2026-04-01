import { loadData } from '../storage.js';
import { getAdaptiveRepCount } from '../exercises.js';
import { formatPrompt } from '../tones.js';

export function getStatus(dataDir) {
  const data = loadData(dataDir);

  if (!data.profile) {
    return { state: 'needs-setup' };
  }

  const today = new Date().toISOString().split('T')[0];

  if (!data.dailyChoice || data.dailyChoice.date !== today) {
    return {
      state: 'needs-choice',
      exercises: data.profile.exercises,
    };
  }

  const exerciseName = data.dailyChoice.exercise;
  const exercise = data.profile.exercises.find(e => e.name === exerciseName);

  if (!exercise) {
    return {
      state: 'needs-choice',
      exercises: data.profile.exercises,
    };
  }

  const count = getAdaptiveRepCount(exercise, data.log);
  const prompt = formatPrompt(data.profile.tone, exercise.name, count, exercise.unit);

  return {
    state: 'ready',
    exercise: exercise.name,
    count,
    unit: exercise.unit,
    prompt,
  };
}
