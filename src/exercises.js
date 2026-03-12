const DEFAULT_EXERCISES = [
  { name: 'push-ups', unit: 'reps', min: 5, max: 15 },
  { name: 'sit-ups', unit: 'reps', min: 10, max: 20 },
  { name: 'squats', unit: 'reps', min: 10, max: 15 },
  { name: 'lunges', unit: 'reps', min: 10, max: 20, note: 'total, alternating legs' },
  { name: 'plank', unit: 'seconds', min: 15, max: 30 },
];

const EQUIPMENT_EXERCISES = {
  'pull-up-bar': [
    { name: 'pull-ups', unit: 'reps', min: 3, max: 8 },
    { name: 'hanging-leg-raises', unit: 'reps', min: 5, max: 10 },
  ],
  'bands': [
    { name: 'band-rows', unit: 'reps', min: 8, max: 12 },
    { name: 'band-pull-aparts', unit: 'reps', min: 10, max: 15 },
  ],
  'weights': [
    { name: 'dumbbell-curls', unit: 'reps', min: 8, max: 12 },
    { name: 'overhead-press', unit: 'reps', min: 5, max: 10 },
  ],
};

export function getDefaultExercises() {
  return [...DEFAULT_EXERCISES];
}

export function getExercisesForEquipment(equipment = []) {
  const exercises = [...DEFAULT_EXERCISES];
  for (const item of equipment) {
    if (EQUIPMENT_EXERCISES[item]) {
      exercises.push(...EQUIPMENT_EXERCISES[item]);
    }
  }
  return exercises;
}

export function pickExercise(exercises) {
  const index = Math.floor(Math.random() * exercises.length);
  return exercises[index];
}

export function pickRepCount(exercise) {
  return Math.floor(Math.random() * (exercise.max - exercise.min + 1)) + exercise.min;
}
