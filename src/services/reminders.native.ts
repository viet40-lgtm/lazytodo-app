import * as Notifications from 'expo-notifications';
import type { Task } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function parseReminder(reminder: string): Date | null {
  const d = new Date(reminder);
  if (isNaN(d.getTime())) return null;
  return d;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function cancelTaskReminder(notificationId?: string): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore stale ids
  }
}

async function scheduleTaskReminder(task: Task): Promise<string | undefined> {
  if (!task.reminder || task.completed) return undefined;

  const date = parseReminder(task.reminder);
  if (!date) return undefined;

  if (date.getTime() < Date.now()) return undefined;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Lazy To-Do',
      body: task.name,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });

  return id;
}

export async function syncReminders(tasks: Task[]): Promise<Task[]> {
  const granted = await requestNotificationPermission();
  if (!granted) return tasks;

  const nextTasks: Task[] = [];

  for (const task of tasks) {
    await cancelTaskReminder(task.notificationId);

    if (!task.reminder || task.completed) {
      const { notificationId: _removed, ...rest } = task;
      nextTasks.push(rest);
      continue;
    }

    const notificationId = await scheduleTaskReminder(task);
    nextTasks.push({
      ...task,
      ...(notificationId ? { notificationId } : {}),
    });
  }

  return nextTasks;
}
