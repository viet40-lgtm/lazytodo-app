import type { Recurring, Task } from '../types';
import { normalizeRecurring } from './recurringList';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function periodStart(recurring: Recurring, date: Date): Date {
  switch (recurring) {
    case 'daily':
      return startOfDay(date);
    case 'weekly':
    case 'biweekly':
      return startOfWeek(date);
    case 'monthly':
      return startOfMonth(date);
    case 'yearly':
      return startOfYear(date);
  }
}



/** Returns the timestamp for the start of the NEXT period for a recurring type. */
export function nextPeriodStart(recurring: Recurring, from = new Date()): number {
  switch (recurring) {
    case 'daily': {
      const d = new Date(from);
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    case 'weekly': {
      const d = new Date(from);
      const day = d.getDay();
      const daysUntilMonday = day === 0 ? 1 : 8 - day;
      d.setDate(d.getDate() + daysUntilMonday);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    case 'biweekly': {
      const d = new Date(from);
      const day = d.getDay();
      const daysUntilMonday = day === 0 ? 1 : 8 - day;
      d.setDate(d.getDate() + daysUntilMonday + 7);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    case 'monthly': {
      return new Date(from.getFullYear(), from.getMonth() + 1, 1).getTime();
    }
    case 'yearly': {
      return new Date(from.getFullYear() + 1, 0, 1).getTime();
    }
  }
}

/** Strictly advances a specific reminder date forward by the recurring interval */
export function advanceReminder(reminderIso: string, recurring: Recurring): string {
  const d = new Date(reminderIso);
  switch (recurring) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 14);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString();
}

/** Determines if a recurring task is past its due date (and should be auto-skipped) */
export function isTaskOverdue(task: Task, now = Date.now()): boolean {
  const repeats = normalizeRecurring(task.recurring);
  if (repeats.length !== 1) return false;
  const recurring = repeats[0];

  if (task.reminder) {
    // Overdue if past midnight of the reminder day
    const reminderDate = new Date(task.reminder);
    reminderDate.setHours(23, 59, 59, 999);
    return now > reminderDate.getTime();
  }

  // No reminder. Overdue if past the start of the NEXT natural period.
  // The task's "current" period is anchored by showAfter or createdAt.
  const anchor = task.showAfter || task.createdAt;
  const deadline = nextPeriodStart(recurring, new Date(anchor));
  return now >= deadline;
}
