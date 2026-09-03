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
  weekly: ['weekly'],
  monthly: ['monthly'],
  yearly: ['yearly'],
};

/**
 * For persistent habits, the "home" section is the shortest period in the recurring array.
 * Priority: daily > weekly > monthly > yearly.
 * The stats row on the card handles cross-period time totals, so there's no need to
 * duplicate the card in every matching section.
 */
const PERIOD_PRIORITY: TaskSection[] = ['daily', 'weekly', 'monthly', 'yearly'];

export function sectionForReminder(reminder: string, now = new Date()): TaskSection {
  const pickedDate = new Date(reminder);
  if (isNaN(pickedDate.getTime())) return 'today';

  const pickedDay = new Date(pickedDate.getFullYear(), pickedDate.getMonth(), pickedDate.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (pickedDay.getTime() <= today.getTime()) return 'today';

  const weekStart = new Date(today);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - day);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  if (pickedDay.getTime() <= weekEnd.getTime()) return 'weekly';

  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  if (pickedDay.getTime() <= monthEnd.getTime()) return 'monthly';

  return 'yearly';
}

export function primarySection(repeats: Recurring[]): TaskSection | null {
  for (const sec of PERIOD_PRIORITY) {
    if (SECTION_REPEAT[sec].some((r) => repeats.includes(r))) return sec;
  }
  return null;
}

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
    // Persistent habits (or recurring tasks that already have time logs) only show
    // in their shortest-period section. The stats row on the card surfaces all other
    // period totals, so there's no need to duplicate the card everywhere.
    const isHabit = task.persistent || (task.timeLogs?.length ?? 0) > 0;
    if (isHabit) {
      return section === primarySection(repeats);
    }
    return SECTION_REPEAT[section].some((r) => repeats.includes(r));
  }

  if (section === 'today' && task.section !== 'daily' && task.reminder) {
    return sectionForReminder(task.reminder, new Date(now)) === 'today';
  }

  if (task.reminder && task.section !== 'daily') {
    const reminderDate = new Date(task.reminder);
    const currentDate = new Date(now);
    if (
      section === 'yearly' &&
      !isNaN(reminderDate.getTime()) &&
      reminderDate.getFullYear() !== currentDate.getFullYear()
    ) {
      return false;
    }
    return sectionForReminder(task.reminder, currentDate) === section;
  }

  return task.section === section;
}
