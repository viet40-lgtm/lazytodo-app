export type Recurring = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type TaskSection = 'today' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface TimeLogEntry {
  at: number;
  minutes: number;
}

export interface SubTask {
  id: string;
  name: string;
  completed: boolean;
  completedAt?: number;
  timeSpent?: number;
  timeLogs?: TimeLogEntry[];
  createdAt?: number;
}

export interface Task {
  id: string;
  name: string;
  section: TaskSection;
  spentMinutes: number;
  completed: boolean;
  completedAt?: number;
  showAfter?: number;
  reminder?: string;
  /** One or more repeat schedules; task can appear in multiple sections. */
  recurring?: Recurring[];
  /**
   * When true the task is a pure reminder — no time tracking, just a checkbox + alert.
   */
  reminderOnly?: boolean;
  persistent?: boolean;
  /** Optional checklist of sub-tasks. */
  subtasks?: SubTask[];
  notificationId?: string;
  alarm?: boolean;
  alarmSet?: boolean;
  createdAt: number;
  updatedAt?: number;
  order?: number;
  deleted?: boolean;
  seriesId?: string;
  seriesTotalMinutes?: number;
  timeLogs?: TimeLogEntry[];
}

export interface AppState {
  tasks: Task[];
  lastCelebrationDate?: string;
  savedAt: number;
}
