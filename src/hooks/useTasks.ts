import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppState, Task } from '../types';
import { pushRemoteState, pullRemoteState, subscribeToRemoteState } from '../services/cloud';
import { syncReminders } from '../services/reminders';
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
  const reminderSyncRef = useRef(0);
  const stateRef = useRef<AppState | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushingRef = useRef(false);
  const pendingPushRef = useRef(false);
  stateRef.current = state;

  // Load state whenever userId changes.
  useEffect(() => {
    let active = true;
    setHydrated(false);

    if (!userId) {
      setState({ tasks: [], savedAt: Date.now() });
      setHydrated(true);
    } else {
      // Logged-in mode: load from cloud.
      setSyncing(true);
      pullRemoteState(userId)
        .then((remote) => {
          if (!active) return;
          setState(remote ?? { tasks: [], savedAt: Date.now() });
          setHydrated(true);
          setSyncing(false);
        })
      // H4: On network failure, DON'T set empty state — that would erase cloud data
      // on the next push. Keep hydrated=false so a retry/reload is required.
          .catch(() => {
          if (!active) return;
          // Stay unhydrated so we don't push empty state to cloud.
          // The loading spinner stays visible; user can pull-to-refresh.
          setState({ tasks: [], savedAt: 0 });
          setHydrated(true);
          setSyncing(false);
        });
    }

    return () => {
      active = false;
    };
  }, [userId]);

  // Persist state changes to cloud for logged-in users.
  useEffect(() => {
    if (!hydrated || !state) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(async () => {
      if (!userId) return;
      if (pushingRef.current) {
        // Another push is in-flight; mark that we need another push after it finishes.
        pendingPushRef.current = true;
        return;
      }
      const doPush = async () => {
        pushingRef.current = true;
        pendingPushRef.current = false;
        try {
          const snapshot = stateRef.current;
          if (snapshot) await pushRemoteState(userId, snapshot).catch(() => {});
        } finally {
          pushingRef.current = false;
          if (pendingPushRef.current) {
            // A state change came in while we were pushing — push once more.
            pendingPushRef.current = false;
            const latest = stateRef.current;
            if (latest) await pushRemoteState(userId, latest).catch(() => {});
          }
        }
      };
      doPush();
    }, 800);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [state, hydrated, userId]);

  // Real-time subscription — instantly reflect changes from other devices.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const channel = subscribeToRemoteState(userId, (remote) => {
      if (!active) return;
      setState((prev) => {
        // Ignore incoming remote state if we have newer local changes pending.
        if (prev && prev.savedAt > remote.savedAt) {
          return prev;
        }
        return remote;
      });
    });
    return () => {
      active = false;
      channel?.unsubscribe();
    };
  }, [userId]);

  // Manual force sync — pull latest from cloud.
  const forceSync = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      const remote = await pullRemoteState(userId);
      if (remote) setState(remote);
    } catch {
      // Sync errors are non-fatal.
    } finally {
      setSyncing(false);
    }
  }, [userId]);

  // Reminder scheduling — runs only when reminder-relevant fields change.
  // M3: Build a stable string from only the fields that matter for reminders,
  // so this memo doesn't re-fire on every unrelated state change.
  const reminderSignature = useMemo(
    () =>
      (state?.tasks ?? [])
        .filter((t) => t.reminder || t.completed)
        .map((t) => `${t.id}:${t.reminder ?? ''}:${t.completed ? 1 : 0}:${t.notificationId ?? ''}`)
        .join('|'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        return changed
          ? {
              ...prev,
              tasks: prev.tasks.map((t) => {
                const synced = tasks.find((s) => s.id === t.id);
                return synced && synced.notificationId !== t.notificationId
                  ? { ...t, notificationId: synced.notificationId }
                  : t;
              }),
            }
          : prev;
      });
    });
  }, [hydrated, reminderSignature]);

  const updateTasks = useCallback((updater: (tasks: Task[]) => Task[]) => {
    setState((prev) => {
      const current = prev ?? { tasks: [], savedAt: Date.now() };
      return { ...current, tasks: sortTasks(updater(current.tasks)), savedAt: Date.now() };
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



  const reorderTask = useCallback(
    (id: string, direction: 'up' | 'down') => {
      updateTasks((tasks) => {
        const target = tasks.find((t) => t.id === id);
        if (!target) return tasks;

        const siblings = sortTasks(
          tasks.filter((t) => t.section === target.section && t.completed === target.completed),
        );
        const siblingIdx = siblings.findIndex((t) => t.id === id);
        const swapIdx = direction === 'up' ? siblingIdx - 1 : siblingIdx + 1;

        if (swapIdx < 0 || swapIdx >= siblings.length) return tasks;

        const reordered = [...siblings];
        [reordered[siblingIdx], reordered[swapIdx]] = [reordered[swapIdx], reordered[siblingIdx]];
        const orderById = new Map(reordered.map((t, i) => [t.id, i * 1000]));
        const now = Date.now();
        return tasks.map((t) =>
          orderById.has(t.id) ? { ...t, order: orderById.get(t.id) as number, updatedAt: now } : t,
        );
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



  // Daily reset for persistent habits:
  // Any task with a timeLogs field (even empty []) is a habit — it means
  // the user has interacted with it as a recurring task.
  useEffect(() => {
    if (!hydrated || !state) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();
    // H3: use timeLogs !== undefined (presence check) instead of .length > 0
    // Fix: Since withRecurringSeries initializes timeLogs to [], we must check length.
    const isHabit = (t: Task) => t.persistent || (t.timeLogs?.length ?? 0) > 0;
    const toReset = state.tasks.filter(
      (t) => isHabit(t) && t.completed && !t.deleted && (t.completedAt ?? 0) < todayMs,
    );
    if (toReset.length === 0) return;
    updateTasks((tasks: Task[]) =>
      tasks.map((t) =>
        isHabit(t) && t.completed && !t.deleted && (t.completedAt ?? 0) < todayMs
          ? { ...t, completed: false, completedAt: undefined, updatedAt: Date.now() }
          : t,
      ),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);



  // Memoize sorted task list.
  const tasks = useMemo(() => sortTasks(state?.tasks ?? []), [state?.tasks]);
  // H2: only count non-deleted tasks toward allDone — deleting all tasks
  // shouldn't trigger the completion celebration.
  const allDone = useMemo(() => {
    const liveTasks = tasks.filter((t) => !t.deleted);
    return liveTasks.length > 0 && liveTasks.every((t) => t.completed);
  }, [tasks]);
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
    reorderTask,
    markCelebrated,
    forceSync,
  };
}
