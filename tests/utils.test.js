import { describe, it, expect } from 'vitest';
import { validateCompleted, isToday, isThisWeek, isInSprint, filterLogByPeriod } from '../src/utils.js';

describe('validateCompleted', () => {
  it('accepts valid integer', () => {
    expect(validateCompleted('10')).toBe(10);
  });

  it('accepts zero', () => {
    expect(validateCompleted('0')).toBe(0);
  });

  it('accepts decimal for seconds', () => {
    expect(validateCompleted('15.5')).toBe(15.5);
  });

  it('rejects negative numbers', () => {
    expect(validateCompleted('-5')).toBe(null);
  });

  it('rejects non-numeric input', () => {
    expect(validateCompleted('abc')).toBe(null);
  });

  it('rejects empty string', () => {
    expect(validateCompleted('')).toBe(null);
  });
});

describe('date filters', () => {
  const now = new Date('2026-03-11T14:00:00Z');

  it('isToday returns true for today', () => {
    expect(isToday('2026-03-11T10:00:00Z', now)).toBe(true);
  });

  it('isToday returns false for yesterday', () => {
    expect(isToday('2026-03-10T10:00:00Z', now)).toBe(false);
  });

  it('isThisWeek returns true for same week (Mon-Sun)', () => {
    expect(isThisWeek('2026-03-09T10:00:00Z', now)).toBe(true);
    expect(isThisWeek('2026-03-11T10:00:00Z', now)).toBe(true);
  });

  it('isThisWeek returns false for last week', () => {
    expect(isThisWeek('2026-03-08T10:00:00Z', now)).toBe(false);
  });

  it('isInSprint returns true for date within sprint', () => {
    expect(isInSprint('2026-03-05T10:00:00Z', '2026-03-02', 14, now)).toBe(true);
  });

  it('isInSprint returns false for date before sprint', () => {
    expect(isInSprint('2026-03-01T10:00:00Z', '2026-03-02', 14, now)).toBe(false);
  });
});

describe('filterLogByPeriod', () => {
  const log = [
    { date: '2026-03-11T10:00:00Z', exercise: 'push-ups', assigned: 10, completed: 10 },
    { date: '2026-03-10T10:00:00Z', exercise: 'sit-ups', assigned: 15, completed: 15 },
    { date: '2026-03-01T10:00:00Z', exercise: 'squats', assigned: 10, completed: 5 },
  ];
  const now = new Date('2026-03-11T14:00:00Z');

  it('filters by today', () => {
    const result = filterLogByPeriod(log, 'today', {}, now);
    expect(result).toHaveLength(1);
    expect(result[0].exercise).toBe('push-ups');
  });

  it('filters by week', () => {
    const result = filterLogByPeriod(log, 'week', {}, now);
    expect(result).toHaveLength(2);
  });

  it('returns all for all-time', () => {
    const result = filterLogByPeriod(log, 'all', {}, now);
    expect(result).toHaveLength(3);
  });
});
