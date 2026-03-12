import { capitalize } from './utils.js';

function formatMinimal(exercise, count, unit) {
  const name = capitalize(exercise);
  if (unit === 'seconds') {
    return `${name} (${count}s) — How many seconds did you hold?`;
  }
  return `${name} (${count}) — How many did you do?`;
}

function formatEncouraging(exercise, count, unit) {
  if (unit === 'seconds') {
    return `Nice PR! Time for a ${count}s ${exercise} — you've got this! How many seconds did you hold?`;
  }
  return `Nice PR! Time for ${count} ${exercise} — you've got this! How many did you get?`;
}

export function formatPrompt(tone, exercise, count, unit) {
  switch (tone) {
    case 'encouraging':
      return formatEncouraging(exercise, count, unit);
    case 'minimal':
    default:
      return formatMinimal(exercise, count, unit);
  }
}

export function formatDailyChoice(exercises) {
  const lines = ['Good morning! Pick your exercise for today:'];
  lines.push('1. Random (surprise me)');
  exercises.forEach((ex, i) => {
    lines.push(`${i + 2}. ${capitalize(ex.name)}`);
  });
  return lines.join('\n');
}
