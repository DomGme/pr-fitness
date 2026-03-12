export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function validateCompleted(input) {
  if (input === '' || input === null || input === undefined) return null;
  const num = Number(input);
  if (isNaN(num) || num < 0) return null;
  return num;
}

export function isToday(dateStr, now = new Date()) {
  const date = new Date(dateStr);
  return date.toDateString() === now.toDateString();
}

export function isThisWeek(dateStr, now = new Date()) {
  const date = new Date(dateStr);
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - mondayOffset);

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 7);

  return date >= monday && date < sunday;
}

export function isInSprint(dateStr, sprintStartDate, sprintLengthDays, now = new Date()) {
  const date = new Date(dateStr);
  const sprintStart = new Date(sprintStartDate + 'T00:00:00');

  const msPerDay = 86400000;
  const daysSinceStart = Math.floor((now - sprintStart) / msPerDay);
  const currentSprintNumber = Math.floor(daysSinceStart / sprintLengthDays);
  const currentSprintStart = new Date(sprintStart.getTime() + currentSprintNumber * sprintLengthDays * msPerDay);
  const currentSprintEnd = new Date(currentSprintStart.getTime() + sprintLengthDays * msPerDay);

  return date >= currentSprintStart && date < currentSprintEnd;
}

export function filterLogByPeriod(log, period, profile = {}, now = new Date()) {
  switch (period) {
    case 'today':
      return log.filter(entry => isToday(entry.date, now));
    case 'week':
      return log.filter(entry => isThisWeek(entry.date, now));
    case 'sprint':
      return log.filter(entry =>
        isInSprint(entry.date, profile.sprintStartDate, profile.sprintLengthDays, now)
      );
    case 'all':
    default:
      return [...log];
  }
}
