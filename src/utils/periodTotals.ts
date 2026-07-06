import type { Task, TaskSection, TimeLogEntry } from '../types';
import { formatDuration } from './time';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Monday 00:00 through Sunday 23:59:59 of the week containing `now`. */
export function weekRange(now = new Date()): { start: number; end: number } {
  const d = startOfDay(now);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  const start = d.getTime();
  const sunday = new Date(d);
  sunday.setDate(sunday.getDate() + 6);
  return { start, end: endOfDay(sunday).getTime() };
}

export function monthRange(now = new Date()): { start: number; end: number } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)).getTime();
  return { start, end };
}

export function yearRange(now = new Date()): { start: number; end: number } {
  const start = new Date(now.getFullYear(), 0, 1).getTime();
  // M4: end at Dec 31 23:59:59 so the full year is always visible
  const end = endOfDay(new Date(now.getFullYear(), 11, 31)).getTime();
  return { start, end };
}

export function dayRange(now = new Date()): { start: number; end: number } {
  return { start: startOfDay(now).getTime(), end: endOfDay(now).getTime() };
}

export function sumTimeLogs(logs: TimeLogEntry[] | undefined, start: number, end: number): number {
  if (!logs?.length) return 0;
  return logs
    .filter((log) => log.at >= start && log.at <= end)
    .reduce((sum, log) => sum + log.minutes, 0);
}

function fmtShort(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function periodRangeLabel(section: TaskSection, now = new Date()): string {
  switch (section) {
    case 'today':
    case 'daily':
      return 'today';
    case 'weekly': {
      const { start, end } = weekRange(now);
      return `${fmtShort(new Date(start))}–${fmtShort(new Date(end))}`;
    }
    case 'monthly': {
      const { start, end } = monthRange(now);
      return `${fmtShort(new Date(start))}–${fmtShort(new Date(end))}`;
    }
    case 'yearly': {
      const y = now.getFullYear();
      return `1/1–${fmtShort(now)} ${y}`;
    }
  }
}

export function minutesForSection(task: Task, section: TaskSection, now = new Date()): number {
  const logs = task.timeLogs;
  let range: { start: number; end: number };
  switch (section) {
    case 'today':
    case 'daily':
      range = dayRange(now);
      break;
    case 'weekly':
      range = weekRange(now);
      break;
    case 'monthly':
      range = monthRange(now);
      break;
    case 'yearly':
      range = yearRange(now);
      break;
    default:
      range = dayRange(now);
  }
  const fromLogs = sumTimeLogs(logs, range.start, range.end);
  if (fromLogs > 0) return fromLogs;
  // Legacy tasks without timeLogs
  if (!logs?.length && task.spentMinutes > 0) {
    const updated = task.updatedAt ?? task.createdAt;
    if (updated >= range.start && updated <= range.end) return task.spentMinutes;
  }
  return fromLogs;
}

export function formatSectionTime(task: Task, section: TaskSection, now = new Date()): string {
  const mins = minutesForSection(task, section, now);
  return formatDuration(mins);
}
