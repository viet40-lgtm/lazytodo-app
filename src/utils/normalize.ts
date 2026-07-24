import type { AppState, Recurring, SubTask, Task, TaskSection, TimeLogEntry } from '../types';

function parseTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

const VALID_RECURRING: Recurring[] = ['daily', 'weekly', 'monthly', 'yearly'];

function normalizeRecurringField(raw: unknown): Recurring[] | undefined {
  if (Array.isArray(raw)) {
    const list = raw.filter((r): r is Recurring => VALID_RECURRING.includes(r as Recurring));
    return list.length ? list : undefined;
  }
  if (typeof raw === 'string' && VALID_RECURRING.includes(raw as Recurring)) {
    return [raw as Recurring];
  }
  return undefined;
}

function normalizeTimeLogs(raw: unknown, spentMinutes: number, createdAt: number): TimeLogEntry[] {
  if (Array.isArray(raw)) {
    const logs = raw
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const e = entry as Record<string, unknown>;
        const at = parseTimestamp(e.at);
        const minutes = typeof e.minutes === 'number' ? Math.round(e.minutes) : 0;
        if (at === undefined || minutes <= 0) return null;
        return { at, minutes };
      })
      .filter((e): e is TimeLogEntry => e !== null);
    // Return the validated array even if empty — callers decide whether to include it.
    return logs;
  }
  if (spentMinutes > 0) return [{ at: createdAt, minutes: spentMinutes }];
  return [];
}

function normalizeSubtasks(raw: unknown): SubTask[] | undefined {
  if (!Array.isArray(raw) || !raw.length) return undefined;
  const items = raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const e = entry as Record<string, unknown>;
      if (typeof e.id !== 'string' || typeof e.name !== 'string') return null;
      const createdAt = typeof e.createdAt === 'number' ? e.createdAt : Date.now();
      const timeSpent = typeof e.timeSpent === 'number' ? e.timeSpent : 0;
      return { 
        id: e.id, 
        name: e.name.trim(), 
        completed: Boolean(e.completed),
        timeSpent: typeof e.timeSpent === 'number' ? e.timeSpent : undefined,
        timeLogs: normalizeTimeLogs(e.timeLogs, timeSpent, createdAt),
        createdAt: typeof e.createdAt === 'number' ? e.createdAt : undefined,
        completedAt: typeof e.completedAt === 'number' ? e.completedAt : undefined
      } as SubTask;
    })
    .filter((e): e is SubTask => e !== null && e.name.length > 0);
  return items.length ? items : undefined;
}

function normalizeTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== 'object') return null;
  const task = raw as Record<string, unknown>;
  if (typeof task.id !== 'string' || typeof task.name !== 'string') return null;

  const createdAt = parseTimestamp(task.createdAt) ?? Date.now();
  const recurring = normalizeRecurringField(task.recurring);
  let section: TaskSection =
    task.section === 'daily' ||
    task.section === 'weekly' ||
    task.section === 'monthly' ||
    task.section === 'yearly'
      ? task.section
      : 'today';

  if (recurring?.includes('daily')) {
    section = 'daily';
  }
  const spentMinutes =
    typeof task.spentMinutes === 'number' && task.spentMinutes >= 0
      ? Math.round(task.spentMinutes)
      : 0;

  const timeLogs = normalizeTimeLogs(task.timeLogs, spentMinutes, createdAt);
  // Always preserve timeLogs for recurring tasks (even empty) so the habit
  // detection logic (timeLogs.length > 0) works after a cloud round-trip.
  const shouldIncludeTimeLogs = timeLogs.length > 0 || !!recurring;

  // Cache expensive repeated calls (M5)
  const completedAt = parseTimestamp(task.completedAt);
  const showAfter = parseTimestamp(task.showAfter);
  const updatedAt = parseTimestamp(task.updatedAt);
  const subtasks = normalizeSubtasks(task.subtasks); // H1: call once only

  return {
    id: task.id,
    name: task.name.trim(),
    section,
    spentMinutes,
    completed: Boolean(task.completed),
    ...(completedAt !== undefined ? { completedAt } : {}),
    ...(typeof task.reminder === 'string' && task.reminder ? { reminder: task.reminder } : {}),
    ...(recurring ? { recurring } : {}),
    ...(shouldIncludeTimeLogs ? { timeLogs } : {}),
    ...(typeof task.notificationId === 'string' ? { notificationId: task.notificationId } : {}),
    ...(showAfter !== undefined ? { showAfter } : {}),
    ...(typeof task.order === 'number' ? { order: task.order } : {}),
    ...(task.deleted === true ? { deleted: true } : {}),
    ...(updatedAt !== undefined ? { updatedAt } : {}),
    ...(typeof task.seriesId === 'string' ? { seriesId: task.seriesId } : {}),
    ...(typeof task.seriesTotalMinutes === 'number' && task.seriesTotalMinutes >= 0
      ? { seriesTotalMinutes: Math.round(task.seriesTotalMinutes) }
      : {}),
    ...(task.persistent === true ? { persistent: true } : {}),
    ...(task.reminderOnly === true ? { reminderOnly: true } : {}),
    ...(subtasks ? { subtasks } : {}),
    createdAt,
  };
}

export function normalizeState(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') return { tasks: [], savedAt: Date.now() };
  const data = raw as Record<string, unknown>;
  const tasks = Array.isArray(data.tasks)
    ? data.tasks.map(normalizeTask).filter((task): task is Task => task !== null)
    : [];

  return {
    tasks,
    ...(typeof data.lastCelebrationDate === 'string'
      ? { lastCelebrationDate: data.lastCelebrationDate }
      : {}),
    // L4: missing savedAt → use 0 (oldest) so local state always wins the timestamp guard
    savedAt: parseTimestamp(data.savedAt) ?? 0,
  };
}
