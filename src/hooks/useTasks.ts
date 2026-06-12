import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppState, Task, TaskSection } from '../types';
import { pullRemoteState, pushRemoteState } from '../services/cloud';
import { syncReminders } from '../services/reminders';
import { loadState, saveState } from '../services/storage';
import { isGoalComplete } from '../utils/progress';

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
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
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !state) return;
    saveState(state).catch(() => {});
  }, [hydrated, state]);

  // Pull from cloud once when the user logs in, then reconcile by savedAt.
  useEffect(() => {
    if (!hydrated || !userId) return;
    let active = true;
    setSyncing(true);
    (async () => {
      const remote = await pullRemoteState(userId);
      const local = stateRef.current;
      if (!active) return;
      if (remote && (!local || (remote.savedAt ?? 0) > (local.savedAt ?? 0))) {
        setState(remote);
      } else if (local) {
        await pushRemoteState(userId, local);
      }
      if (active) setSyncing(false);
    })();
    return () => {
      active = false;
    };
  }, [hydrated, userId]);

  // Debounced push to cloud on every change while logged in.
  useEffect(() => {
    if (!hydrated || !userId || !state) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushRemoteState(userId, state).catch(() => {});
    }, 1200);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [state, hydrated, userId]);

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
      return { ...prev, tasks: sortTasks(updater(prev.tasks)), savedAt: Date.now() };
    });
  }, []);

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'spentMinutes'>) => {
    const newTask: Task = {
      ...task,
      section: task.section ?? 'today',
      spentMinutes: 0,
      id: createTaskId(),
      createdAt: Date.now(),
      completed: false,
    };
    updateTasks((tasks) => [...tasks, newTask]);
  }, [updateTasks]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    updateTasks((tasks) => tasks.map((task) => (task.id === id ? { ...task, ...updates } : task)));
  }, [updateTasks]);

  const logTime = useCallback((id: string, minutes: number) => {
    updateTasks((tasks) =>
      tasks.map((task) =>
        task.id === id
          ? { ...task, spentMinutes: Math.max(0, task.spentMinutes + minutes) }
          : task,
      ),
    );
  }, [updateTasks]);

  const toggleTask = useCallback((id: string) => {
    updateTasks((tasks) =>
      tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: !task.completed,
              completedAt: !task.completed ? Date.now() : undefined,
            }
          : task,
      ),
    );
  }, [updateTasks]);

  const deleteTask = useCallback((id: string) => {
    updateTasks((tasks) => tasks.filter((task) => task.id !== id));
  }, [updateTasks]);

  const markCelebrated = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setState((prev) => (prev ? { ...prev, lastCelebrationDate: today, savedAt: Date.now() } : prev));
  }, []);

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
    markCelebrated,
  };
}
