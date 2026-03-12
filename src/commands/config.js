import { loadData, saveData } from '../storage.js';
import { getExercisesForEquipment } from '../exercises.js';

export function updateConfig(dataDir, updates) {
  const data = loadData(dataDir);

  if (!data.profile) {
    throw new Error('Run pr-fitness setup first');
  }

  if (updates.tone) {
    data.profile.tone = updates.tone;
  }

  if (updates.equipment) {
    data.profile.equipment = updates.equipment;
    data.profile.exercises = getExercisesForEquipment(updates.equipment);
  }

  if (updates.sprintLengthDays) {
    data.profile.sprintLengthDays = updates.sprintLengthDays;
  }

  if (updates.sprintStartDate) {
    data.profile.sprintStartDate = updates.sprintStartDate;
  }

  saveData(dataDir, data);
  return data.profile;
}
