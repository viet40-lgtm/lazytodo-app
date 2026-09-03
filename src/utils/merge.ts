import type { AppState, JournalEntry, SubTask, Task, TimeLogEntry } from '../types';

/**
 * Merge two time log arrays, eliminating duplicate entries based on timestamp 'at',
 * and keeping the larger minute value if duplicate timestamps exist.
 */
export function mergeTimeLogs(
  logsA: TimeLogEntry[] = [],
  logsB: TimeLogEntry[] = [],
): TimeLogEntry[] {
  const map = new Map<number, TimeLogEntry>();

  for (const log of logsA) {
    if (log && typeof log.at === 'number' && log.minutes > 0) {
      map.set(log.at, log);
    }
  }

  for (const log of logsB) {
    if (log && typeof log.at === 'number' && log.minutes > 0) {
      const existing = map.get(log.at);
      if (!existing) {
        map.set(log.at, log);
      } else {
        map.set(log.at, {
          at: log.at,
          minutes: Math.max(existing.minutes, log.minutes),
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.at - b.at);
}

/**
 * Merge subtask lists by subtask id.
 */
export function mergeSubtasks(
  subsA: SubTask[] = [],
  subsB: SubTask[] = [],
): SubTask[] {
  const map = new Map<string, SubTask>();

  for (const s of subsA) {
    if (s?.id) map.set(s.id, s);
  }

  for (const s of subsB) {
    if (!s?.id) continue;
    const existing = map.get(s.id);
    if (!existing) {
      map.set(s.id, s);
    } else {
      const mergedLogs = mergeTimeLogs(existing.timeLogs, s.timeLogs);
      const totalFromLogs = mergedLogs.reduce((sum, l) => sum + l.minutes, 0);
      const timeSpent = Math.max(existing.timeSpent ?? 0, s.timeSpent ?? 0, totalFromLogs);

      map.set(s.id, {
        ...existing,
        ...s,
        completed: existing.completed || s.completed,
        timeSpent,
        timeLogs: mergedLogs,
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Intelligent task-level merging between remote and local tasks.
 * Prevents device overwrites by:
 * 1. Preserving tasks unique to either device (union by id).
 * 2. Merging timeLogs so logged time is never lost.
 * 3. Selecting latest metadata based on updatedAt timestamp.
 * 4. Respecting tombstoning (deleted: true).
 */
export function mergeTasks(
  remoteTasks: Task[] = [],
  localTasks: Task[] = [],
): Task[] {
  const map = new Map<string, Task>();

  const getTimestamp = (t: Task) => t.updatedAt ?? t.createdAt ?? 0;

  // Index all remote tasks
  for (const t of remoteTasks) {
    if (t?.id) {
      map.set(t.id, t);
    }
  }

  // Merge each local task
  for (const local of localTasks) {
    if (!local?.id) continue;
    const remote = map.get(local.id);

    if (!remote) {
      // Exists only locally: keep it
      map.set(local.id, local);
    } else {
      // Exists on both: merge properties
      const remoteTime = getTimestamp(remote);
      const localTime = getTimestamp(local);

      const mergedLogs = mergeTimeLogs(remote.timeLogs, local.timeLogs);
      const mergedSubtasks = mergeSubtasks(remote.subtasks, local.subtasks);

      // Pick base with newer timestamp for text/settings
      const base = localTime >= remoteTime ? local : remote;
      const other = localTime >= remoteTime ? remote : local;

      // Ensure spentMinutes and seriesTotalMinutes reflect the maximum accumulated time
      const totalFromLogs = mergedLogs.reduce((sum, l) => sum + l.minutes, 0);
      const spentMinutes = Math.max(
        base.spentMinutes || 0,
        other.spentMinutes || 0,
        totalFromLogs,
      );

      const seriesTotalMinutes = Math.max(
        base.seriesTotalMinutes ?? base.spentMinutes ?? 0,
        other.seriesTotalMinutes ?? other.spentMinutes ?? 0,
        spentMinutes,
      );

      const baseTime = getTimestamp(base);
      const otherTime = getTimestamp(other);

      // Tombstoning: if either device marked deleted, only un-delete if the other has a strictly newer update
      let isDeleted = false;
      if (base.deleted) {
        isDeleted = true;
      } else if (other.deleted && otherTime > baseTime) {
        isDeleted = true;
      }

      map.set(local.id, {
        ...other,
        ...base,
        deleted: isDeleted,
        timeLogs: mergedLogs,
        subtasks: mergedSubtasks,
        spentMinutes,
        seriesTotalMinutes,
        updatedAt: Math.max(remoteTime, localTime),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    return a.createdAt - b.createdAt;
  });
}

/**
 * Merge journals by date.
 */
export function mergeJournals(
  cloud: JournalEntry[] = [],
  local: JournalEntry[] = [],
): JournalEntry[] {
  const map = new Map<string, JournalEntry>();

  for (const entry of cloud) {
    if (entry?.date) map.set(entry.date, entry);
  }

  for (const entry of local) {
    if (!entry?.date) continue;
    const existing = map.get(entry.date);
    if (!existing) {
      map.set(entry.date, entry);
    } else {
      const cloudTime = existing.updatedAt ?? existing.createdAt ?? 0;
      const localTime = entry.updatedAt ?? entry.createdAt ?? 0;
      if (localTime >= cloudTime) {
        map.set(entry.date, entry);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Merge full AppState from remote and local snapshots.
 */
export function mergeAppState(
  remote: AppState | null | undefined,
  local: AppState | null | undefined,
  fallbackJournals: JournalEntry[] = [],
): AppState {
  if (!remote && !local) {
    return { tasks: [], journals: fallbackJournals, savedAt: Date.now() };
  }
  if (!remote) {
    return {
      tasks: local!.tasks,
      journals: mergeJournals(local!.journals ?? [], fallbackJournals),
      savedAt: local!.savedAt || Date.now(),
      lastCelebrationDate: local!.lastCelebrationDate,
    };
  }
  if (!local) {
    return {
      tasks: remote.tasks,
      journals: mergeJournals(remote.journals ?? [], fallbackJournals),
      savedAt: remote.savedAt || Date.now(),
      lastCelebrationDate: remote.lastCelebrationDate,
    };
  }

  const mergedTasks = mergeTasks(remote.tasks, local.tasks);
  const mergedJournals = mergeJournals(
    remote.journals ?? [],
    mergeJournals(local.journals ?? [], fallbackJournals),
  );

  return {
    tasks: mergedTasks,
    journals: mergedJournals,
    lastCelebrationDate: remote.lastCelebrationDate || local.lastCelebrationDate,
    savedAt: Math.max(remote.savedAt || 0, local.savedAt || 0, Date.now()),
  };
}
