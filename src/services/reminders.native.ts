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

function parseReminder(reminder: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(reminder);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
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

  const time = parseReminder(task.reminder);
  if (!time) return undefined;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Lazy To-Do',
      body: task.name,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
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
