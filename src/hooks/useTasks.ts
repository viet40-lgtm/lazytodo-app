import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppState, Task, TaskSection } from '../types';
import { pullRemoteState, pushRemoteState } from '../services/cloud';
import { syncReminders } from '../services/reminders';
import { loadState, saveState, DataCorruptionError, mergeStates } from '../services/storage';
import { isGoalComplete } from '../utils/progress';
import { nextPeriodStart, advanceReminder, isTaskOverdue } from '../utils/recurring';

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

function createTaskId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function useTasks(userId: string | null = null) {
  const [state, setState] = useState<AppState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isCorrupted, setIsCorrupted] = useState(false);
  const reminderSyncRef = useRef(0);
  const stateRef = useRef<AppState | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  stateRef.current = state;

  useEffect(() => {
    let active = true;
    loadState().then((loaded) => {
      if (!active) return;
      setState(loaded);
      setHydrated(true);
    }).catch((err) => {
      if (err instanceof DataCorruptionError) {
        if (!active) return;
        setIsCorrupted(true);
        setHydrated(true);
      } else {
        // Fallback for non-corruption errors
        if (!active) return;
        setState({ tasks: [], savedAt: Date.now() });
        setHydrated(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !state || isCorrupted) return;
    saveState(state).catch(() => {});
  }, [hydrated, state]);

  // Pull from cloud once when the user logs in, then reconcile by savedAt.
  useEffect(() => {
    if (!hydrated || !userId || isCorrupted) return;
    let active = true;
    setSyncing(true);
    (async () => {
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
      if (active) setSyncing(false);
    })();
    return () => {
      active = false;
    };
  }, [hydrated, userId]);

  // Manual force sync
  const forceSync = useCallback(async () => {
    if (!userId || !state || isCorrupted) return;
    setSyncing(true);
    try {
      const remoteState = await pullRemoteState(userId);
      if (remoteState) {
        const { merged, localChanged, remoteChanged } = mergeStates(state, remoteState);
        if (localChanged) setState(merged);
        if (remoteChanged) await pushRemoteState(userId, merged);
      } else {
        await pushRemoteState(userId, state);
      }
    } catch (err) {
      console.error('Force sync failed:', err);
    } finally {
      setSyncing(false);
    }
  }, [userId, state, isCorrupted]);

  // Debounced smart merge on every change while logged in.
  useEffect(() => {
    if (!hydrated || !userId || !state || isCorrupted) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      forceSync().catch(() => {});
    }, 1200);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [state, hydrated, userId, isCorrupted, forceSync]);

  const reminderSignature = state?.tasks
    .map((task) => `${task.id}:${task.name}:${task.reminder ?? ''}:${task.completed ? 1 : 0}`)
    .join('|');

  useEffect(() => {
    if (!hydrated || !state) return;

    const syncId = ++reminderSyncRef.current;
    const currentTasks = state.tasks;

    syncReminders(currentTasks).then((tasks) => {
      if (syncId !== reminderSyncRef.current) return;
      setState((prev) => {
        if (!prev) return prev;
        const changed = tasks.some((task) => {
          const existing = prev.tasks.find((item) => item.id === task.id);
          return existing?.notificationId !== task.notificationId;
        });
        if (!changed) return prev;
        return { ...prev, tasks };
      });
    });
  }, [hydrated, reminderSignature]);

  const updateTasks = useCallback((updater: (tasks: Task[]) => Task[]) => {
    setState((prev) => {
      if (!prev) return prev;
      const newTasks = sortTasks(updater(prev.tasks));
      console.log('updateTasks called! Previous count:', prev.tasks.length, 'New count:', newTasks.length);
      return { ...prev, tasks: newTasks, savedAt: Date.now() };
    });
  }, []);


  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'spentMinutes'>) => {
    const newTask: Task = {
      ...task,
      section: task.section ?? 'today',
      spentMinutes: 0,
      id: createTaskId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completed: false,
    };
    updateTasks((tasks) => [...tasks, newTask]);
  }, [updateTasks]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    updateTasks((tasks) => tasks.map((task) => (task.id === id ? { ...task, ...updates, updatedAt: Date.now() } : task)));
  }, [updateTasks]);

  const logTime = useCallback((id: string, minutes: number) => {
    updateTasks((tasks) =>
      tasks.map((task) =>
        task.id === id
          ? { ...task, spentMinutes: Math.max(0, task.spentMinutes + minutes), updatedAt: Date.now() }
          : task,
      ),
    );
  }, [updateTasks]);

  const toggleTask = useCallback((id: string) => {
    updateTasks((tasks) => {
      const target = tasks.find((t) => t.id === id);
      if (!target) return tasks;

      const isCompleting = !target.completed;
      const toggled = tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: !task.completed,
              completedAt: !task.completed ? Date.now() : undefined,
              updatedAt: Date.now(),
            }
          : task,
      );

      // Spawn next occurrence immediately, hidden until next period starts
      if (isCompleting && target.recurring) {
        // Only spawn if no future occurrence already exists
        const alreadyQueued = tasks.some(
          (t) => t.id !== id && t.name === target.name &&
            t.section === target.section && !t.completed &&
            t.showAfter !== undefined,
        );
        if (!alreadyQueued) {
          toggled.push({
            ...target,
            id: createTaskId(),
            completed: false,
            completedAt: undefined,
            createdAt: Date.now(),
            spentMinutes: 0,
            showAfter: nextPeriodStart(target.recurring),
            reminder: target.reminder ? advanceReminder(target.reminder, target.recurring) : undefined,
          });
        }
      }

      return toggled;
    });
  }, [updateTasks]);

  const deleteTask = useCallback((id: string) => {
    updateTasks((tasks) => tasks.map((task) => task.id === id ? { ...task, deleted: true, updatedAt: Date.now() } : task));
  }, [updateTasks]);

  const skipTask = useCallback((id: string) => {
    updateTasks((tasks) => {
      const target = tasks.find((t) => t.id === id);
      if (!target) return tasks;

      const remaining = tasks.map((t) => t.id === id ? { ...t, deleted: true, updatedAt: Date.now() } : t);

      if (target.recurring) {
        const alreadyQueued = tasks.some(
          (t) => t.id !== id && t.name === target.name &&
            t.section === target.section && !t.completed &&
            t.showAfter !== undefined,
        );
        if (!alreadyQueued) {
          remaining.push({
            ...target,
            id: createTaskId(),
            completed: false,
            completedAt: undefined,
            createdAt: Date.now(),
            spentMinutes: 0,
            showAfter: nextPeriodStart(target.recurring),
            reminder: target.reminder ? advanceReminder(target.reminder, target.recurring) : undefined,
          });
        }
      }

      return remaining;
    });
  }, [updateTasks]);

  const reorderTask = useCallback((id: string, direction: 'up' | 'down') => {
    updateTasks((tasks) => {
      const idx = tasks.findIndex(t => t.id === id);
      if (idx === -1) return tasks;
      const target = tasks[idx];
      
      const siblingTasks = sortTasks(tasks.filter(t => t.section === target.section && t.completed === target.completed));
      const siblingIdx = siblingTasks.findIndex(t => t.id === id);
      
      if (direction === 'up' && siblingIdx > 0) {
        const swapIdx = siblingIdx - 1;
        return tasks.map(t => {
          if (t.section !== target.section || t.completed !== target.completed) return t;
          const sIdx = siblingTasks.findIndex(s => s.id === t.id);
          if (sIdx === -1) return t;
          
          let newOrder = sIdx * 1000;
          if (sIdx === siblingIdx) newOrder = swapIdx * 1000;
          if (sIdx === swapIdx) newOrder = siblingIdx * 1000;
          return { ...t, order: newOrder, updatedAt: Date.now() };
        });
      } else if (direction === 'down' && siblingIdx < siblingTasks.length - 1) {
        const swapIdx = siblingIdx + 1;
        return tasks.map(t => {
          if (t.section !== target.section || t.completed !== target.completed) return t;
          const sIdx = siblingTasks.findIndex(s => s.id === t.id);
          if (sIdx === -1) return t;
          
          let newOrder = sIdx * 1000;
          if (sIdx === siblingIdx) newOrder = swapIdx * 1000;
          if (sIdx === swapIdx) newOrder = siblingIdx * 1000;
          return { ...t, order: newOrder, updatedAt: Date.now() };
        });
      }
      return tasks;
    });
  }, [updateTasks]);

  const markCelebrated = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setState((prev) => (prev ? { ...prev, lastCelebrationDate: today, savedAt: Date.now() } : prev));
  }, []);

  const loadFromBackup = useCallback((backup: AppState) => {
    setState({ ...backup, savedAt: Date.now() + 9999999 });
  }, []);

  useEffect(() => {
    if (!hydrated || !state || isCorrupted) return;
    const now = Date.now();
    state.tasks.forEach((task) => {
      if (!task.completed && !task.deleted && task.recurring && isTaskOverdue(task, now)) {
        skipTask(task.id);
      }
    });
  }, [hydrated, state, isCorrupted, skipTask]);

  const tasks = sortTasks(state?.tasks ?? []);
  const tasksBySection = (section: TaskSection) =>
    tasks.filter((task) => task.section === section);
  const allDone = tasks.length > 0 && tasks.every(isGoalComplete);
  const celebratedToday = state?.lastCelebrationDate === new Date().toISOString().slice(0, 10);

  return {
    hydrated,
    syncing,
    tasks,
    tasksBySection,
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
