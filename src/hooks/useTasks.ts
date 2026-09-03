import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppState, JournalEntry, Task } from '../types';
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
import { mergeAppState, mergeJournals, mergeTasks } from '../utils/merge';

const JOURNAL_STORAGE_KEY = 'lazy_todo_journals_v1';

function getLocalJournals(): JournalEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

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
      const localJ = getLocalJournals();
      setState({ tasks: [], journals: localJ, savedAt: Date.now() });
      setHydrated(true);
    } else {
      // Logged-in mode: load from cloud and merge with local
      setSyncing(true);
      pullRemoteState(userId)
        .then(async (remote) => {
          if (!active) return;
          const localJ = getLocalJournals();
          const current = stateRef.current;
          const merged = mergeAppState(remote, current, localJ);
          setState(merged);
          stateRef.current = merged;
          try {
            if (typeof localStorage !== 'undefined' && merged.journals) {
              localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(merged.journals));
            }
          } catch {}
          setHydrated(true);
          setSyncing(false);

          // If local had tasks that were not in remote, push the merged state to cloud
          if (current && current.tasks && current.tasks.length > 0) {
            await pushRemoteState(userId, merged).catch(() => {});
          }
        })
        // H4: On network failure, DON'T set empty state — that would erase cloud data
        // on the next push. Keep hydrated=false so a retry/reload is required.
        .catch(() => {
          if (!active) return;
          const localJ = getLocalJournals();
          setState({ tasks: [], journals: localJ, savedAt: 0 });
          setHydrated(true);
          setSyncing(false);
        });
    }

    return () => {
      active = false;
    };
  }, [userId]);

  // Persist state changes to cloud for logged-in users with two-way merge
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
          if (!snapshot) return;
          // Merge with latest remote before pushing so we don't overwrite another device's updates
          const remote = await pullRemoteState(userId);
          const localJ = getLocalJournals();
          const merged = remote ? mergeAppState(remote, snapshot, localJ) : snapshot;
          stateRef.current = merged;
          setState(merged);
          await pushRemoteState(userId, merged).catch(() => {});
        } finally {
          pushingRef.current = false;
          if (pendingPushRef.current) {
            pendingPushRef.current = false;
            const latest = stateRef.current;
            if (latest) {
              const remote = await pullRemoteState(userId);
              const localJ = getLocalJournals();
              const merged = remote ? mergeAppState(remote, latest, localJ) : latest;
              stateRef.current = merged;
              setState(merged);
              await pushRemoteState(userId, merged).catch(() => {});
            }
          }
        }
      };
      doPush();
    }, 800);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [state, hydrated, userId]);

  // Real-time subscription — instantly reflect changes from other devices via merge
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const channel = subscribeToRemoteState(userId, (remote) => {
      if (!active) return;
      setState((prev) => {
        if (!prev) return remote;
        const localJ = getLocalJournals();
        const merged = mergeAppState(remote, prev, localJ);
        stateRef.current = merged;

        if (merged.journals && typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(merged.journals));
          } catch {}
        }
        return merged;
      });
    });
    return () => {
      active = false;
      channel?.unsubscribe();
    };
  }, [userId]);

  // Manual force sync — pull from cloud, merge with local, update local, and push merged back
  const forceSync = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      const localJ = getLocalJournals();
      const remote = await pullRemoteState(userId);
      const current = stateRef.current;
      const merged = mergeAppState(remote, current, localJ);

      setState(merged);
      stateRef.current = merged;

      if (typeof localStorage !== 'undefined' && merged.journals) {
        try {
          localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(merged.journals));
        } catch {}
      }

      await pushRemoteState(userId, merged).catch(() => {});
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
          return (
            existing?.notificationId !== task.notificationId ||
            existing?.alarmSet !== task.alarmSet
          );
        });
        return changed
          ? {
              ...prev,
              tasks: prev.tasks.map((t) => {
                const synced = tasks.find((s) => s.id === t.id);
                if (synced) {
                  if (
                    synced.notificationId !== t.notificationId ||
                    synced.alarmSet !== t.alarmSet
                  ) {
                    return {
                      ...t,
                      notificationId: synced.notificationId,
                      alarmSet: synced.alarmSet,
                    };
                  }
                }
                return t;
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
        alarmSet: false,
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
          
          const reminderChanged = updates.reminder !== undefined && updates.reminder !== task.reminder;
          const alarmChanged = updates.alarm !== undefined && updates.alarm !== task.alarm;
          const resetAlarmSet = reminderChanged || alarmChanged;

          const merged = { 
            ...task, 
            ...updates, 
            ...(resetAlarmSet ? { alarmSet: false } : {}),
            updatedAt: Date.now() 
          };
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



  // Daily reset only for daily recurring tasks / persistent habits at 12:00 AM midnight:
  useEffect(() => {
    if (!hydrated) return;

    const checkMidnightReset = () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayMs = todayStart.getTime();

      const isDaily = (t: Task) =>
        t.section === 'daily' ||
        normalizeRecurring(t.recurring).includes('daily') ||
        Boolean(t.persistent);

      updateTasks((tasks: Task[]) => {
        const toReset = tasks.some(
          (t) => isDaily(t) && t.completed && !t.deleted && (t.completedAt ?? 0) < todayMs,
        );
        if (!toReset) return tasks;

        return tasks.map((t) =>
          isDaily(t) && t.completed && !t.deleted && (t.completedAt ?? 0) < todayMs
            ? { ...t, completed: false, completedAt: undefined, updatedAt: Date.now() }
            : t,
        );
      });
    };

    checkMidnightReset();

    // Check every minute so it automatically resets at 12:00 AM midnight while app is open
    const interval = setInterval(checkMidnightReset, 60000);
    return () => clearInterval(interval);
  }, [hydrated, updateTasks]);



  // Memoize sorted task list.
  const tasks = useMemo(() => sortTasks(state?.tasks ?? []), [state?.tasks]);
  // H2: only count non-deleted tasks toward allDone — deleting all tasks
  // shouldn't trigger the completion celebration.
  const allDone = useMemo(() => {
    const liveTasks = tasks.filter((t) => !t.deleted);
    return liveTasks.length > 0 && liveTasks.every((t) => t.completed);
  }, [tasks]);
  const celebratedToday = state?.lastCelebrationDate === new Date().toISOString().slice(0, 10);
  const journals = useMemo(() => state?.journals ?? [], [state?.journals]);

  const saveJournals = useCallback((updatedJournals: JournalEntry[]) => {
    setState((prev) => {
      const base = prev ?? { tasks: [], savedAt: 0 };
      return {
        ...base,
        journals: updatedJournals,
        savedAt: Date.now(),
      };
    });
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(updatedJournals));
      }
    } catch {}
  }, []);

  return {
    hydrated,
    syncing,
    tasks,
    allDone,
    celebratedToday,
    journals,
    saveJournals,
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
