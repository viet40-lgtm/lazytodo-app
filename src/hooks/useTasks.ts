import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppState, Task } from '../types';
import { syncReminders } from '../services/reminders';
import { loadState, saveState } from '../services/storage';

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.createdAt - b.createdAt;
  });
}

function createTaskId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function useTasks() {
  const [state, setState] = useState<AppState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const reminderSyncRef = useRef(0);

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
      return { ...prev, tasks: sortTasks(updater(prev.tasks)) };
    });
  }, []);

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'completed'>) => {
    const newTask: Task = {
      ...task,
      id: createTaskId(),
      createdAt: Date.now(),
      completed: false,
    };
    updateTasks((tasks) => [...tasks, newTask]);
  }, [updateTasks]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    updateTasks((tasks) => tasks.map((task) => (task.id === id ? { ...task, ...updates } : task)));
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
    setState((prev) => (prev ? { ...prev, lastCelebrationDate: today } : prev));
  }, []);

  const tasks = sortTasks(state?.tasks ?? []);
  const completedCount = tasks.filter((task) => task.completed).length;
  const totalCount = tasks.length;
  const allDone = totalCount > 0 && completedCount === totalCount;
  const celebratedToday = state?.lastCelebrationDate === new Date().toISOString().slice(0, 10);

  return {
    hydrated,
    tasks,
    completedCount,
    totalCount,
    allDone,
    celebratedToday,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    markCelebrated,
  };
}
