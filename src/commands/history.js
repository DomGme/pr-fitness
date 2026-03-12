import { loadData } from '../storage.js';
import { filterLogByPeriod, capitalize } from '../utils.js';

const PERIOD_LABELS = {
  today: 'Today',
  week: 'This Week',
  sprint: 'This Sprint',
  all: 'All Time',
};

export function formatHistory(dataDir, period = 'today', now = new Date()) {
  const data = loadData(dataDir);
  const filtered = filterLogByPeriod(data.log, period, data.profile || {}, now);
  const label = PERIOD_LABELS[period] || period;

  if (filtered.length === 0) {
    return `PR Fitness History — ${label}\n\nNo exercises logged yet.\n`;
  }

  // Reverse chronological
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  const lines = [`PR Fitness History — ${label}\n`];
  for (const entry of sorted) {
    const time = new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date(entry.date).toLocaleDateString();
    const unit = entry.unit === 'seconds' ? 's' : '';
    const diff = entry.completed - entry.assigned;
    const diffStr = diff > 0 ? ` (+${diff})` : diff < 0 ? ` (${diff})` : '';
    const pr = entry.pr ? ` [${entry.pr}]` : '';
    lines.push(`  ${date} ${time}  ${capitalize(entry.exercise)} — ${entry.completed}${unit}/${entry.assigned}${unit}${diffStr}${pr}`);
  }

  return lines.join('\n');
}
