import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEGACY_WEB_STORAGE_KEY, STORAGE_KEY } from '../constants';
import type { AppState, Task, TaskSection } from '../types';


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

function normalizeTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== 'object') return null;
  const task = raw as Record<string, unknown>;
  if (typeof task.id !== 'string' || typeof task.name !== 'string') return null;

  const createdAt = parseTimestamp(task.createdAt) ?? Date.now();
  let section: TaskSection =
    task.section === 'daily' ||
    task.section === 'weekly' ||
    task.section === 'monthly' ||
    task.section === 'yearly'
      ? task.section
      : 'today';

  if (task.recurring === 'daily') {
    section = 'daily';
  }
  const spentMinutes =
    typeof task.spentMinutes === 'number' && task.spentMinutes >= 0
      ? Math.round(task.spentMinutes)
      : 0;

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
    ...(task.recurring === 'daily' ||
    task.recurring === 'weekly' ||
    task.recurring === 'biweekly' ||
    task.recurring === 'monthly' ||
    task.recurring === 'yearly'
      ? { recurring: task.recurring }
      : {}),
    ...(typeof task.notificationId === 'string' ? { notificationId: task.notificationId } : {}),
    ...(parseTimestamp(task.showAfter) !== undefined ? { showAfter: parseTimestamp(task.showAfter) } : {}),
    ...(typeof task.order === 'number' ? { order: task.order } : {}),
    ...(task.deleted === true ? { deleted: true } : {}),
    ...(parseTimestamp(task.updatedAt) !== undefined ? { updatedAt: parseTimestamp(task.updatedAt) } : {}),
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

  console.log(`[SmartMerge] Local tasks: ${localMap.size}, Remote tasks: ${remoteMap.size}`);

  // 1. Process all remote tasks
  for (const [id, rTask] of remoteMap) {
    const lTask = localMap.get(id);
    if (!lTask) {
      // Exists only remotely -> we want it
      mergedTasks.set(id, rTask);
      localChanged = true;
      console.log(`[SmartMerge] Added remote-only task: ${rTask.name}`);
    } else {
      // Exists in both -> resolve conflict
      const rTime = rTask.updatedAt || rTask.createdAt;
      const lTime = lTask.updatedAt || lTask.createdAt;

      if (rTime > lTime) {
        mergedTasks.set(id, rTask);
        localChanged = true;
        console.log(`[SmartMerge] Remote task newer: ${rTask.name}`);
      } else if (lTime > rTime) {
        mergedTasks.set(id, lTask);
        remoteChanged = true;
        console.log(`[SmartMerge] Local task newer: ${lTask.name}`);
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
      console.log(`[SmartMerge] Added local-only task: ${lTask.name}`);
    }
  }

  console.log(`[SmartMerge] Finished. Local changed? ${localChanged}, Remote changed? ${remoteChanged}. Total merged tasks: ${mergedTasks.size}`);

  const merged: AppState = {
    tasks: Array.from(mergedTasks.values()),
    savedAt: Date.now(),
    lastCelebrationDate: local.savedAt > remote.savedAt ? local.lastCelebrationDate : remote.lastCelebrationDate,
  };

  return { merged, localChanged, remoteChanged };
}
