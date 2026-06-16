import type { Recurring } from '../types';
import { hasRecurring, normalizeRecurring } from './recurringList';

export function createSeriesId(): string {
  return `series_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function seriesTotalMinutes(task: {
  recurring?: Recurring[];
  seriesTotalMinutes?: number;
  spentMinutes: number;
  timeLogs?: { at: number; minutes: number }[];
}): number {
  if (!hasRecurring(task)) return task.spentMinutes;
  if (task.seriesTotalMinutes !== undefined) return task.seriesTotalMinutes;
  if (task.timeLogs?.length) {
    return task.timeLogs.reduce((sum, log) => sum + log.minutes, 0);
  }
  return task.spentMinutes;
}

export function isQueuedSuccessor(
  candidate: {
    id: string;
    seriesId?: string;
    name: string;
    section: string;
    completed: boolean;
    showAfter?: number;
  },
  target: { id: string; seriesId?: string; name: string; section: string },
): boolean {
  if (candidate.id === target.id || candidate.completed || candidate.showAfter === undefined) return false;
  if (target.seriesId && candidate.seriesId) return candidate.seriesId === target.seriesId;
  return candidate.name === target.name && candidate.section === target.section;
}

export function recurringLabelShort(recurring: Recurring[]): string {
  const labels: Record<Recurring, string> = {
    daily: 'D',
    weekly: 'W',
    biweekly: 'B-W',
    monthly: 'M',
    yearly: 'Y',
  };
  return normalizeRecurring(recurring)
    .map((r) => labels[r])
    .join('/');
}
