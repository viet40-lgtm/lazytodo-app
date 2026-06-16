import type { Recurring, Task } from '../types';
import { advanceReminder, nextPeriodStart } from './recurring';
import { hasRecurring, normalizeRecurring } from './recurringList';
import { createSeriesId } from './series';

export function createTaskId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function ensureSeriesFields(task: Task): Pick<Task, 'seriesId' | 'seriesTotalMinutes'> {
  if (!hasRecurring(task)) return {};
  return {
    seriesId: task.seriesId ?? createSeriesId(),
    seriesTotalMinutes: task.seriesTotalMinutes ?? task.spentMinutes,
  };
}

export function spawnNextOccurrence(task: Task): Task {
  const repeats = normalizeRecurring(task.recurring);
  const primary = repeats[0];
  if (!primary) return task;
  const series = ensureSeriesFields(task);
  return {
    ...task,
    ...series,
    id: createTaskId(),
    completed: false,
    completedAt: undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    spentMinutes: 0,
    showAfter: nextPeriodStart(primary),
    reminder: task.reminder ? advanceReminder(task.reminder, primary) : undefined,
  };
}

export function applyLoggedTime(task: Task, minutes: number): Task {
  const at = Date.now();
  const timeLogs = [...(task.timeLogs ?? []), { at, minutes }];
  const nextSpent = Math.max(0, task.spentMinutes + minutes);

  if (!hasRecurring(task)) {
    return { ...task, spentMinutes: nextSpent, timeLogs, updatedAt: at };
  }

  const series = ensureSeriesFields(task);
  const baseTotal = series.seriesTotalMinutes ?? task.spentMinutes;
  return {
    ...task,
    ...series,
    spentMinutes: nextSpent,
    seriesTotalMinutes: baseTotal + minutes,
    timeLogs,
    updatedAt: at,
  };
}

export function withRecurringSeries(
  task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'spentMinutes'>,
): Partial<Task> {
  if (!hasRecurring(task)) return {};
  return { seriesId: createSeriesId(), seriesTotalMinutes: 0, timeLogs: [] };
}
