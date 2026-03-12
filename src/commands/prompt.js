import { loadData, saveData } from '../storage.js';
import { pickExercise, getAdaptiveRepCount } from '../exercises.js';
import { formatPrompt, formatDailyChoice } from '../tones.js';

export function generatePrompt(dataDir) {
  const data = loadData(dataDir);

  if (!data.profile) {
    return { needsSetup: true };
  }

  const today = new Date().toISOString().split('T')[0];

  if (!data.dailyChoice || data.dailyChoice.date !== today) {
    return {
      needsDailyChoice: true,
      exercises: data.profile.exercises,
      dailyChoicePrompt: formatDailyChoice(data.profile.exercises),
    };
  }

  const exerciseName = data.dailyChoice.exercise;
  const exercise = data.profile.exercises.find(e => e.name === exerciseName);

  if (!exercise) {
    return { needsDailyChoice: true, exercises: data.profile.exercises, dailyChoicePrompt: formatDailyChoice(data.profile.exercises) };
  }

  const count = getAdaptiveRepCount(exercise, data.log);
  const prompt = formatPrompt(data.profile.tone, exercise.name, count, exercise.unit);

  return {
    needsSetup: false,
    needsDailyChoice: false,
    exercise: exercise.name,
    unit: exercise.unit,
    count,
    prompt,
  };
}

export function setDailyChoice(dataDir, choice) {
  const data = loadData(dataDir);
  const today = new Date().toISOString().split('T')[0];

  let exerciseName = choice;
  if (choice === 'random') {
    const picked = pickExercise(data.profile.exercises);
    exerciseName = picked.name;
  }

  data.dailyChoice = { date: today, exercise: exerciseName };
  saveData(dataDir, data);
  return exerciseName;
}
