import type { Recurring, Task, TaskSection } from '../types';

export function normalizeRecurring(recurring?: Recurring | Recurring[]): Recurring[] {
  if (!recurring) return [];
  return Array.isArray(recurring) ? recurring : [recurring];
}

export function hasRecurring(task: { recurring?: Recurring | Recurring[] }): boolean {
  return normalizeRecurring(task.recurring).length > 0;
}

const SECTION_REPEAT: Record<TaskSection, Recurring[]> = {
  today: [],
  daily: ['daily'],
  weekly: ['weekly', 'biweekly'],
  monthly: ['monthly'],
  yearly: ['yearly'],
};

/** Whether a task appears in a home-screen section. */
export function taskShowsInSection(
  task: Task,
  section: TaskSection,
  now = Date.now(),
): boolean {
  if (task.completed || task.deleted) return false;
  if (task.showAfter && task.showAfter > now) return false;

  const repeats = normalizeRecurring(task.recurring);
  if (repeats.length > 0) {
    return SECTION_REPEAT[section].some((r) => repeats.includes(r));
  }

  if (section === 'today' && task.section !== 'daily' && task.reminder) {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    if (new Date(task.reminder).getTime() <= todayEnd.getTime()) return true;
  }

  return task.section === section;
}
