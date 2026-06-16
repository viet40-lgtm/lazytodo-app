import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppState, Task, TaskSection } from '../types';
import { pushRemoteState, pullRemoteState } from '../services/cloud';
import { syncReminders } from '../services/reminders';
import { loadState, saveState, DataCorruptionError, mergeStates } from '../services/storage';
import { isTaskOverdue } from '../utils/recurring';
import { isQueuedSuccessor } from '../utils/series';
import { hasRecurring, normalizeRecurring } from '../utils/recurringList';
import {
  applyLoggedTime,
  createTaskId,
  spawnNextOccurrence,
  withRecurringSeries,
} from '../utils/taskSeries';

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;

    if (a.order !== undefined || b.order !== undefined) {
      const oA = a.order ?? 99999999;
      const oB = b.order ?? 99999999;
      if (oA !== oB) return oA - oB;
    }

    const hasRemA = !!a.reminder;
    const hasRemB = !!b.reminder;
    if (hasRemA !== hasRemB) return hasRemA ? -1 : 1;

    if (hasRemA && hasRemB) {
      const timeA = new Date(a.reminder!).getTime();
      const timeB = new Date(b.reminder!).getTime();
      if (timeA !== timeB) return timeA - timeB;
    }

    return a.createdAt - b.createdAt;
  });
}

export function useTasks(userId: string | null = null) {
  const [state, setState] = useState<AppState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isCorrupted, setIsCorrupted] = useState(false);
  const reminderSyncRef = useRef(0);
  const stateRef = useRef<AppState | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSyncDoneRef = useRef(false);
  stateRef.current = state;

  // Load from local storage once on mount.
  useEffect(() => {
    let active = true;
    loadState()
      .then((loaded) => {
        if (!active) return;
        setState(loaded);
        setHydrated(true);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof DataCorruptionError) {
          setIsCorrupted(true);
        } else {
          setState({ tasks: [], savedAt: Date.now() });
        }
        setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Debounced local save (300 ms) — avoids writing on every keystroke.
  useEffect(() => {
    if (!hydrated || !state || isCorrupted) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveState(state).catch(() => {});
    }, 300);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [hydrated, state, isCorrupted]);

  // Reset the initial-sync gate whenever the signed-in user changes so we
  // never push before re-reading that user's cloud data.
  useEffect(() => {
    initialSyncDoneRef.current = false;
  }, [userId]);

  // Pull from cloud once when user logs in, reconcile by task-level timestamps.
  useEffect(() => {
    if (!hydrated || !userId || isCorrupted) return;
    let active = true;
    setSyncing(true);
    (async () => {
      try {
        const remote = await pullRemoteState(userId);
        const local = stateRef.current;
        if (!active) return;
        if (remote) {
          if (!local) {
            setState(remote);
          } else {
            const { merged, localChanged, remoteChanged } = mergeStates(local, remote);
            if (localChanged) setState(merged);
            if (remoteChanged) await pushRemoteState(userId, merged);
          }
        } else if (local) {
          await pushRemoteState(userId, local);
        }
      } finally {
        if (active) {
          // Only allow background pushes after the cloud has been read and
          // merged, so an empty local can never overwrite good cloud data.
          initialSyncDoneRef.current = true;
          setSyncing(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [hydrated, userId, isCorrupted]);

  // Debounced push-only sync (1.2 s) — pushes local changes without pulling.
  useEffect(() => {
    if (!hydrated || !userId || !state || isCorrupted) return;
    if (!initialSyncDoneRef.current) return; // never push before first pull/merge
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushRemoteState(userId, stateRef.current ?? state).catch(() => {});
    }, 1200);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [state, hydrated, userId, isCorrupted]);

  // Manual full sync (pull + push).
  const forceSync = useCallback(async () => {
    if (!userId || !stateRef.current || isCorrupted) return;
    setSyncing(true);
    try {
      const remote = await pullRemoteState(userId);
      if (remote) {
        const { merged, localChanged, remoteChanged } = mergeStates(stateRef.current, remote);
        if (localChanged) setState(merged);
        if (remoteChanged) await pushRemoteState(userId, merged);
      } else {
        await pushRemoteState(userId, stateRef.current);
      }
    } catch {
      // Sync errors are non-fatal; data is safe locally.
    } finally {
      setSyncing(false);
    }
  }, [userId, isCorrupted]);

  // Reminder scheduling — runs only when reminder-relevant fields change.
  const reminderSignature = useMemo(
    () =>
      state?.tasks
        .map((t) => `${t.id}:${t.reminder ?? ''}:${t.completed ? 1 : 0}`)
        .join('|') ?? '',
    [state?.tasks],
  );

  useEffect(() => {
    if (!hydrated || !state) return;
    const syncId = ++reminderSyncRef.current;
    syncReminders(state.tasks).then((tasks) => {
      if (syncId !== reminderSyncRef.current) return;
      setState((prev) => {
        if (!prev) return prev;
        const changed = tasks.some((task) => {
          const existing = prev.tasks.find((item) => item.id === task.id);
          return existing?.notificationId !== task.notificationId;
        });
        return changed ? { ...prev, tasks } : prev;
      });
    });
  }, [hydrated, reminderSignature]);

  const updateTasks = useCallback((updater: (tasks: Task[]) => Task[]) => {
    setState((prev) => {
      if (!prev) return prev;
      return { ...prev, tasks: sortTasks(updater(prev.tasks)), savedAt: Date.now() };
    });
  }, []);

  const addTask = useCallback(
    (task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'spentMinutes'>) => {
      const newTask: Task = {
        ...task,
        ...withRecurringSeries(task),
        section: task.section ?? 'today',
        spentMinutes: 0,
        id: createTaskId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        completed: false,
      };
      updateTasks((tasks) => [...tasks, newTask]);
    },
    [updateTasks],
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      updateTasks((tasks) =>
        tasks.map((task) => {
          if (task.id !== id) return task;
          const merged = { ...task, ...updates, updatedAt: Date.now() };
          if (updates.recurring && hasRecurring(merged)) {
            return { ...merged, ...withRecurringSeries(merged) };
          }
          return merged;
        }),
      );
    },
    [updateTasks],
  );

  const logTime = useCallback(
    (id: string, minutes: number) => {
      updateTasks((tasks) =>
        tasks.map((task) => (task.id === id ? applyLoggedTime(task, minutes) : task)),
      );
    },
    [updateTasks],
  );

  const toggleTask = useCallback(
    (id: string) => {
      updateTasks((tasks) =>
        tasks.map((task) =>
          task.id === id
            ? {
                ...task,
                completed: !task.completed,
                completedAt: !task.completed ? Date.now() : undefined,
                updatedAt: Date.now(),
              }
            : task,
        ),
      );
    },
    [updateTasks],
  );

  const deleteTask = useCallback(
    (id: string) => {
      updateTasks((tasks) =>
        tasks.map((task) =>
          task.id === id ? { ...task, deleted: true, updatedAt: Date.now() } : task,
        ),
      );
    },
    [updateTasks],
  );

  const skipTask = useCallback(
    (id: string) => {
      updateTasks((tasks) => {
        const target = tasks.find((t) => t.id === id);
        if (!target) return tasks;

        const remaining = tasks.map((t) =>
          t.id === id ? { ...t, deleted: true, updatedAt: Date.now() } : t,
        );

        if (target.recurring && normalizeRecurring(target.recurring).length === 1) {
          const alreadyQueued = tasks.some((t) => isQueuedSuccessor(t, target));
          if (!alreadyQueued) {
            remaining.push(spawnNextOccurrence(target));
          }
        }
        return remaining;
      });
    },
    [updateTasks],
  );

  const reorderTask = useCallback(
    (id: string, direction: 'up' | 'down') => {
      updateTasks((tasks) => {
        const target = tasks.find((t) => t.id === id);
        if (!target) return tasks;

        const siblings = sortTasks(
          tasks.filter((t) => t.section === target.section && t.completed === target.completed),
        );
        const siblingIdx = siblings.findIndex((t) => t.id === id);
        const swapIdx =
          direction === 'up'
            ? siblingIdx - 1
            : siblingIdx + 1;

        if (swapIdx < 0 || swapIdx >= siblings.length) return tasks;

        const swapId = siblings[swapIdx].id;
        return tasks.map((t) => {
          if (t.id === id) return { ...t, order: swapIdx * 1000, updatedAt: Date.now() };
          if (t.id === swapId) return { ...t, order: siblingIdx * 1000, updatedAt: Date.now() };
          return t;
        });
      });
    },
    [updateTasks],
  );

  const markCelebrated = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setState((prev) =>
      prev ? { ...prev, lastCelebrationDate: today, savedAt: Date.now() } : prev,
    );
  }, []);

  const loadFromBackup = useCallback((backup: AppState) => {
    // Force local state to win on next cloud sync by giving it a future timestamp.
    setState({ ...backup, savedAt: Date.now() + 9_999_999 });
  }, []);

  // Batch overdue auto-skip in a single state update.
  useEffect(() => {
    if (!hydrated || !state || isCorrupted) return;
    const now = Date.now();
    const overdueIds = state.tasks
      .filter((t) => !t.completed && !t.deleted && t.recurring && isTaskOverdue(t, now))
      .map((t) => t.id);
    if (overdueIds.length === 0) return;
    updateTasks((tasks: Task[]) =>
      tasks.flatMap((task: Task) => {
        if (!overdueIds.includes(task.id)) return [task];
        const skipped = { ...task, deleted: true, updatedAt: Date.now() };
        if (!task.recurring || normalizeRecurring(task.recurring).length !== 1) return [skipped];
        return [skipped, spawnNextOccurrence(task)];
      }),
    );
  // Only run when hydration or corruption status changes, not on every state change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isCorrupted]);

  // Memoize sorted task list — avoids re-sorting on every consumer render.
  const tasks = useMemo(() => sortTasks(state?.tasks ?? []), [state?.tasks]);
  const allDone = useMemo(
    () => tasks.length > 0 && tasks.every((t) => t.completed || t.deleted),
    [tasks],
  );
  const celebratedToday = state?.lastCelebrationDate === new Date().toISOString().slice(0, 10);

  return {
    hydrated,
    syncing,
    tasks,
    allDone,
    celebratedToday,
    addTask,
    updateTask,
    logTime,
    toggleTask,
    deleteTask,
    skipTask,
    reorderTask,
    markCelebrated,
    loadFromBackup,
    forceSync,
    isCorrupted,
  };
}
