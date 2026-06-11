import type { Recurring, Task } from '../types';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function periodStart(recurring: Recurring, date: Date): Date {
  switch (recurring) {
    case 'daily':
      return startOfDay(date);
    case 'weekly':
      return startOfWeek(date);
    case 'monthly':
      return startOfMonth(date);
  }
}

export function shouldResetRecurring(task: Task, now = new Date()): boolean {
  if (!task.recurring || !task.completed || !task.completedAt) return false;
  const completed = new Date(task.completedAt);
  return (
    periodStart(task.recurring, completed).getTime() <
    periodStart(task.recurring, now).getTime()
  );
}

export function resetRecurringTasks(tasks: Task[]): Task[] {
  return tasks.map((task) =>
    shouldResetRecurring(task)
      ? { ...task, completed: false, completedAt: undefined }
      : task,
  );
}
