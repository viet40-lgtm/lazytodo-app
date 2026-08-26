import type { Task } from '../types';

function parseReminder(reminder: string): Date | null {
  const d = new Date(reminder);
  if (isNaN(d.getTime())) return null;
  return d;
}

export async function requestNotificationPermission(): Promise<boolean> {
  return true;
}

export async function syncReminders(tasks: Task[]): Promise<Task[]> {
  const nextTasks: Task[] = [];
  
  for (const task of tasks) {
    if (!task.reminder || task.completed) {
      const { notificationId: _removed, alarmSet: _alarmRemoved, ...rest } = task;
      nextTasks.push({ ...rest, alarmSet: false });
      continue;
    }
  
    let alarmSet = task.alarmSet;
    if (!alarmSet && task.reminder && !task.completed) {
      const date = parseReminder(task.reminder);
      if (date && date.getTime() > Date.now()) {
        const hour = date.getHours();
        const minutes = date.getMinutes();
        try {
          const { Platform } = require('react-native');
          if (Platform.OS === 'android') {
            const IntentLauncher = require('expo-intent-launcher');
            await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
              extra: {
                'android.intent.extra.alarm.HOUR': hour,
                'android.intent.extra.alarm.MINUTES': minutes,
                'android.intent.extra.alarm.MESSAGE': task.name,
                'android.intent.extra.alarm.SKIP_UI': true,
              },
            });
            alarmSet = true;
          }
        } catch (e) {
          console.warn("Failed to set native Android alarm", e);
        }
      }
    }
  
    nextTasks.push({
      ...task,
      notificationId: undefined,
      alarmSet,
    });
  }
  
  return nextTasks;
}
