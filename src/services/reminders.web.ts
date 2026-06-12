import type { Task } from '../types';

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function syncReminders(tasks: Task[]): Promise<Task[]> {
  return tasks;
}
