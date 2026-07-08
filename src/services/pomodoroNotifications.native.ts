import * as Notifications from 'expo-notifications';

const WORK_SECS = 25 * 60;
const BREAK_SECS = 5 * 60;

export async function requestPomodoroPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleTimerNotifications(
  phase: 'work' | 'break',
  secsLeft: number
): Promise<string[]> {
  try {
    const ids: string[] = [];

    // 1st notification: end of current phase
    const triggerDate1 = new Date(Date.now() + secsLeft * 1000);
    const id1 = await Notifications.scheduleNotificationAsync({
      content: {
        title: phase === 'work' ? '🍅 Focus Session Done' : '☕ Break Done',
        body: phase === 'work' ? 'Time for a 5-minute break!' : 'Time to start focusing again!',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate1,
      },
    });
    ids.push(id1);

    // 2nd notification: end of next phase
    const nextPhase = phase === 'work' ? 'break' : 'work';
    const nextDuration = nextPhase === 'work' ? WORK_SECS : BREAK_SECS;
    const triggerDate2 = new Date(Date.now() + (secsLeft + nextDuration) * 1000);
    const id2 = await Notifications.scheduleNotificationAsync({
      content: {
        title: nextPhase === 'work' ? '🍅 Focus Session Done' : '☕ Break Done',
        body: nextPhase === 'work' ? 'Time for a 5-minute break!' : 'Time to start focusing again!',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate2,
      },
    });
    ids.push(id2);

    return ids;
  } catch (e) {
    console.warn('Failed to schedule notifications', e);
    return [];
  }
}

export async function cancelTimerNotifications(ids: string[]): Promise<void> {
  try {
    for (const id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  } catch (e) {
    console.warn('Failed to cancel notifications', e);
  }
}

export async function setSystemAlarm(message: string, secsLeft: number): Promise<void> {
  try {
    const alarmTime = new Date(Date.now() + secsLeft * 1000);
    const hour = alarmTime.getHours();
    const minutes = alarmTime.getMinutes();
    const { Platform } = require('react-native');
    if (Platform.OS === 'android') {
      const IntentLauncher = require('expo-intent-launcher');
      await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
        extra: {
          'android.intent.extra.alarm.HOUR': hour,
          'android.intent.extra.alarm.MINUTES': minutes,
          'android.intent.extra.alarm.MESSAGE': message,
          'android.intent.extra.alarm.SKIP_UI': true,
        },
      });
    }
  } catch (e) {
    console.warn('Failed to set native Android alarm for Pomodoro', e);
  }
}
