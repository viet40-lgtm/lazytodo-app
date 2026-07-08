export async function requestPomodoroPermission(): Promise<boolean> {
  return false;
}

export async function scheduleTimerNotifications(
  phase: 'work' | 'break',
  secsLeft: number
): Promise<string[]> {
  return [];
}

export async function cancelTimerNotifications(ids: string[]): Promise<void> {
  return;
}

export async function setSystemAlarm(message: string, secsLeft: number): Promise<void> {
  return;
}
