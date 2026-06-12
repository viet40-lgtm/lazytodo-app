import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEGACY_WEB_STORAGE_KEY, STORAGE_KEY } from '../constants';
import type { AppState, Task, TaskSection } from '../types';
import { resetRecurringTasks } from '../utils/recurring';

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
  const section: TaskSection =
    task.section === 'weekly' ||
    task.section === 'monthly' ||
    task.section === 'yearly'
      ? task.section
      : 'today';
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
    task.recurring === 'monthly' ||
    task.recurring === 'yearly'
      ? { recurring: task.recurring }
      : {}),
    ...(typeof task.notificationId === 'string' ? { notificationId: task.notificationId } : {}),
    createdAt,
  };
}

function normalizeState(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') return defaultState();
  const data = raw as Record<string, unknown>;
  const tasks = Array.isArray(data.tasks)
    ? data.tasks.map(normalizeTask).filter((task): task is Task => task !== null)
    : [];

  return {
    tasks: resetRecurringTasks(tasks),
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
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const migrated = await migrateLegacyWebStorage();
      return migrated ?? defaultState();
    }
    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

export async function saveState(state: AppState): Promise<void> {
  const payload: AppState = {
    ...state,
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
