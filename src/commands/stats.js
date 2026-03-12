import { loadData } from '../storage.js';
import { filterLogByPeriod, capitalize } from '../utils.js';

const PERIOD_LABELS = {
  today: 'Today',
  week: 'This Week',
  sprint: 'This Sprint',
  all: 'All Time',
};

export function getStats(dataDir, period = 'week', now = new Date()) {
  const data = loadData(dataDir);
  const filtered = filterLogByPeriod(data.log, period, data.profile || {}, now);

  const exercises = {};
  for (const entry of filtered) {
    if (!exercises[entry.exercise]) {
      exercises[entry.exercise] = { assigned: 0, completed: 0, balance: 0 };
    }
    exercises[entry.exercise].assigned += entry.assigned;
    exercises[entry.exercise].completed += entry.completed;
    exercises[entry.exercise].balance += (entry.completed - entry.assigned);
  }

  return { exercises, totalPRs: filtered.length };
}

export function formatStats(dataDir, period = 'week', now = new Date()) {
  const { exercises, totalPRs } = getStats(dataDir, period, now);
  const label = PERIOD_LABELS[period] || period;

  if (totalPRs === 0) {
    return `PR Fitness — ${label}\n\nNo exercises logged yet.\n`;
  }

  const lines = [`PR Fitness — ${label}\n`];
  const header = 'Exercise'.padEnd(20) + 'Assigned'.padStart(10) + 'Done'.padStart(8) + 'Balance'.padStart(10);
  lines.push(header);

  for (const [name, data] of Object.entries(exercises)) {
    const balance = data.balance > 0 ? `+${data.balance}` : `${data.balance}`;
    lines.push(
      capitalize(name).padEnd(20) +
      String(data.assigned).padStart(10) +
      String(data.completed).padStart(8) +
      balance.padStart(10)
    );
  }

  lines.push(`\nTotal PRs: ${totalPRs}`);
  return lines.join('\n');
}
