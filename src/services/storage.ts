import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEGACY_WEB_STORAGE_KEY, STORAGE_KEY } from '../constants';
import type { AppState, Recurring, Task, TaskSection, TimeLogEntry } from '../types';


export class DataCorruptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataCorruptionError';
  }
}

const defaultState = (): AppState => ({
  tasks: [],
  savedAt: Date.now(),
});

function parseTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

const VALID_RECURRING: Recurring[] = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'];

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

function normalizeTimeLogs(raw: unknown, spentMinutes: number, createdAt: number): TimeLogEntry[] | undefined {
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
    if (logs.length) return logs;
  }
  if (spentMinutes > 0) return [{ at: createdAt, minutes: spentMinutes }];
  return undefined;
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

  return {
    id: task.id,
    name: task.name.trim(),
    section,
    spentMinutes,
    completed: Boolean(task.completed),
    ...(parseTimestamp(task.completedAt) !== undefined
      ? { completedAt: parseTimestamp(task.completedAt) }
      : {}),
    ...(typeof task.reminder === 'string' && task.reminder ? { reminder: task.reminder } : {}),
    ...(recurring ? { recurring } : {}),
    ...(timeLogs ? { timeLogs } : {}),
    ...(typeof task.notificationId === 'string' ? { notificationId: task.notificationId } : {}),
    ...(parseTimestamp(task.showAfter) !== undefined ? { showAfter: parseTimestamp(task.showAfter) } : {}),
    ...(typeof task.order === 'number' ? { order: task.order } : {}),
    ...(task.deleted === true ? { deleted: true } : {}),
    ...(parseTimestamp(task.updatedAt) !== undefined ? { updatedAt: parseTimestamp(task.updatedAt) } : {}),
    ...(typeof task.seriesId === 'string' ? { seriesId: task.seriesId } : {}),
    ...(typeof task.seriesTotalMinutes === 'number' && task.seriesTotalMinutes >= 0
      ? { seriesTotalMinutes: Math.round(task.seriesTotalMinutes) }
      : {}),
    createdAt,
  };
}

export function normalizeState(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') return defaultState();
  const data = raw as Record<string, unknown>;
  const tasks = Array.isArray(data.tasks)
    ? data.tasks.map(normalizeTask).filter((task): task is Task => task !== null)
    : [];

  return {
    tasks,
    ...(typeof data.lastCelebrationDate === 'string'
      ? { lastCelebrationDate: data.lastCelebrationDate }
      : {}),
    savedAt: parseTimestamp(data.savedAt) ?? Date.now(),
  };
}

async function migrateLegacyWebStorage(): Promise<AppState | null> {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_WEB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = normalizeState(JSON.parse(raw));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    await AsyncStorage.removeItem(LEGACY_WEB_STORAGE_KEY);
    return parsed;
  } catch {
    return null;
  }
}

export async function loadState(): Promise<AppState> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  } catch (err) {
    throw new DataCorruptionError('Failed to read from AsyncStorage');
  }

  if (!raw) {
    try {
      const migrated = await migrateLegacyWebStorage();
      return migrated ?? defaultState();
    } catch {
      return defaultState();
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new DataCorruptionError('Local storage file contains invalid JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new DataCorruptionError('Local storage data is not a valid object');
  }

  const data = parsed as Record<string, unknown>;
  if (data.tasks && !Array.isArray(data.tasks)) {
    throw new DataCorruptionError('Local tasks data is corrupted (not an array)');
  }

  return normalizeState(parsed);
}

export async function saveState(state: AppState): Promise<void> {
  const payload: AppState = {
    ...state,
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

/** Merges remote and local state safely using Item-Level timestamps */
export function mergeStates(local: AppState, remote: AppState): { merged: AppState, localChanged: boolean, remoteChanged: boolean } {
  const mergedTasks = new Map<string, Task>();
  let localChanged = false;
  let remoteChanged = false;

  const localMap = new Map(local.tasks.map(t => [t.id, t]));
  const remoteMap = new Map(remote.tasks.map(t => [t.id, t]));


  // 1. Process all remote tasks
  for (const [id, rTask] of remoteMap) {
    const lTask = localMap.get(id);
    if (!lTask) {
      // Exists only remotely -> we want it
      mergedTasks.set(id, rTask);
      localChanged = true;
    } else {
      // Exists in both -> resolve conflict
      const rTime = rTask.updatedAt || rTask.createdAt;
      const lTime = lTask.updatedAt || lTask.createdAt;

      if (rTime > lTime) {
        mergedTasks.set(id, rTask);
        localChanged = true;
      } else if (lTime > rTime) {
        mergedTasks.set(id, lTask);
        remoteChanged = true;
      } else {
        // Equal timestamps, just stick with local
        mergedTasks.set(id, lTask);
      }
    }
  }

  // 2. Add remaining local tasks that don't exist on remote
  for (const [id, lTask] of localMap) {
    if (!remoteMap.has(id)) {
      mergedTasks.set(id, lTask);
      remoteChanged = true;
    }
  }


  const merged: AppState = {
    tasks: Array.from(mergedTasks.values()),
    savedAt: Date.now(),
    lastCelebrationDate: local.savedAt > remote.savedAt ? local.lastCelebrationDate : remote.lastCelebrationDate,
  };

  return { merged, localChanged, remoteChanged };
}
